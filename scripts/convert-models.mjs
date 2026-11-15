import {readFile, writeFile} from 'node:fs/promises';
import {parseVRML} from '../src/vrml.mjs';
import {models} from '../src/models.mjs';
for (const model of models) {
  const mesh = parseVRML(await readFile(`models/${model.id}.wrl`, 'utf8'));
  const data = new Float32Array(mesh.positions.length + mesh.colors.length);
  data.set(mesh.positions); data.set(mesh.colors, mesh.positions.length);
  await writeFile(`models/${model.id}.bin`, Buffer.from(data.buffer));
  console.log(`${model.id}: ${mesh.faceCount} faces, ${data.byteLength} bytes`);
}
