const assert = require('node:assert/strict');
const test = require('node:test');

const { SprayCanvas } = require('../js/prefabs/SprayCanvas.js');

function createMockScene(maxTextureSize = 16384) {
    const drawCalls = [];
    const batchDrawCalls = [];
    let beginDrawCalls = 0;
    let endDrawCalls = 0;
    let clearCalls = 0;

    const mockRenderTexture = {
        x: 0,
        y: 0,
        originX: 0,
        originY: 0,
        depth: 0,
        mask: null,
        width: 0,
        height: 0,
        setOrigin(ox, oy) {
            this.originX = ox;
            this.originY = oy;
            return this;
        },
        setDepth(d) {
            this.depth = d;
            return this;
        },
        setPosition(x, y) {
            this.x = x;
            this.y = y;
            return this;
        },
        setMask(m) {
            this.mask = m;
            return this;
        },
        draw(entry, x, y) {
            drawCalls.push({ entry, x, y });
            return this;
        },
        beginDraw() {
            beginDrawCalls++;
            return this;
        },
        batchDraw(entry, x, y) {
            batchDrawCalls.push({ entry, x, y });
            return this;
        },
        endDraw() {
            endDrawCalls++;
            return this;
        },
        clear() {
            clearCalls++;
            return this;
        },
        destroy() {
            return this;
        },
    };

    const brushCommands = [];
    const mockBrush = {
        clear() {
            brushCommands.push({ type: 'clear' });
            return this;
        },
        fillStyle(color, alpha) {
            brushCommands.push({ type: 'fillStyle', color, alpha });
            return this;
        },
        fillCircle(x, y, radius) {
            brushCommands.push({ type: 'fillCircle', x, y, radius });
            return this;
        },
        destroy() {
            brushCommands.push({ type: 'destroy' });
            return this;
        },
    };

    const scene = {
        add: {
            renderTexture: (x, y, w, h) => {
                mockRenderTexture.x = x;
                mockRenderTexture.y = y;
                mockRenderTexture.width = w;
                mockRenderTexture.height = h;
                return mockRenderTexture;
            },
        },
        make: {
            graphics: () => mockBrush,
        },
        game: {
            renderer: {
                gl: {
                    MAX_TEXTURE_SIZE: 0x0D33,
                    getParameter: () => maxTextureSize,
                },
            },
        },
    };

    return {
        scene,
        mockRenderTexture,
        mockBrush,
        drawCalls,
        batchDrawCalls,
        brushCommands,
        getStats: () => ({
            drawCalls,
            batchDrawCalls,
            beginDrawCalls,
            endDrawCalls,
            clearCalls,
        }),
    };
}

test('initializes SprayCanvas with default options and hardware detection', () => {
    const { scene, mockRenderTexture } = createMockScene(16384);
    const canvas = new SprayCanvas(scene);

    assert.equal(canvas.worldWidth, 1920);
    assert.equal(canvas.worldHeight, 1080);
    assert.equal(canvas.worldOffsetX, 0);
    assert.equal(canvas.depth, 10);
    assert.equal(mockRenderTexture.width, 1920);
    assert.equal(mockRenderTexture.height, 1080);
    assert.equal(mockRenderTexture.originX, 0);
    assert.equal(mockRenderTexture.depth, 10);
});

test('clamps texture size to hardware MAX_TEXTURE_SIZE on restricted GPUs', () => {
    const { scene, mockRenderTexture } = createMockScene(4096);
    const canvas = new SprayCanvas(scene, {
        worldWidth: 11000,
        worldHeight: 1080,
        worldOffsetX: 1000,
    });

    assert.equal(canvas.maxTextureSize, 4096);
    assert.equal(mockRenderTexture.width, 4096);
    assert.equal(mockRenderTexture.height, 1080);
});

test('calculates correct originX based on worldOffsetX and textureWidth', () => {
    const { scene, mockRenderTexture } = createMockScene(16384);
    const canvas = new SprayCanvas(scene, {
        worldWidth: 8000,
        worldHeight: 1080,
        worldOffsetX: 2000,
        depth: 33,
    });

    assert.equal(canvas.worldOffsetX, 2000);
    assert.equal(mockRenderTexture.originX, 0.25);
    assert.equal(mockRenderTexture.depth, 33);
});

test('calculates correct originX when texture size is clamped on mobile GPUs', () => {
    const { scene, mockRenderTexture } = createMockScene(4096);
    const canvas = new SprayCanvas(scene, {
        worldWidth: 8000,
        worldHeight: 1080,
        worldOffsetX: 2000,
    });

    // originX = 2000 / 4096 = 0.48828125
    assert.equal(mockRenderTexture.originX, 2000 / 4096);
    // Invariant: originX * textureWidth === worldOffsetX
    assert.equal(mockRenderTexture.originX * mockRenderTexture.width, 2000);
});

test('applies bitmap mask to renderTexture when maskImage is provided', () => {
    const { scene, mockRenderTexture } = createMockScene();
    const mockMask = { isMask: true };
    const maskImage = {
        createBitmapMask: () => mockMask,
    };

    new SprayCanvas(scene, {
        maskImage,
    });

    assert.equal(mockRenderTexture.mask, mockMask);
});

test('updates offscreen brush and avoids redundant re-clearing on identical state', () => {
    const { scene, brushCommands } = createMockScene();
    const canvas = new SprayCanvas(scene);

    canvas.updateBrush(0xff0000, 0.8, 15);
    assert.equal(brushCommands.length, 3); // clear, fillStyle, fillCircle
    assert.deepEqual(brushCommands[0], { type: 'clear' });
    assert.deepEqual(brushCommands[1], { type: 'fillStyle', color: 0xff0000, alpha: 0.8 });
    assert.deepEqual(brushCommands[2], { type: 'fillCircle', x: 0, y: 0, radius: 15 });

    // Subsequent call with identical arguments -> skipped
    canvas.updateBrush(0xff0000, 0.8, 15);
    assert.equal(brushCommands.length, 3);

    // Call with changed radius -> updated
    canvas.updateBrush(0xff0000, 0.8, 25);
    assert.equal(brushCommands.length, 6);
});

test('stamps at worldX + worldOffsetX and worldY', () => {
    const { scene, drawCalls, mockBrush } = createMockScene();
    const canvas = new SprayCanvas(scene, {
        worldOffsetX: 1000,
    });

    canvas.updateBrush(0x00ff00, 0.9, 10);
    canvas.stamp(50, 200, 20, false);

    assert.equal(drawCalls.length, 1);
    assert.equal(drawCalls[0].entry, mockBrush);
    assert.equal(drawCalls[0].x, 1050); // 50 + 1000
    assert.equal(drawCalls[0].y, 200);
});

test('stampStroke batches multiple points via beginDraw and endDraw', () => {
    const { scene, getStats, mockBrush } = createMockScene();
    const canvas = new SprayCanvas(scene, {
        worldOffsetX: 500,
    });

    canvas.updateBrush(0x0000ff, 1.0, 10);
    const points = [
        { x: 100, y: 150 },
        { x: 120, y: 160 },
        { x: 140, y: 170 },
    ];

    canvas.stampStroke(points, 20);

    const stats = getStats();
    assert.equal(stats.beginDrawCalls, 1);
    assert.equal(stats.endDrawCalls, 1);
    assert.equal(stats.batchDrawCalls.length, 3);
    assert.equal(stats.batchDrawCalls[0].x, 600); // 100 + 500
    assert.equal(stats.batchDrawCalls[1].x, 620); // 120 + 500
    assert.equal(stats.batchDrawCalls[2].x, 640); // 140 + 500
    assert.equal(stats.drawCalls.length, 0);
});

test('synchronizes renderTexture position with world coordinates', () => {
    const { scene, mockRenderTexture } = createMockScene();
    const canvas = new SprayCanvas(scene);

    canvas.setPosition(-350, 0);
    assert.equal(mockRenderTexture.x, -350);
    assert.equal(mockRenderTexture.y, 0);
});

test('clears and destroys SprayCanvas cleanly', () => {
    const { scene, getStats, brushCommands } = createMockScene();
    const canvas = new SprayCanvas(scene);

    canvas.clear();
    assert.equal(getStats().clearCalls, 1);

    canvas.destroy();
    assert.equal(canvas.sprayBrush, null);
    assert.equal(canvas.renderTexture, null);
    assert.ok(brushCommands.some(cmd => cmd.type === 'destroy'));
});

const createDisplayObject = () => ({
    x: 0,
    y: 0,
    depth: 0,
    scaleX: 1,
    scaleY: 1,
    originX: 0,
    originY: 0,
    visible: true,
    children: [],
    add(items) { if (Array.isArray(items)) this.children.push(...items); else this.children.push(items); return this; },
    removeAll() { this.children = []; return this; },
    setDepth(d) { this.depth = d; return this; },
    setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
    setInteractive() { return this; },
    disableInteractive() { return this; },
    setActive() { return this; },
    setOrigin(ox, oy) { this.originX = ox; this.originY = oy !== undefined ? oy : ox; return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
    setSize() { return this; },
    setTexture() { return this; },
    setAlpha() { return this; },
    setTintFill() { return this; },
    setVisible() { return this; },
    play() { return this; },
    stop() { return this; },
    sort() { return this; },
    on() { return this; },
});

test('StreetScene instantiates SprayCanvas at depth 10 with worldWidth 8000 and worldOffsetX 2000', () => {
    const { StreetScene } = require('../js/street/StreetScene.js');
    const { scene } = createMockScene();
    const street = new StreetScene();
    street.add = {
        container: (x, y) => { const c = createDisplayObject(); c.x = x; c.y = y; return c; },
        renderTexture: scene.add.renderTexture,
        image: () => createDisplayObject(),
        sprite: () => createDisplayObject(),
        zone: (x, y) => { const z = createDisplayObject(); z.x = x; z.y = y; return z; },
    };
    street.make = scene.make;
    street.game = { canvas: { style: {} }, renderer: scene.game.renderer };
    street.anims = { exists: () => true, create: () => {} };
    street.input = { on: () => {}, keyboard: { createCursorKeys: () => ({ left: {}, right: {}, up: {}, down: {} }), addKey: () => ({}) } };
    street.events = { once: () => {} };

    street.create();

    assert.ok(street.sprayCanvas instanceof SprayCanvas);
    assert.equal(street.sprayCanvas.worldWidth, 8000);
    assert.equal(street.sprayCanvas.worldHeight, 1080);
    assert.equal(street.sprayCanvas.worldOffsetX, 2000);
    assert.equal(street.sprayCanvas.depth, 10);
    assert.equal(street.sprayEffects, street.sprayCanvas.renderTexture);
});

test('TrainyardScene instantiates SprayCanvas at depth 10 with worldWidth 11000 and worldOffsetX 1000', () => {
    const { TrainyardScene } = require('../js/trainyard/TrainyardScene.js');
    const { scene } = createMockScene();
    const trainyard = new TrainyardScene();
    trainyard.add = {
        container: (x, y) => { const c = createDisplayObject(); c.x = x; c.y = y; return c; },
        renderTexture: scene.add.renderTexture,
        image: () => createDisplayObject(),
        sprite: () => createDisplayObject(),
        zone: (x, y) => { const z = createDisplayObject(); z.x = x; z.y = y; return z; },
    };
    trainyard.make = scene.make;
    trainyard.game = { canvas: { style: {} }, renderer: scene.game.renderer };
    trainyard.anims = { exists: () => true, create: () => {} };
    trainyard.input = { on: () => {}, keyboard: { createCursorKeys: () => ({ left: {}, right: {}, up: {}, down: {} }), addKey: () => ({}) } };
    trainyard.events = { once: () => {} };

    trainyard.create();

    assert.ok(trainyard.sprayCanvas instanceof SprayCanvas);
    assert.equal(trainyard.sprayCanvas.worldWidth, 11000);
    assert.equal(trainyard.sprayCanvas.worldHeight, 1080);
    assert.equal(trainyard.sprayCanvas.worldOffsetX, 1000);
    assert.equal(trainyard.sprayCanvas.depth, 10);
    assert.equal(trainyard.sprayEffects, trainyard.sprayCanvas.renderTexture);
});
