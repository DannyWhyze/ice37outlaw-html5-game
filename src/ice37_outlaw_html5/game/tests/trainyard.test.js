const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { LAYOUT } = require('../js/trainyard/trainyardNativeLayout.js');
const { TrainyardScene } = require('../js/trainyard/TrainyardScene.js');
const { BOXING_FRAME_MS, KICK_FRAME_MS } = require('../js/logic/playerCombat.js');
const MenuNavigation = require('../js/menuNavigation.js');

test('verifies trainyard_background.jpg asset exists and matches 145.jpg', () => {
    const bgPath = path.join(__dirname, '../assets/images/trainyard/trainyard_background.jpg');
    assert.ok(fs.existsSync(bgPath), 'trainyard_background.jpg must exist in assets/images/trainyard/');
    const stats = fs.statSync(bgPath);
    assert.equal(stats.size, 157449, 'trainyard_background.jpg must be exactly 157,449 bytes');
});

test('provides exact native 1920x1080 canvas and stage dimensions for Trainyard', () => {
    assert.equal(LAYOUT.canvas.width, 1920);
    assert.equal(LAYOUT.canvas.height, 1080);
    assert.equal(LAYOUT.canvas.resolution, 1);
    assert.equal(LAYOUT.stage.width, 1920);
    assert.ok(Math.abs(LAYOUT.stage.height - 1054.945055) < 0.001);
    assert.ok(Math.abs(LAYOUT.stage.offsetY - 12.527473) < 0.001);
});

test('provides exact native trainyard background panorama placement', () => {
    assert.ok(Math.abs(LAYOUT.background.width - 9592.967033) < 0.001);
    assert.ok(Math.abs(LAYOUT.background.height - 1054.945055) < 0.001);
    assert.ok(Math.abs(LAYOUT.background.x - (-597.802198)) < 0.001);
    assert.ok(Math.abs(LAYOUT.background.y - 12.527473) < 0.001);
});

test('provides exact native trainyard scroll speed matching Flash tempo 6', () => {
    assert.ok(Math.abs(LAYOUT.scroll.worldScrollSpeed - 527.472527) < 0.001);
    assert.ok(Math.abs(LAYOUT.scroll.initialScroll - 527.472527) < 0.001);
});

test('provides exact native player root matching center in Trainyard', () => {
    assert.equal(LAYOUT.player.rootX, 960.0);
    assert.ok(Math.abs(LAYOUT.player.rootY - 548.565385) < 0.001);
});

test('provides exact native backpack root and scale in Trainyard', () => {
    assert.ok(Math.abs(LAYOUT.backpack.rootX - 3.164835) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.rootY - 830.912637) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.scale - 2.461538) < 0.001);
});

test('provides exact native exit door positions for Trainyard', () => {
    assert.ok(Math.abs(LAYOUT.exits.leftDoor.x - (-526.417582)) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.leftDoor.y - 476.703297) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.rightDoor.x - 8918.857143) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.rightDoor.y - 476.703297) < 0.001);
});

test('marks TrainyardScene as available in MenuNavigation when registered', () => {
    const registeredSceneKeys = [
        'BootScene',
        'StartScene',
        'MenuScene',
        'HomeScene',
        'HallOfFameScene',
        'StreetScene',
        'TrainyardScene',
    ];
    const menuItem = { id: 'train', texture: 'btn_train_hover', y: 204, scene: 'TrainyardScene' };
    const navState = MenuNavigation.getMenuNavigationState(menuItem, registeredSceneKeys);

    assert.equal(navState.isAvailable, true);
    assert.equal(navState.sceneKey, 'TrainyardScene');
});

function createMockTrainyardScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        visible: true,
        children: [],
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setInteractive() { return this; },
        disableInteractive() { return this; },
        setActive(a) { this.active = a; return this; },
        setOrigin() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setSize() { return this; },
        setTexture(k) { this.texture = k; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setTintFill() { return this; },
        setVisible(v) { this.visible = v; return this; },
        play() { return this; },
        stop() { return this; },
        on() { return this; },
    });

    const cursorKeys = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false },
    };
    const actionKey = { isDown: false };

    global.Phaser = {
        Scene: class {},
        Scenes: {
            Events: { SHUTDOWN: 'shutdown' },
        },
        Cameras: {
            Scene2D: {
                Events: { FADE_OUT_COMPLETE: 'fade-complete' },
            },
        },
        Input: {
            Keyboard: {
                KeyCodes: { A: 65, S: 83, ESC: 27 },
                JustDown: (k) => Boolean(k && k.justDown),
            },
        },
    };

    const scene = new TrainyardScene();
    scene.add = {
        container: (x, y) => {
            const c = makeDisplayObject();
            c.x = x;
            c.y = y;
            return c;
        },
        graphics: () => {
            const g = makeDisplayObject();
            g.fillStyle = () => g;
            g.fillCircle = () => g;
            g.setMask = () => g;
            g.clear = () => g;
            g.lineStyle = () => g;
            g.strokeRect = () => g;
            return g;
        },
        renderTexture: () => {
            const rt = makeDisplayObject();
            rt.setOrigin = () => rt;
            rt.setMask = () => rt;
            rt.draw = () => rt;
            rt.beginDraw = () => rt;
            rt.batchDraw = () => rt;
            rt.endDraw = () => rt;
            rt.clear = () => rt;
            return rt;
        },
        image: () => makeDisplayObject(),
        sprite: () => makeDisplayObject(),
        zone: (x, y) => {
            const z = makeDisplayObject();
            z.x = x;
            z.y = y;
            return z;
        },
    };
    scene.make = {
        image: () => {
            const img = makeDisplayObject();
            img.createBitmapMask = () => ({});
            return img;
        },
        graphics: () => {
            const g = makeDisplayObject();
            g.fillStyle = () => g;
            g.fillCircle = () => g;
            g.clear = () => g;
            return g;
        },
    };
    scene.anims = {
        exists: () => true,
        create: () => {},
    };
    scene.game = {
        canvas: { style: { cursor: '' } },
    };
    scene.cameras = {
        main: {
            fadeOut() {},
            once(_ev, cb) { cb(); },
        },
    };
    scene.scene = {
        start(key) { scene.startedScene = key; },
    };
    const keys = new Map();
    const getKey = (code) => {
        if (!keys.has(code)) keys.set(code, { code, isDown: false, justDown: false });
        return keys.get(code);
    };
    scene.input = {
        keyboard: {
            createCursorKeys: () => cursorKeys,
            addKey: (code) => getKey(code),
        },
        on() {},
    };
    scene.events = {
        once() {},
    };

    return { scene, cursorKeys, actionKey, getKey };
}

test('instantiates TrainyardScene and creates worldLayer, background, exits, player, cop and backpack', () => {
    const { scene } = createMockTrainyardScene();
    scene.create();

    assert.ok(scene.worldLayer, 'worldLayer must exist');
    assert.ok(scene.background, 'background must exist');
    assert.equal(scene.background.width, LAYOUT.background.width);
    assert.equal(scene.background.height, LAYOUT.background.height);
    assert.ok(scene.exitLeft, 'exitLeft door must exist');
    assert.ok(scene.exitRight, 'exitRight door must exist');
    assert.ok(scene.player, 'Player prefab must be instantiated');
    assert.ok(scene.cop, 'Cop prefab must be instantiated');
    assert.equal(scene.cop.x, 1350);
    assert.equal(scene.cop.y, LAYOUT.player.rootY + LAYOUT.player.walkHeight);
    assert.equal(scene.cop.isFacingLeft, true);
    assert.equal(scene.cop.isSpawned, false);
    assert.equal(scene.cop.container.visible, false);
    assert.ok(scene.copSpawner, 'copSpawner must exist');
    assert.equal(scene.copSpawner.copdichte, 350);
    assert.ok(scene.backpack, 'Backpack prefab must be instantiated');
});

test('positions Cop in copLayer at depth 35 in front of sprayEffects (depth 10) in Trainyard', () => {
    const { scene } = createMockTrainyardScene();
    scene.create();

    assert.ok(scene.copLayer, 'copLayer container must exist');
    assert.equal(scene.copLayer.depth, 35);
    assert.equal(scene.sprayEffects.depth, 10);
    assert.ok(scene.copLayer.depth > scene.sprayEffects.depth, 'Cop must render in front of spray effects');
    assert.equal(scene.copLayer.children.includes(scene.cop.container), true);
    assert.equal(scene.worldLayer.children.includes(scene.cop.container), false);

    // Scroll worldLayer -> copLayer must synchronize position
    scene.worldLayer.x = -300;
    scene.syncPaintWorldPosition();
    assert.equal(scene.copLayer.x, -300);
});

test('scrolls worldLayer when moving left or right in Trainyard', () => {
    const { scene, cursorKeys } = createMockTrainyardScene();
    scene.create();

    const startX = scene.worldLayer.x;

    // Move right -> world scrolls left (x decreases)
    cursorKeys.right.isDown = true;
    cursorKeys.left.isDown = false;
    scene.update(0, 100);
    assert.ok(scene.worldLayer.x < startX, 'worldLayer should scroll left when moving right');

    // Move left -> world scrolls right (x increases)
    const midX = scene.worldLayer.x;
    cursorKeys.right.isDown = false;
    cursorKeys.left.isDown = true;
    scene.update(0, 100);
    assert.ok(scene.worldLayer.x > midX, 'worldLayer should scroll right when moving left');
});

test('blocks world scrolling while player is boxing in Trainyard', () => {
    const { scene, cursorKeys } = createMockTrainyardScene();
    scene.create();
    scene.copSpawner = null;

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

    const { scene: leftScene, cursorKeys: leftKeys } = createMockTrainyardScene();
    leftScene.create();
    leftScene.copSpawner = null;
    const leftStartX = leftScene.worldLayer.x;

    leftKeys.left.isDown = true;
    leftKeys.up.isDown = true;
    leftScene.update(0, 16);
    assert.ok(Math.abs(leftScene.worldLayer.x - (leftStartX + flashStep)) < 1e-9);

    const { scene: stationaryScene, cursorKeys: stationaryKeys } = createMockTrainyardScene();
    stationaryScene.create();
    stationaryScene.copSpawner = null;
    const stationaryStartX = stationaryScene.worldLayer.x;

    stationaryKeys.up.isDown = true;
    stationaryScene.update(0, 16);
    assert.equal(stationaryScene.worldLayer.x, stationaryStartX);
});

test('blocks world scrolling while player is kicking in Trainyard', () => {
    const { scene, cursorKeys } = createMockTrainyardScene();
    scene.create();
    scene.copSpawner = null;

    const startX = scene.worldLayer.x;
    const flashStep = scene.worldScrollSpeed * (KICK_FRAME_MS / 1000);

    cursorKeys.right.isDown = true;
    cursorKeys.down.isDown = true;
    scene.update(0, 16);
    assert.ok(Math.abs(scene.worldLayer.x - (startX - flashStep)) < 1e-9);

    const afterStartSlide = scene.worldLayer.x;
    scene.update(16, 100);
    assert.equal(scene.worldLayer.x, afterStartSlide);

    cursorKeys.down.isDown = false;
    for (let updateIndex = 0; updateIndex < 10; updateIndex += 1) {
        scene.update(116 + updateIndex * 40, 40);
        assert.equal(scene.worldLayer.x, afterStartSlide);
    }

    scene.update(516, 40);
    assert.ok(scene.worldLayer.x < afterStartSlide);
});

test('detects when player reaches exit door in Trainyard', () => {
    const { scene } = createMockTrainyardScene();
    scene.create();

    // Initially player is at 960 and left door is at -526.42 + 0 -> distance > 1000, not at exit
    assert.equal(scene.hasReachedExit(), false);

    // Scroll world so that left door reaches player (leftDoor.x + worldLayer.x ≈ 960)
    scene.worldLayer.x = 960 - LAYOUT.exits.leftDoor.x;
    assert.equal(scene.hasReachedExit(), true);
});

test('verifies trainyard_paintmask.png asset exists and matches 7414x500 dimensions', () => {
    const maskPath = path.join(__dirname, '../assets/images/trainyard/trainyard_paintmask.png');
    assert.ok(fs.existsSync(maskPath), 'trainyard_paintmask.png must exist in assets/images/trainyard/');
    const stats = fs.statSync(maskPath);
    assert.equal(stats.size, 19043, 'trainyard_paintmask.png must be exactly 19,043 bytes');

    const buf = fs.readFileSync(maskPath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.equal(width, 7414);
    assert.equal(height, 500);
});

test('provides exact native trainyard paintmask placement', () => {
    assert.ok(Math.abs(LAYOUT.paintmask.x - 506.373626) < 0.001);
    assert.ok(Math.abs(LAYOUT.paintmask.y - 212.967033) < 0.001);
    assert.equal(LAYOUT.paintmask.width, 7414);
    assert.equal(LAYOUT.paintmask.height, 500);
});

test('synchronizes sprayEffects and maskImage on world scroll in Trainyard', () => {
    const { scene, cursorKeys } = createMockTrainyardScene();
    scene.create();

    assert.equal(scene.sprayEffects.x, 0);
    assert.equal(scene.maskImage.x, LAYOUT.paintmask.x);

    cursorKeys.right.isDown = true;
    scene.update(0, 100);

    assert.equal(scene.sprayEffects.x, scene.worldLayer.x);
    assert.equal(scene.maskImage.x, LAYOUT.paintmask.x + scene.worldLayer.x);
});

test('handles spray painting and stamping in TrainyardScene', () => {
    const { scene } = createMockTrainyardScene();
    scene.create();

    assert.equal(scene.isSpraying, false);
    scene.beginSpray({ x: 600, y: 300 });
    assert.equal(scene.isSpraying, true);
    assert.deepEqual(scene.lastSprayPoint, { x: 600, y: 300 });

    scene.continueSpray({ x: 620, y: 310, isDown: true });
    assert.deepEqual(scene.lastSprayPoint, { x: 620, y: 310 });

    scene.endSpray();
    assert.equal(scene.isSpraying, false);
    assert.equal(scene.lastSprayPoint, null);

    // Open backpack and verify click-outside closes backpack without spraying
    scene.backpack.open();
    assert.equal(scene.backpack.isOpen, true);
    scene.beginSpray({ x: 600, y: 300 });
    assert.equal(scene.backpack.isOpen, false);
    assert.equal(scene.isSpraying, false);
    assert.equal(scene.lastSprayPoint, null);

    // Subsequent spray works normally
    scene.beginSpray({ x: 600, y: 300 });
    assert.equal(scene.isSpraying, true);
    assert.deepEqual(scene.lastSprayPoint, { x: 600, y: 300 });
    scene.endSpray();
});

test('handles combat interactions between Player and Cop in TrainyardScene', () => {
    const { scene, getKey } = createMockTrainyardScene();
    scene.create();

    const boxingKey = getKey(87); // W (WASD Boxing)
    const kickKey = getKey(83);   // S (WASD Kick)

    assert.equal(scene.cop.hitCount, 0);
    assert.equal(scene.cop.isDead, false);
    assert.equal(scene.cop.isSpawned, false);
    assert.equal(scene.player.health, 100);
    assert.equal(scene.player.isDead, false);

    // Spawn cop at X=1350 for testing
    scene.spawnCop('right', 1350);
    assert.equal(scene.cop.isSpawned, true);
    assert.equal(scene.cop.container.visible, true);

    // Initial cop position is X=1350 (distance 390px from Player at 960) -> out of punch reach (330px)
    boxingKey.isDown = true;
    scene.update(0, 520);
    assert.equal(scene.cop.hitCount, 0); // No hit because out of range!
    boxingKey.isDown = false;
    scene.update(0, 40);

    // Move cop into punch reach on the right (X=1100, distance = 140px <= 330px)
    scene.cop.x = 1100;
    scene.player.isFacingLeft = false;

    // Player punches Cop (Hit 1 from player standing to the left -> Cop must face left)
    boxingKey.isDown = true;
    scene.update(0, 100);
    assert.equal(scene.player.isBoxing, true);
    assert.equal(scene.cop.hitCount, 1);
    assert.equal(scene.cop.isHurt, true);
    assert.equal(scene.cop.isFacingLeft, true);
    assert.equal(scene.player.hasHitThisAttack, true);

    // Release boxing key and advance cop hurt animation
    boxingKey.isDown = false;
    for (let i = 0; i < 6; i++) {
        scene.update(0, 84);
    }
    assert.equal(scene.cop.isHurt, false);

    // Move cop into kick reach on the left (X=800, distance = 160px <= 280px)
    scene.cop.x = 800;
    scene.player.isFacingLeft = true;

    // Player kicks Cop (Hit 2 from player standing to the right -> Cop must face right)
    kickKey.isDown = true;
    scene.update(0, 100);
    assert.equal(scene.player.isKicking, true);
    assert.equal(scene.cop.hitCount, 2);
    assert.equal(scene.cop.isHurt, true);
    assert.equal(scene.cop.isFacingLeft, false);

    // Release kick key and advance cop hurt animation
    kickKey.isDown = false;
    for (let i = 0; i < 6; i++) {
        scene.update(0, 84);
    }
    assert.equal(scene.cop.isHurt, false);

    // Move cop back to the right (X=1100)
    scene.cop.x = 1100;
    scene.player.isFacingLeft = false;

    // Player punches Cop (Hit 3 -> Death, Cop faces left toward player)
    boxingKey.isDown = true;
    scene.update(0, 100);
    assert.equal(scene.cop.hitCount, 3);
    assert.equal(scene.cop.isDead, true);
    assert.equal(scene.cop.isFacingLeft, true);
    boxingKey.isDown = false;

    // Respawn cop for cop-attacks-player test
    scene.cop.respawn();
    scene.cop.x = 1100;
    assert.equal(scene.cop.isDead, false);

    // Cop is within sensor reach (140px <= 320px), triggers boxing
    scene.update(0, 50);
    assert.equal(scene.cop.isBoxing, true);

    // Advance cop boxing ticks to tick 9 (impact window)
    for (let i = 0; i < 9; i++) {
        scene.update(0, 84);
    }
    // Player took 20 damage!
    assert.equal(scene.player.health, 80);
    assert.equal(scene.player.isHurt, true);
});

test('spawns Cop autonomously via copSpawner and handles kill cycle in TrainyardScene', () => {
    const { scene } = createMockTrainyardScene();
    scene.create();

    assert.equal(scene.cop.isSpawned, false);
    assert.equal(scene.copSpawner.copdichte, 350);

    // Force or trigger spawn on left side (-280 screenX)
    scene.spawnCop('left', -280);
    assert.equal(scene.cop.isSpawned, true);
    assert.equal(scene.cop.x, -280);

    // Trigger death and complete animation
    scene.cop.triggerDeath();
    assert.equal(scene.cop.isDead, true);

    // Advance 35 ticks to complete death animation (mocking Math.random to prevent premature re-spawn)
    const origRandom = Math.random;
    Math.random = () => 0.5;
    try {
        for (let i = 0; i < 35; i++) {
            scene.update(0, 84);
        }
    } finally {
        Math.random = origRandom;
    }

    // Cop has despawned, kill registered, copdichte decreased
    assert.equal(scene.cop.isSpawned, false);
    assert.equal(scene.cop.container.visible, false);
    assert.equal(scene.copSpawner.copkill, 1);
    assert.equal(scene.copSpawner.copdichte, 315);
    assert.equal(scene.copSpawner.copanz, 0);
});
