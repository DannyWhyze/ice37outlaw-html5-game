const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { LAYOUT } = require('../js/startNativeLayout.js');
const StartScene = require('../js/StartScene.js');

test('verifies start_background.png asset exists and matches 1920x1055 dimensions', () => {
    const bgPath = path.join(__dirname, '../assets/images/start/start_background.png');
    assert.ok(fs.existsSync(bgPath), 'start_background.png must exist in assets/images/start/');
    const fd = fs.openSync(bgPath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    assert.equal(width, 1920, 'start_background.png width must be 1920');
    assert.equal(height, 1055, 'start_background.png height must be 1055');
});

test('verifies btn_enter.png asset exists and matches 376x176 dimensions', () => {
    const btnPath = path.join(__dirname, '../assets/images/start/btn_enter.png');
    assert.ok(fs.existsSync(btnPath), 'btn_enter.png must exist in assets/images/start/');
    const fd = fs.openSync(btnPath, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    assert.equal(width, 376, 'btn_enter.png width must be 376');
    assert.equal(height, 176, 'btn_enter.png height must be 176');
});

test('provides exact native 1920x1080 canvas and stage dimensions for Start', () => {
    assert.equal(LAYOUT.canvas.width, 1920);
    assert.equal(LAYOUT.canvas.height, 1080);
    assert.equal(LAYOUT.canvas.resolution, 1);
    assert.equal(LAYOUT.stage.width, 1920);
    assert.ok(Math.abs(LAYOUT.stage.height - 1054.945055) < 0.001);
    assert.ok(Math.abs(LAYOUT.stage.offsetY - 12.527473) < 0.001);
});

test('provides exact native background placement and size for Start', () => {
    assert.equal(LAYOUT.background.x, 960.0);
    assert.equal(LAYOUT.background.y, 540.0);
    assert.equal(LAYOUT.background.width, 1920);
    assert.ok(Math.abs(LAYOUT.background.height - 1054.945055) < 0.001);
});

test('provides exact native enter button placement, origin, and AS2 scale factors', () => {
    assert.equal(LAYOUT.button.x, 960.0);
    assert.equal(LAYOUT.button.y, 1000.0);
    assert.equal(LAYOUT.button.width, 376);
    assert.equal(LAYOUT.button.height, 176);
    assert.ok(Math.abs(LAYOUT.button.originX - 0.453457) < 0.001);
    assert.ok(Math.abs(LAYOUT.button.originY - 0.661932) < 0.001);
    assert.equal(LAYOUT.button.scaleNormal, 1.0);
    assert.equal(LAYOUT.button.scaleHover, 1.0625);
    assert.equal(LAYOUT.button.scalePress, 0.975);
    assert.equal(LAYOUT.transition.fadeDurationMs, 300);
});

function createMockStartScene() {
    global.Phaser = {
        Cameras: {
            Scene2D: {
                Events: { FADE_OUT_COMPLETE: 'camerafadeoutcomplete' },
            },
        },
    };

    function makeDisplayObject() {
        const obj = {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            depth: 0,
            originX: 0.5,
            originY: 0.5,
            displayW: 0,
            displayH: 0,
            events: {},
            setOrigin(ox, oy) {
                obj.originX = ox;
                obj.originY = oy !== undefined ? oy : ox;
                return obj;
            },
            setDisplaySize(w, h) {
                obj.displayW = w;
                obj.displayH = h;
                return obj;
            },
            setScale(sx, sy) {
                obj.scaleX = sx;
                obj.scaleY = sy !== undefined ? sy : sx;
                return obj;
            },
            setDepth(d) {
                obj.depth = d;
                return obj;
            },
            setInteractive() {
                return obj;
            },
            on(eventName, cb) {
                obj.events[eventName] = cb;
                return obj;
            },
            emit(eventName, ...args) {
                if (obj.events[eventName]) {
                    obj.events[eventName](...args);
                }
            },
        };
        return obj;
    }

    const scene = new StartScene();
    scene.createdImages = [];
    scene.add = {
        image: (x, y, texture) => {
            const img = makeDisplayObject();
            img.x = x;
            img.y = y;
            img.textureKey = texture;
            scene.createdImages.push(img);
            return img;
        },
    };

    let fadeCallback = null;
    scene.cameras = {
        main: {
            fadeOut(duration, r, g, b) {
                scene.fadeDuration = duration;
            },
            once(event, cb) {
                fadeCallback = cb;
            },
            triggerFadeComplete() {
                if (fadeCallback) {
                    fadeCallback();
                }
            },
        },
    };

    scene.scene = {
        start(sceneKey) {
            scene.startedScene = sceneKey;
        },
    };

    return scene;
}

test('instantiates StartScene and initializes background and button', () => {
    const scene = createMockStartScene();
    scene.create();

    assert.equal(scene.createdImages.length, 2, 'StartScene must create exactly 2 images');
    const [bg, btn] = scene.createdImages;

    assert.equal(bg.textureKey, 'start_background');
    assert.equal(bg.x, 960.0);
    assert.equal(bg.y, 540.0);
    assert.equal(bg.displayW, 1920);
    assert.ok(Math.abs(bg.displayH - 1054.945055) < 0.001);
    assert.equal(bg.originX, 0.5);
    assert.equal(bg.originY, 0.5);
    assert.equal(bg.depth, 1);

    assert.equal(btn.textureKey, 'btn_enter');
    assert.equal(btn.x, 960.0);
    assert.equal(btn.y, 1000.0);
    assert.ok(Math.abs(btn.originX - 0.453457) < 0.001);
    assert.ok(Math.abs(btn.originY - 0.661932) < 0.001);
    assert.equal(btn.scaleX, 1.0);
    assert.equal(btn.depth, 10);
});

test('handles pointer events with authentic AS2 scaling and fade transition to MenuScene', () => {
    const scene = createMockStartScene();
    scene.create();

    const [, btn] = scene.createdImages;

    // Hover -> scale 1.0625 (+6.25%)
    btn.emit('pointerover');
    assert.equal(btn.scaleX, 1.0625);
    assert.equal(btn.scaleY, 1.0625);

    // Out -> scale 1.0
    btn.emit('pointerout');
    assert.equal(btn.scaleX, 1.0);
    assert.equal(btn.scaleY, 1.0);

    // Press -> scale 0.975 (-2.5%) & fade transition to MenuScene
    btn.emit('pointerdown');
    assert.equal(btn.scaleX, 0.975);
    assert.equal(scene.fadeDuration, 300);

    scene.cameras.main.triggerFadeComplete();
    assert.equal(scene.startedScene, 'MenuScene', 'Must transition to MenuScene on fade complete');
});
