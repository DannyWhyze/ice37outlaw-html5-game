const assert = require('node:assert/strict');
const test = require('node:test');

const {
    canSpray,
    getNativeCapSize,
    interpolateSprayStamps,
    extractPointerPoints,
    SprayStroke,
    createStroke,
} = require('../js/logic/sprayPaint.js');

test('creates one stamp for a movement shorter than the cap spacing', () => {
    assert.deepEqual(
        interpolateSprayStamps({ x: 10, y: 10 }, { x: 11, y: 10 }, 5),
        [{ x: 11, y: 10 }],
    );
});

test('interpolates evenly spaced stamps across a long movement', () => {
    assert.deepEqual(
        interpolateSprayStamps({ x: 0, y: 0 }, { x: 10, y: 0 }, 5),
        [
            { x: 1.6666666666666665, y: 0 },
            { x: 3.333333333333333, y: 0 },
            { x: 5, y: 0 },
            { x: 6.666666666666666, y: 0 },
            { x: 8.333333333333334, y: 0 },
            { x: 10, y: 0 },
        ],
    );
});

test('disables spraying after scene exit has begun', () => {
    assert.equal(canSpray(true), false);
    assert.equal(canSpray(false), true);
});

test('scales Flash cap size by native stage factor for 1080p rendering', () => {
    assert.ok(Math.abs(getNativeCapSize(2) - (2 * 1920 / 546)) < 0.001);
    assert.ok(Math.abs(getNativeCapSize(5) - (5 * 1920 / 546)) < 0.001);
    assert.ok(Math.abs(getNativeCapSize(10) - (10 * 1920 / 546)) < 0.001);
    assert.ok(Math.abs(getNativeCapSize(28) - (28 * 1920 / 546)) < 0.001);
});

test('extractPointerPoints returns fallback point when no coalesced events exist', () => {
    const pointer = { x: 300, y: 150 };
    const points = extractPointerPoints(pointer, 50, null);
    assert.deepEqual(points, [{ x: 250, y: 150 }]);
});

test('extractPointerPoints transforms coalesced client coordinates to 1080p canvas space', () => {
    const mockCanvas = {
        getBoundingClientRect: () => ({
            left: 100,
            top: 50,
            width: 960,  // scaleX = 1920 / 960 = 2
            height: 540, // scaleY = 1080 / 540 = 2
        }),
    };
    const pointer = {
        x: 300,
        y: 200,
        event: {
            getCoalescedEvents: () => [
                { clientX: 150, clientY: 100 }, // (150-100)*2 - 20 = 80, (100-50)*2 = 100
                { clientX: 200, clientY: 150 }, // (200-100)*2 - 20 = 180, (150-50)*2 = 200
            ],
        },
    };
    const points = extractPointerPoints(pointer, 20, mockCanvas);
    assert.equal(points.length, 2);
    assert.deepEqual(points[0], { x: 80, y: 100 });
    assert.deepEqual(points[1], { x: 180, y: 200 });
});

test('extractPointerPoints filters micro jitter points under 1.5px distance', () => {
    const pointer = {
        x: 100,
        y: 100,
        event: {
            getCoalescedEvents: () => [
                { clientX: 100, clientY: 100 },
                { clientX: 100.5, clientY: 100.5 }, // hypot delta ~ 0.7px -> filtered
                { clientX: 110, clientY: 110 },     // hypot delta ~ 13.4px -> accepted
            ],
        },
    };
    const points = extractPointerPoints(pointer, 0, null);
    assert.equal(points.length, 2);
    assert.deepEqual(points[0], { x: 100, y: 100 });
    assert.deepEqual(points[1], { x: 110, y: 110 });
});

test('extractPointerPoints handles getCoalescedEvents error defensively with fallback', () => {
    const pointer = {
        x: 400,
        y: 250,
        event: {
            getCoalescedEvents: () => {
                throw new Error('PermissionDenied or TouchError');
            },
        },
    };
    const points = extractPointerPoints(pointer, 100, null);
    assert.deepEqual(points, [{ x: 300, y: 250 }]);
});

test('SprayStroke handles 2-point short stroke with finish()', () => {
    const stroke = createStroke({ x: 10, y: 10 }, 5);
    const duringStamps = stroke.addPoints([{ x: 20, y: 10 }]);
    assert.equal(duringStamps.length, 0); // Not enough points for a triple yet
    const finalStamps = stroke.finish();
    assert.ok(finalStamps.length > 0);
    const lastStamp = finalStamps[finalStamps.length - 1];
    assert.equal(lastStamp.x, 20);
    assert.equal(lastStamp.y, 10);
});

test('SprayStroke generates curved Bezier stamps between midpoints on an arc', () => {
    const stroke = new SprayStroke({ x: 0, y: 0 }, 5);
    // Arc points: (0,0) -> (50, 50) -> (100, 0)
    // Direct chord between midpoints (25, 25) and (75, 25) has y = 25.
    // Quadratic Bezier with control point (50, 50) should produce points with y > 25.
    const stamps = stroke.addPoints([
        { x: 50, y: 50 },
        { x: 100, y: 0 },
    ]);
    assert.ok(stamps.length > 0);
    const maxY = Math.max(...stamps.map(s => s.y));
    assert.ok(maxY > 25, `Expected Bezier curve to bulge above chord (maxY: ${maxY} > 25)`);
});

test('SprayStroke preserves sharp 90-degree corner without smoothing', () => {
    const stroke = new SprayStroke({ x: 0, y: 0 }, 5);
    // 90-degree corner: (0,0) -> (50, 0) -> (50, 50)
    // cosTheta = 0 < 0.342, triggering sharp corner linear stamping through P1 (50,0)
    const stamps = stroke.addPoints([
        { x: 50, y: 0 },
        { x: 50, y: 50 },
    ]);
    assert.ok(stamps.length > 0);
    // Sharp corner must explicitly hit or pass very close to the apex (50, 0)
    const apexPass = stamps.some(s => Math.hypot(s.x - 50, s.y - 0) < 3);
    assert.ok(apexPass, 'Expected stamps to pass directly through apex (50, 0) for sharp corner');
});

test('SprayStroke maintains O(1) memory window during incremental drawing', () => {
    const stroke = new SprayStroke({ x: 0, y: 0 }, 5);
    for (let i = 1; i <= 100; i++) {
        stroke.addPoints([{ x: i * 5, y: Math.sin(i) * 10 }]);
        assert.ok(stroke.points.length <= 2, `Expected sliding window length <= 2, got ${stroke.points.length}`);
    }
    const finalStamps = stroke.finish();
    assert.ok(finalStamps.length > 0);
    assert.equal(stroke.points.length, 0);
});


