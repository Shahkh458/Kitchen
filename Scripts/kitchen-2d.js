document.addEventListener('DOMContentLoaded', function() {
    // Initialize canvas with scrollable container
    const canvas = new fabric.Canvas('kitchen-canvas', {
        selection: true,
        backgroundColor: '#f9f9f9',
        preserveObjectStacking: true,
        renderOnAddRemove: false,
        fireRightClick: true,
        stopContextMenu: true
    });
    
    // Set smaller canvas dimensions (300% smaller than original)
    const CANVAS_WIDTH = 2000;
    const CANVAS_HEIGHT = 2000;
    canvas.setWidth(CANVAS_WIDTH);
    canvas.setHeight(CANVAS_HEIGHT);
    
    // Make container scrollable
    const container = document.querySelector('.canvas-container');
    container.style.width = '700px';
    container.style.height = '500px';
    container.style.overflow = 'auto';

    // Constants
    const GRID_SIZE = 20; // 20px grid
    const SCALE = 5; // 1px = 5mm
    const DEFAULT_WALL_HEIGHT = 2700;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3;
    const ZOOM_FACTOR = 0.1;
    const WALL_COLOR = '#7e8aa1';
    const DOOR_COLOR = '#8a5a44';
    const WINDOW_COLOR = '#a5d8ff';

    // State
    let currentMode = 'select';
    let currentItemType = null;
    let isDrawing = false;
    let startPoint = null;
    let currentWall = null;
    let isPanning = false;
    let lastPosX = 0;
    let lastPosY = 0;
    const objects = [];

    // UI Elements
    const wallThicknessX = document.getElementById('wall-thickness-x');
    const wallThicknessY = document.getElementById('wall-thickness-y');
    const wallHeightInput = document.getElementById('wall-height');
    const doorWidthInput = document.getElementById('door-width');
    const doorHeightInput = document.getElementById('door-height');
    const windowWidthInput = document.getElementById('window-width');
    const windowHeightInput = document.getElementById('window-height');
    const dimensionDisplay = document.getElementById('dimension-display');
    const zoomDisplay = document.getElementById('zoom-display');

    // Grid Pattern
    function createGrid() {
        const zoom = canvas.getZoom();
        const gridSize = GRID_SIZE * zoom;
        const gridCanvas = document.createElement('canvas');
        gridCanvas.width = gridSize;
        gridCanvas.height = gridSize;
        const ctx = gridCanvas.getContext('2d');
        
        ctx.strokeStyle = '#e6e6e6';
        ctx.lineWidth = 1 / zoom;
        
        ctx.beginPath();
        ctx.moveTo(0.5, 0);
        ctx.lineTo(0.5, gridSize);
        ctx.moveTo(0, 0.5);
        ctx.lineTo(gridSize, 0.5);
        ctx.stroke();
        
        return new fabric.Pattern({ 
            source: gridCanvas, 
            repeat: 'repeat'
        });
    }

    function updateGrid() {
        canvas.setBackgroundColor(createGrid(), function() {
            canvas.renderAll();
        });
        updateZoomDisplay();
    }

    function updateZoomDisplay() {
        zoomDisplay.textContent = `${Math.round(canvas.getZoom() * 100)}%`;
    }

    // Initialize grid
    updateGrid();

    // Snap to grid
    function snapToGrid(point) {
        const zoom = canvas.getZoom();
        const grid = GRID_SIZE * zoom;
        return {
            x: Math.round(point.x / grid) * grid,
            y: Math.round(point.y / grid) * grid
        };
    }

    // Find nearest wall end for snapping
    function findNearestWallEnd(point, threshold = GRID_SIZE * 1.5) {
        let nearestEnd = null;
        let minDistance = threshold * canvas.getZoom();
        
        // Only check the last 20 walls for performance
        const wallsToCheck = objects.filter(o => o.objectType === 'wall').slice(-20);
        
        for (const wall of wallsToCheck) {
            const ends = [
                { x: wall.x1, y: wall.y1 },
                { x: wall.x2, y: wall.y2 }
            ];
            
            for (const end of ends) {
                const dx = point.x - end.x;
                const dy = point.y - end.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestEnd = end;
                }
            }
        }
        return nearestEnd;
    }

    // Mode Management
    function setMode(mode, itemType = null) {
        currentMode = mode;
        currentItemType = itemType;
        
        const cursors = {
            'select': 'default',
            'wall': 'crosshair',
            'door': 'crosshair',
            'window': 'crosshair',
            'delete': 'pointer',
            'place': 'pointer'
        };
        
        canvas.defaultCursor = cursors[mode] || 'default';
        canvas.selection = mode === 'select';
        
        canvas.forEachObject(obj => {
            obj.set({
                selectable: mode === 'select' || mode === 'delete',
                evented: mode === 'select' || mode === 'delete'
            });
        });
        
        updateUI();
        canvas.discardActiveObject().renderAll();
    }

    function updateUI() {
        document.querySelectorAll('.tool-button').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${currentMode}-mode`);
        });
    }

    // Wall Drawing with different X/Y thickness
    function startWallDrawing(start) {
        isDrawing = true;
        startPoint = start;
        
        currentWall = new fabric.Line([start.x, start.y, start.x, start.y], {
            stroke: WALL_COLOR,
            strokeWidth: getWallThickness(start, start),
            selectable: false,
            hasControls: false,
            hasBorders: false,
            objectType: 'wall',
            thicknessX: parseInt(wallThicknessX.value),
            thicknessY: parseInt(wallThicknessY.value),
            height: parseInt(wallHeightInput.value) || DEFAULT_WALL_HEIGHT,
            strokeUniform: true,
            strokeLineCap: 'round'
        });
        
        canvas.add(currentWall);
    }

    function getWallThickness(start, end) {
        const dx = Math.abs(end.x - start.x);
        const dy = Math.abs(end.y - start.y);
        
        // Use X thickness for horizontal walls, Y for vertical
        return (dx > dy) ? 
            parseInt(wallThicknessX.value) / SCALE : 
            parseInt(wallThicknessY.value) / SCALE;
    }

    function updateWallDrawing(end) {
        if (!currentWall || !isDrawing) return;
        
        let endPoint = end;
        const nearestEnd = findNearestWallEnd(endPoint);
        if (nearestEnd) endPoint = nearestEnd;

        // Update thickness based on direction
        const thickness = getWallThickness(startPoint, endPoint);
        
        currentWall.set({ 
            x2: endPoint.x, 
            y2: endPoint.y,
            strokeWidth: thickness
        });
        
        // Update dimensions display
        const length = Math.sqrt(
            Math.pow(currentWall.x2 - currentWall.x1, 2) + 
            Math.pow(currentWall.y2 - currentWall.y1, 2)
        );
        dimensionDisplay.textContent = `${Math.round(length * SCALE)}mm`;
        
        canvas.requestRenderAll();
    }

    function finalizeWall() {
        if (!currentWall) return;
        
        const length = Math.sqrt(
            Math.pow(currentWall.x2 - currentWall.x1, 2) + 
            Math.pow(currentWall.y2 - currentWall.y1, 2)
        );
        
        if (length > GRID_SIZE * canvas.getZoom() / 2) {
            currentWall.set({
                selectable: true,
                hasControls: true,
                hasBorders: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true
            });
            objects.push(currentWall);
        } else {
            canvas.remove(currentWall);
        }
        
        isDrawing = false;
        currentWall = null;
        dimensionDisplay.textContent = '';
        canvas.requestRenderAll();
    }

    // Opening Creation (Doors/Windows)
    function createOpening(type, wall, position) {
        const width = type === 'door' ? 
            parseInt(doorWidthInput.value) : 
            parseInt(windowWidthInput.value);
        
        const height = type === 'door' ? 
            parseInt(doorHeightInput.value) : 
            parseInt(windowHeightInput.value);
        
        const color = type === 'door' ? DOOR_COLOR : WINDOW_COLOR;
        
        // Calculate position along wall
        const wallLength = Math.sqrt(
            Math.pow(wall.x2 - wall.x1, 2) + 
            Math.pow(wall.y2 - wall.y1, 2)
        );
        
        const opening = new fabric.Rect({
            width: width / SCALE,
            height: height / SCALE,
            fill: color,
            opacity: 0.7,
            stroke: 'rgba(0,0,0,0.5)',
            strokeWidth: 1,
            originX: 'center',
            originY: 'center',
            objectType: type,
            selectable: true,
            hasControls: true,
            hasBorders: true
        });
        
        // Position the opening on the wall
        const angle = Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1);
        opening.set({
            left: wall.x1 + (wall.x2 - wall.x1) * position,
            top: wall.y1 + (wall.y2 - wall.y1) * position,
            angle: angle * (180 / Math.PI)
        });
        
        canvas.add(opening);
        objects.push(opening);
        canvas.requestRenderAll();
    }

    // Item Placement
    function placeItem(position) {
        const { type, width, height } = currentItemType;
        
        const item = new fabric.Rect({
            left: position.x,
            top: position.y,
            width: width / SCALE,
            height: height / SCALE,
            fill: getItemColor(type),
            stroke: '#666',
            strokeWidth: 1,
            originX: 'center',
            originY: 'center',
            objectType: type,
            selectable: true,
            hasControls: true,
            hasBorders: true
        });
        
        canvas.add(item);
        objects.push(item);
        canvas.requestRenderAll();
        setMode('select');
    }

    function getItemColor(type) {
        const colors = {
            'base-cabinet': 'rgba(139, 69, 19, 0.7)',
            'wall-cabinet': 'rgba(160, 82, 45, 0.7)',
            'refrigerator': 'rgba(220, 220, 220, 0.7)',
            'oven': 'rgba(100, 100, 100, 0.7)'
        };
        return colors[type] || 'rgba(200, 200, 200, 0.7)';
    }

    // Event Handlers
    function initEventHandlers() {
        // Canvas Events
        canvas.on('mouse:down', (options) => {
            if (options.e.button === 2 || options.e.ctrlKey) {
                isPanning = true;
                lastPosX = options.e.clientX;
                lastPosY = options.e.clientY;
                canvas.defaultCursor = 'grabbing';
                return;
            }

            const pointer = canvas.getPointer(options.e);
            const snappedPoint = snapToGrid(pointer);
            const nearestEnd = findNearestWallEnd(snappedPoint);
            const finalPoint = nearestEnd || snappedPoint;

            if (currentMode === 'wall') {
                startWallDrawing(finalPoint);
            } 
            else if (currentMode === 'delete') {
                const target = canvas.findTarget(options.e);
                if (target?.objectType) {
                    canvas.remove(target);
                    objects.splice(objects.indexOf(target), 1);
                    canvas.requestRenderAll();
                }
            } 
            else if (currentMode === 'place' && currentItemType) {
                placeItem(finalPoint);
            }
            else if (currentMode === 'door' || currentMode === 'window') {
                const target = canvas.findTarget(options.e);
                if (target?.objectType === 'wall') {
                    const wallPoint = target.getLocalPoint(pointer);
                    createOpening(currentMode, target, wallPoint.x);
                }
            }
        });

        canvas.on('mouse:move', (options) => {
            if (isPanning) {
                const deltaX = options.e.clientX - lastPosX;
                const deltaY = options.e.clientY - lastPosY;
                lastPosX = options.e.clientX;
                lastPosY = options.e.clientY;
                
                container.scrollLeft -= deltaX;
                container.scrollTop -= deltaY;
                updateGrid();
                return;
            }

            if (isDrawing && currentWall) {
                const pointer = canvas.getPointer(options.e);
                updateWallDrawing(snapToGrid(pointer));
            }
        });

        canvas.on('mouse:up', () => {
            if (isPanning) {
                isPanning = false;
                setMode(currentMode);
            }
            
            if (isDrawing && currentWall) {
                finalizeWall();
            }
        });

        // Zoom with mouse wheel
        canvas.on('mouse:wheel', (options) => {
            options.e.preventDefault();
            
            const delta = -Math.sign(options.e.deltaY);
            const zoom = Math.max(MIN_ZOOM, Math.min(
                canvas.getZoom() * (1 + delta * ZOOM_FACTOR), 
                MAX_ZOOM
            ));
            
            canvas.zoomToPoint(
                { x: options.e.offsetX, y: options.e.offsetY },
                zoom
            );
            updateGrid();
        });

        // UI Events
        document.getElementById('select-mode').addEventListener('click', () => setMode('select'));
        document.getElementById('wall-mode').addEventListener('click', () => setMode('wall'));
        document.getElementById('door-mode').addEventListener('click', () => setMode('door'));
        document.getElementById('window-mode').addEventListener('click', () => setMode('window'));
        document.getElementById('delete-mode').addEventListener('click', () => setMode('delete'));
        
        document.getElementById('clear-all').addEventListener('click', function() {
            if (confirm('Are you sure you want to clear the entire design?')) {
                canvas.clear();
                objects.length = 0;
                updateGrid();
            }
        });

        document.getElementById('view-3d').addEventListener('click', function() {
            const designData = { walls: [], items: [], settings: { scale: SCALE } };
            
            objects.forEach(obj => {
                if (obj.objectType === 'wall') {
                    designData.walls.push({
                        x1: obj.x1,
                        y1: obj.y1,
                        x2: obj.x2,
                        y2: obj.y2,
                        thicknessX: obj.thicknessX,
                        thicknessY: obj.thicknessY,
                        height: obj.height
                    });
                } else {
                    designData.items.push({
                        type: obj.objectType,
                        x: obj.left,
                        y: obj.top,
                        width: obj.width * (obj.scaleX || 1),
                        height: obj.height * (obj.scaleY || 1),
                        rotation: obj.angle || 0
                    });
                }
            });
            
            localStorage.setItem('kitchenDesign', JSON.stringify(designData));
            window.open('3d-modeling.html', '_blank');
        });

        // Category Tabs
        document.querySelectorAll('.category-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelectorAll('.category-tab').forEach(t => 
                    t.classList.toggle('active', t === this)
                );
                document.querySelectorAll('.category-content').forEach(c => 
                    c.style.display = c.id === `${this.dataset.category}-content` ? 'block' : 'none'
                );
            });
        });

        // Design Items
        document.querySelectorAll('.design-item').forEach(item => {
            item.addEventListener('click', function() {
                setMode('place', {
                    type: this.dataset.type,
                    width: parseInt(this.dataset.width),
                    height: parseInt(this.dataset.height)
                });
            });
        });

        // Window resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                updateGrid();
            }, 100);
        });
    }

    // Initialize the application
    function init() {
        setMode('select');
        initEventHandlers();
        updateGrid();
    }

    init();
});