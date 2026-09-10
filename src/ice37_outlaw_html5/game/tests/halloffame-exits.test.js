const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');
const { BOXING_FRAME_MS } = require('../js/logic/playerCombat.js');

test('provides exact native exit door positions in LAYOUT.exits', () => {
    assert.ok(Math.abs(LAYOUT.exits.leftDoor.x - (-526.417582)) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.leftDoor.y - 476.703297) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.rightDoor.x - 4125.889011) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.rightDoor.y - 476.703297) < 0.001);
});

function createHallSceneHarness() {
    class Scene {}
    const images = [];
    const zones = [];
    const makeDisplayObject = () => {
        const object = {
            x: 0,
            y: 0,
            depth: 0,
            scaleX: 1,
            scaleY: 1,
            originX: 0,
            originY: 0,
            visible: true,
            children: [],
            add(items) { this.children.push(...(Array.isArray(items) ? items : [items])); return this; },
            beginDraw() { return this; },
            batchDraw() { return this; },
            draw() { return this; },
            endDraw() { return this; },
            clear() { return this; },
            createGeometryMask() { return {}; },
            disableInteractive() { return this; },
            fillCircle() { return this; },
            fillRect() { return this; },
            lineStyle() { return this; },
            on() { return this; },
            play() { return this; },
            removeAll() { this.children = []; return this; },
            setActive() { return this; },
            setDepth(depth) { this.depth = depth; return this; },
            setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
            setDisplayOrigin() { return this; },
            setFillStyle() { return this; },
            setFlipX() { return this; },
            setInteractive() { return this; },
            setMask() { return this; },
            setOrigin(ox, oy) {
                this.originX = ox;
                this.originY = oy !== undefined ? oy : ox;
                return this;
            },
            setPosition(x, y) { this.x = x; this.y = y; return this; },
            setScale(sx, sy) {
                this.scaleX = sx;
                this.scaleY = sy !== undefined ? sy : sx;
                return this;
            },
            setSize() { return this; },
            setTexture(key) { this.key = key; return this; },
            setText() { return this; },
            setTintFill() { return this; },
            setVisible(v) { this.visible = v; return this; },
            strokeRect() { return this; },
            sort() { return this; },
            stop() { return this; },
        };
        return object;
    };
    const sandbox = {
        HallOfFameNativeLayout: require('../js/halloffame/halloffameNativeLayout.js'),
        PaintSurfaceGeometry: require('../js/logic/paintSurfaceGeometry.js'),
        SprayPaint: require('../js/logic/sprayPaint.js'),
        ToolCursor: require('../js/logic/toolCursor.js'),
        BackpackPalette: require('../js/logic/backpackPalette.js'),
        PlayerCombat: require('../js/logic/playerCombat.js'),
        Player: require('../js/prefabs/Player.js').Player,
        Backpack: require('../js/prefabs/Backpack.js').Backpack,
        SprayCanvas: require('../js/prefabs/SprayCanvas.js').SprayCanvas,
        Phaser: {
            Scene,
            Scenes: { Events: { SHUTDOWN: 'shutdown' } },
            Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: 'fade-complete' } } },
            Input: { Keyboard: { JustDown() { return false; }, KeyCodes: { A: 65, S: 83 } } },
        },
        module: { exports: {} },
    };
    const source = fs.readFileSync(path.join(__dirname, '../js/halloffame/HallOfFameScene.js'), 'utf8');
    vm.runInNewContext(`${source}\nmodule.exports = HallOfFameScene;`, sandbox);
    const scene = new sandbox.module.exports();
    scene.add = {
        container: () => makeDisplayObject(),
        graphics: () => makeDisplayObject(),
        renderTexture: () => makeDisplayObject(),
        image: (x, y, key) => {
            const image = makeDisplayObject();
            image.x = x;
            image.y = y;
            image.key = key;
            images.push(image);
            return image;
        },
        sprite: () => makeDisplayObject(),
        text: () => makeDisplayObject(),
        zone: (x, y) => {
            const zone = makeDisplayObject();
            zone.x = x;
            zone.y = y;
            zones.push(zone);
            return zone;
        },
    };
    scene.anims = { create() {}, exists() { return true; } };
    scene.cursors = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false },
    };
    scene.events = { once() {} };
    scene.game = {
        canvas: { style: {} },
        config: { resolution: 1 },
    };
    scene.cameras = {
        main: {
            fadeOut() {},
            once(_ev, cb) { cb(); },
        },
    };
    scene.input = {
        activePointer: { x: 0, y: 0 },
        keyboard: {
            addKey() { return { isDown: false }; },
            createCursorKeys() { return scene.cursors; },
        },
        on() {},
        off() {},
    };
    scene.make = {
        image: (config) => {
            const img = makeDisplayObject();
            img.x = config.x;
            img.y = config.y;
            img.key = config.key;
            img.createBitmapMask = () => ({});
            return img;
        },
    };
    scene.scene = {
        start(key) { scene.startedScene = key; },
    };
    return { cursorKeys: scene.cursors, images, scene, zones };
}

test('instantiates exit doors and shadows in worldLayer, and stage edges outside', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    assert.ok(scene.exitLeft, 'exitLeft door must exist');
    assert.ok(scene.exitShadowLeft, 'exitShadowLeft must exist');
    assert.ok(scene.exitRight, 'exitRight door must exist');
    assert.ok(scene.exitShadowRight, 'exitShadowRight must exist');
    assert.ok(scene.stageEdges, 'stageEdges must exist');

    assert.equal(scene.worldLayer.children.includes(scene.exitLeft), true);
    assert.equal(scene.worldLayer.children.includes(scene.exitShadowLeft), true);
    assert.equal(scene.worldLayer.children.includes(scene.exitRight), true);
    assert.equal(scene.worldLayer.children.includes(scene.exitShadowRight), true);
    assert.equal(scene.worldLayer.children.includes(scene.stageEdges), false);

    assert.equal(scene.exitLeft.depth, 5);
    assert.equal(scene.exitShadowLeft.depth, 4);
    assert.equal(scene.exitRight.depth, 5);
    assert.equal(scene.exitShadowRight.depth, 4);
    assert.equal(scene.stageEdges.depth, 193);
});

test('verifies exit PNG assets exist and match exact 1080p dimensions', () => {
    const assetsDir = path.join(__dirname, '../assets/images/prefabs/exits');
    const files = [
        { file: 'emergency_exit_door.png', expectedW: 656, expectedH: 629 },
        { file: 'emergency_exit_shadow.png', expectedW: 1527, expectedH: 567 },
        { file: 'hall_stage_edges.png', expectedW: 2975, expectedH: 1055 },
    ];

    for (const item of files) {
        const filePath = path.join(assetsDir, item.file);
        assert.ok(fs.existsSync(filePath), `${item.file} must exist`);

        const fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(24);
        fs.readSync(fd, header, 0, 24, 0);
        fs.closeSync(fd);

        const width = header.readUInt32BE(16);
        const height = header.readUInt32BE(20);
        assert.equal(width, item.expectedW, `${item.file} width must be ${item.expectedW}`);
        assert.equal(height, item.expectedH, `${item.file} height must be ${item.expectedH}`);
    }
});

test('verifies BootScene preloads exit PNG assets with 1080p_hd cache-buster', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    assert.ok(
        bootSource.includes("this.load.image('halloffame_exit_door', 'assets/images/prefabs/exits/emergency_exit_door.png?v=1080p_hd');"),
        'BootScene must preload emergency_exit_door.png'
    );
    assert.ok(
        bootSource.includes("this.load.image('halloffame_exit_shadow', 'assets/images/prefabs/exits/emergency_exit_shadow.png?v=1080p_hd');"),
        'BootScene must preload emergency_exit_shadow.png'
    );
    assert.ok(
        bootSource.includes("this.load.image('halloffame_stage_edges', 'assets/images/prefabs/exits/hall_stage_edges.png?v=1080p_hd');"),
        'BootScene must preload hall_stage_edges.png'
    );
});

test('sets 1:1 scale for exit doors, shadows, and stage edges, mirroring the right exit', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    assert.equal(scene.exitLeft.scaleX, 1.0);
    assert.equal(scene.exitLeft.scaleY, 1.0);
    assert.equal(scene.exitShadowLeft.scaleX, 1.0);
    assert.equal(scene.exitShadowLeft.scaleY, 1.0);
    assert.equal(scene.exitRight.scaleX, -1.0);
    assert.equal(scene.exitRight.scaleY, 1.0);
    assert.equal(scene.exitShadowRight.scaleX, -1.0);
    assert.equal(scene.exitShadowRight.scaleY, 1.0);
    assert.equal(scene.stageEdges.scaleX, 1.0);
    assert.equal(scene.stageEdges.scaleY, 1.0);
});

test('detects exit collision when player reaches left or right door in HallOfFame', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    // Initial position: player at 960, worldLayer.x at 0
    scene.worldLayer.x = 0;
    assert.equal(scene.hasReachedExit(), false);

    // Left door reached (leftDoor.x + worldLayer.x ≈ 960)
    scene.worldLayer.x = LAYOUT.player.rootX - LAYOUT.exits.leftDoor.x;
    assert.equal(scene.hasReachedExit(), true);

    // Move away from left door
    scene.worldLayer.x = 500;
    assert.equal(scene.hasReachedExit(), false);

    // Right door reached (rightDoor.x + worldLayer.x ≈ 960)
    scene.worldLayer.x = LAYOUT.player.rootX - LAYOUT.exits.rightDoor.x;
    assert.equal(scene.hasReachedExit(), true);
});

test('handles returnToMenu transition and prevents duplicate triggers', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    assert.equal(scene.isLeavingHallOfFame, false);
    scene.returnToMenu();
    assert.equal(scene.isLeavingHallOfFame, true);
    assert.equal(scene.startedScene, 'MenuScene');

    // hasReachedExit() returns false once isLeavingHallOfFame is true
    assert.equal(scene.hasReachedExit(), false);

    // Calling returnToMenu again is safely guarded
    scene.startedScene = null;
    scene.returnToMenu();
    assert.equal(scene.startedScene, null);
});

test('keeps paint graphics outside the world container and synchronizes their offset without independent mask movement', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    assert.equal(scene.worldLayer.children.includes(scene.sprayEffects), false);
    assert.equal(scene.sprayCanvas.chunks.length, 1);
    assert.equal(scene.sprayCanvas.chunks[0].renderTexture.x, scene.layout.paintmask.x);
    assert.equal(scene.sprayCanvas.chunks[0].maskImage.x, scene.layout.paintmask.x);

    scene.worldLayer.x = -75;
    scene.syncSprayMaskWorldPosition();
    assert.equal(scene.sprayCanvas.chunks[0].renderTexture.x, scene.layout.paintmask.x - 75);
    assert.equal(scene.sprayCanvas.chunks[0].maskImage.x, scene.layout.paintmask.x - 75);
    assert.equal(scene.maskImage, undefined);
});

test('keeps every player presentation above the clipped paint layer', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    assert.equal(scene.sprayEffects.depth, 33);
    assert.equal(scene.playerShadow.depth, 36);
    assert.equal(scene.idleSprayer.depth, 37);
    assert.equal(scene.walkingSprayer.depth, 37);
    assert.equal(scene.boxingSprayer.depth, 37);
    assert.equal(scene.kickSprayer.depth, 37);
});

test('groups player shadow and sprites inside unified playerContainer', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    assert.ok(scene.playerContainer);
    assert.equal(scene.playerContainer.depth, 37);
    assert.ok(scene.playerContainer.children.includes(scene.playerShadow));
    assert.ok(scene.playerContainer.children.includes(scene.idleSprayer));
    assert.ok(scene.playerContainer.children.includes(scene.walkingSprayer));
    assert.ok(scene.playerContainer.children.includes(scene.boxingSprayer));
    assert.ok(scene.playerContainer.children.includes(scene.kickSprayer));
});

test('scrolls worldLayer and triggers returnToMenu when player reaches exit during update', () => {
    const { scene } = createHallSceneHarness();
    scene.create();

    // Position worldLayer right at the left door threshold
    scene.worldLayer.x = LAYOUT.player.rootX - LAYOUT.exits.leftDoor.x;
    scene.update(0, 100);

    assert.equal(scene.isLeavingHallOfFame, true);
    assert.equal(scene.startedScene, 'MenuScene');
});

test('blocks world scrolling while player is boxing in Hall of Fame', () => {
    const { scene, cursorKeys } = createHallSceneHarness();
    scene.create();

    const startX = scene.worldLayer.x;
    const flashStep = scene.worldScrollSpeed * (BOXING_FRAME_MS / 1000);

    cursorKeys.right.isDown = true;
    cursorKeys.up.isDown = true;
    scene.update(0, 16);
    assert.ok(Math.abs(scene.worldLayer.x - (startX - flashStep)) < 1e-9);

    const afterStartSlide = scene.worldLayer.x;
    scene.update(16, 100);
    assert.equal(scene.worldLayer.x, afterStartSlide);

    cursorKeys.up.isDown = false;
    for (let updateIndex = 0; updateIndex < 11; updateIndex += 1) {
        scene.update(116 + updateIndex * 40, 40);
        assert.equal(scene.worldLayer.x, afterStartSlide);
    }

    scene.update(556, 40);
    assert.ok(scene.worldLayer.x < afterStartSlide);

    const { scene: leftScene, cursorKeys: leftKeys } = createHallSceneHarness();
    leftScene.create();
    const leftStartX = leftScene.worldLayer.x;

    leftKeys.left.isDown = true;
    leftKeys.up.isDown = true;
    leftScene.update(0, 16);
    assert.ok(Math.abs(leftScene.worldLayer.x - (leftStartX + flashStep)) < 1e-9);

    const { scene: stationaryScene, cursorKeys: stationaryKeys } = createHallSceneHarness();
    stationaryScene.create();
    const stationaryStartX = stationaryScene.worldLayer.x;

    stationaryKeys.up.isDown = true;
    stationaryScene.update(0, 16);
    assert.equal(stationaryScene.worldLayer.x, stationaryStartX);
});
