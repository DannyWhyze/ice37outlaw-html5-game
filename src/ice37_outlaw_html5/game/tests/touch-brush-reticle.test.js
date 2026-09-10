const assert = require('node:assert/strict');
const test = require('node:test');

const TouchPointerMode = require('../js/logic/touchPointerMode.js');
const TouchControlsLogic = require('../js/logic/touchControlsLogic.js');
const { getNativeCapSize } = require('../js/logic/sprayPaint.js');

test('isCoarsePointer correctly detects coarse media query matches', () => {
    const mockWindowCoarse = {
        matchMedia: (query) => ({
            matches: query === '(pointer: coarse)',
        }),
    };
    const mockWindowFine = {
        matchMedia: (query) => ({
            matches: query !== '(pointer: coarse)',
        }),
    };

    assert.equal(TouchPointerMode.isCoarsePointer(mockWindowCoarse, null), true, 'Must return true when (pointer: coarse) matches');
    assert.equal(TouchPointerMode.isCoarsePointer(mockWindowFine, null), false, 'Must return false when (pointer: coarse) does not match');
});

test('isCoarsePointer falls back to mobile User Agent string', () => {
    const mockWindowNoMedia = {};
    const mockNavAndroid = { userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36' };
    const mockNavDesktop = { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

    assert.equal(TouchPointerMode.isCoarsePointer(mockWindowNoMedia, mockNavAndroid), true, 'Must return true for Android mobile UA');
    assert.equal(TouchPointerMode.isCoarsePointer(mockWindowNoMedia, mockNavDesktop), false, 'Must return false for Windows desktop UA');
});

test('isTouchPointerEvent distinguishes touch vs mouse pointer events', () => {
    const touchPointer = { wasTouch: true, pointerType: 'touch' };
    const mousePointer = { wasTouch: false, pointerType: 'mouse' };
    const genericPointer = { wasTouch: false };

    assert.equal(TouchPointerMode.isTouchPointerEvent(touchPointer, false), true, 'Must return true for wasTouch=true');
    assert.equal(TouchPointerMode.isTouchPointerEvent(mousePointer, true), false, 'Must return false for pointerType="mouse" even if default was coarse');
    assert.equal(TouchPointerMode.isTouchPointerEvent(genericPointer, true), true, 'Must fall back to default when pointerType is unspecified');
});

test('calculateReticleGeometry accurately calculates worldRadius using getNativeCapSize and zoom compensation', () => {
    const cap5 = 5;
    const expectedRadius5 = getNativeCapSize(cap5) / 2;
    const geom5 = TouchPointerMode.calculateReticleGeometry(cap5, 1.0, 0xff0000);

    assert.ok(Math.abs(geom5.worldRadius - expectedRadius5) < 0.001, 'worldRadius must equal getNativeCapSize(cap) / 2');
    assert.equal(geom5.innerColor, 0xff0000, 'innerColor must match active color');
    assert.equal(geom5.outerColor, 0x000000, 'outerColor must be black for contrast');

    const cap15 = 15;
    const expectedRadius15 = getNativeCapSize(cap15) / 2;
    const geom15 = TouchPointerMode.calculateReticleGeometry(cap15, 2.0, 0x00ff00);

    assert.ok(Math.abs(geom15.worldRadius - expectedRadius15) < 0.001, 'worldRadius for fat cap must equal getNativeCapSize(15) / 2');
    assert.ok(Math.abs(geom15.strokeWidth - (2.0 / 2.0)) < 0.001, 'strokeWidth must be compensated by zoom level');
});

test('touchControlsLogic uses offset coordinates away from backpack', () => {
    const layout = TouchControlsLogic.LAYOUT;
    // Backpack is at X=3..243, buttons are offset to the right
    assert.ok(layout.buttons.left.centerX >= 280, 'Left button centerX must be offset >= 280 to clear closed backpack');
    assert.ok(layout.buttons.right.centerX >= 400, 'Right button centerX must be >= 400');
    assert.equal(layout.toggleKey, 'V', 'Toggle key must be V');
});
