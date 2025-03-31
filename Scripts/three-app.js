// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.getElementById('3d-container').appendChild(renderer.domElement);

// Add controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.25;

// Add lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

// Add grid helper
const gridHelper = new THREE.GridHelper(20, 20);
scene.add(gridHelper);

// Store loaded models
const models = {
  cabinet: null,
  sink: null,
  oven: null
};

// Store added furniture
let furnitureItems = [];

// Load models
const loader = new THREE.GLTFLoader();

Promise.all([
  new Promise(resolve => loader.load('models/cabinet.glb', resolve)),
  new Promise(resolve => loader.load('models/sink.glb', resolve)),
  new Promise(resolve => loader.load('models/oven.glb', resolve))
]).then(([cabinet, sink, oven]) => {
  models.cabinet = cabinet;
  models.sink = sink;
  models.oven = oven;
});

// Add furniture functions
function addFurniture(type) {
  if (!models[type]) return;
  
  const model = models[type].scene.clone();
  model.position.set(0, 0, 0);
  model.traverse(child => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  
  scene.add(model);
  furnitureItems.push({
    type: type,
    model: model,
    cost: getCostForType(type)
  });
}

function getCostForType(type) {
  const costs = {
    cabinet: 200,
    sink: 150,
    oven: 300
  };
  return costs[type] || 0;
}

// Event listeners
document.getElementById('add-cabinet').addEventListener('click', () => addFurniture('cabinet'));
document.getElementById('add-sink').addEventListener('click', () => addFurniture('sink'));
document.getElementById('add-oven').addEventListener('click', () => addFurniture('oven'));

document.getElementById('clear-scene').addEventListener('click', () => {
  furnitureItems.forEach(item => scene.remove(item.model));
  furnitureItems = [];
});

document.getElementById('calculate-cost').addEventListener('click', () => {
  const totalCost = furnitureItems.reduce((sum, item) => sum + item.cost, 0);
  localStorage.setItem('furnitureItems', JSON.stringify(furnitureItems));
  window.location.href = 'costing.html';
});

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();