const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const PlayerHurt = require('../js/logic/playerHurt.js');

test('verifies native 125% zoom hurt assets exist on disk with valid dimensions', () => {
    const assetsDir = path.resolve(__dirname, '../assets/images/prefabs/player/hurt_native');
    const requiredFiles = [
        { file: 'hurt_character_shape_110.png', width: 192, height: 456 },
        { file: 'hurt_blood_drop_shape_30.png', width: 28, height: 35 },
    ];

    for (const item of requiredFiles) {
        const fullPath = path.join(assetsDir, item.file);
        assert.ok(fs.existsSync(fullPath), `Asset file must exist: ${item.file}`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 0, `Asset file must not be empty: ${item.file}`);

        const buf = fs.readFileSync(fullPath);
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        assert.equal(w, item.width, `${item.file} width mismatch`);
        assert.equal(h, item.height, `${item.file} height mismatch`);
    }
});

test('provides correct timing and 5-tick constants for player hurt', () => {
    assert.equal(PlayerHurt.TOTAL_TICKS, 5);
    assert.ok(Math.abs(PlayerHurt.TICK_DURATION_MS - (1000 / 12)) < 0.01);
    assert.equal(PlayerHurt.FRAME_KEYS.character, 'player_hurt_character');
    assert.equal(PlayerHurt.FRAME_KEYS.bloodDrop, 'player_hurt_blood_drop');
    assert.equal(PlayerHurt.FRAME_DIMENSIONS.player_hurt_character.width, 192);
    assert.equal(PlayerHurt.FRAME_DIMENSIONS.player_hurt_character.height, 456);
    assert.equal(PlayerHurt.FRAME_DIMENSIONS.player_hurt_blood_drop.width, 28);
    assert.equal(PlayerHurt.FRAME_DIMENSIONS.player_hurt_blood_drop.height, 35);
});

test('computes correct hurt state and blood drop positions across all 5 ticks', () => {
    for (let tick = 1; tick <= 5; tick++) {
        const state = PlayerHurt.getHurtState(tick);
        assert.equal(state.tick, tick);
        assert.equal(state.frameKey, PlayerHurt.FRAME_KEYS.character);
        assert.equal(state.offsetX, PlayerHurt.NATIVE_OFFSETS.characterX);
        assert.equal(state.zeroFromFeetY, PlayerHurt.NATIVE_OFFSETS.zeroFromFeetY);
        assert.ok(state.drop1.visible);
        assert.ok(state.drop2.visible);
        assert.ok(state.drop1.x < 0, 'Drop 1 must spray backward');
        assert.ok(state.drop2.x < 0, 'Drop 2 must spray backward');
        assert.ok(state.drop1.y > 0, 'Drop 1 must spray downward');
        assert.ok(state.drop2.y > 0, 'Drop 2 must spray downward');

        assert.equal(state.isComplete, false);
    }

    // Verify parabolic flight: drops travel farther each tick
    const t1 = PlayerHurt.getHurtState(1);
    const t5 = PlayerHurt.getHurtState(5);
    assert.ok(Math.abs(t5.drop1.x) > Math.abs(t1.drop1.x), 'Drop 1 travels backward over time');
    assert.ok(t5.drop1.y > t1.drop1.y, 'Drop 1 falls downward over time');
    assert.ok(Math.abs(t5.drop2.x) > Math.abs(t1.drop2.x), 'Drop 2 travels backward over time');
    assert.ok(t5.drop2.y > t1.drop2.y, 'Drop 2 falls downward over time');
});

test('clamps tick boundaries (<1 to 1, >5 to 5)', () => {
    const under = PlayerHurt.getHurtState(0);
    assert.equal(under.tick, 1);
    assert.equal(under.isComplete, false);

    const over = PlayerHurt.getHurtState(10);
    assert.equal(over.tick, 5);
    assert.equal(over.isComplete, true);
});

test('advances hurt timeline with deltaMs and accumulator correctly', () => {
    // 50ms is less than 83.33ms -> tick remains 1, remainingMs = 50
    const step1 = PlayerHurt.advanceHurt(1, 50, 0);
    assert.equal(step1.tick, 1);
    assert.equal(step1.remainingMs, 50);

    // Add another 40ms -> total 90ms -> advances by 1 tick (to tick 2)
    const step2 = PlayerHurt.advanceHurt(step1.tick, 40, step1.remainingMs);
    assert.equal(step2.tick, 2);
    assert.ok(Math.abs(step2.remainingMs - (90 - PlayerHurt.TICK_DURATION_MS)) < 0.01);

    // Large delta -> clamps at tick 5 with isComplete
    const stepMax = PlayerHurt.advanceHurt(1, 1000, 0);
    assert.equal(stepMax.tick, 5);
    assert.equal(stepMax.isComplete, true);
    assert.equal(stepMax.state.isComplete, true);
});

test('computes correct presentation with horizontal facing', () => {
    // Facing right (flipX: false)
    const presRight = PlayerHurt.getHurtPresentation(3, false);
    assert.equal(presRight.flipX, false);
    assert.equal(presRight.offsetX, PlayerHurt.NATIVE_OFFSETS.characterX);
    assert.ok(presRight.drop1.x < 0);

    // Facing left (flipX: true)
    const presLeft = PlayerHurt.getHurtPresentation(3, true);
    assert.equal(presLeft.flipX, true);
    assert.equal(presLeft.offsetX, -PlayerHurt.NATIVE_OFFSETS.characterX);
    assert.ok(presLeft.drop1.x > 0);
    assert.equal(presLeft.drop1.x, -presRight.drop1.x);
});

test('verifies blood drop rotation angles match Flash Sprite 111 (bulb leading, tip trailing)', () => {
    for (let tick = 1; tick <= 5; tick++) {
        const state = PlayerHurt.getHurtState(tick);
        // Drop 1 rotation is +1.571 rad (+90 deg)
        assert.equal(state.drop1.rotation, 1.571);
        // Drop 2 rotation progresses from 1.239 to 1.810 rad
        assert.ok(state.drop2.rotation > 1.0 && state.drop2.rotation < 2.0);
    }
});
