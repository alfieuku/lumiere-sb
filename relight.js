import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

let puddleMaterial = null;

// scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

// camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 2);
camera.lookAt(0, 2, 2);

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.setSize(window.innerWidth, window.innerHeight);
const container = document.getElementById('canvas-container') || document.body;
container.appendChild(renderer.domElement);

// mouse look
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

// keyboard controls
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

  if (puddleMaterial) {
    puddleMaterial.uniforms.time.value += 0.016;
  }

  renderer.render(scene, camera);
}
animate();

// window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});


const ambient = new THREE.AmbientLight(0xffffff, 1.0); // start flatlit
scene.add(ambient);

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
road.receiveShadow = true;
scene.add(road);

// road markings
const laneMat = new THREE.MeshPhongMaterial({ color: 0xffe066, roughness: 0.9 });
for (let z = -100; z <= 100; z += 8) {
  const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 2.5), laneMat);
  dash.rotation.x = -Math.PI/2;
  dash.position.set(0, 0.505, z);
  scene.add(dash);
}

const testtexture = new THREE.TextureLoader().load('images/skytest.webp');
testtexture.colorSpace = THREE.SRGBColorSpace;
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 100),
  new THREE.MeshBasicMaterial({ map: testtexture }),
);
backdrop.position.set(0, 40, -100);
scene.add(backdrop);

// custom reflective puddle shader
puddleMaterial = new THREE.ShaderMaterial({
  uniforms: {
    skyTexture: { value: testtexture },
    time: { value: 0.0 }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform sampler2D skyTexture;
    uniform float time;
    varying vec3 vWorldPosition;
    varying vec3 vNormal;
    void main() {
      vec3 I = normalize(vWorldPosition - cameraPosition);
      vec3 normal = normalize(vNormal);
      normal.x += sin(vWorldPosition.x * 8.0 + time * 3.0) * 0.02;
      normal.z += cos(vWorldPosition.z * 8.0 + time * 2.5) * 0.02;
      normal = normalize(normal);
      vec3 R = reflect(I, normal);
      float t = (-100.0 - vWorldPosition.z) / R.z;
      vec3 refl = vec3(0.01, 0.02, 0.04);
      if (t > 0.0 && R.z < 0.0) {
        vec3 hit = vWorldPosition + t * R;
        float u = (hit.x + 100.0) / 200.0;
        float v = (hit.y + 10.0) / 100.0;
        if (u >= 0.0 && u <= 1.0 && v >= 0.0 && v <= 1.0) {
          refl = texture2D(skyTexture, vec2(u, v)).rgb;
        }
      }
      float cosTheta = max(dot(-I, normal), 0.0);
      float fresnel = 0.02 + 0.98 * pow(1.0 - cosTheta, 5.0);
      vec3 water = vec3(0.01, 0.015, 0.02);
      gl_FragColor = vec4(mix(water, refl, fresnel), 0.9);
    }
  `,
  transparent: true
});

const puddle = new THREE.Mesh(
  new THREE.CircleGeometry(1.2, 32),
  puddleMaterial
);
puddle.rotation.x = -Math.PI / 2;
puddle.position.set(0.5, 0.51, -6);
scene.add(puddle);



// sidewalks
const sidewalkMaterial = new THREE.MeshPhongMaterial({ color: 0x999999 });

const leftSidewalk = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 200), sidewalkMaterial);
leftSidewalk.position.set(-3, 0.42, 0);
scene.add(leftSidewalk);

const rightSidewalk = new THREE.Mesh(new THREE.BoxGeometry(12, 0.15, 200), sidewalkMaterial);
rightSidewalk.position.set(3, 0.42, 0);
scene.add(rightSidewalk);

const buildingTemplate = await new OBJLoader().loadAsync('models/B5.obj');

// left buildings
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

// right buildings
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

const sun = new THREE.DirectionalLight(0xffffff, 0.0); // start sun off
sun.position.set(2.3, 10, 5);
sun.castShadow = false;
scene.add(sun);

// add headlights to car
function addHeadlights(carGroup) {
  const bulbGeom = new THREE.SphereGeometry(0.1, 8, 8);
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
  
  const leftHeadlight = new THREE.Mesh(bulbGeom, bulbMat);
  leftHeadlight.position.set(-0.6, 0.2, -1.8);
  carGroup.add(leftHeadlight);
  
  const rightHeadlight = new THREE.Mesh(bulbGeom, bulbMat);
  rightHeadlight.position.set(0.6, 0.2, -1.8);
  carGroup.add(rightHeadlight);
  
  const leftSpot = new THREE.SpotLight(0xffffee, 10, 20, Math.PI / 6, 0.5, 1);
  leftSpot.position.set(-0.6, 0.2, -1.9);
  const leftTarget = new THREE.Object3D();
  leftTarget.position.set(-0.6, 0.2, -10);
  carGroup.add(leftTarget);
  leftSpot.target = leftTarget;
  leftSpot.castShadow = true;
  carGroup.add(leftSpot);
  
  const rightSpot = new THREE.SpotLight(0xffffee, 10, 20, Math.PI / 6, 0.5, 1);
  rightSpot.position.set(0.6, 0.2, -1.9);
  const rightTarget = new THREE.Object3D();
  rightTarget.position.set(0.6, 0.2, -10);
  carGroup.add(rightTarget);
  rightSpot.target = rightTarget;
  rightSpot.castShadow = true;
  carGroup.add(rightSpot);
}

// create bicycle using primitives
function createBike() {
  const group = new THREE.Group();
  
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.8, roughness: 0.2 });
  const rubberMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x27ae60, metalness: 0.5, roughness: 0.3 });
  
  const wheelGeom = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
  const frontWheel = new THREE.Mesh(wheelGeom, rubberMat);
  frontWheel.position.set(0, 0.35, 0.7);
  frontWheel.rotation.y = Math.PI / 2;
  frontWheel.castShadow = true;
  frontWheel.receiveShadow = true;
  group.add(frontWheel);

  const backWheel = new THREE.Mesh(wheelGeom, rubberMat);
  backWheel.position.set(0, 0.35, -0.7);
  backWheel.rotation.y = Math.PI / 2;
  backWheel.castShadow = true;
  backWheel.receiveShadow = true;
  group.add(backWheel);

  const frameGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
  
  const chainStay = new THREE.Mesh(frameGeom, frameMat);
  chainStay.position.set(0, 0.35, -0.35);
  chainStay.rotation.x = Math.PI / 2;
  chainStay.castShadow = true;
  group.add(chainStay);

  const seatStay = new THREE.Mesh(frameGeom, frameMat);
  seatStay.position.set(0, 0.55, -0.35);
  seatStay.rotation.x = -Math.PI / 6;
  seatStay.castShadow = true;
  group.add(seatStay);

  const downTube = new THREE.Mesh(frameGeom, frameMat);
  downTube.position.set(0, 0.5, 0.25);
  downTube.rotation.x = Math.PI / 4;
  downTube.castShadow = true;
  group.add(downTube);

  const seatTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6), frameMat);
  seatTube.position.set(0, 0.55, -0.1);
  seatTube.rotation.x = -Math.PI / 12;
  seatTube.castShadow = true;
  group.add(seatTube);

  const topTube = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.75), frameMat);
  topTube.position.set(0, 0.75, 0.25);
  topTube.rotation.x = Math.PI / 2;
  topTube.castShadow = true;
  group.add(topTube);

  const handlebarGeom = new THREE.CylinderGeometry(0.015, 0.015, 0.6);
  const bars = new THREE.Mesh(handlebarGeom, metalMat);
  bars.position.set(0, 0.85, 0.6);
  bars.rotation.z = Math.PI / 2;
  bars.castShadow = true;
  group.add(bars);

  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3), metalMat);
  stem.position.set(0, 0.7, 0.6);
  stem.rotation.x = -Math.PI / 12;
  stem.castShadow = true;
  group.add(stem);

  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, 0.25), rubberMat);
  seat.position.set(0, 0.82, -0.15);
  seat.castShadow = true;
  group.add(seat);

  return group;
}

const loader = new OBJLoader();
const interactives = [];

const car = await loader.loadAsync('models/Car.obj');
car.scale.set(0.4, 0.4, 0.4);
car.position.set(0, 0.6, -5);
car.userData.groundOffset = 0.6;
car.userData.type = 'car';
car.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
addHeadlights(car);
scene.add(car);
interactives.push(car);

const human = await loader.loadAsync('models/human-model.obj');
human.scale.set(0.1, 0.1, 0.1);
human.position.set(0.7, 1.1, -5);
human.userData.groundOffset = 1.1;
human.userData.type = 'person';
human.traverse(child => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
scene.add(human);
interactives.push(human);

let dragging = null;
let selectedObject = null;
const ray = new THREE.Raycaster();
const mp = new THREE.Vector2();
const ground  = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const skyPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -120);
const hit = new THREE.Vector3();

renderer.domElement.addEventListener('mousedown', e => {
  if (document.pointerLockElement) return;
  mp.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mp, camera);
  const hits = ray.intersectObjects(interactives, true);
  if (hits.length) {
    let o = hits[0].object;
    while (o && !interactives.includes(o)) o = o.parent;
    if (o) {
      dragging = o;
      selectedObject = o;
    }
  } else {
    selectedObject = null;
  }
});

window.addEventListener('mousemove', e => {
  if (!dragging) return;
  mp.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(mp, camera);
  const plane = dragging.userData.sky ? skyPlane : ground;
  ray.ray.intersectPlane(plane, hit);
  
  if (keys['shift']) {
    let spot = null;
    dragging.traverse(child => {
      if (child.isSpotLight) spot = child;
    });
    if (spot && spot.target) {
      const localHit = hit.clone();
      dragging.worldToLocal(localHit);
      spot.target.position.copy(localHit);
    } else {
      const dx = hit.x - dragging.position.x;
      const dz = hit.z - dragging.position.z;
      dragging.rotation.y = Math.atan2(dx, dz);
    }
  } else {
    if (dragging.userData.sky) {
      dragging.position.set(hit.x, 120, hit.z);
    } else {
      dragging.position.set(hit.x, dragging.userData.groundOffset || 0, hit.z);
    }
  }
});

window.addEventListener('mouseup', () => dragging = null);

// delete selected object
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'x' && selectedObject) {
    scene.remove(selectedObject);
    const index = interactives.indexOf(selectedObject);
    if (index > -1) interactives.splice(index, 1);
    selectedObject = null;
  }
});

// handle spawning click events
document.getElementById('btn-spawn-person').addEventListener('click', () => {
  const p = human.clone();
  p.position.set((Math.random() - 0.5) * 4, 1.1, -8);
  p.userData.groundOffset = 1.1;
  p.userData.type = 'person';
  scene.add(p);
  interactives.push(p);
});

document.getElementById('btn-spawn-group').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.groundOffset = 1.1;
  g.userData.type = 'group';
  
  const p1 = human.clone();
  p1.position.set(-0.4, 0, 0);
  g.add(p1);
  
  const p2 = human.clone();
  p2.position.set(0.4, 0, 0);
  g.add(p2);
  
  g.position.set((Math.random() - 0.5) * 4, 1.1, -8);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-spawn-car').addEventListener('click', () => {
  const c = car.clone();
  c.position.set((Math.random() - 0.5) * 4, 0.6, -10);
  c.userData.groundOffset = 0.6;
  c.userData.type = 'car';
  addHeadlights(c);
  scene.add(c);
  interactives.push(c);
});

document.getElementById('btn-spawn-sportcar').addEventListener('click', () => {
  const c = car.clone();
  c.scale.set(0.48, 0.28, 0.48);
  c.traverse(child => {
    if (child.isMesh) {
      child.material = new THREE.MeshStandardMaterial({ color: 0xff3300, roughness: 0.1, metalness: 0.7 });
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  c.position.set((Math.random() - 0.5) * 4, 0.42, -10);
  c.userData.groundOffset = 0.42;
  c.userData.type = 'sportcar';
  addHeadlights(c);
  scene.add(c);
  interactives.push(c);
});

document.getElementById('btn-spawn-bike').addEventListener('click', () => {
  const b = createBike();
  b.position.set((Math.random() - 0.5) * 4, 0, -8);
  b.userData.groundOffset = 0;
  b.userData.type = 'bike';
  scene.add(b);
  interactives.push(b);
});

document.getElementById('btn-light-moon').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'moon';
  g.userData.sky = true;
  const l = new THREE.DirectionalLight(0xddeeff, 0.4);
  l.castShadow = true;
  g.add(l);
  const m = new THREE.Mesh(new THREE.SphereGeometry(2), new THREE.MeshBasicMaterial({ color: 0xeeeeff }));
  g.add(m);
  g.position.set(-20, 120, -50);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-light-sun').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'sun';
  g.userData.sky = true;
  const l = new THREE.DirectionalLight(0xfffaed, 0.8);
  l.castShadow = true;
  g.add(l);
  const m = new THREE.Mesh(new THREE.SphereGeometry(3), new THREE.MeshBasicMaterial({ color: 0xfff0c4 }));
  g.add(m);
  g.position.set(20, 120, -40);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-light-lamppost').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'lamppost';
  g.userData.groundOffset = 0;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3, 8), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  pole.position.y = 1.5;
  g.add(pole);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({ color: 0xfffacc }));
  bulb.position.y = 3;
  g.add(bulb);
  const l = new THREE.SpotLight(0xfffacc, 8, 20, Math.PI / 4, 0.5, 1);
  l.position.y = 2.9;
  const t = new THREE.Object3D();
  t.position.set(0, 0, 0);
  g.add(t);
  l.target = t;
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 0, -8);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-light-neon').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'neon';
  g.userData.groundOffset = 2.5;
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.4), new THREE.MeshBasicMaterial({ color: 0xff007f }));
  g.add(sign);
  const l = new THREE.PointLight(0xff007f, 15, 15, 1.5);
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 2.5, -8);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-light-tungsten').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'tungsten';
  g.userData.groundOffset = 1.5;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3), new THREE.MeshBasicMaterial({ color: 0xffa500 }));
  g.add(bulb);
  const l = new THREE.PointLight(0xffa500, 10, 15, 1);
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 1.5, -8);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-light-hmi').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'hmi';
  g.userData.groundOffset = 2.0;
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshStandardMaterial({ color: 0x555555 }));
  g.add(body);
  const l = new THREE.SpotLight(0x7dd3fc, 12, 30, Math.PI / 6, 0.4, 1);
  const t = new THREE.Object3D();
  t.position.set(0, 0, -5);
  g.add(t);
  l.target = t;
  l.castShadow = true;
  g.add(l);
  g.position.set((Math.random() - 0.5) * 4, 2.0, -8);
  scene.add(g);
  interactives.push(g);
});

document.getElementById('btn-light-window').addEventListener('click', () => {
  const g = new THREE.Group();
  g.userData.type = 'window';
  g.userData.groundOffset = 3.0;
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.8), new THREE.MeshBasicMaterial({ color: 0xffd700 }));
  g.add(frame);
  const l = new THREE.SpotLight(0xffd700, 8, 15, Math.PI / 3, 0.5, 1);
  const t = new THREE.Object3D();
  t.position.set(-2, -3, 0);
  g.add(t);
  l.target = t;
  l.castShadow = true;
  g.add(l);
  g.position.set(-6, 3.0, -8);
  scene.add(g);
  interactives.push(g);
});

// mode toggling
let currentMode = 'flat';

function updateMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });

  if (mode === 'flat') {
    ambient.intensity = 1.0;
    sun.intensity = 0.0;
    sun.castShadow = false;
  } else if (mode === 'day') {
    ambient.intensity = 0.3;
    sun.intensity = 1.2;
    sun.castShadow = true;
  } else if (mode === 'night') {
    ambient.intensity = 0.05;
    sun.intensity = 0.0;
    sun.castShadow = false;
  }
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    updateMode(btn.dataset.mode);
  });
});

// set initial mode
updateMode('flat');

const scoreModal = document.getElementById('score-modal');
const modalTitle = document.getElementById('modal-title');
const scoreCircle = document.getElementById('modal-score-circle');
const feedbackText = document.getElementById('modal-feedback-text');
const closeBtn = document.getElementById('modal-close-btn');

document.getElementById('btn-check-score').addEventListener('click', () => {
  // show loading state
  modalTitle.textContent = 'Checking Lighting...';
  scoreCircle.textContent = '--';
  scoreCircle.style.borderColor = '#475569';
  feedbackText.textContent = 'Analyzing your scene composition and light source distribution relative to the target image...';
  scoreModal.classList.add('show');
  
  setTimeout(() => {
    let score = 10;
    const critiques = [];
    
    if (currentMode === 'night') {
      score += 30;
    } else {
      critiques.push('the scene is not in night mode but the target is a night scene');
    }
    
    let hasNeon = false;
    let neonCorrect = false;
    let hasLamp = false;
    let lampCorrect = false;
    let hasCar = false;
    let carCorrect = false;
    let hasPerson = false;
    let personCorrect = false;
    
    for (const obj of interactives) {
      const type = obj.userData.type;
      const x = obj.position.x;
      const z = obj.position.z;
      
      if (type === 'neon') {
        hasNeon = true;
        // check if on right building side
        if (x > 1.5 && z < 0.0 && z > -35.0) neonCorrect = true;
      }
      if (type === 'lamppost') {
        hasLamp = true;
        // check if on left side
        if (x < -1.0 && z < 0.0 && z > -35.0) lampCorrect = true;
      }
      if (type === 'car' || type === 'sportcar') {
        hasCar = true;
        // check if on road
        if (x > -3.0 && x < 3.0) carCorrect = true;
      }
      if (type === 'person' || type === 'group') {
        hasPerson = true;
        // check if on street or sidewalk
        if (z < 0.0 && z > -25.0) personCorrect = true;
      }
    }
    
    if (hasNeon) {
      score += 15;
      if (neonCorrect) score += 10;
      else critiques.push('neon light is placed but should be on the right side on building wall');
    } else {
      critiques.push('no neon light detected on the right building facade');
    }
    
    if (hasLamp) {
      score += 15;
      if (lampCorrect) score += 10;
      else critiques.push('lamp post is placed but should be on the left sidewalk');
    } else {
      critiques.push('no lampposts detected to light up the left sidewalk');
    }
    
    if (hasCar) {
      score += 5;
      if (carCorrect) score += 5;
    } else {
      critiques.push('adding a car on the road with headlights will help match the target composition');
    }
    
    if (hasPerson) {
      score += 5;
      if (personCorrect) score += 5;
    } else {
      critiques.push('try spawning some people to stand on the sidewalk or cross the street');
    }
    
    // limit max score to 100
    score = Math.min(score, 100);
    
    // format modal content
    scoreCircle.textContent = `${score}%`;
    if (score >= 80) {
      modalTitle.textContent = 'Lighting Match Achieved!';
      scoreCircle.style.borderColor = '#10b981'; // green border
      feedbackText.textContent = `success! your lighting composition matches the target reference image beautifully with a score of ${score}%! you win!`;
      closeBtn.textContent = 'Play Again';
    } else {
      modalTitle.textContent = 'Lighting Analysis';
      scoreCircle.style.borderColor = '#ef4444'; // red border
      let feedback = `score: ${score}%. keep adjusting! critiques:\n`;
      if (critiques.length > 0) {
        feedback += critiques.map(c => `- ${c}`).join('\n');
      } else {
        feedback += 'adjust light positions or angles to align better with the reference composition';
      }
      feedbackText.innerText = feedback;
      closeBtn.textContent = 'Keep Adjusting';
    }
  }, 1000);
});

closeBtn.addEventListener('click', () => {
  scoreModal.classList.remove('show');
  if (closeBtn.textContent === 'Play Again') {
    // reset scene objects
    const toRemove = interactives.filter(o => o.userData.type !== 'car' && o.userData.type !== 'person');
    for (const obj of toRemove) {
      scene.remove(obj);
      const idx = interactives.indexOf(obj);
      if (idx > -1) interactives.splice(idx, 1);
    }
    // reset default car and person position
    for (const obj of interactives) {
      if (obj.userData.type === 'car') obj.position.set(0, 0.6, -5);
      if (obj.userData.type === 'person') obj.position.set(0.7, 1.1, -5);
    }
    updateMode('flat');
  }
});
