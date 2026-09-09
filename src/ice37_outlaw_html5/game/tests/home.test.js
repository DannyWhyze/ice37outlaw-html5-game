const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const HomeScene = require('../js/HomeScene.js');

const HOME_TRAIN_SOUND = Object.freeze({
    key: 'home_trainspotting',
    relativePath: 'assets/audio/home/trainspotting_80-519.mp3',
    size: 25064,
    sha256: '96a176af21c36c5c277aefbbc9c46674c6d89b80c61004b8e6d506753ddf8be4',
});

test('ships the confirmed HomeScene Trainspotting MP3 unchanged', () => {
    const soundPath = path.join(__dirname, '..', HOME_TRAIN_SOUND.relativePath);

    assert.ok(fs.existsSync(soundPath), `${HOME_TRAIN_SOUND.relativePath} must exist`);
    const soundData = fs.readFileSync(soundPath);
    assert.equal(soundData.length, HOME_TRAIN_SOUND.size);
    assert.equal(crypto.createHash('sha256').update(soundData).digest('hex'), HOME_TRAIN_SOUND.sha256);
});

test('BootScene preloads the dedicated HomeScene Trainspotting sound', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    const context = {
        Phaser: { Scene: class {} },
        PlayerCombat: {
            getFrameKey: (frameNumber) => `player_boxing_native_${frameNumber}`,
            getKickFrameKey: (frameNumber) => `player_kick_native_${frameNumber}`,
        },
        URLSearchParams,
    };
    vm.runInNewContext(`${bootSource}\nglobalThis.TestBootScene = BootScene;`, context);

    const audioRegistrations = [];
    const bootScene = new context.TestBootScene();
    bootScene.cameras = { main: { width: 546, height: 300 } };
    bootScene.add = {
        graphics: () => ({
            fillStyle() { return this; },
            fillRect() { return this; },
            clear() { return this; },
            destroy() { return this; },
        }),
    };
    bootScene.make = {
        text: () => ({ setOrigin() { return this; }, destroy() { return this; } }),
    };
    bootScene.load = new Proxy({
        on() { return this; },
        audio(key, assetPath) { audioRegistrations.push({ key, assetPath }); },
    }, {
        get(target, property) {
            return property in target ? target[property] : () => {};
        },
    });

    bootScene.preload();

    assert.deepEqual(
        audioRegistrations.find(({ key }) => key === HOME_TRAIN_SOUND.key),
        { key: HOME_TRAIN_SOUND.key, assetPath: HOME_TRAIN_SOUND.relativePath }
    );
});

test('verifies all 33 shelf spray cans and 6 floor cans exist and match native 352% HD dimensions', () => {
    const cansDir = path.join(__dirname, '../assets/images/home/cans');
    assert.ok(fs.existsSync(cansDir), 'cans directory must exist');

    for (let i = 1; i <= 33; i++) {
        const canFile = path.join(cansDir, `farbdose_${i}.png`);
        assert.ok(fs.existsSync(canFile), `farbdose_${i}.png must exist`);
        const fd = fs.openSync(canFile, 'r');
        const header = Buffer.alloc(24);
        fs.readSync(fd, header, 0, 24, 0);
        fs.closeSync(fd);
        const width = header.readUInt32BE(16);
        const height = header.readUInt32BE(20);
        assert.equal(width, 86, `farbdose_${i}.png width must be 86`);
        assert.equal(height, 229, `farbdose_${i}.png height must be 229`);
    }

    for (let i = 1; i <= 6; i++) {
        const canFile = path.join(cansDir, `rs_can_${i}.png`);
        assert.ok(fs.existsSync(canFile), `rs_can_${i}.png must exist`);
        const fd = fs.openSync(canFile, 'r');
        const header = Buffer.alloc(24);
        fs.readSync(fd, header, 0, 24, 0);
        fs.closeSync(fd);
        const width = header.readUInt32BE(16);
        const height = header.readUInt32BE(20);
        assert.equal(width, 86, `rs_can_${i}.png width must be 86`);
        assert.equal(height, 196, `rs_can_${i}.png height must be 196`);
    }

    const deckelFile = path.join(cansDir, 'rs_deckelfarbe.png');
    assert.ok(fs.existsSync(deckelFile), 'rs_deckelfarbe.png must exist');
    const fd = fs.openSync(deckelFile, 'r');
    const header = Buffer.alloc(24);
    fs.readSync(fd, header, 0, 24, 0);
    fs.closeSync(fd);
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    assert.equal(width, 64, 'rs_deckelfarbe.png width must be 64');
    assert.equal(height, 44, 'rs_deckelfarbe.png height must be 44');
});

test('verifies native 352% HD environment assets (background, train, lamp, window) exist and match HD dimensions', () => {
    const homeDir = path.join(__dirname, '../assets/images/home');

    const readDimensions = (filePath) => {
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

    // 1. Background (DefineShape 120, 1920x1055 px)
    const bgDims = readDimensions(path.join(homeDir, 'home_bg.png'));
    assert.equal(bgDims.width, 1920, 'home_bg.png width must be 1920');
    assert.equal(bgDims.height, 1055, 'home_bg.png height must be 1055');

    // 2. Ceiling Lamp (DefineShape3 6, 1241x655 px)
    const lampDims = readDimensions(path.join(homeDir, 'lamp.png'));
    assert.equal(lampDims.width, 1241, 'lamp.png width must be 1241');
    assert.equal(lampDims.height, 655, 'lamp.png height must be 655');

    // 3. Train (DefineShape 11, 2986x159 px)
    const trainDims = readDimensions(path.join(homeDir, 'train/10.png'));
    assert.equal(trainDims.width, 2986, 'train/10.png width must be 2986');
    assert.equal(trainDims.height, 159, 'train/10.png height must be 159');

    // 4. Window mask (DefineShape 8, 725x208 px)
    const maskDims = readDimensions(path.join(homeDir, 'train/8.png'));
    assert.equal(maskDims.width, 725, 'train/8.png width must be 725');
    assert.equal(maskDims.height, 208, 'train/8.png height must be 208');

    // 5. Window foreground (DefineShape3 9, 720x303 px)
    const fgDims = readDimensions(path.join(homeDir, 'train/9.png'));
    assert.equal(fgDims.width, 720, 'train/9.png width must be 720');
    assert.equal(fgDims.height, 303, 'train/9.png height must be 303');

    // 6. Main menu button (DefineSprite 118, 915x199 px)
    const btnDims = readDimensions(path.join(homeDir, 'btn_mainmenu_hover.png'));
    assert.equal(btnDims.width, 915, 'btn_mainmenu_hover.png width must be 915');
    assert.equal(btnDims.height, 199, 'btn_mainmenu_hover.png height must be 199');
});

function createHomeSceneHarness() {
    const scene = new HomeScene();
    const images = [];
    const events = [];
    const sceneEventHandlers = {};

    scene.cameras = {
        main: {
            width: 1920,
            height: 1080,
            fadeOut: () => {},
            once: () => {},
        },
    };

    scene.input = {
        setDraggable: () => {},
    };

    scene.tweens = {
        add: (cfg) => {
            if (cfg.targets) {
                cfg.targets.x = cfg.x;
                cfg.targets.y = cfg.y;
            }
            if (typeof cfg.onComplete === 'function') {
                cfg.onComplete();
            }
        },
        killTweensOf: () => {},
    };

    scene.add = {
        image: (x, y, key) => {
            const img = {
                x,
                y,
                key,
                originX: 0,
                originY: 0,
                scaleX: 1,
                scaleY: 1,
                rotation: 0,
                displayWidth: 0,
                displayHeight: 0,
                depth: 0,
                visible: true,
                listeners: {},
                setOrigin(ox, oy) {
                    this.originX = ox;
                    this.originY = oy;
                    return this;
                },
                setScale(sx, sy) {
                    this.scaleX = sx;
                    this.scaleY = (sy !== undefined) ? sy : sx;
                    return this;
                },
                setRotation(r) {
                    this.rotation = r;
                    return this;
                },
                setDisplaySize(w, h) {
                    this.displayWidth = w;
                    this.displayHeight = h;
                    return this;
                },
                setDepth(d) {
                    this.depth = d;
                    return this;
                },
                setMask(mask) {
                    this.mask = mask;
                    return this;
                },
                setVisible(v) {
                    this.visible = v;
                    return this;
                },
                setPosition(px, py) {
                    this.x = px;
                    this.y = py;
                    return this;
                },
                setInteractive(cfg) {
                    this.interactive = true;
                    this.interactiveConfig = cfg;
                    return this;
                },
                on(evt, cb) {
                    this.listeners[evt] = cb;
                    return this;
                },
                emit(evt, ...args) {
                    if (this.listeners && this.listeners[evt]) {
                        return this.listeners[evt](...args);
                    }
                },
                setTint() {
                    return this;
                },
                setTintFill(color) {
                    this.tintFill = color;
                    return this;
                },
                clearTint() {
                    return this;
                },
            };
            images.push(img);
            return img;
        },
    };

    scene.make = {
        image: (opts) => ({
            ...opts,
            createBitmapMask: () => ({ mask: true }),
            setOrigin() { return this; },
            setScale() { return this; },
        }),
    };

    scene.cache = {
        json: {
            get: (key) => ({
                frames: Array(350).fill({ x: 0, y: 0, scaleX: 1, scaleY: 1 }),
            }),
        },
    };

    scene.time = {
        addEvent: (config) => {
            const timerEvent = {
                ...config,
                removed: false,
                remove() {
                    this.removed = true;
                },
            };
            events.push(timerEvent);
            return timerEvent;
        },
    };

    scene.events = {
        once: (eventName, callback) => {
            sceneEventHandlers[eventName] = callback;
        },
    };

    return { scene, images, events, sceneEventHandlers };
}

test('plays the dedicated Trainspotting sound at Flash frame 110 in HomeScene', () => {
    const previousSoundFx = global.SoundFx;
    const playedKeys = [];
    global.SoundFx = {
        play(_scene, key) {
            playedKeys.push(key);
            return true;
        },
    };

    try {
        const { scene, events } = createHomeSceneHarness();
        scene.create();
        const trainspottingTimer = events[0];

        assert.ok(trainspottingTimer, 'Trainspotting timer event must exist');
        for (let frame = 1; frame < 110; frame++) {
            trainspottingTimer.callback();
        }

        assert.deepEqual(playedKeys, [HOME_TRAIN_SOUND.key]);
    } finally {
        global.SoundFx = previousSoundFx;
    }
});

test('main menu exit immediately stops and resets Trainspotting without changing can colors', () => {
    const CanInventory = require('../js/logic/canInventory.js');
    const trainTimeline = require('../assets/data/home_train_timeline.json');
    const lampTimeline = require('../assets/data/home_lamp_timeline.json');
    const previousPhaser = global.Phaser;
    const previousSoundFx = global.SoundFx;
    const stoppedKeys = [];

    global.Phaser = {
        Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: 'fadeoutcomplete' } } },
        Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    };
    global.SoundFx = {
        play() { return true; },
        stop(_scene, key) {
            stoppedKeys.push(key);
            return true;
        },
    };
    CanInventory.resetFloorColors();
    CanInventory.setFloorColor(0, 0x123456);

    try {
        const { scene, images, events } = createHomeSceneHarness();
        scene.cache.json.get = (key) => (
            key === 'home_train_timeline' ? trainTimeline : lampTimeline
        );
        scene.create();

        const timer = events[0];
        const train = images.find((img) => img.key === 'home_train');
        const background = images.find((img) => img.key === 'home_bg');
        const mainMenuButton = images.find((img) => img.key === 'btn_mainmenu_hover');
        for (let frame = 1; frame < 110; frame++) {
            timer.callback();
        }
        assert.equal(train.visible, true, 'Train must be visible at Flash frame 110');

        mainMenuButton.emit('pointerdown');

        assert.equal(timer.removed, true, 'Trainspotting timer must stop before the fade');
        assert.deepEqual(stoppedKeys, [HOME_TRAIN_SOUND.key]);
        assert.equal(train.visible, false, 'Train must reset to the hidden Flash frame 1 state');
        assert.equal(background.x, 0, 'Background shake must reset before leaving HomeScene');
        assert.equal(CanInventory.getFloorColor(0), 0x123456);
    } finally {
        CanInventory.resetFloorColors();
        global.Phaser = previousPhaser;
        global.SoundFx = previousSoundFx;
    }
});

test('scene shutdown also stops and resets Trainspotting', () => {
    const trainTimeline = require('../assets/data/home_train_timeline.json');
    const lampTimeline = require('../assets/data/home_lamp_timeline.json');
    const previousPhaser = global.Phaser;
    const previousSoundFx = global.SoundFx;
    const stoppedKeys = [];

    global.Phaser = {
        Cameras: { Scene2D: { Events: { FADE_OUT_COMPLETE: 'fadeoutcomplete' } } },
        Scenes: { Events: { SHUTDOWN: 'shutdown' } },
    };
    global.SoundFx = {
        play() { return true; },
        stop(_scene, key) {
            stoppedKeys.push(key);
            return true;
        },
    };

    try {
        const { scene, images, events, sceneEventHandlers } = createHomeSceneHarness();
        scene.cache.json.get = (key) => (
            key === 'home_train_timeline' ? trainTimeline : lampTimeline
        );
        scene.create();

        const timer = events[0];
        const train = images.find((img) => img.key === 'home_train');
        for (let frame = 1; frame < 110; frame++) {
            timer.callback();
        }

        assert.equal(typeof sceneEventHandlers.shutdown, 'function');
        sceneEventHandlers.shutdown();

        assert.equal(timer.removed, true);
        assert.deepEqual(stoppedKeys, [HOME_TRAIN_SOUND.key]);
        assert.equal(train.visible, false);
    } finally {
        global.Phaser = previousPhaser;
        global.SoundFx = previousSoundFx;
    }
});

test('instantiates HomeScene and initializes background, floor cans, shelf cans, and button', () => {
    const { scene, images } = createHomeSceneHarness();
    scene.create();

    // 1. Background image
    const bg = images.find((img) => img.key === 'home_bg');
    assert.ok(bg, 'home_bg must be created');
    assert.equal(bg.displayWidth, 1920);

    // 2. 6 floor cans with 352% HD scale 0.70 and origin (0, 0)
    const expectedColors = [0x0000cc, 0xffffff, 0xffff33, 0x66ff33, 0xff0000, 0x000000];
    for (let i = 1; i <= 6; i++) {
        const floorCan = images.find((img) => img.key === `rs_can_${i}`);
        assert.ok(floorCan, `rs_can_${i} must be created`);
        assert.equal(floorCan.originX, 0);
        assert.equal(floorCan.originY, 0);
        assert.equal(floorCan.scaleX, 0.70, `rs_can_${i} scaleX must be 0.70`);
        assert.equal(floorCan.scaleY, 0.70, `rs_can_${i} scaleY must be 0.70`);
    }

    // 2b. 6 floor can cap color overlays (rs_deckelfarbe)
    const caps = images.filter((img) => img.key === 'rs_deckelfarbe');
    assert.equal(caps.length, 6, 'Must create 6 rs_deckelfarbe cap overlays');
    caps.forEach((cap, idx) => {
        assert.equal(cap.originX, 0, `cap ${idx + 1} originX must be 0`);
        assert.equal(cap.originY, 0, `cap ${idx + 1} originY must be 0`);
        assert.equal(cap.scaleX, 0.70, `cap ${idx + 1} scaleX must be 0.70`);
        assert.equal(cap.scaleY, 0.70, `cap ${idx + 1} scaleY must be 0.70`);
        assert.equal(cap.tintFill, expectedColors[idx], `cap ${idx + 1} tintFill must match starter color`);
    });

    // 3. 33 shelf cans with 352% HD scale 0.70 and origin (0.5, 0.5)
    for (let i = 1; i <= 33; i++) {
        const shelfCan = images.find((img) => img.key === `farbdose_${i}`);
        assert.ok(shelfCan, `farbdose_${i} must be created`);
        assert.equal(shelfCan.originX, 0.5, `farbdose_${i} originX must be 0.5`);
        assert.equal(shelfCan.originY, 0.5, `farbdose_${i} originY must be 0.5`);
        assert.equal(shelfCan.scaleX, 0.70, `farbdose_${i} scaleX must be 0.70`);
        assert.equal(shelfCan.scaleY, 0.70, `farbdose_${i} scaleY must be 0.70`);
    }

    // 4. Main menu return button
    const btnMainMenu = images.find((img) => img.key === 'btn_mainmenu_hover');
    assert.ok(btnMainMenu, 'btn_mainmenu_hover must be created');
    assert.equal(btnMainMenu.originX, 0.5);
    assert.equal(btnMainMenu.originY, 0.5);
    assert.equal(btnMainMenu.scaleX, 0.70, 'btnMainMenu scaleX must be 0.70');
    assert.equal(btnMainMenu.scaleY, 0.70, 'btnMainMenu scaleY must be 0.70');
    assert.equal(btnMainMenu.depth, 60, 'btnMainMenu depth must be 60');

    // 5. Trainspotting assembly with 352% HD scale 0.70
    const train = images.find((img) => img.key === 'home_train');
    assert.ok(train, 'home_train must be created');
    assert.equal(train.scaleX, 0.70, 'train scaleX must be 0.70');
    assert.equal(train.scaleY, 0.70, 'train scaleY must be 0.70');

    const lamp = images.find((img) => img.key === 'home_lamp');
    assert.ok(lamp, 'home_lamp must be created');
    assert.equal(lamp.originX, 176.90 / 352.80, 'lamp originX must be anchored at ceiling hook');
    assert.equal(lamp.originY, 0, 'lamp originY must be anchored at ceiling wire top');
    assert.equal(lamp.scaleX, 0.70, 'lamp scaleX must be 0.70');
    assert.equal(lamp.scaleY, 0.70, 'lamp scaleY must be 0.70');
    assert.equal(lamp.depth, 50, 'lamp depth must be 50 to hang in front of shelf cans (depth 20)');

    const fg = images.find((img) => img.key === 'home_train_window_foreground');
    assert.ok(fg, 'home_train_window_foreground must be created');
    assert.equal(fg.scaleX, 0.70, 'window foreground scaleX must be 0.70');
    assert.equal(fg.scaleY, 0.70, 'window foreground scaleY must be 0.70');
});

test('handles shelf can drag-and-drop interaction, z-depth elevation, and color transfer to floor cans', () => {
    const CanInventory = require('../js/logic/canInventory.js');
    CanInventory.resetFloorColors();

    const { scene, images } = createHomeSceneHarness();
    scene.create();

    const shelfCan = images.find((img) => img.key === 'farbdose_1');
    assert.ok(shelfCan, 'farbdose_1 must exist');
    assert.equal(shelfCan.depth, 20);
    assert.equal(shelfCan.interactive, true);
    assert.equal(shelfCan.interactiveConfig.draggable, true);

    const caps = images.filter((img) => img.key === 'rs_deckelfarbe');
    assert.equal(caps.length, 6);
    assert.equal(caps[0].tintFill, 0x0000cc);

    // 1. dragstart elevates depth to 200
    shelfCan.emit('dragstart');
    assert.equal(shelfCan.depth, 200);

    // 2. drag updates coordinates
    shelfCan.emit('drag', { x: 50, y: 300 }, 50, 300);
    assert.equal(shelfCan.x, 50);
    assert.equal(shelfCan.y, 300);

    // 3. dragend dropping over floor can 1
    const floorCan1 = images.find((img) => img.key === 'rs_can_1');
    assert.ok(floorCan1, 'rs_can_1 must exist');

    const dropPointer = { x: floorCan1.x + 10, y: floorCan1.y + 10 };
    shelfCan.emit('dragend', dropPointer);

    // farbdose_1 color is 0x660066 -> cap 0 and CanInventory slot 0 must be updated
    assert.equal(caps[0].tintFill, 0x660066);
    assert.equal(CanInventory.getFloorColor(0), 0x660066);

    // Tween snap back restored coordinates and depth
    assert.equal(shelfCan.x, shelfCan.origX);
    assert.equal(shelfCan.y, shelfCan.origY);
    assert.equal(shelfCan.depth, 20);
});

test('verifies ceiling lamp rotates dynamically matching SWF timeline rotation during train vibration', () => {
    const lampTimeline = require('../assets/data/home_lamp_timeline.json');
    const trainTimeline = require('../assets/data/home_train_timeline.json');
    const { scene, images, events } = createHomeSceneHarness();

    scene.cache.json.get = (key) => {
        if (key === 'home_lamp_timeline') return lampTimeline;
        if (key === 'home_train_timeline') return trainTimeline;
        return { frames: Array(600).fill({ x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0 }) };
    };

    scene.create();
    const lamp = images.find((img) => img.key === 'home_lamp');
    assert.ok(lamp, 'home_lamp must exist');
    assert.equal(lamp.rotation, 0, 'Initial lamp rotation at frame 0 must be 0');

    const timer = events[0];
    assert.ok(timer, 'Trainspotting timer event must exist');

    // Advance to frame index 240 (peak positive swing)
    for (let i = 0; i < 240; i++) {
        timer.callback();
    }
    assert.equal(lamp.rotation, lampTimeline.frames[240].rotation);
    assert.ok(lamp.rotation > 0.05, 'Lamp should swing positive (> 0.05 rad) at frame 240');

    // Advance to frame index 270 (peak negative swing)
    for (let i = 240; i < 270; i++) {
        timer.callback();
    }
    assert.equal(lamp.rotation, lampTimeline.frames[270].rotation);
    assert.ok(lamp.rotation < -0.05, 'Lamp should swing negative (< -0.05 rad) at frame 270');
});
