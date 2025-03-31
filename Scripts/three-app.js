const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('3d-container').appendChild(renderer.domElement);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
scene.add(directionalLight);

const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

const models = {};
let furnitureItems = [];
const loader = new THREE.GLTFLoader();

Promise.all([
  loader.loadAsync('models/base-cabinet.glb'),
  loader.loadAsync('models/wall-cabinet.glb'),
  loader.loadAsync('models/tall-unit.glb'),
  loader.loadAsync('models/sink.glb'),
  loader.loadAsync('models/oven.glb')
]).then(([baseCabinet, wallCabinet, tallUnit, sink, oven]) => {
  models['base-cabinet'] = baseCabinet;
  models['wall-cabinet'] = wallCabinet;
  models['tall-unit'] = tallUnit;
  models.sink = sink;
  models.oven = oven;
});

function addFurniture(type, position = { x: Math.random() * 10 - 5, y: 0, z: Math.random() * 10 - 5 }) {
  if (!models[type]) return;
  const model = models[type].scene.clone();
  model.position.set(position.x, position.y, position.z);
  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(model);
  furnitureItems.push({ type, model, cost: getCostForType(type), finish: 'default' });
}

function addWall() {
  const wallGeometry = new THREE.BoxGeometry(5, 2, 0.2);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(Math.random() * 10 - 5, 1, Math.random() * 10 - 5);
  wall.castShadow = true;
  wall.receiveShadow = true;
  scene.add(wall);
  furnitureItems.push({ type: 'Wall', model: wall, cost: 50, finish: 'default' });
}

function getCostForType(type) {
  const costs = { 'base-cabinet': 200, 'wall-cabinet': 150, 'tall-unit': 300, sink: 120, oven: 300, Wall: 50 };
  return costs[type] || 0;
}

document.getElementById('add-wall').addEventListener('click', addWall);
document.getElementById('add-base-cabinet').addEventListener('click', () => addFurniture('base-cabinet'));
document.getElementById('add-wall-cabinet').addEventListener('click', () => addFurniture('wall-cabinet'));
document.getElementById('add-tall-unit').addEventListener('click', () => addFurniture('tall-unit'));
document.getElementById('add-sink').addEventListener('click', () => addFurniture('sink'));
document.getElementById('add-oven').addEventListener('click', () => addFurniture('oven'));
document.getElementById('clear-scene').addEventListener('click', () => {
  furnitureItems.forEach(item => scene.remove(item.model));
  furnitureItems = [];
});
document.getElementById('calculate-cost').addEventListener('click', () => {
  localStorage.setItem('designItems', JSON.stringify(furnitureItems.map(item => ({ type: item.type, cost: item.cost, finish: item.finish }))));
  window.location.href = 'costing.html';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();