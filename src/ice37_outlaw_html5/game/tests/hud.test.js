const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('verifies HUD HD assets exist and match exact HD pixel dimensions', () => {
    const hudDir = path.join(__dirname, '../assets/images/prefabs/hud');

    const readDims = (filePath) => {
        assert.ok(fs.existsSync(filePath), `${filePath} must exist`);
        const fd = fs.openSync(filePath, 'r');
        const header = Buffer.alloc(24);
        fs.readSync(fd, header, 0, 24, 0);
        fs.closeSync(fd);
        return {
            width: header.readUInt32BE(16),
            height: header.readUInt32BE(20)
        };
    };

    const healthBar = readDims(path.join(hudDir, 'health_bar.png'));
    assert.equal(healthBar.width, 458, 'health_bar.png width must be 458 px');
    assert.equal(healthBar.height, 39, 'health_bar.png height must be 39 px');

    const skull = readDims(path.join(hudDir, 'hud_skull.png'));
    assert.equal(skull.width, 1313, 'hud_skull.png width must be 1313 px');
    assert.equal(skull.height, 1241, 'hud_skull.png height must be 1241 px');
});

test('verifies BootScene preloads HUD assets with 1080p_hd cache-buster', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    assert.ok(
        bootSource.includes("this.load.image('hud_health_bar', 'assets/images/prefabs/hud/health_bar.png?v=1080p_hd');"),
        'BootScene must preload hud_health_bar'
    );
    assert.ok(
        bootSource.includes("this.load.image('hud_skull', 'assets/images/prefabs/hud/hud_skull.png?v=1080p_hd');"),
        'BootScene must preload hud_skull'
    );
});

test('verifies HUD font assets exist (Typist.woff and Typist.ttf)', () => {
    const fontsDir = path.join(__dirname, '../assets/fonts');
    const woffPath = path.join(fontsDir, 'Typist.woff');
    const ttfPath = path.join(fontsDir, 'Typist.ttf');

    assert.ok(fs.existsSync(woffPath), 'Typist.woff must exist');
    assert.ok(fs.existsSync(ttfPath), 'Typist.ttf must exist');
    assert.ok(fs.statSync(woffPath).size > 1000, 'Typist.woff must be valid non-empty font');
    assert.ok(fs.statSync(ttfPath).size > 1000, 'Typist.ttf must be valid non-empty font');
});

test('verifies index.html loads Hud.js with cache-buster under Global Prefabs', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert.ok(
        indexHtml.includes('js/prefabs/Hud.js?v='),
        'index.html must include Hud.js with cache-buster'
    );
    assert.ok(
        indexHtml.includes("@font-face {\n            font-family: 'Typist';") ||
        indexHtml.includes("font-family: 'Typist'"),
        'index.html must declare @font-face for Typist'
    );
});

test('instantiates Hud prefab with exact Flash coordinates, scale, depth, and crop calculation', () => {
    const Hud = require('../js/prefabs/Hud.js');

    const addedImages = [];
    const addedContainers = [];

    const mockScene = {
        scaleS: 1920 / 546,
        offsetY: (1080 - 300 * (1920 / 546)) / 2,
        add: {
            container(x, y) {
                const c = {
                    x, y, depth: 0, children: [],
                    setDepth(d) { this.depth = d; return this; },
                    add(items) { this.children.push(...items); return this; },
                    destroy() { this.destroyed = true; }
                };
                addedContainers.push(c);
                return c;
            },
            image(x, y, texture) {
                const img = {
                    x, y, texture,
                    originX: 0.5, originY: 0.5,
                    scaleX: 1, scaleY: 1,
                    crop: null,
                    setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
                    setScale(s) { this.scaleX = s; this.scaleY = s; return this; },
                    setCrop(x, y, w, h) { this.crop = { x, y, w, h }; return this; }
                };
                addedImages.push(img);
                return img;
            }
        }
    };

    const mockPlayer = { health: 100, maxHealth: 100 };
    const hud = new Hud(mockScene, mockPlayer);

    // Verify root placement matching Flash (10.0 * scaleS, 10.0 * scaleS + offsetY)
    const expectedRootX = 10.0 * mockScene.scaleS;
    const expectedRootY = 10.0 * mockScene.scaleS + mockScene.offsetY;
    assert.ok(Math.abs(hud.rootX - expectedRootX) < 0.001, `Root X must match ${expectedRootX}`);
    assert.ok(Math.abs(hud.rootY - expectedRootY) < 0.001, `Root Y must match ${expectedRootY}`);

    // Verify container and depth
    assert.equal(addedContainers.length, 1, 'Must create 1 container');
    assert.equal(hud.container.depth, 150, 'HUD depth must be 150');

    // Verify health bar image
    assert.equal(hud.healthBar.texture, 'hud_health_bar');
    assert.equal(hud.healthBar.x, 0);
    assert.equal(hud.healthBar.y, 0);
    assert.equal(hud.healthBar.originX, 0);
    assert.equal(hud.healthBar.originY, 0);
    assert.deepEqual(hud.healthBar.crop, { x: 0, y: 0, w: 458, h: 39 }, 'Full health crop must be 458x39');

    // Verify skull image
    assert.equal(hud.skull.texture, 'hud_skull');
    const expectedSkullX = -6.75 * mockScene.scaleS;
    const expectedSkullY = 11.10 * mockScene.scaleS;
    assert.ok(Math.abs(hud.skull.x - expectedSkullX) < 0.001, `Skull X must match ${expectedSkullX}`);
    assert.ok(Math.abs(hud.skull.y - expectedSkullY) < 0.001, `Skull Y must match ${expectedSkullY}`);
    assert.equal(hud.skull.originX, 0);
    assert.equal(hud.skull.originY, 0);
    assert.equal(hud.skull.scaleX, 0.10, 'Skull scale must be 0.10');

    // Verify score text GameObject
    assert.ok(hud.scoreText, 'hud.scoreText must be created');
    const expectedScoreX = 43.40 * mockScene.scaleS;
    const expectedScoreY = 19.15 * mockScene.scaleS;
    assert.ok(Math.abs(hud.scoreText.x - expectedScoreX) < 0.001, `Score X must match ${expectedScoreX}`);
    assert.ok(Math.abs(hud.scoreText.y - expectedScoreY) < 0.001, `Score Y must match ${expectedScoreY}`);
    assert.equal(hud.scoreText.text, '0', 'Initial score text must be "0"');
    assert.equal(hud.currentScore, 0, 'Initial currentScore must be 0');

    // Test setScore
    hud.setScore(3);
    assert.equal(hud.currentScore, 3, 'currentScore must update to 3');
    assert.equal(hud.scoreText.text, '3', 'scoreText.text must update to "3"');

    // Test health crop transitions
    hud.setHealth(80, 100);
    assert.equal(hud.currentVisibleWidth, 366, '80 HP must yield 366 px visible width');
    assert.deepEqual(hud.healthBar.crop, { x: 0, y: 0, w: 366, h: 39 });

    hud.setHealth(20, 100);
    assert.equal(hud.currentVisibleWidth, 92, '20 HP must yield 92 px visible width');
    assert.deepEqual(hud.healthBar.crop, { x: 0, y: 0, w: 92, h: 39 });

    hud.setHealth(0, 100);
    assert.equal(hud.currentVisibleWidth, 0, '0 HP must yield 0 px visible width');
    assert.deepEqual(hud.healthBar.crop, { x: 0, y: 0, w: 0, h: 39 });

    // Test hud.update() synchronization with player
    mockPlayer.health = 60;
    hud.update();
    assert.equal(hud.currentVisibleWidth, 275, '60 HP must update to 275 px visible width on hud.update()');

    mockPlayer.health = 100;
    hud.update();
    assert.equal(hud.currentVisibleWidth, 458, 'Revive to 100 HP must restore full 458 px width');

    // Test destroy
    hud.destroy();
    assert.equal(hud.container, null);
});

test('verifies StreetScene and TrainyardScene instantiate Hud with player binding', () => {
    const { StreetScene } = require('../js/street/StreetScene.js');
    const { TrainyardScene } = require('../js/trainyard/TrainyardScene.js');

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

    const makeDisplayObject = (x = 0, y = 0) => ({
        x, y,
        depth: 0,
        originX: 0.5, originY: 0.5,
        scaleX: 1, scaleY: 1,
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
        setOrigin(ox, oy) { this.originX = ox; this.originY = oy !== undefined ? oy : ox; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setSize() { return this; },
        setTexture(k) { this.texture = k; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setTint() { return this; },
        setTintFill() { return this; },
        setVisible(v) { this.visible = v; return this; },
        setCrop(x, y, w, h) { this.crop = { x, y, w, h }; return this; },
        setMask() { return this; },
        play() { return this; },
        stop() { return this; },
        on() { return this; },
        destroy() { this.destroyed = true; }
    });

    const setupMockScene = (SceneClass, initialRegistryStore = null) => {
        const scene = new SceneClass();
        scene.scaleS = 1920 / 546;
        scene.offsetY = (1080 - 300 * scene.scaleS) / 2;

        scene.add = {
            container: (x, y) => makeDisplayObject(x, y),
            image: (x, y, texture) => {
                const img = makeDisplayObject(x, y);
                img.texture = texture;
                return img;
            },
            sprite: (x, y, texture) => {
                const spr = makeDisplayObject(x, y);
                spr.texture = texture;
                return spr;
            },
            zone: (x, y) => makeDisplayObject(x, y),
            graphics: () => {
                const g = makeDisplayObject();
                g.fillStyle = () => g;
                g.fillCircle = () => g;
                g.lineStyle = () => g;
                g.strokeRect = () => g;
                g.clear = () => g;
                return g;
            }
        };

        scene.make = {
            image: () => {
                const img = makeDisplayObject();
                img.createBitmapMask = () => ({});
                return img;
            }
        };

        scene.anims = {
            exists: () => true,
            create: () => {}
        };

        scene.game = { canvas: { style: {} } };
        scene.input = {
            on() {},
            keyboard: {
                createCursorKeys() { return { left: {}, right: {}, up: {}, down: {} }; },
                addKey() { return { isDown: false }; }
            }
        };

        const registryStore = initialRegistryStore || new Map();
        scene.registry = {
            get(key) { return registryStore.get(key); },
            set(key, val) { registryStore.set(key, val); return this; }
        };

        scene.cameras = {
            main: {
                fadeOut() {},
                once() {}
            }
        };

        scene.create();
        return scene;
    };

    const street = setupMockScene(StreetScene);
    assert.ok(street.hud, 'StreetScene must have hud');
    assert.equal(street.hud.depth, 150, 'StreetScene hud depth must be 150');
    assert.equal(street.hud.player, street.player, 'StreetScene hud must bind to player');
    assert.ok(street.hud.scoreText, 'StreetScene hud must have scoreText');
    assert.equal(street.hud.currentScore, 0, 'StreetScene initial score must be 0');
    street.spawnCop('right', 1350);
    assert.equal(typeof street.cop.deathCallback, 'function', 'deathCallback must be assigned after spawnCop');
    street.cop.deathCallback();
    assert.equal(street.copSpawner.copkill, 1, 'copSpawner copkill must increment to 1');
    assert.equal(street.registry.get('copkill'), 1, 'registry copkill must be updated to 1');
    assert.equal(street.registry.get('highscore'), 1, 'registry highscore must be initialized to 1');
    assert.equal(street.hud.currentScore, 1, 'hud score must be updated to 1');

    const trainyard = setupMockScene(TrainyardScene);
    assert.ok(trainyard.hud, 'TrainyardScene must have hud');
    assert.equal(trainyard.hud.depth, 150, 'TrainyardScene hud depth must be 150');
    assert.equal(trainyard.hud.player, trainyard.player, 'TrainyardScene hud must bind to player');
    assert.ok(trainyard.hud.scoreText, 'TrainyardScene hud must have scoreText');
    assert.equal(trainyard.hud.currentScore, 0, 'TrainyardScene initial score must be 0');
    trainyard.spawnCop('right', 1350);
    assert.equal(typeof trainyard.cop.deathCallback, 'function', 'deathCallback must be assigned after spawnCop');
    trainyard.cop.deathCallback();
    assert.equal(trainyard.copSpawner.copkill, 1, 'Trainyard copSpawner copkill must increment to 1');
    assert.equal(trainyard.registry.get('copkill'), 1, 'Trainyard registry copkill must be updated to 1');
    assert.equal(trainyard.registry.get('highscore'), 1, 'Trainyard registry highscore must be initialized to 1');
    assert.equal(trainyard.hud.currentScore, 1, 'Trainyard hud score must be updated to 1');

    // Verify reset on entry and highscore preservation across runs
    const sharedRegistryStore = new Map([
        ['copkill', 5],
        ['highscore', 10]
    ]);
    const streetWithExistingRun = setupMockScene(StreetScene, sharedRegistryStore);

    assert.equal(streetWithExistingRun.copSpawner.copkill, 0, 'New street run must reset copkill to 0');
    assert.equal(streetWithExistingRun.hud.currentScore, 0, 'HUD must show 0 on new street run');
    assert.equal(streetWithExistingRun.registry.get('copkill'), 0, 'Registry copkill must be reset to 0');
    assert.equal(streetWithExistingRun.registry.get('highscore'), 10, 'Existing highscore must be preserved');

    streetWithExistingRun.spawnCop('right', 1350);
    streetWithExistingRun.cop.deathCallback();
    assert.equal(streetWithExistingRun.copSpawner.copkill, 1, 'copkill increments to 1');
    assert.equal(streetWithExistingRun.registry.get('highscore'), 10, 'Highscore remains 10 when copkill < highscore');

    // Simulate exceeding highscore
    streetWithExistingRun.copSpawner.copkill = 10;
    streetWithExistingRun.cop.deathCallback();
    assert.equal(streetWithExistingRun.copSpawner.copkill, 11, 'copkill reaches 11');
    assert.equal(streetWithExistingRun.registry.get('highscore'), 11, 'Highscore updates to 11 when beaten');
});
