const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { CameraHud } = require('../js/prefabs/CameraHud.js');
const { Backpack } = require('../js/prefabs/Backpack.js');
const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');

function createMockScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        visible: true,
        alpha: 1,
        angle: 0,
        width: 0,
        height: 0,
        children: [],
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        listeners: {},
        setSize(w, h) { this.width = w; this.height = h; return this; },
        setStrokeStyle(w, col, alpha) { this.strokeWidth = w; this.strokeColor = col; this.strokeAlpha = alpha; return this; },
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setInteractive(shape, callback) { this.interactiveOptions = shape; this.hitArea = shape; this.hitCallback = callback; return this; },
        disableInteractive() { return this; },
        setActive(a) { this.active = a; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setOrigin() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setTexture(k) { this.texture = k; return this; },
        setTintFill(t) { this.tintFill = t; return this; },
        setAngle(ang) { this.angle = ang; return this; },
        setVisible(v) { this.visible = v; return this; },
        on(evt, cb) { this.listeners[evt] = cb; return this; },
        emit(evt, ...args) {
            if (this.listeners && this.listeners[evt]) return this.listeners[evt](...args);
        },
    });

    const tweensAdded = [];

    return {
        add: {
            container: (x, y) => {
                const c = makeDisplayObject();
                c.x = x;
                c.y = y;
                return c;
            },
            image: (x = 0, y = 0, key = '') => {
                const img = makeDisplayObject();
                img.x = x;
                img.y = y;
                img.texture = key;
                return img;
            },
            rectangle: () => makeDisplayObject(),
            text: (x = 0, y = 0, textContent = '', style = {}) => {
                const t = makeDisplayObject();
                t.x = x;
                t.y = y;
                t.text = textContent;
                t.style = style;
                t.setColor = (c) => { t.color = c; return t; };
                t.setText = (txt) => { t.text = txt; return t; };
                return t;
            },
            zone: (x, y) => {
                const z = makeDisplayObject();
                z.x = x;
                z.y = y;
                return z;
            },
        },
        cameras: {
            main: {
                zoom: 1.0,
                setZoom(z) { this.zoom = z; return this; },
            },
        },
        tweens: {
            add: (config) => {
                tweensAdded.push(config);
                if (config.onComplete) {
                    config.onComplete();
                }
                return { stop() {} };
            },
        },
        input: {
            defaultCursor: '',
            setDefaultCursor(c) { this.defaultCursor = c; return this; },
            listeners: {},
            on(evt, cb) { this.listeners[evt] = cb; return this; },
            emit(evt, ...args) { if (this.listeners && this.listeners[evt]) return this.listeners[evt](...args); },
            off(evt) { delete this.listeners[evt]; return this; },
            keyboard: {
                listeners: {},
                on(evt, cb) { this.listeners[evt] = cb; return this; },
                emit(evt, ...args) { if (this.listeners && this.listeners[evt]) return this.listeners[evt](...args); },
            },
        },
        game: {
            canvas: {
                style: { cursor: '' },
                toDataURL: (type) => `data:${type};base64,mockCanvasData`,
            },
        },
        getTweensAdded: () => tweensAdded,
    };
}

test('verifies all native camera HUD assets exist in prefabs/camera directory', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/camera');
    assert.ok(fs.existsSync(dir), 'prefabs/camera directory must exist');

    const expectedFiles = [
        'hud_camera_frame.png',
        'hud_camera_shutter.png',
        'hud_camera_focus.png',
        'hud_camera_close.png',
        'hud_camera_gallery.png',
        'hud_camera_player_toggle.png',
    ];

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        assert.ok(fs.existsSync(filePath), `File ${fileName} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `File ${fileName} must not be empty`);
    });
});

test('verifies exact dimensions of native camera HUD PNG files', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/camera');

    function getPngDimensions(filePath) {
        const buf = fs.readFileSync(filePath);
        return {
            width: buf.readUInt32BE(16),
            height: buf.readUInt32BE(20),
        };
    }

    const expectedDimensions = {
        'hud_camera_frame.png': { width: 1678, height: 937 },
        'hud_camera_shutter.png': { width: 247, height: 239 },
        'hud_camera_focus.png': { width: 164, height: 157 },
        'hud_camera_close.png': { width: 188, height: 98 },
        'hud_camera_gallery.png': { width: 197, height: 192 },
        'hud_camera_player_toggle.png': { width: 197, height: 192 },
    };

    for (const [fileName, expected] of Object.entries(expectedDimensions)) {
        const dims = getPngDimensions(path.join(dir, fileName));
        assert.equal(dims.width, expected.width, `${fileName} width mismatch`);
        assert.equal(dims.height, expected.height, `${fileName} height mismatch`);
    }
});

test('instantiates CameraHud prefab with initial closed state and creates display objects', () => {
    const scene = createMockScene();
    let onOpenCalled = false;
    let onCloseCalled = false;
    let onGalleryCalled = false;
    let onPhotoCaptured = null;

    const cameraHud = new CameraHud(scene, {
        onOpen: () => { onOpenCalled = true; },
        onClose: () => { onCloseCalled = true; },
        onOpenGallery: () => { onGalleryCalled = true; },
        onTakePhoto: (dataUrl) => { onPhotoCaptured = dataUrl; },
    });

    assert.equal(cameraHud.isOpen, false);
    assert.equal(cameraHud.container.visible, false);
    assert.equal(cameraHud.container.depth, 200);

    // Open CameraHud
    cameraHud.open();
    assert.equal(cameraHud.isOpen, true);
    assert.equal(cameraHud.container.visible, true);
    assert.equal(onOpenCalled, true);

    // Close via closeButton pointerdown
    cameraHud.closeButton.emit('pointerdown');
    assert.equal(cameraHud.isOpen, false);
    assert.equal(cameraHud.container.visible, false);
    assert.equal(onCloseCalled, true);

    // Toggle open
    cameraHud.toggle();
    assert.equal(cameraHud.isOpen, true);
    assert.equal(cameraHud.container.visible, true);

    // Click galleryButton
    cameraHud.galleryButton.emit('pointerdown');
    assert.equal(onGalleryCalled, true);

    // Take photo via shutterButton pointerdown
    const photoData = cameraHud.shutterButton.emit('pointerdown');
    assert.ok(onPhotoCaptured);
    assert.ok(onPhotoCaptured.startsWith('data:image/png;base64,'));

    // Toggle close
    cameraHud.toggle();
    assert.equal(cameraHud.isOpen, false);
    assert.equal(cameraHud.container.visible, false);
});

test('connects Backpack smartphone click to CameraHud open and closes backpack', () => {
    const scene = createMockScene();
    const cameraHud = new CameraHud(scene);

    const backpack = new Backpack(scene, LAYOUT.backpack.rootX, LAYOUT.backpack.rootY, LAYOUT.backpack, {
        onSelectPhone: () => {
            backpack.close();
            cameraHud.open();
        },
    });

    // Open backpack
    backpack.open();
    assert.equal(backpack.isOpen, true);
    assert.equal(cameraHud.isOpen, false);

    // Click smartphone slot (slot index 10)
    backpack.paletteHitZones[10].emit('pointerdown');
    assert.equal(backpack.isOpen, false);
    assert.equal(cameraHud.isOpen, true);
});

test('CameraHud elevates scene toolCursor to depth 300 and switches to hand cursor on open, reverts on close', () => {
    const scene = createMockScene();
    const mockToolCursor = {
        depth: 200,
        texture: 'halloffame_cursor_spraycan',
        setDepth(d) { this.depth = d; return this; },
        setTexture(k) { this.texture = k; return this; },
        setOrigin() { return this; },
        setPosition() { return this; },
        setVisible() { return this; },
    };
    scene.toolCursor = mockToolCursor;

    let updateCursorCount = 0;
    scene.updateToolCursor = () => {
        updateCursorCount++;
        const isHand = Boolean(cameraHud && cameraHud.isOpen);
        scene.toolCursor.setTexture(isHand ? 'halloffame_cursor_hand' : 'halloffame_cursor_spraycan');
    };

    // Constructing CameraHud elevates toolCursor to depth 300 (above CameraHud container depth 200)
    const cameraHud = new CameraHud(scene);
    assert.equal(mockToolCursor.depth, 300, 'Constructor must set toolCursor depth to 300');
    assert.equal(cameraHud.container.depth, 200, 'CameraHud container is at depth 200');

    // Open CameraHud
    cameraHud.open();
    assert.equal(mockToolCursor.depth, 300, 'toolCursor must remain at depth 300 on open');
    assert.equal(mockToolCursor.texture, 'halloffame_cursor_hand', 'Cursor must switch to hand cursor when HUD is open');
    assert.ok(updateCursorCount >= 1, 'scene.updateToolCursor must be called on open');

    // Close CameraHud
    cameraHud.close();
    assert.equal(mockToolCursor.texture, 'halloffame_cursor_spraycan', 'Cursor must revert to tool cursor when HUD is closed');
    assert.ok(updateCursorCount >= 2, 'scene.updateToolCursor must be called on close');
});

test('CameraHud uses Phaser renderer.snapshot when available, hiding HUD & cursor during capture and triggering flash after', () => {
    const scene = createMockScene();
    let snapshotCallback = null;
    let snapshotCalled = false;
    scene.game.renderer = {
        snapshot: (cb) => {
            snapshotCalled = true;
            snapshotCallback = cb;
        },
    };

    const mockToolCursor = {
        depth: 300,
        visible: true,
        setVisible(v) { this.visible = v; return this; },
        setDepth() { return this; },
    };
    scene.toolCursor = mockToolCursor;

    let capturedData = null;
    const cameraHud = new CameraHud(scene, {
        onTakePhoto: (data) => { capturedData = data; },
    });
    cameraHud.open();
    assert.equal(cameraHud.container.visible, true);
    assert.equal(mockToolCursor.visible, true);

    // Call takePhoto
    cameraHud.takePhoto();
    assert.equal(snapshotCalled, true, 'renderer.snapshot must be called');
    assert.equal(cameraHud.container.visible, false, 'HUD container must be hidden during snapshot');
    assert.equal(mockToolCursor.visible, false, 'toolCursor must be hidden during snapshot');

    // Simulate renderer completing snapshot
    assert.ok(snapshotCallback, 'snapshot callback must be registered');
    snapshotCallback({ src: 'data:image/png;base64,mockSceneSnapshot' });

    // After snapshot: HUD and cursor are restored, flash overlay is triggered, callback receives data
    assert.equal(cameraHud.container.visible, true, 'HUD container must be restored after snapshot');
    assert.equal(mockToolCursor.visible, true, 'toolCursor must be restored after snapshot');
    assert.equal(capturedData, 'data:image/png;base64,mockSceneSnapshot');
});

test('CameraHud provides player visibility toggle with Piece-Only default and keyboard shortcut P', () => {
    const scene = createMockScene();
    const mockPlayerContainer = {
        visible: true,
        setVisible(v) { this.visible = v; return this; },
    };
    scene.player = {
        container: mockPlayerContainer,
    };

    let toggleCallbackResult = null;
    const cameraHud = new CameraHud(scene, {
        onTogglePlayer: (visible) => { toggleCallbackResult = visible; },
    });

    // Check playerToggleButton properties
    assert.ok(cameraHud.playerToggleButton, 'playerToggleButton must exist');
    assert.equal(cameraHud.playerToggleButton.x, 1234.6);
    assert.equal(cameraHud.playerToggleButton.y, 944.6);
    assert.equal(cameraHud.playerToggleButton.alpha, 0.6);
    assert.equal(cameraHud.isPlayerVisible, false);

    // Initial state: Player container is visible before camera opens
    assert.equal(scene.player.container.visible, true);

    // Open CameraHud -> Piece-Only default (player container hidden, button alpha 0.6)
    cameraHud.open();
    assert.equal(cameraHud.isOpen, true);
    assert.equal(cameraHud.isPlayerVisible, false);
    assert.equal(scene.player.container.visible, false, 'Player container must be hidden on open (Piece-Only default)');
    assert.equal(cameraHud.playerToggleButton.alpha, 0.6);

    // Click playerToggleButton -> Toggle to visible
    cameraHud.playerToggleButton.emit('pointerdown');
    assert.equal(cameraHud.isPlayerVisible, true);
    assert.equal(scene.player.container.visible, true, 'Player container must become visible');
    assert.equal(cameraHud.playerToggleButton.alpha, 1.0, 'Button alpha must become 1.0 when player is visible');
    assert.equal(toggleCallbackResult, true);

    // Click again -> Toggle back to hidden
    cameraHud.playerToggleButton.emit('pointerdown');
    assert.equal(cameraHud.isPlayerVisible, false);
    assert.equal(scene.player.container.visible, false);
    assert.equal(cameraHud.playerToggleButton.alpha, 0.6);
    assert.equal(toggleCallbackResult, false);

    // Press key 'P' -> Toggle to visible
    scene.input.keyboard.emit('keydown-P');
    assert.equal(cameraHud.isPlayerVisible, true);
    assert.equal(scene.player.container.visible, true);
    assert.equal(cameraHud.playerToggleButton.alpha, 1.0);

    // Close CameraHud -> Player container must be reliably restored to true
    cameraHud.close();
    assert.equal(cameraHud.isOpen, false);
    assert.equal(scene.player.container.visible, true, 'Player container must be restored on camera close');
});

test('CameraHud provides zoom levels [1.0, 1.5, 2.0, 2.5] with safe clamping and UI preset buttons', () => {
    const scene = createMockScene();
    const cameraHud = new CameraHud(scene);

    assert.equal(cameraHud.zoomLevel, 1.0, 'Default zoom must be 1.0');
    assert.deepEqual(cameraHud.zoomLevels, [1.0, 1.5, 2.0, 2.5]);
    assert.equal(cameraHud.zoomButtons.length, 4, 'Must create exactly 4 zoom buttons');

    // Open CameraHud
    cameraHud.open();
    assert.equal(cameraHud.zoomLevel, 1.0);
    assert.equal(scene.cameras.main.zoom, 1.0);

    // Set zoom to 1.5
    cameraHud.setZoom(1.5);
    assert.equal(cameraHud.zoomLevel, 1.5);
    assert.equal(scene.cameras.main.zoom, 1.5);
    assert.equal(cameraHud.container.scaleX, 1 / 1.5);
    assert.equal(cameraHud.container.scaleY, 1 / 1.5);

    // Clamp below 1.0 -> strictly locked at 1.0 to prevent black borders or exit peeking
    cameraHud.setZoom(0.3);
    assert.equal(cameraHud.zoomLevel, 1.0, 'Zoom must not go below 1.0');
    assert.equal(scene.cameras.main.zoom, 1.0);

    // Clamp above 2.5 -> locked at 2.5
    cameraHud.setZoom(4.0);
    assert.equal(cameraHud.zoomLevel, 2.5, 'Zoom must not exceed 2.5');
    assert.equal(scene.cameras.main.zoom, 2.5);

    // Click 2x preset button
    const btn2x = cameraHud.zoomButtons.find(b => b.level === 2.0);
    assert.ok(btn2x, 'Must find 2.0x preset button');
    btn2x.container.emit('pointerdown');
    assert.equal(cameraHud.zoomLevel, 2.0);
    assert.equal(scene.cameras.main.zoom, 2.0);

    // Close CameraHud -> resets to 1.0
    cameraHud.close();
    assert.equal(cameraHud.zoomLevel, 1.0);
    assert.equal(scene.cameras.main.zoom, 1.0);
    assert.equal(cameraHud.container.scaleX, 1.0);
    assert.equal(cameraHud.container.x, 0);
    assert.equal(cameraHud.container.y, 0);
});

test('CameraHud supports mouse wheel stepping through zoom levels', () => {
    const scene = createMockScene();
    const cameraHud = new CameraHud(scene);

    cameraHud.open();
    assert.equal(cameraHud.zoomLevel, 1.0);

    // Wheel up (deltaY = -100) -> Zoom in to 1.5
    scene.input.emit('wheel', null, null, 0, -100);
    assert.equal(cameraHud.zoomLevel, 1.5);

    // Wheel up again -> Zoom in to 2.0
    scene.input.emit('wheel', null, null, 0, -100);
    assert.equal(cameraHud.zoomLevel, 2.0);

    // Wheel up again -> Zoom in to 2.5
    scene.input.emit('wheel', null, null, 0, -100);
    assert.equal(cameraHud.zoomLevel, 2.5);

    // Wheel up again -> Clamped at 2.5
    scene.input.emit('wheel', null, null, 0, -100);
    assert.equal(cameraHud.zoomLevel, 2.5);

    // Wheel down (deltaY = 100) -> Zoom out to 2.0
    scene.input.emit('wheel', null, null, 0, 100);
    assert.equal(cameraHud.zoomLevel, 2.0);

    // Wheel down -> 1.5
    scene.input.emit('wheel', null, null, 0, 100);
    assert.equal(cameraHud.zoomLevel, 1.5);

    // Wheel down -> 1.0
    scene.input.emit('wheel', null, null, 0, 100);
    assert.equal(cameraHud.zoomLevel, 1.0);

    // Wheel down again -> Clamped at 1.0 (no border peek)
    scene.input.emit('wheel', null, null, 0, 100);
    assert.equal(cameraHud.zoomLevel, 1.0);

    // When closed, wheel events are ignored
    cameraHud.close();
    scene.input.emit('wheel', null, null, 0, -100);
    assert.equal(cameraHud.zoomLevel, 1.0, 'Wheel must be ignored when camera is closed');
});

test('CameraHud zoom buttons and open/close methods enforce cursor none and do not use useHandCursor', () => {
    const scene = createMockScene();
    let updateCursorCalled = 0;
    scene.updateToolCursor = () => { updateCursorCalled++; };
    const cameraHud = new CameraHud(scene);

    // Zoom buttons must use centered hitArea (-42, -24, 84, 48) with hit padding and not use useHandCursor
    for (const btn of cameraHud.zoomButtons) {
        assert.ok(btn.container, 'Zoom button container must exist');
        assert.equal(
            btn.container.interactiveOptions?.useHandCursor,
            undefined,
            'Zoom button must not set useHandCursor: true'
        );
        assert.deepEqual(
            btn.container.hitArea,
            { x: -42, y: -24, width: 84, height: 48 },
            'Zoom button hitArea must be centered around (0, 0)'
        );
    }

    // Changing zoom must trigger scene.updateToolCursor to refresh cursor scale and position
    cameraHud.setZoom(1.5);
    assert.ok(updateCursorCalled > 0, 'setZoom must call scene.updateToolCursor');

    // Opening camera enforces setDefaultCursor("none") and canvas.style.cursor = "none"
    cameraHud.open();
    assert.equal(scene.input.defaultCursor, 'none', 'open() must set input defaultCursor to none');
    assert.equal(scene.game.canvas.style.cursor, 'none', 'open() must set canvas style cursor to none');

    // Closing camera also ensures defaultCursor and canvas style cursor remain none
    cameraHud.close();
    assert.equal(scene.input.defaultCursor, 'none', 'close() must keep input defaultCursor as none');
    assert.equal(scene.game.canvas.style.cursor, 'none', 'close() must keep canvas style cursor as none');
});

test('CameraHud saves photo to GalleryStorageService on photo capture and galleryButton triggers gallery open', async () => {
    const scene = createMockScene();
    const VALID_1X1_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    let savedPhoto = null;
    const mockStorage = {
        savePhoto: async (dataUrl, metadata) => {
            savedPhoto = { dataUrl, metadata };
            return savedPhoto;
        },
    };

    let galleryOpened = false;
    const cameraHud = new CameraHud(scene, {
        storage: mockStorage,
        onOpenGallery: () => {
            galleryOpened = true;
        },
    });

    // 1. Trigger gallery button
    cameraHud.galleryButton.emit('pointerdown');
    assert.equal(galleryOpened, true, 'galleryButton click must trigger onOpenGallery');

    // 2. Open camera & capture photo
    cameraHud.open();
    scene.game.renderer = {
        snapshot: (cb) => {
            cb({ src: VALID_1X1_PNG });
        },
    };

    cameraHud.takePhoto();

    assert.ok(savedPhoto, 'takePhoto must delegate to storage.savePhoto');
    assert.equal(savedPhoto.dataUrl, VALID_1X1_PNG);
    assert.equal(savedPhoto.metadata.zoom, 1.0);
    assert.ok(savedPhoto.metadata.timestamp > 0);
});





