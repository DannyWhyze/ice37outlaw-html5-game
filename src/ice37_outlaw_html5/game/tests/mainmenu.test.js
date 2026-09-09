const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('verifies native 352% HD MainMenu assets (background, cat shapes) exist and match exact HD dimensions', () => {
    const menuDir = path.join(__dirname, '../assets/images/mainmenu');

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

    // 1. Background (DefineShape3 108, 1920x1055 px)
    const bgDims = readDimensions(path.join(menuDir, 'mainmenu_bg.png'));
    assert.equal(bgDims.width, 1920, 'mainmenu_bg.png width must be 1920');
    assert.equal(bgDims.height, 1055, 'mainmenu_bg.png height must be 1055');

    // 2. Cat animation: Paw swipe / reach (DefineShape 10, 336x226 px)
    const cat10Dims = readDimensions(path.join(menuDir, 'cat/10.png'));
    assert.equal(cat10Dims.width, 336, 'cat/10.png width must be 336');
    assert.equal(cat10Dims.height, 226, 'cat/10.png height must be 226');

    // 3. Cat animation: Paw return (DefineShape 12, 299x365 px)
    const cat12Dims = readDimensions(path.join(menuDir, 'cat/12.png'));
    assert.equal(cat12Dims.width, 299, 'cat/12.png width must be 299');
    assert.equal(cat12Dims.height, 365, 'cat/12.png height must be 365');

    // 4. Cat animation: Head / alert pose (DefineShape 13, 200x322 px)
    const cat13Dims = readDimensions(path.join(menuDir, 'cat/13.png'));
    assert.equal(cat13Dims.width, 200, 'cat/13.png width must be 200');
    assert.equal(cat13Dims.height, 322, 'cat/13.png height must be 322');

    // 5. Cat animation: Leap / jump (DefineShape 15, 444x233 px)
    const cat15Dims = readDimensions(path.join(menuDir, 'cat/15.png'));
    assert.equal(cat15Dims.width, 444, 'cat/15.png width must be 444');
    assert.equal(cat15Dims.height, 233, 'cat/15.png height must be 233');

    // 6. Cat animation: Clip mask (DefineShape 8, 563x389 px)
    const cat8Dims = readDimensions(path.join(menuDir, 'cat/8.png'));
    assert.equal(cat8Dims.width, 563, 'cat/8.png width must be 563');
    assert.equal(cat8Dims.height, 389, 'cat/8.png height must be 389');
});

test('verifies BootScene loads mainmenu_bg as PNG with 1080p_hd cache-buster', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    assert.ok(
        bootSource.includes("this.load.image('mainmenu_bg', 'assets/images/mainmenu/mainmenu_bg.png?v=1080p_hd');"),
        'BootScene must load mainmenu_bg as HD PNG with 1080p_hd cache-buster'
    );
});

test('declares the Stencil runtime font used by the MainMenu gallery label', () => {
    const gameDir = path.join(__dirname, '..');
    const stencilFontPath = path.join(gameDir, 'assets/fonts/Stencil.ttf');
    const indexHtml = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');

    assert.ok(fs.existsSync(stencilFontPath), 'Stencil runtime font must exist');
    assert.match(indexHtml, /font-family:\s*'Stencil';[\s\S]*?assets\/fonts\/Stencil\.ttf/);
});

test('opens the existing gallery overlay from the labelled MainMenu poster', () => {
    const MenuScene = require('../js/MenuScene.js');
    const previousGalleryStorage = global.GalleryStorage;
    const previousGalleryOverlay = global.GalleryOverlay;
    const texts = [];
    const zones = [];

    class TestGalleryStorageService {}
    class TestGalleryOverlay {
        constructor(scene, options) {
            this.scene = scene;
            this.storage = options.storage;
            this.openCount = 0;
        }

        open() {
            this.openCount += 1;
        }
    }

    global.GalleryStorage = { GalleryStorageService: TestGalleryStorageService };
    global.GalleryOverlay = TestGalleryOverlay;

    try {
        const scene = new MenuScene();
        scene.registeredSceneKeys = [];
        scene.cameras = { main: { width: 1920, height: 1080 } };
        scene.createCatEasterEgg = () => {};
        scene.add = {
            image: () => ({
                setDisplaySize() { return this; },
                setScale() { return this; },
                setOrigin() { return this; },
                setAlpha() { return this; },
            }),
            text: (x, y, text, style) => {
                const label = {
                    x,
                    y,
                    text,
                    style,
                    depth: 0,
                    setOrigin() { return this; },
                    setDepth(depth) { this.depth = depth; return this; },
                    setTint(tint) { this.tint = tint; return this; },
                    clearTint() { this.tint = null; return this; },
                };
                texts.push(label);
                return label;
            },
            zone: (x, y, width, height) => {
                const zone = {
                    x,
                    y,
                    width,
                    height,
                    depth: 0,
                    events: {},
                    setOrigin() { return this; },
                    setDepth(depth) { this.depth = depth; return this; },
                    setInteractive(config) { this.interactiveConfig = config; return this; },
                    on(event, callback) { this.events[event] = callback; return this; },
                    emit(event) { return this.events[event]?.(); },
                };
                zones.push(zone);
                return zone;
            },
        };

        scene.create();

        const galleryLabel = texts.find((label) => label.text === 'GALLERY');
        assert.ok(galleryLabel, 'MainMenu poster must display a GALLERY label');
        assert.equal(galleryLabel.style.fontFamily, "'Stencil', sans-serif");
        assert.equal(galleryLabel.style.color, '#333333', 'Gallery label must use the MainMenu default grey');
        assert.equal(galleryLabel.style.strokeThickness, 0, 'Gallery label must not add a non-menu outline');
        assert.equal(galleryLabel.depth, 61, 'Gallery label must remain above the menu background');

        const posterButton = zones.find((zone) => zone.interactiveConfig?.useHandCursor === true);
        assert.ok(posterButton, 'MainMenu poster must provide a hand-cursor click zone');
        assert.equal(posterButton.depth, 60, 'Poster click zone must remain below the label');
        posterButton.emit('pointerover');
        assert.equal(posterButton.events.pointerover && galleryLabel.tint, 0x000000, 'Gallery hover must use the MainMenu black');
        posterButton.emit('pointerout');
        assert.equal(galleryLabel.tint, null, 'Gallery hover exit must restore the default grey');
        posterButton.emit('pointerdown');

        assert.ok(scene.galleryOverlay instanceof TestGalleryOverlay);
        assert.equal(scene.galleryOverlay.storage instanceof TestGalleryStorageService, true);
        assert.equal(scene.galleryOverlay.openCount, 1, 'Poster click must open the gallery overlay');

        const firstOverlay = scene.galleryOverlay;
        const firstStorage = scene.galleryStorage;
        scene.create();

        assert.equal(
            scene.galleryStorage,
            firstStorage,
            'MenuScene recreation must retain the selected storage adapter instead of probing the gallery server again'
        );
        zones.at(-1).emit('pointerdown');

        assert.notEqual(
            scene.galleryOverlay,
            firstOverlay,
            'MenuScene recreation must not reuse an overlay whose Phaser container was destroyed during scene shutdown'
        );
        assert.equal(scene.galleryOverlay.openCount, 1, 'The recreated overlay must open on its first poster click');
    } finally {
        global.GalleryStorage = previousGalleryStorage;
        global.GalleryOverlay = previousGalleryOverlay;
    }
});

test('verifies MainMenu audio assets exist and match Flash sound extraction sizes', () => {
    const audioDir = path.join(__dirname, '../assets/audio/mainmenu');
    assert.ok(fs.existsSync(audioDir), 'mainmenu audio directory must exist');

    const meowPath = path.join(audioDir, 'cat_meow_11.mp3');
    assert.ok(fs.existsSync(meowPath), 'cat_meow_11.mp3 must exist');
    const meowStats = fs.statSync(meowPath);
    assert.equal(meowStats.size, 1872, 'cat_meow_11.mp3 size must match 1872 bytes');

    const screechPath = path.join(audioDir, 'cat_screech_16.mp3');
    assert.ok(fs.existsSync(screechPath), 'cat_screech_16.mp3 must exist');
    const screechStats = fs.statSync(screechPath);
    assert.equal(screechStats.size, 3120, 'cat_screech_16.mp3 size must match 3120 bytes');
});

test('verifies BootScene preloads cat audio assets', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    assert.ok(
        bootSource.includes("this.load.audio('cat_meow', 'assets/audio/mainmenu/cat_meow_11.mp3');"),
        'BootScene must preload cat_meow'
    );
    assert.ok(
        bootSource.includes("this.load.audio('cat_screech', 'assets/audio/mainmenu/cat_screech_16.mp3');"),
        'BootScene must preload cat_screech'
    );
});

test('instantiates MenuScene and creates Cat Easter Egg container, hit area, and animations', () => {
    const MenuScene = require('../js/MenuScene.js');
    const scene = new MenuScene();

    const scaleS = 1920 / 546;
    const offsetY = (1080 - 300 * scaleS) / 2;
    const expectedCatX = 451.35 * scaleS;
    const expectedCatY = 121.15 * scaleS + offsetY;

    const playedSounds = [];
    const tweensAdded = [];
    const delayedCalls = [];
    const containerChildren = [];

    const mockCatContainer = {
        x: 0,
        y: 0,
        depth: 0,
        mask: null,
        setDepth(d) { this.depth = d; return this; },
        setMask(m) { this.mask = m; return this; },
        add(child) { containerChildren.push(child); return this; }
    };

    const mockHitArea = {
        events: {},
        depth: 0,
        isInteractive: false,
        setInteractive() { this.isInteractive = true; return this; },
        setDepth(d) { this.depth = d; return this; },
        on(event, cb) { this.events[event] = cb; return this; }
    };

    const mockCatPaw = {
        texture: '',
        x: 0, y: 0,
        originX: 0, originY: 0,
        rotation: 0,
        visible: false,
        setTexture(t) { this.texture = t; return this; },
        setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setScale() { return this; },
        setVisible(v) { this.visible = v; return this; }
    };

    const mockCatBody = {
        texture: '',
        x: 0, y: 0,
        originX: 0, originY: 0,
        visible: false,
        setTexture(t) { this.texture = t; return this; },
        setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale() { return this; },
        setVisible(v) { this.visible = v; return this; }
    };

    scene.add = {
        container(x, y) {
            mockCatContainer.x = x;
            mockCatContainer.y = y;
            return mockCatContainer;
        },
        image(_x, _y, key) {
            if (key === 'mainmenu_cat_15') return mockCatBody;
            if (key === 'mainmenu_cat_10') return mockCatPaw;
            return {
                setDisplaySize() { return this; },
                setScale() { return this; },
                setAlpha() { return this; },
                setDepth() { return this; }
            };
        },
        zone(_x, _y, _w, _h) {
            return mockHitArea;
        }
    };

    scene.make = {
        image(config) {
            return {
                config,
                setScale() { return this; },
                setOrigin() { return this; },
                createBitmapMask() { return { type: 'BitmapMask' }; }
            };
        }
    };

    scene.sound = {
        play(key) { playedSounds.push(key); }
    };

    scene.tweens = {
        add(config) {
            tweensAdded.push(config);
            if (config.onComplete) {
                config.onComplete();
            }
            return config;
        }
    };

    scene.time = {
        delayedCall(delay, callback) {
            delayedCalls.push({ delay, callback });
            callback();
        }
    };

    scene.cameras = {
        main: { width: 1920, height: 1080 }
    };

    scene.createCatEasterEgg(scaleS, offsetY);

    // Verify cat container placement & depth
    assert.equal(mockCatContainer.depth, 26, 'Cat container must be depth 26');
    assert.ok(Math.abs(mockCatContainer.x - expectedCatX) < 0.001, 'Cat X must match Flash matrix 451.35 * scaleS');
    assert.ok(Math.abs(mockCatContainer.y - expectedCatY) < 0.001, 'Cat Y must match Flash matrix 121.15 * scaleS + offsetY');
    assert.ok(mockCatContainer.mask, 'Cat container must have BitmapMask');

    // Verify hit area
    assert.equal(mockHitArea.isInteractive, true, 'Hit area must be interactive');
    assert.equal(mockHitArea.depth, 27, 'Hit area depth must be 27');
    assert.equal(typeof mockHitArea.events.pointerover, 'function', 'Hit area must wire pointerover');
    assert.equal(typeof mockHitArea.events.pointerdown, 'function', 'Hit area must wire pointerdown');

    // Verify Rollover event
    mockHitArea.events.pointerover();
    assert.ok(playedSounds.includes('cat_meow'), 'Rollover must play cat_meow');
    assert.equal(scene.isCatBusy, false, 'isCatBusy must return to false after animation completes');

    // Verify Click event
    mockHitArea.events.pointerdown();
    assert.ok(playedSounds.includes('cat_screech'), 'Click must play cat_screech');
    assert.equal(scene.isCatBusy, false, 'isCatBusy must return to false after jump completes');

    // Verify busy guard prevents double invocation
    scene.isCatBusy = true;
    const soundCountBefore = playedSounds.length;
    mockHitArea.events.pointerover();
    mockHitArea.events.pointerdown();
    assert.equal(playedSounds.length, soundCountBefore, 'Events while busy must be ignored');
});

test('verifies native 352% HD MainMenu button frames exist and match exact HD dimensions', () => {
    const btnDir = path.join(__dirname, '../assets/images/mainmenu/buttons');

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

    const configs = [
        { key: 'home', w: 365, h: 168 },
        { key: 'hall', w: 801, h: 168 },
        { key: 'street', w: 965, h: 177 },
        { key: 'train', w: 700, h: 185 }
    ];

    configs.forEach((cfg) => {
        for (let f = 1; f <= 25; f++) {
            const framePath = path.join(btnDir, cfg.key, `${f}.png`);
            const dims = readDims(framePath);
            assert.equal(dims.width, cfg.w, `${cfg.key}/${f}.png width must be ${cfg.w}`);
            assert.equal(dims.height, cfg.h, `${cfg.key}/${f}.png height must be ${cfg.h}`);
        }
    });
});

test('verifies BootScene preloads 4x25 HD button animation frames', () => {
    const bootSource = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf8');
    assert.ok(
        bootSource.includes("this.load.image(`menu_btn_${btnKey}_${f}`, `assets/images/mainmenu/buttons/${btnKey}/${f}.png?v=1080p_hd`);"),
        'BootScene must preload 4x25 HD button frames'
    );
});

test('instantiates MenuScene with exact Flash coordinates, origins, and 25-frame dripping hover animation', () => {
    const MenuScene = require('../js/MenuScene.js');
    const scene = new MenuScene();

    const scaleS = 1920 / 546;
    const offsetY = (1080 - 300 * scaleS) / 2;

    const addedImages = [];
    const timers = [];

    scene.add = {
        image(x, y, texture) {
            const img = {
                x, y, texture,
                scale: 1,
                originX: 0.5, originY: 0.5,
                alpha: 1,
                isInteractive: false,
                events: {},
                setDisplaySize() { return this; },
                setScale(s) { this.scale = s; return this; },
                setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
                setAlpha(a) { this.alpha = a; return this; },
                setTexture(t) { this.texture = t; return this; },
                setVisible(_v) { return this; },
                setInteractive() { this.isInteractive = true; return this; },
                on(event, cb) { this.events[event] = cb; return this; }
            };
            addedImages.push(img);
            return img;
        },
        container() {
            return { setDepth() { return this; }, add() { return this; } };
        },
        zone() {
            return { setDepth() { return this; }, setInteractive() { return this; }, on() { return this; } };
        }
    };

    scene.make = {
        image() {
            return { setScale() { return this; }, setOrigin() { return this; }, createBitmapMask() { return {}; } };
        }
    };

    scene.time = {
        addEvent(config) {
            timers.push(config);
            return {
                remove() { config.removed = true; }
            };
        }
    };

    scene.cameras = {
        main: {
            width: 1920,
            height: 1080,
            fadeOut() {},
            once(_ev, cb) { cb(); }
        }
    };

    const startedScenes = [];
    scene.scene = {
        start(key) { startedScenes.push(key); }
    };

    scene.create();

    // The last 4 images added to scene.add.image are the 4 menu buttons
    const btnImages = addedImages.slice(-4);
    assert.equal(btnImages.length, 4, 'Must create 4 menu buttons');

    const expected = [
        { id: 'home', y: 119.25, ox: 0.3855, oy: 0.2563, scene: 'HomeScene' },
        { id: 'hall', y: 148.40, ox: 0.4479, oy: 0.2563, scene: 'HallOfFameScene' },
        { id: 'street', y: 177.55, ox: 0.4573, oy: 0.2428, scene: 'StreetScene' },
        { id: 'train', y: 206.75, ox: 0.4425, oy: 0.2326, scene: 'TrainyardScene' }
    ];

    expected.forEach((exp, idx) => {
        const btn = btnImages[idx];
        const expectedX = 270.0 * scaleS;
        const expectedY = exp.y * scaleS + offsetY;

        assert.ok(Math.abs(btn.x - expectedX) < 0.001, `${exp.id} X must match Flash 270.0 * scaleS`);
        assert.ok(Math.abs(btn.y - expectedY) < 0.001, `${exp.id} Y must match Flash ${exp.y} * scaleS + offsetY`);
        assert.equal(btn.scale, 0.70, `${exp.id} scale must be 0.70`);
        assert.ok(Math.abs(btn.originX - exp.ox) < 0.001, `${exp.id} originX must match ${exp.ox}`);
        assert.ok(Math.abs(btn.originY - exp.oy) < 0.001, `${exp.id} originY must match ${exp.oy}`);
        assert.equal(btn.texture, `menu_btn_${exp.id}_1`, `${exp.id} initial texture must be frame 1`);
        assert.equal(btn.isInteractive, true, `${exp.id} must be interactive`);

        // Test pointerover triggers animation timer
        btn.events.pointerover();
        const activeTimer = timers[timers.length - 1];
        assert.equal(activeTimer.delay, 40, 'Timer delay must be 40ms (25 FPS)');
        assert.equal(activeTimer.repeat, 24, 'Timer repeat must be 24 (frames 2 to 25)');

        // Simulate frame progress
        activeTimer.callback();
        assert.equal(btn.texture, `menu_btn_${exp.id}_2`, 'Must advance to frame 2');

        // Test pointerout resets to frame 1 and cancels timer
        btn.events.pointerout();
        assert.equal(activeTimer.removed, true, 'pointerout must remove animation timer');
        assert.equal(btn.texture, `menu_btn_${exp.id}_1`, 'pointerout must reset to frame 1');

        // Test pointerdown triggers scene transition
        btn.events.pointerdown();
        assert.equal(startedScenes[startedScenes.length - 1], exp.scene, `pointerdown must navigate to ${exp.scene}`);
    });
});

test('verifies all 4 MainMenu buttons (home, hall, street, train) use authentic Flash #333333 grey in Frame 1, pure black (0, 0, 0) in Frames 2..25, and no text-flicker in Frame 2', () => {
    const zlib = require('node:zlib');
    const btnDir = path.join(__dirname, '../assets/images/mainmenu/buttons');

    const inspectPixels = (filePath) => {
        const data = fs.readFileSync(filePath);
        const w = data.readUInt32BE(16);
        const h = data.readUInt32BE(20);
        let idat = Buffer.alloc(0);
        let pos = 8;
        while (pos < data.length) {
            const len = data.readUInt32BE(pos);
            const ctype = data.toString('ascii', pos + 4, pos + 8);
            if (ctype === 'IDAT') {
                idat = Buffer.concat([idat, data.subarray(pos + 8, pos + 8 + len)]);
            }
            pos += 12 + len;
        }
        const raw = zlib.inflateSync(idat);
        const stride = 1 + w * 4;
        let opaquePixelCount = 0;
        const pixels = [];
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = y * stride + 1 + x * 4;
                const r = raw[idx];
                const g = raw[idx + 1];
                const b = raw[idx + 2];
                const a = raw[idx + 3];
                if (a > 0) {
                    opaquePixelCount++;
                    pixels.push({ x, y, r, g, b, a });
                }
            }
        }
        return { w, h, opaquePixelCount, pixels };
    };

    ['home', 'hall', 'street', 'train'].forEach((key) => {
        const f1 = inspectPixels(path.join(btnDir, key, '1.png'));
        assert.ok(f1.opaquePixelCount > 0, `${key}/1.png must have visible pixels`);

        // Frame 1 must be authentic Flash #333333 wall grey
        for (const p of f1.pixels) {
            assert.equal(p.r, 51, `Pixel at (${p.x}, ${p.y}) in ${key}/1.png must have R=51 (#333333) (got ${p.r})`);
            assert.equal(p.g, 51, `Pixel at (${p.x}, ${p.y}) in ${key}/1.png must have G=51 (#333333) (got ${p.g})`);
            assert.equal(p.b, 51, `Pixel at (${p.x}, ${p.y}) in ${key}/1.png must have B=51 (#333333) (got ${p.b})`);
        }

        // Frame 2 must maintain all text pixels (count >= frame 1 count) to prevent hover flicker
        const f2 = inspectPixels(path.join(btnDir, key, '2.png'));
        assert.ok(
            f2.opaquePixelCount >= f1.opaquePixelCount,
            `${key}/2.png pixel count (${f2.opaquePixelCount}) must be >= Frame 1 count (${f1.opaquePixelCount}) to prevent text dropout flicker`
        );

        // Frames 2..25 must be pure black (0, 0, 0)
        for (let f = 2; f <= 25; f++) {
            const frameInfo = (f === 2) ? f2 : inspectPixels(path.join(btnDir, key, `${f}.png`));
            for (const p of frameInfo.pixels) {
                assert.equal(p.r, 0, `Pixel at (${p.x}, ${p.y}) in ${key}/${f}.png must have R=0 (got ${p.r})`);
                assert.equal(p.g, 0, `Pixel at (${p.x}, ${p.y}) in ${key}/${f}.png must have G=0 (got ${p.g})`);
                assert.equal(p.b, 0, `Pixel at (${p.x}, ${p.y}) in ${key}/${f}.png must have B=0 (got ${p.b})`);
            }
        }
    });
});
