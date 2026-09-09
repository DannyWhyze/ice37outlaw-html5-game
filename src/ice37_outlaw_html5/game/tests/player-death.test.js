const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const PlayerDeath = require('../js/logic/playerDeath.js');

test('verifies all 6 native 125% zoom die assets exist on disk', () => {
    const assetsDir = path.resolve(__dirname, '../assets/images/prefabs/player/die_native');
    const requiredFiles = [
        'die_frame_01.png',
        'die_frame_02.png',
        'die_frame_03.png',
        'die_frame_04.png',
        'die_blood_pool.png',
        'die_eyes_white.png',
    ];

    for (const file of requiredFiles) {
        const fullPath = path.join(assetsDir, file);
        assert.ok(fs.existsSync(fullPath), `Asset file must exist: ${file}`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 0, `Asset file must not be empty: ${file}`);
    }
});

test('provides correct timing and slide constants', () => {
    assert.equal(PlayerDeath.TOTAL_TICKS, 116);
    assert.ok(Math.abs(PlayerDeath.TICK_DURATION_MS - (1000 / 12)) < 0.01);
    assert.equal(PlayerDeath.SLIDE_DISTANCE_NATIVE, 128.6);
    assert.equal(typeof PlayerDeath.BLOOD_MAX_SCALE.scaleX, 'number');
    assert.equal(typeof PlayerDeath.BLOOD_MAX_SCALE.scaleY, 'number');
    assert.equal(typeof PlayerDeath.SHADOW_STRETCH_SCALE.scaleX, 'number');
    assert.equal(typeof PlayerDeath.SHADOW_STRETCH_SCALE.scaleY, 'number');
});

test('provides correct phase progression across 116 ticks', () => {
    // Phase 1: fall_recoil (ticks 1..2)
    const t1 = PlayerDeath.getDeathState(1);
    assert.equal(t1.phase, 'fall_recoil');
    assert.equal(t1.frameKey, PlayerDeath.FRAME_KEYS.frame1);
    assert.equal(t1.slideX, 0);
    assert.equal(t1.shadow.visible, false);
    assert.equal(t1.blood.visible, false);
    assert.equal(t1.eyes.visible, false);
    assert.equal(t1.isComplete, false);

    const t2 = PlayerDeath.getDeathState(2);
    assert.equal(t2.phase, 'fall_recoil');
    assert.equal(t2.frameKey, PlayerDeath.FRAME_KEYS.frame1);

    // Phase 2: fall_buckle (ticks 3..4)
    const t3 = PlayerDeath.getDeathState(3);
    assert.equal(t3.phase, 'fall_buckle');
    assert.equal(t3.frameKey, PlayerDeath.FRAME_KEYS.frame2);
    assert.equal(t3.slideX, 0);
    assert.equal(t3.shadow.visible, false);

    const t4 = PlayerDeath.getDeathState(4);
    assert.equal(t4.phase, 'fall_buckle');

    // Phase 3: fall_midair (ticks 5..6)
    const t5 = PlayerDeath.getDeathState(5);
    assert.equal(t5.phase, 'fall_midair');
    assert.equal(t5.frameKey, PlayerDeath.FRAME_KEYS.frame3);
    assert.equal(t5.slideX, 0);

    const t6 = PlayerDeath.getDeathState(6);
    assert.equal(t6.phase, 'fall_midair');

    // Phase 4: ground_slide (ticks 7..24)
    const t7 = PlayerDeath.getDeathState(7);
    assert.equal(t7.phase, 'ground_slide');
    assert.equal(t7.frameKey, PlayerDeath.FRAME_KEYS.frame4);
    assert.equal(t7.slideX, 0); // Slide start
    assert.equal(t7.shadow.visible, true);
    assert.equal(t7.blood.visible, false);

    const t15 = PlayerDeath.getDeathState(15);
    assert.equal(t15.phase, 'ground_slide');
    assert.ok(t15.slideX < 0 && t15.slideX > -PlayerDeath.SLIDE_DISTANCE_NATIVE);

    const t24 = PlayerDeath.getDeathState(24);
    assert.equal(t24.phase, 'ground_slide');
    assert.ok(Math.abs(t24.slideX - (-PlayerDeath.SLIDE_DISTANCE_NATIVE)) < 0.01);

    // Phase 5: ground_still (ticks 25..39)
    const t25 = PlayerDeath.getDeathState(25);
    assert.equal(t25.phase, 'ground_still');
    assert.equal(t25.frameKey, PlayerDeath.FRAME_KEYS.frame4);
    assert.equal(t25.slideX, -PlayerDeath.SLIDE_DISTANCE_NATIVE);
    assert.equal(t25.blood.visible, false);
    assert.equal(t25.eyes.visible, false);

    const t39 = PlayerDeath.getDeathState(39);
    assert.equal(t39.phase, 'ground_still');

    // Phase 6: bleed_and_fade (ticks 40..90)
    const t40 = PlayerDeath.getDeathState(40);
    assert.equal(t40.phase, 'bleed_and_fade');
    assert.equal(t40.blood.visible, true);
    assert.ok(t40.blood.scaleX >= 0);
    assert.equal(t40.eyes.visible, true);
    assert.equal(t40.eyes.alpha, 1.0);
    assert.equal(t40.eyes.greyLevel, 255);
    assert.equal(t40.eyes.tint, 0xffffff);

    // Frame 71: Flash keyframe (AddTerm 100) -> greyLevel 100, tint 0x646464
    const t71 = PlayerDeath.getDeathState(71);
    assert.equal(t71.phase, 'bleed_and_fade');
    assert.equal(t71.eyes.visible, true);
    assert.equal(t71.eyes.alpha, 1.0);
    assert.equal(t71.eyes.greyLevel, 100);
    assert.equal(t71.eyes.tint, 0x646464);

    // Frame 90: Flash keyframe (AddTerm 5) -> greyLevel 5, tint 0x050505
    const t90 = PlayerDeath.getDeathState(90);
    assert.equal(t90.phase, 'bleed_and_fade');
    assert.ok(Math.abs(t90.blood.scaleX - PlayerDeath.BLOOD_MAX_SCALE.scaleX) < 0.01);
    assert.equal(t90.eyes.visible, true);
    assert.equal(t90.eyes.alpha, 1.0);
    assert.equal(t90.eyes.greyLevel, 5);
    assert.equal(t90.eyes.tint, 0x050505);

    // Phase 7: dead_hold (ticks 91..116) -> eyes remain solid black (tint 0x000000)
    const t91 = PlayerDeath.getDeathState(91);
    assert.equal(t91.phase, 'dead_hold');
    assert.equal(t91.blood.visible, true);
    assert.equal(t91.blood.scaleX, PlayerDeath.BLOOD_MAX_SCALE.scaleX);
    assert.equal(t91.blood.scaleY, PlayerDeath.BLOOD_MAX_SCALE.scaleY);
    assert.equal(t91.eyes.visible, true);
    assert.equal(t91.eyes.alpha, 1.0);
    assert.equal(t91.eyes.greyLevel, 0);
    assert.equal(t91.eyes.tint, 0x000000);
    assert.equal(t91.isComplete, false);

    const t115 = PlayerDeath.getDeathState(115);
    assert.equal(t115.phase, 'dead_hold');
    assert.equal(t115.eyes.visible, true);
    assert.equal(t115.eyes.tint, 0x000000);
    assert.equal(t115.isComplete, false);

    const t116 = PlayerDeath.getDeathState(116);
    assert.equal(t116.phase, 'dead_hold');
    assert.equal(t116.eyes.visible, true);
    assert.equal(t116.eyes.tint, 0x000000);
    assert.equal(t116.isComplete, true);
});

test('clamps tick boundaries (<1 to 1, >116 to 116)', () => {
    const under = PlayerDeath.getDeathState(0);
    assert.equal(under.tick, 1);
    assert.equal(under.phase, 'fall_recoil');

    const over = PlayerDeath.getDeathState(200);
    assert.equal(over.tick, 116);
    assert.equal(over.phase, 'dead_hold');
    assert.equal(over.isComplete, true);
});

test('advances death timeline with deltaMs and accumulator correctly', () => {
    // 50ms is less than 83.33ms -> tick remains 1, remainingMs = 50
    const step1 = PlayerDeath.advanceDeath(1, 50, 0);
    assert.equal(step1.tick, 1);
    assert.equal(step1.remainingMs, 50);

    // Add another 40ms -> total 90ms -> advances by 1 tick (to tick 2), remainingMs = 90 - 83.33 ~ 6.67ms
    const step2 = PlayerDeath.advanceDeath(step1.tick, 40, step1.remainingMs);
    assert.equal(step2.tick, 2);
    assert.ok(Math.abs(step2.remainingMs - (90 - PlayerDeath.TICK_DURATION_MS)) < 0.01);

    // Large delta (e.g. 500ms ~ 6 ticks)
    const step3 = PlayerDeath.advanceDeath(2, 500, 0);
    assert.equal(step3.tick, 2 + Math.floor(500 / PlayerDeath.TICK_DURATION_MS));

    // Clamps at TOTAL_TICKS (116)
    const maxStep = PlayerDeath.advanceDeath(110, 10000, 0);
    assert.equal(maxStep.tick, 116);
});

test('computes correct presentation with horizontal facing', () => {
    // Facing right (not left)
    const presRight = PlayerDeath.getDeathPresentation(25, false);
    assert.equal(presRight.flipX, false);
    assert.equal(presRight.slideX, -PlayerDeath.SLIDE_DISTANCE_NATIVE);

    // Facing left
    const presLeft = PlayerDeath.getDeathPresentation(25, true);
    assert.equal(presLeft.flipX, true);
    assert.equal(presLeft.slideX, PlayerDeath.SLIDE_DISTANCE_NATIVE);
});

test('provides valid GROUND_OFFSETS relative to Shape 103', () => {
    const offsets = PlayerDeath.GROUND_OFFSETS;
    assert.ok(offsets);
    assert.ok(offsets.eyes.x > 0);
    assert.ok(offsets.eyes.y > 0);
    assert.ok(offsets.bloodCenter.x > 0);
    assert.ok(offsets.bloodCenter.y > 0);
    assert.ok(offsets.shadowCenter.x > 0);
    assert.ok(offsets.shadowCenter.y > 0);
});
