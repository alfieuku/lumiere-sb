import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 2, 2);
camera.lookAt(0, 2, 2);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(innerWidth, innerHeight);
(document.getElementById('canvas-container') || document.body).appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Camera look
let yaw = 0, pitch = 0;
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw -= e.movementX * 0.002;
  pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch - e.movementY * 0.002));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
});

// 
const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

// 
const _fwd = new THREE.Vector3(), _rgt = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);

function animate() {
  requestAnimationFrame(animate);
  if (document.pointerLockElement === renderer.domElement) {
    const dx = (keys['d'] ? 1 : 0) - (keys['a'] ? 1 : 0);
    const dz = (keys['s'] ? 1 : 0) - (keys['w'] ? 1 : 0);
    if (dx || dz) {
      camera.getWorldDirection(_fwd); _fwd.y = 0; _fwd.normalize();
      _rgt.crossVectors(_fwd, UP).normalize();
      camera.position.addScaledVector(_fwd, -dz * 0.1);
      camera.position.addScaledVector(_rgt, dx * 0.1);
    }
  }
  renderer.render(scene, camera);
}
animate();

// ─
const ambient = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 0.0);
sun.position.set(2.3, 10, 5);
sun.castShadow = false;
scene.add(sun);

const land = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 300),
  new THREE.MeshPhongMaterial({ color: 0xC2A16A })
);
land.rotation.x = -Math.PI / 2;
land.position.z = 0.4;
scene.add(land);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 200),
  new THREE.MeshPhongMaterial({ color: 0x333333 })
);
road.rotation.x = -Math.PI / 2;
road.position.y = 0.5;
road.receiveShadow = true;
scene.add(road);

const dashMat = new THREE.MeshPhongMaterial({ color: 0xffe066 });
for (let z = -100; z <= 100; z += 8) {
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 2.5), dashMat);
  dash.rotation.x = -Math.PI / 2;
  dash.position.set(0, 0.505, z);
  scene.add(dash);
}

const skyTex = new THREE.TextureLoader().load('images/skytest.webp');
skyTex.colorSpace = THREE.SRGBColorSpace;
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 100),
  new THREE.MeshBasicMaterial({ map: skyTex })
);
backdrop.position.set(0, 40, -100);
scene.add(backdrop);

//depth
function createPuddle(x, z, scaleX, scaleZ, depth) {
  const color = new THREE.Color(
    0.18 - depth * 0.12,
    0.26 - depth * 0.14,
    0.45 - depth * 0.10
  );
  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.68 + depth * 0.22,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  // road is at y=0.5
  const onRoad = Math.abs(x) < 2;
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(scaleX, 1, scaleZ);
  mesh.position.set(x, onRoad ? 0.51 : 0.50, z);
  scene.add(mesh);
}

// 2 on road, 3 on sidewalks 
createPuddle( -1,  0,  0.8, 0.05, 0.8);  // road,           circle
createPuddle(-0.4, -35,  2.0, 0.7, 0.5);  // road,           wide ellipse
createPuddle(-3.8,  -42,  1.1, 0.8, 0.3);  // left sidewalk,  just off road edge
createPuddle(-4.2, -53,  1.3, 1.0, 0.6);  // left sidewalk,  medium down
createPuddle( 3.8, -20,  1.0, 0.8, 0.4);  // right sidewalk, medium close

const swMat = new THREE.MeshPhongMaterial({ color: 0x999999 });
const leftSW = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 200), swMat);
leftSW.position.set(-3, 0.42, 0);
scene.add(leftSW);
const rightSW = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 200), swMat);
rightSW.position.set(3, 0.42, 0);
scene.add(rightSW);

// Buildings
const buildingTemplate = await new OBJLoader().loadAsync('models/B5.obj');

function placeBuildings(positions, rotY) {
  for (const { x, z } of positions) {
    const b = buildingTemplate.clone();
    b.scale.setScalar(0.1);
    b.position.set(x, 0.1, z);
    b.rotation.y = rotY;
    b.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(b);
  }
}

placeBuildings([
  { x: -13.2, z:   0 }, { x: -13.5, z:  -4 }, { x: -13.7, z:  -8 }, { x: -13.3, z: -12 },
  { x: -13.7, z: -16 }, { x: -13.4, z: -20 }, { x: -13.5, z: -24 }, { x: -13.6, z: -28 },
  { x: -13.2, z: -32 }, { x: -13.5, z: -36 }, { x: -13.7, z: -40 }, { x: -13.3, z: -44 },
  { x: -13.7, z: -48 }, { x: -13.4, z: -52 }, { x: -13.5, z: -56 }, { x: -13.6, z: -60 },
], Math.PI / 2);

placeBuildings([
  { x: 13.7, z:  -4 }, { x: 13.5, z:  -8 }, { x: 13.4, z: -12 }, { x: 13.6, z: -16 },
  { x: 13.2, z: -20 }, { x: 13.5, z: -24 }, { x: 13.4, z: -28 }, { x: 13.7, z: -32 },
  { x: 13.7, z: -36 }, { x: 13.5, z: -40 }, { x: 13.4, z: -44 }, { x: 13.6, z: -48 },
  { x: 13.2, z: -52 }, { x: 13.5, z: -56 }, { x: 13.4, z: -60 }, { x: 13.7, z: -64 },
], -Math.PI / 2);

// ─Model
function addHeadlights(group) {
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  const bulbGeom = new THREE.SphereGeometry(0.1, 8, 8);
  for (const side of [-0.6, 0.6]) {
    const bulb = new THREE.Mesh(bulbGeom, bulbMat);
    bulb.position.set(side, 0.2, -1.8);
    group.add(bulb);
    const spot = new THREE.SpotLight(0xffffee, 10, 20, Math.PI / 6, 0.5, 1);
    spot.position.set(side, 0.2, -1.9);
    const target = new THREE.Object3D();
    target.position.set(side, 0.2, -10);
    group.add(target);
    spot.target = target;
    spot.castShadow = true;
    group.add(spot);
  }
}

function createBike() {
  const g = new THREE.Group();
  const metal  = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.2 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const frame  = new THREE.MeshStandardMaterial({ color: 0x27ae60, metalness: 0.5, roughness: 0.3 });

  const wheelGeom = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
  for (const z of [0.7, -0.7]) {
    const w = new THREE.Mesh(wheelGeom, rubber);
    w.position.set(0, 0.35, z);
    w.rotation.y = Math.PI / 2;
    w.castShadow = true;
    g.add(w);
  }

  const parts = [
    [new THREE.CylinderGeometry(0.02, 0.02, 0.8),   frame,  [0, 0.35, -0.35], [Math.PI / 2,   0, 0]],
    [new THREE.CylinderGeometry(0.02, 0.02, 0.8),   frame,  [0, 0.55, -0.35], [-Math.PI / 6,  0, 0]],
    [new THREE.CylinderGeometry(0.02, 0.02, 0.8),   frame,  [0, 0.5,   0.25], [Math.PI / 4,   0, 0]],
    [new THREE.CylinderGeometry(0.02, 0.02, 0.6),   frame,  [0, 0.55,  -0.1], [-Math.PI / 12, 0, 0]],
    [new THREE.CylinderGeometry(0.02, 0.02, 0.75),  frame,  [0, 0.75,  0.25], [Math.PI / 2,   0, 0]],
    [new THREE.CylinderGeometry(0.015, 0.015, 0.6), metal,  [0, 0.85,  0.6],  [0, 0, Math.PI / 2]],
    [new THREE.CylinderGeometry(0.02, 0.02, 0.3),   metal,  [0, 0.7,   0.6],  [-Math.PI / 12, 0, 0]],
    [new THREE.BoxGeometry(0.15, 0.04, 0.25),       rubber, [0, 0.82, -0.15], [0, 0, 0]],
  ];
  for (const [geom, mat, [px, py, pz], [rx, ry, rz]] of parts) {
    const m = new THREE.Mesh(geom, mat);
    m.position.set(px, py, pz);
    m.rotation.set(rx, ry, rz);
    m.castShadow = true;
    g.add(m);
  }
  return g;
}

// Model templates
const loader = new OBJLoader();

const carTemplate = await loader.loadAsync('models/Car.obj');
carTemplate.scale.set(0.4, 0.4, 0.4);
carTemplate.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

const humanTemplate = await loader.loadAsync('models/human-model.obj');
humanTemplate.scale.set(0.1, 0.1, 0.1);
humanTemplate.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

// Interactives
const interactives = [];
const LIGHT_TYPES = new Set(['moon', 'sun', 'lamppost', 'neon', 'tungsten', 'hmi', 'window']);

function addToScene(obj) {
  scene.add(obj);
  interactives.push(obj);
  return obj;
}

const car = addToScene(carTemplate.clone());
car.position.set(0, 0.6, -5);
car.userData = { groundOffset: 0.6, type: 'car' };
addHeadlights(car);

const human = addToScene(humanTemplate.clone());
human.position.set(0.7, 1.1, -5);
human.userData = { groundOffset: 1.1, type: 'person' };

// ─Light panel
const lightPanel    = document.getElementById('light-panel');
const colorInput    = document.getElementById('light-color-input');
const intensitySlider = document.getElementById('light-intensity-input');
const intensityVal  = document.getElementById('light-intensity-val');

function getSceneLight(obj) {
  let light = null;
  obj.traverse(c => {
    if (!light && (c.isDirectionalLight || c.isPointLight || c.isSpotLight)) light = c;
  });
  return light;
}

function showLightPanel(obj) {
  const light = getSceneLight(obj);
  if (!light) return;
  const refRect = document.querySelector('.reference-panel').getBoundingClientRect();
  lightPanel.style.top = (refRect.bottom + 12) + 'px';
  colorInput.value = '#' + light.color.getHexString();
  intensitySlider.value = light.intensity;
  intensityVal.textContent = light.intensity.toFixed(1);
  lightPanel.classList.add('visible');
}

function hideLightPanel() {
  lightPanel.classList.remove('visible');
}

colorInput.addEventListener('input', () => {
  if (!selected || !LIGHT_TYPES.has(selected.userData.type)) return;
  const color = new THREE.Color(colorInput.value);
  const light = getSceneLight(selected);
  if (light) light.color.set(color);
  // update any emissive-looking meshes (MeshBasicMaterial = glow/bulb visuals)
  selected.traverse(c => {
    if (c.isMesh && c.material?.isMeshBasicMaterial) c.material.color.set(color);
  });
});

intensitySlider.addEventListener('input', () => {
  if (!selected) return;
  const val = parseFloat(intensitySlider.value);
  intensityVal.textContent = val.toFixed(1);
  const light = getSceneLight(selected);
  if (light) light.intensity = val;
});

// prevent panel interactions from propagating to the canvas
lightPanel.addEventListener('mousedown', e => e.stopPropagation());

// Drag select
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const hitPoint = new THREE.Vector3();

let dragging = null;
let selected = null;

function toNDC(e) {
  return mouse.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}

function pickInteractive(e) {
  raycaster.setFromCamera(toNDC(e), camera);
  const hits = raycaster.intersectObjects(interactives, true);
  if (!hits.length) return null;
  let o = hits[0].object;
  while (o && !interactives.includes(o)) o = o.parent;
  return o || null;
}

renderer.domElement.addEventListener('mousedown', e => {
  if (document.pointerLockElement) return;
  const obj = pickInteractive(e);
  if (obj) {
    dragging = selected = obj;
    if (LIGHT_TYPES.has(obj.userData.type)) showLightPanel(obj);
    else hideLightPanel();
  } else {
    selected = null;
    hideLightPanel();
    renderer.domElement.requestPointerLock();
  }
});

window.addEventListener('mousemove', e => {
  if (!dragging) return;

  // Q for vertical movement
  if (keys['q']) {
    dragging.position.y -= e.movementY * 0.05;
    return;
  }

  // Intersect
  raycaster.setFromCamera(toNDC(e), camera);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -dragging.position.y);
  if (!raycaster.ray.intersectPlane(plane, hitPoint)) return;

  if (keys['shift']) {
    // Shift: aim spotlight target or rotate object
    let spot = null;
    dragging.traverse(c => { if (c.isSpotLight) spot = c; });
    if (spot?.target) {
      const local = hitPoint.clone();
      dragging.worldToLocal(local);
      spot.target.position.copy(local);
    } else {
      dragging.rotation.y = Math.atan2(
        hitPoint.x - dragging.position.x,
        hitPoint.z - dragging.position.z
      );
    }
  } else {
    // Normal drag
    dragging.position.set(hitPoint.x, dragging.position.y, hitPoint.z);
  }
});

window.addEventListener('mouseup', () => { dragging = null; });

document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'x' && selected) {
    scene.remove(selected);
    interactives.splice(interactives.indexOf(selected), 1);
    if (LIGHT_TYPES.has(selected.userData.type)) hideLightPanel();
    selected = null;
  }
});

// Library spawn
document.getElementById('btn-spawn-person').addEventListener('click', () => {
  const p = humanTemplate.clone();
  p.position.set((Math.random() - 0.5) * 4, 1.1, -8);
  p.userData = { groundOffset: 1.1, type: 'person' };
  addToScene(p);
});

document.getElementById('btn-spawn-group').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { groundOffset: 1.1, type: 'group' };
  const p1 = humanTemplate.clone(); p1.position.set(-0.4, 0, 0); g.add(p1);
  const p2 = humanTemplate.clone(); p2.position.set( 0.4, 0, 0); g.add(p2);
  g.position.set((Math.random() - 0.5) * 4, 1.1, -8);
  addToScene(g);
});

document.getElementById('btn-spawn-car').addEventListener('click', () => {
  const c = carTemplate.clone();
  c.position.set((Math.random() - 0.5) * 4, 0.6, -10);
  c.userData = { groundOffset: 0.6, type: 'car' };
  addHeadlights(c);
  addToScene(c);
});

document.getElementById('btn-spawn-sportcar').addEventListener('click', () => {
  const c = carTemplate.clone();
  c.scale.set(0.48, 0.28, 0.48);
  c.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.1, metalness: 0.7 });
      child.castShadow = true; child.receiveShadow = true;
    }
  });
  c.position.set((Math.random() - 0.5) * 4, 0.42, -10);
  c.userData = { groundOffset: 0.42, type: 'sportcar' };
  addHeadlights(c);
  addToScene(c);
});

document.getElementById('btn-spawn-bike').addEventListener('click', () => {
  const b = createBike();
  b.position.set((Math.random() - 0.5) * 4, 0, -8);
  b.userData = { groundOffset: 0, type: 'bike' };
  addToScene(b);
});

//  Spawn lights
document.getElementById('btn-light-moon').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'moon', sky: true };
  const l = new THREE.DirectionalLight(0xddeeff, 0.4);
  l.castShadow = true;
  g.add(l);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({ color: 0xeeeeff })));
  g.position.set(-20, 120, -50);
  addToScene(g);
});

document.getElementById('btn-light-sun').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'sun', sky: true };
  const l = new THREE.DirectionalLight(0xfffaed, 0.8);
  l.castShadow = true;
  g.add(l);
  g.add(new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xfff0c4 })));
  g.position.set(20, 120, -40);
  addToScene(g);
});

document.getElementById('btn-light-lamppost').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'lamppost', groundOffset: 0 };
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  pole.position.y = 1.5;
  g.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xfffacc }));
  bulb.position.y = 3;
  g.add(bulb);
  const l = new THREE.SpotLight(0xfffacc, 8, 20, Math.PI / 4, 0.5, 1);
  l.position.y = 2.9;
  const t = new THREE.Object3D();
  g.add(t);
  l.target = t;
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 0, -8);
  addToScene(g);
});

document.getElementById('btn-light-neon').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'neon', groundOffset: 2.5 };
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.4), new THREE.MeshBasicMaterial({ color: 0xff007f })));
  const l = new THREE.PointLight(0xff007f, 15, 15, 1.5);
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 2.5, -8);
  addToScene(g);
});

document.getElementById('btn-light-tungsten').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'tungsten', groundOffset: 1.5 };
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xffa500 })));
  const l = new THREE.PointLight(0xffa500, 10, 15, 1);
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 1.5, -8);
  addToScene(g);
});

document.getElementById('btn-light-hmi').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'hmi', groundOffset: 2.0 };
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x555555 })));
  const l = new THREE.SpotLight(0x7dd3fc, 12, 30, Math.PI / 6, 0.4, 1);
  const t = new THREE.Object3D();
  t.position.set(0, 0, -5);
  g.add(t);
  l.target = t;
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 2.0, -8);
  addToScene(g);
});

document.getElementById('btn-light-window').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData = { type: 'window', groundOffset: 3.0 };
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xffd700 })));
  const l = new THREE.SpotLight(0xffd700, 8, 15, Math.PI / 3, 0.5, 1);
  const t = new THREE.Object3D();
  t.position.set(-2, -3, 0);
  g.add(t);
  l.target = t;
  l.castShadow = true;
  g.add(l);
  g.position.set(-6, 3.0, -8);
  addToScene(g);
});

// Toggle modes
let currentMode = 'flat';

function updateMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
  if (mode === 'flat')  { ambient.intensity = 1.0; sun.intensity = 0.0; sun.castShadow = false; }
  if (mode === 'day')   { ambient.intensity = 0.3; sun.intensity = 1.2; sun.castShadow = true;  }
  if (mode === 'night') { ambient.intensity = 0.05; sun.intensity = 0.0; sun.castShadow = false; }
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => updateMode(btn.dataset.mode));
});
updateMode('flat');

// Modal score
const scoreModal   = document.getElementById('score-modal');
const modalTitle   = document.getElementById('modal-title');
const scoreCircle  = document.getElementById('modal-score-circle');
const feedbackText = document.getElementById('modal-feedback-text');
const closeBtn     = document.getElementById('modal-close-btn');

document.getElementById('btn-check-score').addEventListener('click', () => {
  modalTitle.textContent = 'Checking Lighting...';
  scoreCircle.textContent = '--';
  scoreCircle.style.borderColor = '#475569';
  feedbackText.textContent = 'Analyzing your scene composition and light source distribution relative to the target image...';
  scoreModal.classList.add('show');

  setTimeout(() => {
    let score = 10;
    const critiques = [];

    if (currentMode === 'night') score += 30;
    else critiques.push('the scene is not in night mode but the target is a night scene');

    let hasNeon = false, neonCorrect = false;
    let hasLamp = false, lampCorrect = false;
    let hasCar  = false, carCorrect  = false;
    let hasPerson = false, personCorrect = false;

    for (const obj of interactives) {
      const { type } = obj.userData;
      const { x, z } = obj.position;
      if (type === 'neon')                          { hasNeon = true;   if (x > 1.5 && z < 0 && z > -35) neonCorrect = true; }
      if (type === 'lamppost')                      { hasLamp = true;   if (x < -1  && z < 0 && z > -35) lampCorrect = true; }
      if (type === 'car'    || type === 'sportcar') { hasCar = true;    if (x > -3  && x < 3)            carCorrect  = true; }
      if (type === 'person' || type === 'group')    { hasPerson = true; if (z < 0   && z > -25)          personCorrect = true; }
    }

    if (hasNeon)   { score += 15; if (neonCorrect)   score += 10; else critiques.push('neon light is placed but should be on the right side on building wall'); }
    else critiques.push('no neon light detected on the right building facade');

    if (hasLamp)   { score += 15; if (lampCorrect)   score += 10; else critiques.push('lamp post is placed but should be on the left sidewalk'); }
    else critiques.push('no lampposts detected to light up the left sidewalk');

    if (hasCar)    { score += 5;  if (carCorrect)    score += 5; }
    else critiques.push('adding a car on the road with headlights will help match the target composition');

    if (hasPerson) { score += 5;  if (personCorrect) score += 5; }
    else critiques.push('try spawning some people to stand on the sidewalk or cross the street');

    score = Math.min(score, 100);
    scoreCircle.textContent = `${score}%`;

    if (score >= 80) {
      modalTitle.textContent = 'Lighting Match Achieved!';
      scoreCircle.style.borderColor = '#10b981';
      feedbackText.textContent = `success! your lighting composition matches the target reference image beautifully with a score of ${score}%! you win!`;
      closeBtn.textContent = 'Play Again';
    } else {
      modalTitle.textContent = 'Lighting Analysis';
      scoreCircle.style.borderColor = '#ef4444';
      feedbackText.innerText = `score: ${score}%. keep adjusting! critiques:\n` +
        (critiques.length ? critiques.map(c => `- ${c}`).join('\n') : 'adjust light positions or angles to align better with the reference composition');
      closeBtn.textContent = 'Keep Adjusting';
    }
  }, 1000);
});

closeBtn.addEventListener('click', () => {
  scoreModal.classList.remove('show');
  if (closeBtn.textContent === 'Play Again') {
    const toRemove = interactives.filter(o => o.userData.type !== 'car' && o.userData.type !== 'person');
    for (const obj of toRemove) {
      scene.remove(obj);
      interactives.splice(interactives.indexOf(obj), 1);
    }
    for (const obj of interactives) {
      if (obj.userData.type === 'car')    obj.position.set(0, 0.6, -5);
      if (obj.userData.type === 'person') obj.position.set(0.7, 1.1, -5);
    }
    hideLightPanel();
    updateMode('flat');
  }
});
