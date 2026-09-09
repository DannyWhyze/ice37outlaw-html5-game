const assert = require('node:assert/strict');
const test = require('node:test');

const CombatCollision = require('../js/logic/combatCollision.js');

test('provides authentic Flash combat and damage constants', () => {
    assert.equal(CombatCollision.MAX_PLAYER_HEALTH, 100);
    assert.equal(CombatCollision.ATTACK_DAMAGE_PLAYER, 20);
    assert.equal(CombatCollision.MAX_COP_HITS, 3);
    assert.ok(CombatCollision.NATIVE_STAGE_SCALE > 3.5);
    assert.equal(CombatCollision.NATIVE_PUNCH_REACH, 330);
    assert.equal(CombatCollision.NATIVE_KICK_REACH, 280);
    assert.equal(CombatCollision.NATIVE_COP_PUNCH_REACH, 460);
    assert.equal(CombatCollision.NATIVE_COP_SENSOR_REACH, 320);
    assert.deepEqual(CombatCollision.PLAYER_BODY, { width: 320, height: 470 });
    assert.deepEqual(CombatCollision.COP_BODY, { width: 230, height: 470 });
});

test('computes facing orientation relative to target', () => {
    // Attacker at 500, Target at 700 (target is to the right)
    assert.equal(CombatCollision.isFacingTarget(500, 700, false), true);  // Facing right -> true
    assert.equal(CombatCollision.isFacingTarget(500, 700, true), false);  // Facing left -> false

    // Attacker at 700, Target at 500 (target is to the left)
    assert.equal(CombatCollision.isFacingTarget(700, 500, true), true);   // Facing left -> true
    assert.equal(CombatCollision.isFacingTarget(700, 500, false), false); // Facing right -> false

    // Same position
    assert.equal(CombatCollision.isFacingTarget(500, 500, false), true);
});

test('computes whether target is within attack reach and facing direction', () => {
    // Target within reach (150px <= 210px) and facing towards target
    assert.equal(CombatCollision.isTargetInReach(500, 650, false, 210), true);

    // Target within reach but attacker facing away
    assert.equal(CombatCollision.isTargetInReach(500, 650, true, 210), false);

    // Target out of reach (300px > 210px) even if facing
    assert.equal(CombatCollision.isTargetInReach(500, 800, false, 210), false);

    // Leftward reach
    assert.equal(CombatCollision.isTargetInReach(650, 500, true, 210), true);
    assert.equal(CombatCollision.isTargetInReach(650, 500, false, 210), false);
});

test('identifies punch and kick impact frame windows', () => {
    // Player punch: frames 3..5
    assert.equal(CombatCollision.isPlayerPunchImpactFrame(1), false);
    assert.equal(CombatCollision.isPlayerPunchImpactFrame(2), false);
    assert.equal(CombatCollision.isPlayerPunchImpactFrame(3), true);
    assert.equal(CombatCollision.isPlayerPunchImpactFrame(4), true);
    assert.equal(CombatCollision.isPlayerPunchImpactFrame(5), true);
    assert.equal(CombatCollision.isPlayerPunchImpactFrame(6), false);

    // Player kick: frames 3..6
    assert.equal(CombatCollision.isPlayerKickImpactFrame(2), false);
    assert.equal(CombatCollision.isPlayerKickImpactFrame(3), true);
    assert.equal(CombatCollision.isPlayerKickImpactFrame(6), true);
    assert.equal(CombatCollision.isPlayerKickImpactFrame(7), false);

    // Cop punch: ticks 9..10
    assert.equal(CombatCollision.isCopPunchImpactTick(8), false);
    assert.equal(CombatCollision.isCopPunchImpactTick(9), true);
    assert.equal(CombatCollision.isCopPunchImpactTick(10), true);
    assert.equal(CombatCollision.isCopPunchImpactTick(11), false);
});

test('resolves player hit progression on cop (3 hits to defeat)', () => {
    // Hit 1
    const hit1 = CombatCollision.resolvePlayerHitOnCop(0);
    assert.equal(hit1.newHitCount, 1);
    assert.equal(hit1.isDeath, false);

    // Hit 2
    const hit2 = CombatCollision.resolvePlayerHitOnCop(1);
    assert.equal(hit2.newHitCount, 2);
    assert.equal(hit2.isDeath, false);

    // Hit 3 (defeat)
    const hit3 = CombatCollision.resolvePlayerHitOnCop(2);
    assert.equal(hit3.newHitCount, 3);
    assert.equal(hit3.isDeath, true);

    // Subsequent hits keep isDeath true
    const hit4 = CombatCollision.resolvePlayerHitOnCop(3);
    assert.equal(hit4.newHitCount, 4);
    assert.equal(hit4.isDeath, true);
});

test('resolves cop hit progression on player (-20 HP per hit, 0 HP to defeat)', () => {
    // Hit 1 from full HP (100 -> 80)
    const hit1 = CombatCollision.resolveCopHitOnPlayer(100);
    assert.equal(hit1.newHealth, 80);
    assert.equal(hit1.damage, 20);
    assert.equal(hit1.isDeath, false);

    // Hit 2 (80 -> 60)
    const hit2 = CombatCollision.resolveCopHitOnPlayer(80);
    assert.equal(hit2.newHealth, 60);
    assert.equal(hit2.isDeath, false);

    // Hit 5 from 20 HP (20 -> 0, defeat)
    const hit5 = CombatCollision.resolveCopHitOnPlayer(20);
    assert.equal(hit5.newHealth, 0);
    assert.equal(hit5.isDeath, true);

    // Floor at 0 HP
    const hitOver = CombatCollision.resolveCopHitOnPlayer(10);
    assert.equal(hitOver.newHealth, 0);
    assert.equal(hitOver.isDeath, true);
});

test('computes AABB bounding boxes and overlaps correctly', () => {
    const box1 = CombatCollision.getHitboxBounds(500, 1000, 320, 470);
    assert.equal(box1.x, 340);
    assert.equal(box1.y, 530);
    assert.equal(box1.width, 320);
    assert.equal(box1.height, 470);

    // Overlapping box
    const box2 = CombatCollision.getHitboxBounds(550, 1000, 320, 470);
    assert.equal(CombatCollision.checkAABBOverlap(box1, box2), true);

    // Distant non-overlapping box
    const box3 = CombatCollision.getHitboxBounds(900, 1000, 320, 470);
    assert.equal(CombatCollision.checkAABBOverlap(box1, box3), false);
});
