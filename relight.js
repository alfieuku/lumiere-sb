import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 2);
camera.lookAt(0, 2, 2);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
// Optional: Choose a shadow map type for better quality (e.g., PCFSoftShadowMap)
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Mouse look
let yaw = 0, pitch = 0;
renderer.domElement.addEventListener('click', () => renderer.domElement.requestPointerLock());
document.addEventListener('mousemove', e => {
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw   -= e.movementX * 0.002;
  pitch -= e.movementY * 0.002;
  pitch  = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
});

// WASD movement
const keys = {};
document.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
document.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

const speed = 0.1;
const direction = new THREE.Vector3();
const forward = new THREE.Vector3();
const right = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);

  direction.set(0, 0, 0);
  if (keys['w']) direction.z -= 1;
  if (keys['s']) direction.z += 1;
  if (keys['a']) direction.x -= 1;
  if (keys['d']) direction.x += 1;

  if (direction.lengthSq() > 0) {
    direction.normalize().multiplyScalar(speed);
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    camera.position.addScaledVector(forward, -direction.z);
    camera.position.addScaledVector(right, direction.x);
  }

  renderer.render(scene, camera);
}
animate();

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


scene.add(new THREE.AmbientLight(0xffffff, 0.2));

const land = new THREE.Mesh(
  new THREE.PlaneGeometry(500, 300),
  new THREE.MeshPhongMaterial({ color: 0xC2A16A })
);
land.rotation.x = -Math.PI/2;
land.position.z = 0.4;
scene.add(land);

const road = new THREE.Mesh(
  new THREE.PlaneGeometry(4, 200),
  new THREE.MeshPhongMaterial({ color: 0x333333 })
);
road.rotation.x = -Math.PI/2;
road.position.y = 0.5;
scene.add(road);

const testtexture = new THREE.TextureLoader().load('skytest.webp');
testtexture.colorSpace = THREE.SRGBColorSpace;
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 100),
  new THREE.MeshBasicMaterial({ map: testtexture }),
);
backdrop.position.set(0, 40, -100);
scene.add(backdrop);



// Sidewalks — runs the length of the road on each side
const sidewalkMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });

const leftSidewalk = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 200), sidewalkMaterial);
leftSidewalk.position.set(-3, 0.42, 0);
scene.add(leftSidewalk);

const rightSidewalk = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 200), sidewalkMaterial);
rightSidewalk.position.set(3, 0.42, 0);
scene.add(rightSidewalk);

const buildingTemplate = await new OBJLoader().loadAsync('B5.obj');

// Left side buildings (negative x = left of road)
const leftBuildings = [
  { x: -13.2, z:   0 },
  { x: -13.5, z:  -4 },
  { x: -13.7, z:  -8 },
  { x: -13.3, z: -12 },
  { x: -13.7, z: -16 },
  { x: -13.4, z: -20 },
  { x: -13.5, z: -24 },
  { x: -13.6, z: -28 },
  { x: -13.2, z: -32 },
  { x: -13.5, z: -36 },
  { x: -13.7, z: -40 },
  { x: -13.3, z: -44 },
  { x: -13.7, z: -48 },
  { x: -13.4, z: -52 },
  { x: -13.5, z: -56 },
  { x: -13.6, z: -60 },
];
for (const { x, z } of leftBuildings) {
  const b = buildingTemplate.clone();
  b.scale.setScalar(0.1);
  b.position.set(x, 0.1, z);
  b.rotation.y = Math.PI / 2;
  b.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
  scene.add(b);
}

// Right side buildings (positive x = right of road)
const rightBuildings = [
  { x: 13.7, z:  -4 },
  { x: 13.5, z:  -8 },
  { x: 13.4, z: -12 },
  { x: 13.6, z: -16 },
  { x: 13.2, z: -20 },
  { x: 13.5, z: -24 },
  { x: 13.4, z: -28 },
  { x: 13.7, z: -32 },
  { x: 13.7, z: -36 },
  { x: 13.5, z: -40 },
  { x: 13.4, z: -44 },
  { x: 13.6, z: -48 },
  { x: 13.2, z: -52 },
  { x: 13.5, z: -56 },
  { x: 13.4, z: -60 },
  { x: 13.7, z: -64 },
];
for (const { x, z } of rightBuildings) {
  const b = buildingTemplate.clone();
  b.scale.setScalar(0.1);
  b.position.set(x, 0.1, z);
  b.rotation.y = -Math.PI / 2;
  b.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
  scene.add(b);
}

const sun = new THREE.DirectionalLight(0xffffff, 0.5);
sun.position.set(2.3, 0.6, 5);
sun.castShadow = true;
scene.add(sun);

const loader = new OBJLoader();
const car = await loader.loadAsync('Car.obj');
car.scale.set(0.4, 0.4, 0.4);
car.position.set(0, 0.6, -5);
car.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
scene.add(car);

const human = await loader.loadAsync('human-model.obj');
human.scale.set(0.1, 0.1, 0.1);
human.position.set(0.7, 1.1, -5);
human.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
scene.add(human);

const lamps = [];
let dragging = null;
let moonMesh = null;
const ray = new THREE.Raycaster();
const mp = new THREE.Vector2();
const ground  = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const skyPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -120);
const hit = new THREE.Vector3();

renderer.domElement.addEventListener('mousedown', e => {
  if (document.pointerLockElement) return;
  mp.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mp, camera);
  if (moonMesh && ray.intersectObject(moonMesh).length) { dragging = moonMesh; return; }
  const hits = ray.intersectObjects(lamps, true);
  if (hits.length) { let o = hits[0].object; while (!lamps.includes(o)) o = o.parent; dragging = o; }
});
window.addEventListener('mousemove', e => {
  if (!dragging) return;
  mp.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mp, camera);
  const plane = dragging === moonMesh ? skyPlane : ground;
  ray.ray.intersectPlane(plane, hit);
  if (dragging === moonMesh) dragging.position.set(hit.x, 120, hit.z);
  else dragging.position.set(hit.x, 0, hit.z);
});
window.addEventListener('mouseup', () => dragging = null);

const lampBtn = document.createElement('button');
lampBtn.textContent = 'Add Lamp';
Object.assign(lampBtn.style, { position:'fixed', bottom:'20px', left:'20px',  color:'#fff', border:'1px solid #555', borderRadius:'4px', cursor:'pointer', zIndex:'10' });
lampBtn.addEventListener('click', () => {
  const g = new THREE.Group();

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 2, 8), new THREE.MeshBasicMaterial({ color: 0x666666 }));
  pole.position.y = 1;
  g.add(pole);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xfffacc }));
  bulb.position.y = 2;
  g.add(bulb);

  const spot = new THREE.SpotLight(0xfffacc, 5, 30, Math.PI / 2, 0.3);
  spot.position.y = 2.2;
  spot.target.position.set(0, 0, 0);
  g.add(spot);
  g.add(spot.target);

  g.position.set(3, 0, -10);
  lamps.push(g);
  scene.add(g);
});
document.body.appendChild(lampBtn);

const moonBtn = document.createElement('button');
moonBtn.textContent = 'Add Moon';
Object.assign(moonBtn.style, { position:'fixed', bottom:'20px', left:'110px', color:'#fff', border:'1px solid #555', borderRadius:'4px', cursor:'pointer', zIndex:'10' });
moonBtn.addEventListener('click', () => {
  scene.add(new THREE.HemisphereLight(0x8899cc, 0x223344, 0.6));

  moonMesh = new THREE.Mesh(new THREE.SphereGeometry(80), new THREE.MeshBasicMaterial({ color: 0xeeeeff }));
  moonMesh.position.set(-80, 120, -200);
  scene.add(moonMesh);
});
document.body.appendChild(moonBtn);

