import * as THREE from '../vendor/three/three.module.min.js';
import {parseVRML} from './vrml.mjs';

const meshMaterial = (vertexColors = false) => new THREE.MeshStandardMaterial({
  color: vertexColors ? 0xffffff : 0x999999,
  vertexColors, side: THREE.DoubleSide, roughness: .66,
});

export async function readModel(file) {
  const extension = file.name.split('.').pop().toLowerCase();
  if (extension === 'wrl') {
    const source = await file.text();
    if (!source.startsWith('#VRML V1.0 ascii')) {
      throw new Error('Use an ASCII VRML 1.0 file, like the models in this collection.');
    }
    const data = parseVRML(source);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(data.positions, 3));
    const color = new THREE.Color();
    for (let i = 0; i < data.colors.length; i += 3) {
      color.setRGB(data.colors[i], data.colors[i+1], data.colors[i+2], THREE.SRGBColorSpace);
      data.colors[i] = color.r; data.colors[i+1] = color.g; data.colors[i+2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(data.colors, 3));
    geometry.computeVertexNormals();
    return new THREE.Mesh(geometry, meshMaterial(true));
  }
  if (extension === 'stl') {
    const {STLLoader} = await import('../vendor/three/loaders/STLLoader.js');
    const geometry = new STLLoader().parse(await file.arrayBuffer());
    return new THREE.Mesh(geometry, meshMaterial(geometry.hasAttribute('color')));
  }
  if (extension === 'obj') {
    const {OBJLoader} = await import('../vendor/three/loaders/OBJLoader.js');
    return new OBJLoader().parse(await file.text());
  }
  if (extension === 'glb') {
    const {GLTFLoader} = await import('../vendor/three/loaders/GLTFLoader.js');
    const buffer = await file.arrayBuffer();
    const header = new DataView(buffer);
    if (buffer.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 || header.getUint32(4, true) !== 2 || header.getUint32(16, true) !== 0x4e4f534a) {
      throw new Error('This is not a valid GLB 2.0 file.');
    }
    const length = header.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
    // A local file must not fetch anything from the network or sibling files.
    for (const entry of [...(json.buffers || []), ...(json.images || [])]) {
      if (entry.uri && !entry.uri.startsWith('data:')) throw new Error('Use a self-contained GLB with its buffers and textures embedded.');
    }
    const unsupported = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_texture_basisu'];
    if ((json.extensionsRequired || []).some(name => unsupported.includes(name))) {
      throw new Error('Use an uncompressed GLB; Draco, Meshopt, and KTX2 decoders are not bundled.');
    }
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(url => {
      if (!url.startsWith('blob:') && !url.startsWith('data:')) throw new Error('External resources are not supported. Use a self-contained GLB.');
      return url;
    });
    const gltf = await new GLTFLoader(manager).parseAsync(buffer, '');
    return gltf.scene;
  }
  throw new Error('Choose a .wrl, .stl, .obj, or .glb file.');
}

export function disposeModel(object, keepGeometry = false) {
  const materials = new Set(), geometries = new Set(), textures = new Set();
  object.traverse(node => {
    if (node.geometry) geometries.add(node.geometry);
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material) materials.add(material);
    }
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    material.dispose();
  }
  for (const texture of textures) texture.dispose();
  if (!keepGeometry) for (const geometry of geometries) geometry.dispose();
}

export function prepareModel(object) {
  try {
    let vertices = 0;
    object.traverse(node => {
      const position = node.geometry?.getAttribute('position');
      if (!position) return;
      vertices += position.count;
      for (let i = 0; i < position.count; i++) {
        if (![position.getX(i), position.getY(i), position.getZ(i)].every(Number.isFinite)) {
          throw new Error('This file contains invalid vertex coordinates.');
        }
      }
    });
    if (!vertices) throw new Error('No viewable geometry was found in this file.');
    const bounds = new THREE.Box3().setFromObject(object);
    const size = bounds.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxSize) || maxSize <= 0) throw new Error('This model has no visible size.');
    object.position.sub(bounds.getCenter(new THREE.Vector3()));
    const root = new THREE.Group(); root.add(object); root.scale.setScalar(8 / maxSize);
    root.updateMatrixWorld(true);
    root.userData.radius = new THREE.Box3().setFromObject(root).getBoundingSphere(new THREE.Sphere()).radius;
    root.userData.uploaded = true;
    return root;
  } catch (error) {
    disposeModel(object);
    throw error;
  }
}
