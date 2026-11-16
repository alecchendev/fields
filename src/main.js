import * as THREE from '../vendor/three/three.module.min.js';
import {OrbitControls} from '../vendor/three/controls/OrbitControls.js';
import {models} from './models.mjs';
import {readModel, prepareModel, disposeModel} from './open-model.mjs';
import {readLibrary, saveModel, removeModel, saveSelection} from './model-library.mjs';

const $ = id => document.getElementById(id);
const nav = $('models');
for (const category of ['electric', 'magnetic']) {
  const group = document.createElement('div'); group.className = 'model-group';
  group.innerHTML = `<h2 class="group-label">${category === 'electric' ? 'Electric' : 'Magnetic'}</h2>`;
  models.filter(m => m.category === category).forEach(m => {
    const button = document.createElement('button'); button.className = 'model-button'; button.dataset.model = m.id;
    button.textContent = m.name;
    button.addEventListener('click', () => { if (location.hash === `#${m.id}`) selectModel(); else location.hash = m.id; }); group.append(button);
  }); nav.append(group);
}

const personalModels = new Map();
let libraryReady, libraryAvailable = true;

let renderer, controls, camera, scene, current, grid, selected, loadVersion = 0;
const geometryCache = new Map();
const requests = new Map();
function fetchModel(id) {
  if (!requests.has(id)) requests.set(id, fetch(new URL(`../models/${id}.bin`, import.meta.url)).then(r => {
    if (!r.ok) throw new Error(`Could not load ${id}`); return r.arrayBuffer();
  }).catch(e => {requests.delete(id); throw e;}));
  return requests.get(id);
}
function geometryFrom(data) {
  const values = new Float32Array(data);
  if (!values.length || values.length % 18 !== 0) throw new Error('Invalid model data');
  const half = values.length / 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(values.subarray(0, half), 3));
  // VRML diffuse colors are sRGB. Convert them for Three's linear lighting pipeline.
  const colors = values.slice(half); const color = new THREE.Color();
  for (let i = 0; i < colors.length; i += 3) {color.setRGB(colors[i], colors[i+1], colors[i+2], THREE.SRGBColorSpace); colors[i]=color.r; colors[i+1]=color.g; colors[i+2]=color.b;}
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals(); geometry.computeBoundingBox();
  const center = geometry.boundingBox.getCenter(new THREE.Vector3());
  const size = geometry.boundingBox.getSize(new THREE.Vector3());
  geometry.translate(-center.x, -center.y, -center.z); geometry.scale(...Array(3).fill(8 / Math.max(size.x, size.y, size.z)));
  geometry.computeBoundingSphere(); return geometry;
}
function setView(view = 'perspective') {
  if (!camera || !current) return;
  const aspect = camera.aspect;
  const radius = current.userData.radius;
  const verticalFov = THREE.MathUtils.degToRad(camera.fov);
  const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
  const distance = radius / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * (aspect < .85 ? 1.3 : 1.12);
  const directions = {perspective:[1.25,.8,1.8], front:[0,0,1], side:[1,0,0], top:[0,1,.0001]};
  camera.position.fromArray(directions[view]).normalize().multiplyScalar(distance);
  controls.target.set(0,0,0); controls.update();
  document.querySelectorAll('[data-view]').forEach(b => {b.classList.toggle('active', b.dataset.view === view); b.setAttribute('aria-pressed', String(b.dataset.view === view));});
}
async function selectModel() {
  await libraryReady;
  const local = personalModels.get(location.hash.slice(1));
  if (local) return openFile(local.file, local);
  const model = models.find(m => m.id === location.hash.slice(1)) || models[0];
  selected = model; const version = ++loadVersion;
  rememberSelection(model.id);
  $('title').textContent = model.name;
  $('description').textContent = model.description;
  $('original').href = `./models/${model.id}.wrl`;
  $('original').textContent = 'Download .wrl';
  $('original').removeAttribute('download');
  $('original').setAttribute('download', '');
  document.title = `${model.name} · Field models`;
  highlightSelection(model.id);
  if (matchMedia('(max-width: 650px)').matches) {
    const active = nav.querySelector('.active');
    if (active) nav.scrollLeft = active.offsetLeft - nav.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2;
  }
  if (!renderer) return;
  $('loading').hidden = false; $('loading').classList.remove('error'); $('loading-text').textContent = 'Opening model…'; $('retry').hidden = true;
  try {
    if (!geometryCache.has(model.id)) geometryCache.set(model.id, geometryFrom(await fetchModel(model.id)));
    if (version !== loadVersion) return;
    const material = new THREE.MeshStandardMaterial({vertexColors:true, side:THREE.DoubleSide, roughness:.66, metalness:0, wireframe:$('wireframe').getAttribute('aria-pressed') === 'true'});
    const object = new THREE.Mesh(geometryCache.get(model.id), material);
    object.userData.radius = object.geometry.boundingSphere.radius;
    showObject(object);
    $('file-status').hidden = true;
    // Fetch the remaining compact geometry during idle time; subsequent clicks use memory.
    if (!prefetchStarted) {prefetchStarted = true; prefetch();}
  } catch (e) {
    if (version !== loadVersion) return;
    console.error(e); $('loading').classList.add('error'); $('loading-text').textContent = 'Unable to open this model.'; $('retry').hidden = false;
  }
}
let prefetchStarted = false;
async function prefetch() {
  for (const m of models) {
    await new Promise(resolve => (window.requestIdleCallback || (cb => setTimeout(cb, 50)))(resolve));
    try {await fetchModel(m.id);} catch {/* Retried when the model is selected. */}
  }
}

let uploadedURL;
function setWireframe(object, enabled) {
  object.traverse(node => {
    for (const material of Array.isArray(node.material) ? node.material : [node.material]) {
      if (material && 'wireframe' in material) material.wireframe = enabled;
    }
  });
}
function showObject(object) {
  if (current) {
    scene.remove(current);
    disposeModel(current, !current.userData.uploaded);
  }
  if (uploadedURL) { URL.revokeObjectURL(uploadedURL); uploadedURL = undefined; }
  current = object;
  setWireframe(current, $('wireframe').getAttribute('aria-pressed') === 'true');
  scene.add(current);
  grid.position.y = new THREE.Box3().setFromObject(current).min.y - .12;
  setView();
  $('loading').hidden = true;
}
function rememberSelection(id) {
  if (libraryAvailable) saveSelection(id).catch(() => {});
}
function highlightSelection(id) {
  for (const button of document.querySelectorAll('[data-model]')) {
    const active = button.dataset.model === id;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}
function fileStatus(message) {
  $('file-status').textContent = message;
  $('file-status').hidden = !message;
}
function renderPersonalModels() {
  const list = $('personal-model-list');
  list.replaceChildren();
  $('personal-models').hidden = !personalModels.size;
  $('storage-note').textContent = [...personalModels.values()].some(record => !record.saved)
    ? 'Some models are available this visit only.' : 'Saved only in this browser.';
  for (const record of personalModels.values()) {
    const row = document.createElement('div'); row.className = 'personal-model';
    const button = document.createElement('button');
    button.className = 'model-button'; button.dataset.model = record.id;
    button.textContent = record.file.name; button.title = record.file.name;
    button.addEventListener('click', () => {
      if (location.hash === `#${record.id}`) selectModel(); else location.hash = record.id;
    });
    const remove = document.createElement('button'); remove.className = 'remove-model';
    remove.textContent = '×'; remove.title = `Remove ${record.file.name}`;
    remove.setAttribute('aria-label', `Remove ${record.file.name}`);
    remove.addEventListener('click', async () => {
      remove.disabled = true;
      try {
        if (record.saved) await removeModel(record.id);
        personalModels.delete(record.id);
        renderPersonalModels();
        if (selected?.id === record.id || location.hash === `#${record.id}`) {
          history.replaceState(null, '', `#${models[0].id}`);
          selectModel();
        }
      } catch {
        fileStatus('Could not remove this saved model. Please try again.');
        remove.disabled = false;
      }
    });
    row.append(button, remove); list.append(row);
  }
  highlightSelection(selected?.id);
}
async function openFile(file, existing) {
  await libraryReady;
  if (!file || !renderer) return;
  const version = ++loadVersion;
  fileStatus('Opening file…');
  $('loading').hidden = true;
  let object;
  try {
    object = prepareModel(await readModel(file));
    if (version !== loadVersion) {disposeModel(object); return;}
    let record = existing;
    let saved = existing?.saved;
    if (!record) {
      // Content IDs avoid duplicates when the same file is opened again.
      const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
      const id = 'user-' + [...new Uint8Array(digest)].map(n => n.toString(16).padStart(2, '0')).join('');
      record = {id, file};
      try {
        await saveModel(record); saved = true; libraryAvailable = true;
      } catch {
        // An earlier saved copy still exists if updating a duplicate fails.
        saved = personalModels.get(id)?.saved || false;
      }
      record.saved = saved;
      personalModels.set(id, record);
      renderPersonalModels();
    }
    if (version !== loadVersion) {disposeModel(object); return;}
    showObject(object); object = null;
    selected = {id: record.id, name: file.name};
    $('title').textContent = file.name;
    document.title = `${file.name} · Field models`;
    $('description').textContent = `${saved ? 'Saved on this browser' : 'Available this visit only'} · ${file.name}`;
    uploadedURL = URL.createObjectURL(file);
    $('original').href = uploadedURL;
    $('original').download = file.name;
    $('original').textContent = 'Download original';
    highlightSelection(record.id);
    history.replaceState(null, '', `#${record.id}`);
    if (saved) rememberSelection(record.id);
    fileStatus(saved ? '' : 'Opened for this visit. Browser storage is unavailable or full, so this model could not be saved.');
  } catch (error) {
    if (object) disposeModel(object);
    if (version !== loadVersion) return;
    fileStatus(`Could not open file. ${error.message}`);
  }
}
$('open-model').addEventListener('click', () => $('model-file').click());
$('model-file').addEventListener('change', () => {
  openFile($('model-file').files[0]);
  $('model-file').value = '';
});
let dragDepth = 0;
const draggingFiles = event => [...event.dataTransfer.types].includes('Files');
window.addEventListener('dragenter', event => {
  if (!draggingFiles(event)) return;
  event.preventDefault(); dragDepth++; $('drop-hint').hidden = false;
});
window.addEventListener('dragover', event => {
  if (!draggingFiles(event)) return;
  event.preventDefault(); event.dataTransfer.dropEffect = 'copy';
});
window.addEventListener('dragleave', () => {
  dragDepth = Math.max(0, dragDepth - 1);
  if (!dragDepth) $('drop-hint').hidden = true;
});
window.addEventListener('drop', event => {
  if (!draggingFiles(event)) return;
  event.preventDefault(); dragDepth = 0; $('drop-hint').hidden = true;
  if (event.dataTransfer.files.length > 1) {
    $('file-status').hidden = false; $('file-status').textContent = 'Please open one model at a time.';
    return;
  }
  openFile(event.dataTransfer.files[0]);
});

try {
  const viewer = $('viewer');
  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setClearColor(0xffffff, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  viewer.append(renderer.domElement);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(38, 1, .01, 500);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor=.08; controls.autoRotateSpeed=.65; controls.minDistance=.7; controls.maxDistance=100;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8c9684, 2.4));
  const key = new THREE.DirectionalLight(0xfff9ed, 2.1); key.position.set(5,8,10); scene.add(key);
  const fill = new THREE.DirectionalLight(0xe3edff, 1.2); fill.position.set(-8,2,-5); scene.add(fill);
  grid = new THREE.GridHelper(20,20,0xb6c3a7,0xd7ddcf); grid.visible=false; scene.add(grid);
  new ResizeObserver(() => {const {width,height} = viewer.getBoundingClientRect(); camera.aspect=width/height; camera.updateProjectionMatrix(); renderer.setSize(width,height); if(current) setView(document.querySelector('[data-view].active')?.dataset.view);}).observe(viewer);
  renderer.setAnimationLoop(() => {controls.update(); renderer.render(scene,camera);});
} catch (e) {
  console.error(e); renderer = null; $('loading').classList.add('error'); $('loading-text').textContent='This browser could not start WebGL. Try enabling hardware acceleration.';
}
$('retry').addEventListener('click', selectModel);
$('reset').addEventListener('click', () => setView());
for (const b of document.querySelectorAll('[data-view]')) b.addEventListener('click', () => setView(b.dataset.view));
for (const id of ['rotate','wireframe','grid']) $(id).addEventListener('click', () => {
  const enabled = $(id).getAttribute('aria-pressed') !== 'true'; $(id).setAttribute('aria-pressed', String(enabled));
  if (id === 'rotate' && controls) controls.autoRotate = enabled;
  if (id === 'wireframe' && current) setWireframe(current, enabled);
  if (id === 'grid' && grid) grid.visible = enabled;
});
$('capture').addEventListener('click', () => {
  if (!renderer || !current) return;
  renderer.setClearColor(0xffffff,1); renderer.render(scene,camera);
  const a=document.createElement('a'); a.download=`${selected.id}.png`; a.href=renderer.domElement.toDataURL('image/png'); a.click(); renderer.setClearColor(0xffffff,0);
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    $('options').open = false;
    $('options').querySelector('summary').focus();
  }
});
window.addEventListener('hashchange', selectModel);
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
  if(e.key.toLowerCase()==='r') setView();
  if (e.key==='ArrowDown' || e.key==='ArrowUp') {
    e.preventDefault();
    const entries = [...models, ...personalModels.values()];
    const index = entries.findIndex(m => m.id === selected?.id);
    location.hash = entries[(index + (e.key==='ArrowDown' ? 1 : -1) + entries.length) % entries.length].id;
  }
});
libraryReady = (async () => {
  const initialHash = location.hash;
  try {
    const {records, selection} = await readLibrary();
    for (const record of records) personalModels.set(record.id, {...record, saved: true});
    renderPersonalModels();
    if (!initialHash && !location.hash && (personalModels.has(selection) || models.some(m => m.id === selection))) {
      history.replaceState(null, '', `#${selection}`);
    }
  } catch {
    libraryAvailable = false;
    fileStatus('Saved models are unavailable. You can still open files for this visit.');
  }
})();
selectModel();
