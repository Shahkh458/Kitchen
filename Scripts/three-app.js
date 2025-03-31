document.addEventListener('DOMContentLoaded', function() {
    // Initialize canvas with grid
    const canvas = new fabric.Canvas('kitchen-canvas', {
        selection: false,
        backgroundColor: '#f9f9f9'
    });
    canvas.setWidth(document.querySelector('.canvas-container').offsetWidth);
    canvas.setHeight(document.querySelector('.canvas-container').offsetHeight);

    // Constants
    const GRID_SIZE = 20; // 20px grid
    const SCALE = 5; // 1px = 5mm
    const WALL_HEIGHT = 2700; // Default wall height in mm

    // Drawing states
    let currentTool = null;
    let currentItem = null;
    let isDrawing = false;
    let startPoint = null;
    
    // UI Elements
    const wallThickness = document.getElementById('wall-thickness');
    const wallHeightInput = document.getElementById('wall-height');
    
    // Category tabs
    const tabs = document.querySelectorAll('.category-tab');
    const contents = document.querySelectorAll('.category-content');
    
    // Initialize grid
    function createGrid() {
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = GRID_SIZE;
        gridCanvas.height = GRID_SIZE;
        const ctx = gridCanvas.getContext('2d');
        
        ctx.strokeStyle = '#e6e6e6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, GRID_SIZE);
        ctx.lineTo(GRID_SIZE, GRID_SIZE);
        ctx.moveTo(GRID_SIZE, 0);
        ctx.lineTo(GRID_SIZE, GRID_SIZE);
        ctx.stroke();
        
        return new fabric.Pattern({
            source: gridCanvas,
            repeat: 'repeat'
        });
    }
    canvas.setBackgroundColor(createGrid(), canvas.renderAll.bind(canvas));

    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            contents.forEach(content => {
                content.style.display = 'none';
            });
            
            document.getElementById(`${this.dataset.category}-content`).style.display = 'block';
            currentTool = this.dataset.category;
        });
    });

    // Wall drawing functionality
    document.getElementById('add-wall').addEventListener('click', function() {
        resetDrawing();
        currentTool = 'wall';
        canvas.defaultCursor = 'crosshair';
    });

    // Item placement
    document.querySelectorAll('.design-item').forEach(item => {
        item.addEventListener('click', function() {
            resetDrawing();
            currentTool = 'place-item';
            currentItem = {
                type: this.dataset.type,
                width: parseInt(this.dataset.width),
                image: this.querySelector('img').src
            };
            canvas.defaultCursor = 'pointer';
        });
    });

    // Canvas mouse events
    canvas.on('mouse:down', function(options) {
        if (!currentTool) return;
        
        const pointer = canvas.getPointer(options.e);
        startPoint = snapToGrid(pointer);
        
        if (currentTool === 'wall') {
            startWallDrawing(startPoint);
        } else if (currentTool === 'place-item') {
            placeItem(startPoint);
        }
    });

    canvas.on('mouse:move', function(options) {
        if (!isDrawing || !currentTool === 'wall') return;
        
        const pointer = canvas.getPointer(options.e);
        const endPoint = snapToGrid(pointer);
        
        updateWallDrawing(endPoint);
    });

    canvas.on('mouse:up', function() {
        if (isDrawing && currentTool === 'wall') {
            finalizeWall();
        }
    });

    // Helper functions
    function snapToGrid(point) {
        return {
            x: Math.round(point.x / GRID_SIZE) * GRID_SIZE,
            y: Math.round(point.y / GRID_SIZE) * GRID_SIZE
        };
    }

    function startWallDrawing(start) {
        isDrawing = true;
        
        currentItem = new fabric.Line([start.x, start.y, start.x, start.y], {
            stroke: '#7e8aa1',
            strokeWidth: parseInt(wallThickness.value) / SCALE,
            selectable: false,
            hasControls: false,
            hasBorders: false,
            objectType: 'wall',
            thickness: parseInt(wallThickness.value),
            height: parseInt(wallHeightInput.value) || WALL_HEIGHT
        });
        
        canvas.add(currentItem);
    }

    function updateWallDrawing(end) {
        const dx = Math.abs(end.x - startPoint.x);
        const dy = Math.abs(end.y - startPoint.y);
        
        // Snap to either horizontal or vertical
        if (dx > dy) {
            // Horizontal wall
            currentItem.set({
                x2: end.x,
                y2: startPoint.y,
                angle: 0
            });
        } else {
            // Vertical wall
            currentItem.set({
                x2: startPoint.x,
                y2: end.y,
                angle: 90
            });
        }
        
        canvas.renderAll();
    }

    function finalizeWall() {
        currentItem.set({
            selectable: true,
            hasControls: true,
            hasBorders: true
        });
        
        isDrawing = false;
        canvas.renderAll();
    }

    function placeItem(position) {
        fabric.Image.fromURL(currentItem.image, function(img) {
            img.set({
                left: position.x,
                top: position.y,
                scaleX: (currentItem.width / SCALE) / img.width,
                originX: 'center',
                originY: 'center',
                objectType: currentItem.type,
                width: currentItem.width
            });
            
            canvas.add(img);
            canvas.renderAll();
        });
    }

    function resetDrawing() {
        isDrawing = false;
        currentTool = null;
        currentItem = null;
        canvas.defaultCursor = 'default';
    }

    // Clear canvas
    document.getElementById('clear-all').addEventListener('click', function() {
        canvas.clear();
        canvas.setBackgroundColor(createGrid(), canvas.renderAll.bind(canvas));
    });

    // View in 3D
    document.getElementById('view-3d').addEventListener('click', function() {
        // Collect all objects and their positions
        const designData = {
            walls: [],
            items: []
        };
        
        canvas.forEachObject(function(obj) {
            if (obj.objectType === 'wall') {
                designData.walls.push({
                    x1: obj.x1,
                    y1: obj.y1,
                    x2: obj.x2,
                    y2: obj.y2,
                    thickness: obj.thickness,
                    height: obj.height
                });
            } else {
                designData.items.push({
                    type: obj.objectType,
                    x: obj.left,
                    y: obj.top,
                    width: obj.width,
                    rotation: obj.angle || 0
                });
            }
        });
        
        // Store design data for 3D viewer
        localStorage.setItem('kitchenDesign', JSON.stringify(designData));
        window.location.href = '3d-modeling.html';
    });

    // Window resize handling
    window.addEventListener('resize', function() {
        canvas.setWidth(document.querySelector('.canvas-container').offsetWidth);
        canvas.setHeight(document.querySelector('.canvas-container').offsetHeight);
        canvas.renderAll();
    });
});