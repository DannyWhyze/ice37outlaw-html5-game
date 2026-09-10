const assert = require('node:assert/strict');
const test = require('node:test');

const { SprayCanvas } = require('../js/prefabs/SprayCanvas.js');

const createDisplayObject = () => ({
    x: 0,
    y: 0,
    originX: 0,
    originY: 0,
    scaleX: 1,
    scaleY: 1,
    depth: 0,
    width: 0,
    height: 0,
    visible: true,
    active: true,
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
    setVisible(v) { this.visible = v; return this; },
    play() { return this; },
    stop() { return this; },
    sort() { return this; },
    on() { return this; },
});

function createMockScene(maxTextureSize = 16384) {
    const drawCalls = [];
    const batchDrawCalls = [];
    let beginDrawCalls = 0;
    let endDrawCalls = 0;
    let clearCalls = 0;

    const renderTextures = [];
    const images = [];

    function createMockRenderTexture(x, y, w, h) {
        const rt = {
            x,
            y,
            originX: 0,
            originY: 0,
            depth: 0,
            mask: null,
            width: w,
            height: h,
            drawCalls: [],
            batchDrawCalls: [],
            beginDrawCalls: 0,
            endDrawCalls: 0,
            clearCalls: 0,
            destroyed: false,
            setOrigin(ox, oy) {
                this.originX = ox;
                this.originY = oy;
                return this;
            },
            setDepth(d) {
                this.depth = d;
                return this;
            },
            setPosition(newX, newY) {
                this.x = newX;
                this.y = newY;
                return this;
            },
            setMask(m) {
                this.mask = m;
                return this;
            },
            clearMask(destroyMask) {
                this.mask = null;
                return this;
            },
            draw(entry, drawX, drawY) {
                this.drawCalls.push({ entry, x: drawX, y: drawY });
                drawCalls.push({ entry, x: drawX, y: drawY });
                return this;
            },
            beginDraw() {
                this.beginDrawCalls++;
                beginDrawCalls++;
                return this;
            },
            batchDraw(entry, drawX, drawY) {
                this.batchDrawCalls.push({ entry, x: drawX, y: drawY });
                batchDrawCalls.push({ entry, x: drawX, y: drawY });
                return this;
            },
            endDraw() {
                this.endDrawCalls++;
                endDrawCalls++;
                return this;
            },
            clear() {
                this.clearCalls++;
                clearCalls++;
                return this;
            },
            destroy() {
                this.destroyed = true;
                return this;
            },
        };
        return rt;
    }

    const defaultRenderTexture = createMockRenderTexture(0, 0, 0, 0);

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
                if (renderTextures.length === 0) {
                    defaultRenderTexture.x = x;
                    defaultRenderTexture.y = y;
                    defaultRenderTexture.width = w;
                    defaultRenderTexture.height = h;
                    renderTextures.push(defaultRenderTexture);
                    return defaultRenderTexture;
                }
                const rt = createMockRenderTexture(x, y, w, h);
                renderTextures.push(rt);
                return rt;
            },
            image: (x, y, key) => {
                const img = createDisplayObject();
                img.x = x;
                img.y = y;
                img.key = key;
                img.destroyed = false;
                img.createBitmapMask = function () {
                    return {
                        type: 'BitmapMask',
                        image: this,
                        destroyed: false,
                        destroy: function () {
                            this.destroyed = true;
                        },
                    };
                };
                img.destroy = function () {
                    this.destroyed = true;
                    return this;
                };
                images.push(img);
                return img;
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
        mockRenderTexture: defaultRenderTexture,
        renderTextures,
        images,
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

test('StreetScene instantiates SprayCanvas in mask-local surface chunks mode with 2 chunks', () => {
    const { StreetScene } = require('../js/street/StreetScene.js');
    const { scene } = createMockScene(4096);
    const street = new StreetScene();
    street.add = {
        container: (x, y) => { const c = createDisplayObject(); c.x = x; c.y = y; return c; },
        renderTexture: scene.add.renderTexture,
        image: scene.add.image,
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
    assert.equal(street.sprayCanvas.isSurfaceMode, true);
    assert.deepEqual(street.sprayCanvas.surfaceBounds, street.layout.paintmask);
    assert.equal(street.sprayCanvas.chunks.length, 2);
    assert.equal(street.sprayCanvas.depth, 10);
    assert.equal(street.sprayEffects, street.sprayCanvas.renderTexture);
});

test('TrainyardScene instantiates SprayCanvas in mask-local surface chunks mode with 2 chunks', () => {
    const { TrainyardScene } = require('../js/trainyard/TrainyardScene.js');
    const { scene } = createMockScene(4096);
    const trainyard = new TrainyardScene();
    trainyard.add = {
        container: (x, y) => { const c = createDisplayObject(); c.x = x; c.y = y; return c; },
        renderTexture: scene.add.renderTexture,
        image: scene.add.image,
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
    assert.equal(trainyard.sprayCanvas.isSurfaceMode, true);
    assert.deepEqual(trainyard.sprayCanvas.surfaceBounds, trainyard.layout.paintmask);
    assert.equal(trainyard.sprayCanvas.chunks.length, 2);
    assert.equal(trainyard.sprayCanvas.depth, 10);
    assert.equal(trainyard.sprayEffects, trainyard.sprayCanvas.renderTexture);
});

test('HallOfFameScene instantiates SprayCanvas in mask-local surface chunks mode with 1 chunk', () => {
    const { HallOfFameNativeLayout } = require('../js/halloffame/halloffameNativeLayout.js');
    const fs = require('fs');
    const path = require('path');
    const vm = require('vm');
    const { scene } = createMockScene(4096);

    const sandbox = {
        HallOfFameNativeLayout: require('../js/halloffame/halloffameNativeLayout.js'),
        PaintSurfaceGeometry: require('../js/logic/paintSurfaceGeometry.js'),
        SprayPaint: require('../js/logic/sprayPaint.js'),
        ToolCursor: require('../js/logic/toolCursor.js'),
        BackpackPalette: require('../js/logic/backpackPalette.js'),
        PlayerCombat: require('../js/logic/playerCombat.js'),
        Player: require('../js/prefabs/Player.js').Player,
        Backpack: require('../js/prefabs/Backpack.js').Backpack,
        SprayCanvas: SprayCanvas,
        Phaser: {
            Scene: class {},
            Scenes: { Events: { SHUTDOWN: 'shutdown' } },
            Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: 'fade-complete' } } },
            Input: { Keyboard: { JustDown() { return false; }, KeyCodes: { A: 65, S: 83 } } },
        },
        module: { exports: {} },
    };
    const source = fs.readFileSync(path.join(__dirname, '../js/halloffame/HallOfFameScene.js'), 'utf8');
    vm.runInNewContext(`${source}\nmodule.exports = HallOfFameScene;`, sandbox);

    const hof = new sandbox.module.exports();
    hof.add = {
        container: (x, y) => { const c = createDisplayObject(); c.x = x; c.y = y; return c; },
        renderTexture: scene.add.renderTexture,
        image: scene.add.image,
        sprite: () => createDisplayObject(),
        zone: (x, y) => { const z = createDisplayObject(); z.x = x; z.y = y; return z; },
    };
    hof.make = scene.make;
    hof.game = { canvas: { style: {} }, renderer: scene.game.renderer };
    hof.anims = { exists: () => true, create: () => {} };
    hof.input = { on: () => {}, keyboard: { createCursorKeys: () => ({ left: {}, right: {}, up: {}, down: {} }), addKey: () => ({}) } };
    hof.events = { once: () => {} };

    hof.create();

    assert.ok(hof.sprayCanvas instanceof SprayCanvas);
    assert.equal(hof.sprayCanvas.isSurfaceMode, true);
    assert.deepEqual(hof.sprayCanvas.surfaceBounds, hof.layout.paintmask);
    assert.equal(hof.sprayCanvas.chunks.length, 1);
    assert.equal(hof.sprayCanvas.depth, 33);
    assert.equal(hof.sprayEffects, hof.sprayCanvas.renderTexture);
});

test('initializes SprayCanvas in mask-local surface chunks mode with separate masks and exact dimensions', () => {
    const { scene, renderTextures, images } = createMockScene(4096);
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    const canvas = new SprayCanvas(scene, {
        surfaceBounds: streetBounds,
        chunkWidth: 4096,
        maskKeys: ['street_chunk_0', 'street_chunk_1'],
        depth: 10,
    });

    assert.equal(canvas.chunks.length, 2);
    assert.equal(renderTextures.length, 2);
    assert.equal(images.length, 2);

    // Chunk 0
    assert.equal(canvas.chunks[0].renderTexture, renderTextures[0]);
    assert.equal(canvas.chunks[0].maskImage, images[0]);
    assert.equal(renderTextures[0].width, 4096);
    assert.equal(renderTextures[0].height, 1393);
    assert.equal(renderTextures[0].originX, 0);
    assert.equal(renderTextures[0].originY, 0);
    assert.equal(images[0].key, 'street_chunk_0');
    assert.equal(images[0].visible, false);
    assert.equal(images[0].originX, 0);
    assert.equal(images[0].originY, 0);

    // Chunk 1
    assert.equal(canvas.chunks[1].renderTexture, renderTextures[1]);
    assert.equal(canvas.chunks[1].maskImage, images[1]);
    assert.equal(renderTextures[1].width, 1134);
    assert.equal(renderTextures[1].height, 1393);
    assert.equal(renderTextures[1].originX, 0);
    assert.equal(renderTextures[1].originY, 0);
    assert.equal(images[1].key, 'street_chunk_1');
    assert.equal(images[1].visible, false);

    // Separate BitmapMask instances
    assert.ok(canvas.chunks[0].bitmapMask);
    assert.ok(canvas.chunks[1].bitmapMask);
    assert.notEqual(canvas.chunks[0].bitmapMask, canvas.chunks[1].bitmapMask);
});

test('SprayCanvas throws if maskKeys count does not match generated chunks count', () => {
    const { scene } = createMockScene(4096);
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    assert.throws(() => new SprayCanvas(scene, {
        surfaceBounds: streetBounds,
        chunkWidth: 4096,
        maskKeys: ['single_key_only'],
    }), /Mismatch between generated chunks count.*maskKeys length/);
});

test('synchronously moves both renderTextures and maskImages on setPosition in chunked mode', () => {
    const { scene } = createMockScene(4096);
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    const canvas = new SprayCanvas(scene, {
        surfaceBounds: streetBounds,
        chunkWidth: 4096,
        maskKeys: ['street_chunk_0', 'street_chunk_1'],
    });

    const scrollX = 500;
    const scrollY = 50;
    canvas.setPosition(scrollX, scrollY);

    // Chunk 0
    const expected0X = scrollX + streetBounds.x;
    const expected0Y = scrollY + streetBounds.y;
    assert.equal(canvas.chunks[0].renderTexture.x, expected0X);
    assert.equal(canvas.chunks[0].maskImage.x, expected0X);
    assert.equal(canvas.chunks[0].renderTexture.y, expected0Y);
    assert.equal(canvas.chunks[0].maskImage.y, expected0Y);

    // Chunk 1
    const expected1X = scrollX + streetBounds.x + 4096;
    const expected1Y = scrollY + streetBounds.y;
    assert.equal(canvas.chunks[1].renderTexture.x, expected1X);
    assert.equal(canvas.chunks[1].maskImage.x, expected1X);
    assert.equal(canvas.chunks[1].renderTexture.y, expected1Y);
    assert.equal(canvas.chunks[1].maskImage.y, expected1Y);
});

test('stamps into correct chunk and handles seam crossing in chunked mode', () => {
    const { scene } = createMockScene(4096);
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    const canvas = new SprayCanvas(scene, {
        surfaceBounds: streetBounds,
        chunkWidth: 4096,
        maskKeys: ['street_chunk_0', 'street_chunk_1'],
    });

    // 1. Stamp within chunk 0
    canvas.stamp(-1000, 100, 10);
    assert.equal(canvas.chunks[0].renderTexture.drawCalls.length, 1);
    assert.equal(canvas.chunks[1].renderTexture.drawCalls.length, 0);
    assert.equal(canvas.chunks[0].renderTexture.drawCalls[0].x, -1000 - streetBounds.x);
    assert.equal(canvas.chunks[0].renderTexture.drawCalls[0].y, 100 - streetBounds.y);

    // 2. Stamp within chunk 1
    canvas.stamp(3000, 100, 10);
    assert.equal(canvas.chunks[0].renderTexture.drawCalls.length, 1);
    assert.equal(canvas.chunks[1].renderTexture.drawCalls.length, 1);
    assert.equal(canvas.chunks[1].renderTexture.drawCalls[0].x, 3000 - (streetBounds.x + 4096));

    // 3. Stamp crossing seam at u = 4096 (worldX = streetBounds.x + 4096 = 2680.4395604395604)
    const seamX = streetBounds.x + 4096;
    canvas.stamp(seamX, 200, 20);
    // Both chunks receive a draw call
    assert.equal(canvas.chunks[0].renderTexture.drawCalls.length, 2);
    assert.equal(canvas.chunks[1].renderTexture.drawCalls.length, 2);

    // 4. Stamp completely outside surface bounds
    canvas.stamp(-2000, 100, 10);
    assert.equal(canvas.chunks[0].renderTexture.drawCalls.length, 2);
    assert.equal(canvas.chunks[1].renderTexture.drawCalls.length, 2);
});

test('stampStroke opens and closes batchDraw only on touched chunks', () => {
    const { scene } = createMockScene(4096);
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    const canvas = new SprayCanvas(scene, {
        surfaceBounds: streetBounds,
        chunkWidth: 4096,
        maskKeys: ['street_chunk_0', 'street_chunk_1'],
    });

    // Stroke exclusively in chunk 0
    const pointsChunk0 = [
        { x: -1000, y: 100 },
        { x: -950, y: 100 },
        { x: -900, y: 100 },
    ];
    canvas.stampStroke(pointsChunk0, 10);

    assert.equal(canvas.chunks[0].renderTexture.beginDrawCalls, 1);
    assert.equal(canvas.chunks[0].renderTexture.endDrawCalls, 1);
    assert.equal(canvas.chunks[1].renderTexture.beginDrawCalls, 0);
    assert.equal(canvas.chunks[1].renderTexture.endDrawCalls, 0);

    // Stroke crossing from chunk 0 into chunk 1 across seam (seam = 2680.4395604395604)
    const seamX = streetBounds.x + 4096;
    const pointsCrossing = [
        { x: seamX - 20, y: 100 },
        { x: seamX + 20, y: 100 },
    ];
    canvas.stampStroke(pointsCrossing, 10);

    assert.equal(canvas.chunks[0].renderTexture.beginDrawCalls, 2);
    assert.equal(canvas.chunks[0].renderTexture.endDrawCalls, 2);
    assert.equal(canvas.chunks[1].renderTexture.beginDrawCalls, 1);
    assert.equal(canvas.chunks[1].renderTexture.endDrawCalls, 1);
});

test('clears and destroys all chunks and resources in chunked mode', () => {
    const { scene } = createMockScene(4096);
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    const canvas = new SprayCanvas(scene, {
        surfaceBounds: streetBounds,
        chunkWidth: 4096,
        maskKeys: ['street_chunk_0', 'street_chunk_1'],
    });

    canvas.clear();
    assert.equal(canvas.chunks[0].renderTexture.clearCalls, 1);
    assert.equal(canvas.chunks[1].renderTexture.clearCalls, 1);

    const chunk0RT = canvas.chunks[0].renderTexture;
    const chunk1RT = canvas.chunks[1].renderTexture;
    const chunk0Img = canvas.chunks[0].maskImage;
    const chunk1Img = canvas.chunks[1].maskImage;
    const chunk0Mask = canvas.chunks[0].bitmapMask;
    const chunk1Mask = canvas.chunks[1].bitmapMask;

    canvas.destroy();
    assert.equal(chunk0RT.destroyed, true);
    assert.equal(chunk1RT.destroyed, true);
    assert.equal(chunk0Img.destroyed, true);
    assert.equal(chunk1Img.destroyed, true);
    assert.equal(chunk0Mask.destroyed, true);
    assert.equal(chunk1Mask.destroyed, true);
    assert.equal(canvas.chunks.length, 0);
});
