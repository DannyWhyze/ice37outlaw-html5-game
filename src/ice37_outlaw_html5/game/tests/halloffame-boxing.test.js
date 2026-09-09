const assert = require('node:assert/strict');
const test = require('node:test');

const {
    FRAME_SHAPES,
    BOXING_FRAME_MS,
    KICK_FRAME_MS,
    resolveBoxingScrollDistance,
    resolveKickScrollDistance,
    resolveCombatScrollDistance,
    BOXING_PLACEMENT,
    getFrameKey,
    getFramePresentation,
    getFacingLeft,
    getKickFrameKey,
    getKickFramePresentation,
    getPlayerPresentation,
    getShadowPresentation,
    KICK_FRAME_SHAPES,
    KICK_PLACEMENT,
    PLAYER_SHADOW,
} = require('../js/logic/playerCombat.js');

test('keeps the evidenced 13-frame boxing sequence', () => {
    assert.deepEqual(FRAME_SHAPES, [16, 16, 17, 17, 18, 18, 19, 19, 19, 20, 20, 20, 20]);
});

test('allows one Flash movement step at boxing start and blocks movement through completion', () => {
    const worldScrollSpeed = 527.472527;
    const normalDistance = worldScrollSpeed * 0.016;
    const flashStep = worldScrollSpeed * (BOXING_FRAME_MS / 1000);

    assert.equal(BOXING_FRAME_MS, 40);

    assert.equal(resolveBoxingScrollDistance({
        normalDistance, worldScrollSpeed, wasBoxing: false, isBoxing: false,
    }), normalDistance);
    assert.ok(Math.abs(resolveBoxingScrollDistance({
        normalDistance, worldScrollSpeed, wasBoxing: false, isBoxing: true,
    }) - flashStep) < 1e-9);
    assert.equal(resolveBoxingScrollDistance({
        normalDistance, worldScrollSpeed, wasBoxing: true, isBoxing: true,
    }), 0);
    assert.equal(resolveBoxingScrollDistance({
        normalDistance, worldScrollSpeed, wasBoxing: true, isBoxing: false,
    }), 0);
});

test('allows one Flash movement step at kick start and blocks movement through completion', () => {
    const worldScrollSpeed = 527.472527;
    const normalDistance = worldScrollSpeed * 0.016;
    const flashStep = worldScrollSpeed * (KICK_FRAME_MS / 1000);

    assert.equal(KICK_FRAME_MS, 40);

    assert.equal(resolveKickScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: false, isKicking: false,
    }), normalDistance);
    assert.ok(Math.abs(resolveKickScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: false, isKicking: true,
    }) - flashStep) < 1e-9);
    assert.equal(resolveKickScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: true, isKicking: true,
    }), 0);
    assert.equal(resolveKickScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: true, isKicking: false,
    }), 0);

    assert.equal(resolveCombatScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: false, isKicking: false,
    }), normalDistance);
    assert.ok(Math.abs(resolveCombatScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: false, isKicking: true,
    }) - flashStep) < 1e-9);
    assert.equal(resolveCombatScrollDistance({
        normalDistance, worldScrollSpeed, wasKicking: true, isKicking: false,
    }), 0);
});

test('maps every boxing frame to its runtime texture key', () => {
    for (let frameNumber = 1; frameNumber <= 13; frameNumber += 1) {
        assert.equal(getFrameKey(frameNumber), `halloffame_boxen_frame_${String(frameNumber).padStart(2, '0')}`);
    }
});

test('rejects boxing frame numbers outside the evidenced sequence', () => {
    assert.throws(() => getFrameKey(0), /Invalid boxing frame number/);
    assert.throws(() => getFrameKey(14), /Invalid boxing frame number/);
});

test('maps each source shape to its measured Flash registration origin', () => {
    const expectedOrigins = [
        [1, 98 / 196, 104.7 / 381.15],
        [3, 56.6 / 277.4, 88.35 / 364.95],
        [5, 56.5 / 272.75, 81.6 / 358.2],
        [7, 62.8 / 196, 96.95 / 373.5],
        [10, 94.3 / 196, 102.9 / 378.75],
    ];

    for (const [frameNumber, x, y] of expectedOrigins) {
        const presentation = getFramePresentation(frameNumber);
        assert.equal(presentation.key, getFrameKey(frameNumber));
        assert.ok(Math.abs(presentation.origin.x - x) < 1e-12);
        assert.ok(Math.abs(presentation.origin.y - y) < 1e-12);
    }
});

test('prioritizes held boxing over the existing movement presentation', () => {
    assert.equal(getPlayerPresentation({ boxingKeyDown: true, isMoving: false }), 'boxing');
    assert.equal(getPlayerPresentation({ boxingKeyDown: true, isMoving: true }), 'boxing');
    assert.equal(getPlayerPresentation({ boxingKeyDown: false, isMoving: true }), 'walking');
    assert.equal(getPlayerPresentation({ boxingKeyDown: false, isMoving: false }), 'idle');
});

test('keeps the evidenced boxing child matrix relative to the player root', () => {
    assert.deepEqual(BOXING_PLACEMENT, { x: -47.15, y: 103.1 });
});

test('retains or updates the facing direction exactly like the Arrow input path', () => {
    assert.equal(getFacingLeft({ isMovingLeft: true, isMovingRight: false, wasFacingLeft: false }), true);
    assert.equal(getFacingLeft({ isMovingLeft: false, isMovingRight: true, wasFacingLeft: true }), false);
    assert.equal(getFacingLeft({ isMovingLeft: false, isMovingRight: false, wasFacingLeft: true }), true);
    assert.equal(getFacingLeft({ isMovingLeft: false, isMovingRight: false, wasFacingLeft: false }), false);
});

test('keeps the evidenced 12-frame kick sequence and its child matrix', () => {
    assert.deepEqual(KICK_FRAME_SHAPES, [22, 22, 23, 23, 23, 24, 24, 24, 25, 25, 25, 25]);
    assert.deepEqual(KICK_PLACEMENT, { x: -66.8, y: 69.4 });
});

test('maps kick frames to their named texture keys and measured registrations', () => {
    const expectedOrigins = [
        [1, 98 / 196, 62 / 374.1],
        [3, 81.75 / 278.45, 54.35 / 365.7],
        [6, 71 / 196, 62.8 / 375],
        [9, 59.5 / 196, 66.45 / 378.4],
    ];

    for (const [frameNumber, x, y] of expectedOrigins) {
        const presentation = getKickFramePresentation(frameNumber);
        assert.equal(presentation.key, `halloffame_kick_frame_${String(frameNumber).padStart(2, '0')}`);
        assert.equal(presentation.key, getKickFrameKey(frameNumber));
        assert.ok(Math.abs(presentation.origin.x - x) < 1e-12);
        assert.ok(Math.abs(presentation.origin.y - y) < 1e-12);
    }

    assert.throws(() => getKickFrameKey(0), /Invalid kick frame number/);
    assert.throws(() => getKickFrameKey(13), /Invalid kick frame number/);
});

test('keeps boxing ahead of kick and kick ahead of walking', () => {
    assert.equal(getPlayerPresentation({ boxingKeyDown: true, kickingKeyDown: true, isMoving: true }), 'boxing');
    assert.equal(getPlayerPresentation({ boxingKeyDown: false, kickingKeyDown: true, isMoving: true }), 'kicking');
});

test('keeps the Shape 8 shadow registration relative to the player root', () => {
    assert.equal(PLAYER_SHADOW.key, 'halloffame_player_shadow');
    assert.ok(Math.abs(PLAYER_SHADOW.origin.x - 86.35 / 148.5) < 1e-12);
    assert.ok(Math.abs(PLAYER_SHADOW.origin.y - -365.8 / 23.2) < 1e-12);
});

test('shows the Shape 8 shadow for walking and combat but not idle', () => {
    assert.deepEqual(getShadowPresentation({ playerPresentation: 'idle', isFacingLeft: false }), {
        key: 'halloffame_player_shadow',
        origin: { x: 86.35 / 148.5, y: -365.8 / 23.2 },
        visible: false,
        flipX: false,
    });
    assert.equal(getShadowPresentation({ playerPresentation: 'walking', isFacingLeft: true }).visible, true);
    assert.equal(getShadowPresentation({ playerPresentation: 'boxing', isFacingLeft: true }).flipX, true);
    assert.equal(getShadowPresentation({ playerPresentation: 'kicking', isFacingLeft: false }).visible, true);
});
