document.addEventListener('DOMContentLoaded', function () {
  const canvas = new fabric.Canvas('kitchen-canvas');
  let items = []; // Store added items for costing

  // Load images for kitchen elements
  const wallImg = new Image();
  wallImg.src = 'images/wall.png';

  const windowImg = new Image();
  windowImg.src = 'images/window.png';

  const doorImg = new Image();
  doorImg.src = 'images/door.png';

  const cabinetImg = new Image();
  cabinetImg.src = 'images/cabinet.png';

  const sinkImg = new Image();
  sinkImg.src = 'images/sink.png';

  const ovenImg = new Image();
  ovenImg.src = 'images/oven.png';

  // Add Wall
  document.getElementById('add-wall').addEventListener('click', function () {
    fabric.Image.fromURL(wallImg.src, function (img) {
      img.scaleToWidth(200); // Resize image
      canvas.add(img);
      items.push({ type: 'Wall', cost: 50 });
    });
  });

  // Add Window
  document.getElementById('add-window').addEventListener('click', function () {
    fabric.Image.fromURL(windowImg.src, function (img) {
      img.scaleToWidth(100); // Resize image
      canvas.add(img);
      items.push({ type: 'Window', cost: 100 });
    });
  });

  // Add Door
  document.getElementById('add-door').addEventListener('click', function () {
    fabric.Image.fromURL(doorImg.src, function (img) {
      img.scaleToWidth(80); // Resize image
      canvas.add(img);
      items.push({ type: 'Door', cost: 150 });
    });
  });

  // Add Cabinet
  document.getElementById('add-cabinet').addEventListener('click', function () {
    fabric.Image.fromURL(cabinetImg.src, function (img) {
      img.scaleToWidth(100); // Resize image
      canvas.add(img);
      items.push({ type: 'Cabinet', cost: 200 });
    });
  });

  // Add Sink
  document.getElementById('add-sink').addEventListener('click', function () {
    fabric.Image.fromURL(sinkImg.src, function (img) {
      img.scaleToWidth(80); // Resize image
      canvas.add(img);
      items.push({ type: 'Sink', cost: 120 });
    });
  });

  // Add Oven
  document.getElementById('add-oven').addEventListener('click', function () {
    fabric.Image.fromURL(ovenImg.src, function (img) {
      img.scaleToWidth(90); // Resize image
      canvas.add(img);
      items.push({ type: 'Oven', cost: 300 });
    });
  });

  // Clear Canvas
  document.getElementById('clear-canvas').addEventListener('click', function () {
    canvas.clear();
    items = [];
  });

  // Calculate Cost
  document.getElementById('calculate-cost').addEventListener('click', function () {
    localStorage.setItem('kitchenItems', JSON.stringify(items));
    window.location.href = 'costing.html';
  });
});