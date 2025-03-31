// kitchen-planner.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize canvas with smaller dimensions
    const canvas = new fabric.Canvas('kitchen-canvas', {
        selection: true,
        backgroundColor: '#f9f9f9',
        preserveObjectStacking: true,
        renderOnAddRemove: false, // Better performance
        skipTargetFind: false,
        fireRightClick: true,
        stopContextMenu: true
    });
    
    const container = document.querySelector('.canvas-container');
    
    // Set smaller canvas dimensions (1/4 of original)
    const setCanvasSize = () => {
        canvas.setWidth(container.offsetWidth);
        canvas.setHeight(container.offsetHeight);
        // Reduced virtual space (2500x2500 instead of 10000x10000)
        canvas.setDimensions({ width: 2500, height: 2500 }, { backstoreOnly: true });
    };
    setCanvasSize();

    // Constants
    const GRID_SIZE = 20; // 20px grid
    const SCALE = 5; // 1px = 5mm
    const DEFAULT_WALL_HEIGHT = 2700;
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3; // Reduced max zoom
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
    const wallThicknessSelect = document.getElementById('wall-thickness');
    const wallHeightInput = document.getElementById('wall-height');
    const dimensionDisplay = document.getElementById('dimension-display');
    const zoomDisplay = document.getElementById('zoom-display');

    // Optimized Grid Pattern
    function createGrid() {
        const zoom = canvas.getZoom();
        const gridSize = GRID_SIZE * zoom;
        const patternCanvas = document.createElement('canvas');
        patternCanvas.width = gridSize;
        patternCanvas.height = gridSize;
        const ctx = patternCanvas.getContext('2d');
        
        ctx.strokeStyle = '#e6e6e6';
        ctx.lineWidth = Math.max(0.5, 1/zoom); // Minimum line width
        
        // Draw grid lines
        ctx.beginPath();
        ctx.moveTo(0.5, 0);
        ctx.lineTo(0.5, gridSize);
        ctx.moveTo(0, 0.5);
        ctx.lineTo(gridSize, 0.5);
        ctx.stroke();
        
        return new fabric.Pattern({ 
            source: patternCanvas, 
            repeat: 'repeat'
        });
    }

    function updateGrid() {
        requestAnimationFrame(() => {
            canvas.setBackgroundColor(createGrid(), canvas.renderAll.bind(canvas));
            updateZoomDisplay();
        });
    }

    function updateZoomDisplay() {
        zoomDisplay.textContent = `${Math.round(canvas.getZoom() * 100)}%`;
    }

    // Initialize grid
    updateGrid();

    // Snap to grid with performance optimization
    function snapToGrid(point) {
        const zoom = canvas.getZoom();
        const grid = GRID_SIZE * zoom;
        return {
            x: Math.round(point.x / grid) * grid,
            y: Math.round(point.y / grid) * grid
        };
    }

    // Find nearest wall end with distance limit
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
        
        // Optimized object event handling
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

    // Wall Drawing Functions (optimized)
    function startWallDrawing(start) {
        isDrawing = true;
        startPoint = start;
        
        currentWall = new fabric.Line([start.x, start.y, start.x, start.y], {
            stroke: WALL_COLOR,
            strokeWidth: parseInt(wallThicknessSelect.value) / SCALE,
            selectable: false,
            hasControls: false,
            hasBorders: false,
            objectType: 'wall',
            thickness: parseInt(wallThicknessSelect.value),
            height: parseInt(wallHeightInput.value) || DEFAULT_WALL_HEIGHT,
            strokeUniform: true,
            strokeLineCap: 'round'
        });
        
        canvas.add(currentWall);
    }

    function updateWallDrawing(end) {
        if (!currentWall || !isDrawing) return;
        
        let endPoint = end;
        const nearestEnd = findNearestWallEnd(endPoint);
        if (nearestEnd) endPoint = nearestEnd;

        currentWall.set({ x2: endPoint.x, y2: endPoint.y });
        
        // Throttle dimension display updates
        if (!this.lastUpdate || Date.now() - this.lastUpdate > 100) {
            const length = Math.sqrt(
                Math.pow(currentWall.x2 - currentWall.x1, 2) + 
                Math.pow(currentWall.y2 - currentWall.y1, 2)
            );
            dimensionDisplay.textContent = `${Math.round(length * SCALE)}mm`;
            this.lastUpdate = Date.now();
        }
        
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
        const openingWidth = type === 'door' ? 900 : 1200; // mm
        const openingHeight = type === 'door' ? 2100 : 1200; // mm
        const color = type === 'door' ? DOOR_COLOR : WINDOW_COLOR;
        
        // Calculate position along wall
        const wallLength = Math.sqrt(
            Math.pow(wall.x2 - wall.x1, 2) + 
            Math.pow(wall.y2 - wall.y1, 2)
        );
        
        const opening = new fabric.Rect({
            width: openingWidth / SCALE,
            height: openingHeight / SCALE,
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

    // Item Placement (optimized)
    function placeItem(position) {
        const { type, width, height } = currentItemType;
        
        // Use simple rectangles instead of images for performance
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
            'oven': 'rgba(100, 100, 100, 0.7)',
            'door': DOOR_COLOR,
            'window': WINDOW_COLOR
        };
        return colors[type] || 'rgba(200, 200, 200, 0.7)';
    }

    // Optimized Event Handlers
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
                    const pointer = canvas.getPointer(options.e);
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
                
                canvas.relativePan({ x: deltaX, y: deltaY });
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

        // Optimized zoom handler
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

        // UI Event Delegation (better performance)
        document.addEventListener('click', (e) => {
            if (e.target.matches('.tool-button')) {
                const mode = e.target.id.replace('-mode', '');
                setMode(mode);
            }
            else if (e.target.matches('.design-item')) {
                setMode('place', {
                    type: e.target.dataset.type,
                    width: parseInt(e.target.dataset.width),
                    height: parseInt(e.target.dataset.height)
                });
            }
            else if (e.target.matches('.category-tab')) {
                document.querySelectorAll('.category-tab').forEach(t => 
                    t.classList.toggle('active', t === e.target)
                );
                document.querySelectorAll('.category-content').forEach(c => 
                    c.style.display = c.id === `${e.target.dataset.category}-content` ? 'block' : 'none'
                );
            }
        });

        // Window resize with debounce
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                setCanvasSize();
                updateGrid();
            }, 100);
        });
    }

    // Initialize the application
    function init() {
        setMode('select');
        initEventHandlers();
        
        // Add zoom controls
        document.getElementById('zoom-in').addEventListener('click', () => {
            canvas.setZoom(Math.min(canvas.getZoom() + ZOOM_FACTOR, MAX_ZOOM));
            updateGrid();
        });
        
        document.getElementById('zoom-out').addEventListener('click', () => {
            canvas.setZoom(Math.max(canvas.getZoom() - ZOOM_FACTOR, MIN_ZOOM));
            updateGrid();
        });
        
        document.getElementById('reset-zoom').addEventListener('click', () => {
            canvas.setZoom(1).viewportTransform[4] = 0;
            canvas.viewportTransform[5] = 0;
            updateGrid();
        });
    }

    init();
});