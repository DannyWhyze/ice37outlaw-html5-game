const assert = require('node:assert/strict');
const test = require('node:test');

if (!global.Phaser) {
    global.Phaser = {
        Scene: class {},
        Scenes: {
            Events: { SHUTDOWN: 'shutdown' },
        },
    };
}

const { getCursorPresentation } = require('../js/logic/toolCursor.js');

test('uses the hand cursor while hovering over the backpack', () => {
    assert.deepEqual(getCursorPresentation(true, 'can'), {
        key: 'halloffame_cursor_hand',
        origin: { x: 24 / 88, y: 2 / 98 },
    });
});

test('uses the paintroller cursor for the roller tool', () => {
    assert.deepEqual(getCursorPresentation(false, 'streiche'), {
        key: 'halloffame_cursor_paintroller',
        origin: { x: 108.8 / 212.6, y: 42.4 / 240.2 },
    });
});

test('uses the spraycan cursor for every non-roller painting tool', () => {
    assert.deepEqual(getCursorPresentation(false, 'can'), {
        key: 'halloffame_cursor_spraycan',
        origin: { x: 46 / 97.6, y: 9.6 / 213.6 },
    });
});

test('verifies all 3 native cursor PNG files exist in cursor_native directory', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const dir = path.join(__dirname, '../assets/images/prefabs/cursor');
    assert.ok(fs.existsSync(dir), 'cursor_native directory must exist');

    ['cursor_spraycan.png', 'cursor_paintroller.png', 'cursor_hand.png'].forEach((file) => {
        const filePath = path.join(dir, file);
        assert.ok(fs.existsSync(filePath), `File ${file} must exist`);
        assert.ok(fs.statSync(filePath).size > 0, `File ${file} must not be empty`);
    });
});

test('verifies exact dimensions of native cursor PNG files', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const dir = path.join(__dirname, '../assets/images/prefabs/cursor');

    function getPngDimensions(filePath) {
        const buf = fs.readFileSync(filePath);
        return {
            width: buf.readUInt32BE(16),
            height: buf.readUInt32BE(20),
        };
    }

    assert.deepEqual(getPngDimensions(path.join(dir, 'cursor_spraycan.png')), { width: 73, height: 159 });
    assert.deepEqual(getPngDimensions(path.join(dir, 'cursor_paintroller.png')), { width: 158, height: 178 });
    assert.deepEqual(getPngDimensions(path.join(dir, 'cursor_hand.png')), { width: 88, height: 98 });
});

test('updateToolCursor suppresses toolCursor and hand cursor on mobile/touch devices across backpack, camera, and gallery', () => {
    const { HallOfFameScene } = require('../js/halloffame/HallOfFameScene.js');
    const dummyCursor = {
        visible: true,
        texture: '',
        originX: 0,
        originY: 0,
        setVisible(v) { this.visible = v; return this; },
        setTexture(k) { this.texture = k; return this; },
        setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
        setPosition() { return this; },
        setScale() { return this; },
    };

    const mockScene = Object.create(HallOfFameScene.prototype);
    mockScene.toolCursor = dummyCursor;
    mockScene.touchControls = { isEnabled: true };
    mockScene.cameraHud = { isOpen: true };
    mockScene.galleryOverlay = { isOpen: false };
    mockScene.backpack = { containsPoint: () => true };
    mockScene.isBackpackCursor = true;

    // 1. When touchControls are enabled, cursor is unconditionally hidden even when camera and backpack are active
    mockScene.updateToolCursor({ x: 960, y: 540, wasTouch: true, pointerType: 'touch' });
    assert.equal(dummyCursor.visible, false, 'toolCursor must be hidden on touch devices when camera is active');

    // 2. When gallery is open on touch device
    mockScene.cameraHud.isOpen = false;
    mockScene.galleryOverlay.isOpen = true;
    mockScene.updateToolCursor({ x: 960, y: 540, wasTouch: true, pointerType: 'touch' });
    assert.equal(dummyCursor.visible, false, 'toolCursor must be hidden on touch devices when gallery is active');

    // 3. When backpack is hovered on touch device
    mockScene.galleryOverlay.isOpen = false;
    mockScene.updateToolCursor({ x: 960, y: 540, wasTouch: true, pointerType: 'touch' });
    assert.equal(dummyCursor.visible, false, 'toolCursor must be hidden on touch devices when backpack is hovered');

    // 4. On desktop (touchControls disabled, mouse pointer), hand cursor is shown when camera/gallery/backpack is active
    mockScene.touchControls.isEnabled = false;
    mockScene.cameraHud.isOpen = true;
    mockScene.updateToolCursor({ x: 960, y: 540, wasTouch: false, pointerType: 'mouse' });
    assert.equal(dummyCursor.visible, true, 'toolCursor must be visible on desktop mouse');
    assert.equal(dummyCursor.texture, 'halloffame_cursor_hand', 'toolCursor must show hand on desktop mouse when camera is open');
});

