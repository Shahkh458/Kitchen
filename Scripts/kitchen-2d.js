document.addEventListener('DOMContentLoaded', function () {
  const canvas = new fabric.Canvas('kitchen-canvas', { backgroundColor: '#f0f0f0' });
  let items = [];
  let isDrawing = false;
  let activeWall;

  // Grid background
  canvas.setBackgroundImage('images/grid.png', canvas.renderAll.bind(canvas), {
    scaleX: 0.5,
    scaleY: 0.5,
    repeat: 'repeat'
  });

  // Images
  const images = {
    wall: 'images/wall.png',
    window: 'images/window.png',
    door: 'images/door.png',
    baseCabinet: 'images/base-cabinet.png',
    wallCabinet: 'images/wall-cabinet.png',
    tallUnit: 'images/tall-unit.png',
    sink: 'images/sink.png',
    oven: 'images/oven.png'
  };

  // Custom wall drawing
  canvas.on('mouse:down', (o) => {
    if (!isDrawing) return;
    const pointer = canvas.getPointer(o.e);
    activeWall = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
      stroke: 'black',
      strokeWidth: 5,
      selectable: true
    });
    canvas.add(activeWall);
  });
  canvas.on('mouse:move', (o) => {
    if (!isDrawing || !activeWall) return;
    const pointer = canvas.getPointer(o.e);
    activeWall.set({ x2: pointer.x, y2: pointer.y });
    canvas.renderAll();
  });
  canvas.on('mouse:up', () => {
    if (isDrawing && activeWall) {
      items.push({ type: 'Wall', cost: 50, finish: 'default' });
      activeWall = null;
    }
    isDrawing = false;
  });

  // Event listeners
  document.getElementById('add-wall').addEventListener('click', () => isDrawing = true);

  function addItem(type, width, cost) {
    fabric.Image.fromURL(images[type] || 'https://via.placeholder.com/100', (img) => {
      img.scaleToWidth(width);
      canvas.add(img);
      items.push({ type, cost, finish: 'default' });
    });
  }

  document.getElementById('add-window').addEventListener('click', () => addItem('window', 100, 100));
  document.getElementById('add-door').addEventListener('click', () => addItem('door', 80, 150));
  document.getElementById('add-base-cabinet').addEventListener('click', () => addItem('baseCabinet', 100, 200));
  document.getElementById('add-wall-cabinet').addEventListener('click', () => addItem('wallCabinet', 80, 150));
  document.getElementById('add-tall-unit').addEventListener('click', () => addItem('tallUnit', 120, 300));
  document.getElementById('add-sink').addEventListener('click', () => addItem('sink', 80, 120));
  document.getElementById('add-oven').addEventListener('click', () => addItem('oven', 90, 300));

  document.getElementById('clear-canvas').addEventListener('click', () => {
    canvas.clear();
    canvas.setBackgroundColor('#f0f0f0', canvas.renderAll.bind(canvas));
    items = [];
  });

  document.getElementById('calculate-cost').addEventListener('click', () => {
    localStorage.setItem('designItems', JSON.stringify(items));
    window.location.href = 'costing.html';
  });
});