const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

test('verifies blende.png asset exists and matches exact 1922x1056 pixel dimensions', () => {
    const blendePath = path.join(__dirname, '../assets/images/prefabs/transitions/blende.png');
    assert.ok(fs.existsSync(blendePath), 'blende.png must exist in assets/images/prefabs/transitions/');

    const fd = fs.openSync(blendePath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);

    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    assert.equal(width, 1922, 'blende.png width must be 1922 px');
    assert.equal(height, 1056, 'blende.png height must be 1056 px');
});

test('verifies BootScene preloads blende asset with 1080p_hd cache-buster', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    assert.ok(
        bootSource.includes("this.load.image('blende', 'assets/images/prefabs/transitions/blende.png?v=1080p_hd');"),
        'BootScene must preload blende with 1080p_hd cache-buster'
    );
});

test('verifies index.html loads Blende.js with 1080p_hd cache-buster under Global Prefabs', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert.ok(
        indexHtml.includes('<script src="js/prefabs/Blende.js?v=1080p_hd"></script>'),
        'index.html must include Blende.js?v=1080p_hd'
    );
});

test('instantiates Blende prefab at depth 500 and handles fadeOut and fadeIn', () => {
    const Blende = require('../js/prefabs/Blende.js');

    const addedImages = [];
    const mockScene = {
        offsetY: 12.5,
        add: {
            image(x, y, texture) {
                const img = {
                    x, y, texture,
                    originX: 0.5, originY: 0.5,
                    depth: 0,
                    alpha: 1,
                    visible: true,
                    displayWidth: 0,
                    displayHeight: 0,
                    setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
                    setDepth(d) { this.depth = d; return this; },
                    setAlpha(a) { this.alpha = a; return this; },
                    setVisible(v) { this.visible = v; return this; },
                    setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; return this; },
                    destroy() { this.destroyed = true; }
                };
                addedImages.push(img);
                return img;
            }
        },
        tweens: null // Headless fallback
    };

    const blende = new Blende(mockScene);
    assert.equal(addedImages.length, 1);
    assert.equal(blende.image.texture, 'blende');
    assert.equal(blende.depth, 500);
    assert.equal(blende.image.depth, 500);
    assert.equal(blende.image.originX, 0);
    assert.equal(blende.image.originY, 0);
    assert.equal(blende.image.alpha, 0);
    assert.equal(blende.image.visible, false);
    assert.equal(blende.image.displayWidth, 1920);
    assert.equal(blende.image.displayHeight, 1056);

    // Test fadeOut in headless mode
    let fadeOutCalled = false;
    blende.fadeOut(280, () => {
        fadeOutCalled = true;
    });
    assert.equal(fadeOutCalled, true, 'fadeOut callback must be called');
    assert.equal(blende.image.alpha, 1, 'fadeOut must reach alpha 1');
    assert.equal(blende.image.visible, true, 'fadeOut must set visible true');

    // Test fadeIn in headless mode
    let fadeInCalled = false;
    blende.fadeIn(280, () => {
        fadeInCalled = true;
    });
    assert.equal(fadeInCalled, true, 'fadeIn callback must be called');
    assert.equal(blende.image.alpha, 0, 'fadeIn must reach alpha 0');
    assert.equal(blende.image.visible, false, 'fadeIn must set visible false');

    blende.destroy();
    assert.equal(blende.image, null);
});

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

test('verifies Player cancels ongoing spray on death and calls onDeathComplete at tick 116', () => {
    const { Player } = require('../js/prefabs/Player.js');
    const layout = {
        walkHeight: 200,
        idleWidth: 100,
        idleHeight: 200,
        walkWidth: 100,
        walkHeightNative: 200,
    };

    let sprayEnded = false;
    const mockScene = {
        add: {
            container: (x, y) => ({
                x, y, depth: 0,
                add() { return this; },
                setDepth(d) { this.depth = d; return this; },
                destroy() {}
            }),
            image: () => ({
                setOrigin() { return this; },
                setScale() { return this; },
                setDepth() { return this; },
                setVisible() { return this; },
                setDisplaySize() { return this; },
                setTexture() { return this; },
                setPosition() { return this; },
                setTint() { return this; },
                setAlpha() { return this; },
                clearTint() { return this; },
                destroy() {}
            }),
            sprite: () => ({
                setOrigin() { return this; },
                setScale() { return this; },
                setDepth() { return this; },
                setVisible() { return this; },
                setDisplaySize() { return this; },
                setTexture() { return this; },
                setPosition() { return this; },
                setTint() { return this; },
                setAlpha() { return this; },
                clearTint() { return this; },
                destroy() {}
            })
        },
        anims: {
            exists: () => true,
            create: () => {}
        },
        endSpray: () => {
            sprayEnded = true;
        }
    };

    const player = new Player(mockScene, 100, 200, layout, 1);
    let deathCompleted = false;
    player.onDeathComplete = () => {
        deathCompleted = true;
    };

    player.triggerDeath();
    assert.equal(player.isDead, true);
    assert.equal(sprayEnded, true, 'Player.triggerDeath must call scene.endSpray()');
    assert.equal(deathCompleted, false, 'onDeathComplete must not be called yet at tick 1');

    // Advance to tick 116 (PlayerDeath.TOTAL_TICKS)
    player.deathTick = 116;
    player.applyDeathFrame();
    assert.equal(deathCompleted, true, 'onDeathComplete must be called at tick 116');
});

test('verifies StreetScene, TrainyardScene, and HallOfFameScene lock spraying when player is dead and transition to MenuScene', () => {
    const { StreetScene } = require('../js/street/StreetScene.js');
    const { TrainyardScene } = require('../js/trainyard/TrainyardScene.js');
    const { HallOfFameScene } = require('../js/halloffame/HallOfFameScene.js');

    const makeDisplayObject = (x = 0, y = 0) => ({
        x, y,
        depth: 0,
        originX: 0.5, originY: 0.5,
        scaleX: 1, scaleY: 1,
        alpha: 1,
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
        clearTint() { return this; },
        setVisible(v) { this.visible = v; return this; },
        setCrop(x, y, w, h) { this.crop = { x, y, w, h }; return this; },
        setMask() { return this; },
        sort() { return this; },
        play() { return this; },
        stop() { return this; },
        on() { return this; },
        destroy() { this.destroyed = true; }
    });

    const setupMockScene = (SceneClass) => {
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
        scene.events = {
            once() {},
            on() {},
            emit() {}
        };
        scene.input = {
            on() {},
            keyboard: {
                createCursorKeys() { return { left: {}, right: {}, up: {}, down: {} }; },
                addKey() { return { isDown: false }; }
            }
        };

        scene.cameras = {
            main: {
                fadeOut() {},
                once() {}
            }
        };

        scene.scene = {
            start(key) {
                scene.startedScene = key;
            }
        };

        scene.create();
        return scene;
    };

    [StreetScene, TrainyardScene, HallOfFameScene].forEach((SceneClass) => {
        const scene = setupMockScene(SceneClass);

        // Blende instantiated
        assert.ok(scene.blende, `${SceneClass.name} must have blende instantiated`);
        assert.equal(scene.blende.depth, 500, `${SceneClass.name} blende depth must be 500`);

        // Player dead spray lock test
        scene.player.isDead = true;
        scene.isSpraying = false;
        scene.beginSpray({ x: 500, y: 300 });
        assert.equal(scene.isSpraying, false, `${SceneClass.name} beginSpray must be blocked when player is dead`);

        // Transition on death complete
        scene.player.onDeathComplete();
        assert.equal(scene.startedScene, 'MenuScene', `${SceneClass.name} must transition to MenuScene on death complete`);
    });
});
