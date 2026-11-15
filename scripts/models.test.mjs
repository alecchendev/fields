import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseVRML} from '../src/vrml.mjs';
import {models} from '../src/models.mjs';

test('VRML separators restore parent coordinates and material state', () => {
  const mesh=parseVRML(`#VRML V1.0 ascii
Separator {
MaterialBinding { value PER_FACE_INDEXED }
Material { diffuseColor [1 0 0] }
Coordinate3 { point [0 0 0, 1 0 0, 0 1 0] }
Separator {
Material { diffuseColor [0 0 1] }
Coordinate3 { point [0 0 2, 1 0 2, 0 1 2] }
IndexedFaceSet { coordIndex [0,1,2,-1] materialIndex [0] }
}
IndexedFaceSet { coordIndex [0,1,2,-1] materialIndex [0] }
}`);
  assert.equal(mesh.faceCount,2);
  assert.deepEqual([...mesh.positions], [0,0,2,1,0,2,0,1,2,0,0,0,1,0,0,0,1,0]);
  assert.deepEqual([...mesh.colors], [0,0,1,0,0,1,0,0,1,1,0,0,1,0,0,1,0,0]);
});
for(const model of models) test(`${model.name}: binary matches all original triangles and face colors`,async()=>{
  const source=await readFile(`models/${model.id}.wrl`,'utf8');
  const mesh=parseVRML(source);
  const binary=await readFile(`models/${model.id}.bin`);
  const values=new Float32Array(binary.buffer,binary.byteOffset,binary.byteLength/4);
  assert.equal(mesh.positions.length,mesh.faceCount*9, 'Source faces should all be triangles');
  assert.ok(mesh.faceCount>1000);
  assert.equal(values.length,mesh.positions.length+mesh.colors.length);
  assert.deepEqual(values.subarray(0,mesh.positions.length),mesh.positions);
  assert.deepEqual(values.subarray(mesh.positions.length),mesh.colors);
  for(const c of mesh.colors) assert.ok(c>=0 && c<=1);
});
test('rejects broken vertex references rather than producing corrupt geometry',()=>{
  assert.throws(()=>parseVRML('#VRML V1.0 ascii\nSeparator { Material { diffuseColor [1 0 0] } Coordinate3 { point [0 0 0] } IndexedFaceSet { coordIndex [0 1 2 -1] } }'),/Invalid vertex/);
});
