const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const CopLogic = require('../js/logic/copLogic.js');
const CopCombat = require('../js/logic/copCombat.js');
const CopHurt = require('../js/logic/copHurt.js');
const CopDeath = require('../js/logic/copDeath.js');
const { Cop } = require('../js/prefabs/Cop.js');

function createMockScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        alpha: 1,
        children: [],
        anims: {
            isPlaying: false,
            currentAnim: null,
            play(key) {
                this.isPlaying = true;
                this.currentAnim = { key };
                return this;
            },
            stop() {
                this.isPlaying = false;
                this.currentAnim = null;
                return this;
            },
        },
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setTexture(k) { this.texture = k; return this; },
        setVisible(v) { this.visible = v; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        destroy() { this.destroyed = true; },
    });

    const registeredAnims = new Map();

    return {
        add: {
            container: (x, y) => {
                const c = makeDisplayObject();
                c.x = x;
                c.y = y;
                return c;
            },
            image: () => makeDisplayObject(),
            sprite: () => makeDisplayObject(),
        },
        anims: {
            exists: (key) => registeredAnims.has(key),
            create: (config) => { registeredAnims.set(config.key, config); },
            get: (key) => registeredAnims.get(key),
        },
        textures: {
            exists: () => true,
        },
    };
}

test('verifies native 130% zoom cop walk assets exist on disk with valid 295x518 dimensions', () => {
    const assetsDir = path.resolve(__dirname, '../assets/images/prefabs/cop/walk_native');
    const requiredFiles = [
        'cop_walk_01.png',
        'cop_walk_02.png',
        'cop_walk_03.png',
        'cop_walk_04.png',
        'cop_walk_05.png',
    ];

    for (const fileName of requiredFiles) {
        const fullPath = path.join(assetsDir, fileName);
        assert.ok(fs.existsSync(fullPath), `Asset file must exist: ${fileName}`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 0, `Asset file must not be empty: ${fileName}`);

        const buf = fs.readFileSync(fullPath);
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        assert.equal(w, 295, `${fileName} width mismatch (expected 295)`);
        assert.equal(h, 518, `${fileName} height mismatch (expected 518)`);
    }
});

test('provides correct timing and 12-tick timeline constants for Cop walk', () => {
    assert.equal(CopLogic.TOTAL_WALK_TICKS, 12);
    assert.ok(Math.abs(CopLogic.TICK_DURATION_MS - (1000 / 12)) < 0.01);
    assert.equal(CopLogic.FRAME_KEYS.length, 5);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX.length, 12);

    // Flash timeline distribution:
    // Frame 1..2 -> cop_walk_01 (Shape 12)
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[0], 0);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[1], 0);
    // Frame 3..5 -> cop_walk_02 (Shape 13)
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[2], 1);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[3], 1);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[4], 1);
    // Frame 6..7 -> cop_walk_03 (Shape 14)
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[5], 2);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[6], 2);
    // Frame 8..9 -> cop_walk_04 (Shape 15)
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[7], 3);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[8], 3);
    // Frame 10..12 -> cop_walk_05 (Shape 16)
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[9], 4);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[10], 4);
    assert.equal(CopLogic.TICK_TO_FRAME_INDEX[11], 4);

    assert.equal(CopLogic.FRAME_DIMENSIONS.width, 295);
    assert.equal(CopLogic.FRAME_DIMENSIONS.height, 518);
    assert.equal(CopLogic.SHAPE_ORIGIN.x, 0.5);
    assert.equal(CopLogic.SHAPE_ORIGIN.y, 1.0);
    assert.ok(Math.abs(CopLogic.NATIVE_COPSPEED_PER_SEC - 168.79) < 0.1);
});

test('computes correct walk state and advances walk ticks accurately', () => {
    const expectedKeys = [
        'cop_walk_01', 'cop_walk_01',
        'cop_walk_02', 'cop_walk_02', 'cop_walk_02',
        'cop_walk_03', 'cop_walk_03',
        'cop_walk_04', 'cop_walk_04',
        'cop_walk_05', 'cop_walk_05', 'cop_walk_05',
    ];

    for (let tick = 1; tick <= 12; tick++) {
        const state = CopLogic.getWalkState(tick);
        assert.equal(state.tick, tick);
        assert.equal(state.frameKey, expectedKeys[tick - 1]);
        assert.equal(state.origin.x, 0.5);
        assert.equal(state.origin.y, 1.0);
    }

    // Wrapping
    const stateWrap = CopLogic.getWalkState(13);
    assert.equal(stateWrap.tick, 1);
    assert.equal(stateWrap.frameKey, 'cop_walk_01');

    // advanceWalk
    const adv1 = CopLogic.advanceWalk(1, 84, 0);
    assert.equal(adv1.tick, 2);
    assert.equal(adv1.state.frameKey, 'cop_walk_01');

    const adv2 = CopLogic.advanceWalk(2, 84, 0);
    assert.equal(adv2.tick, 3);
    assert.equal(adv2.state.frameKey, 'cop_walk_02');

    // Multi-tick advancement
    const advMulti = CopLogic.advanceWalk(1, 84 * 5, 0);
    assert.equal(advMulti.tick, 6);
    assert.equal(advMulti.state.frameKey, 'cop_walk_03');
});

test('computes cop movement and facing toward target coordinates', () => {
    // Facing
    assert.equal(CopLogic.computeFacing(100, 200), false);
    assert.equal(CopLogic.computeFacing(200, 100), true);
    assert.equal(CopLogic.computeFacing(100, 100, true), true);

    // Move right toward target
    const moveRight = CopLogic.computeMove(100, 500, 1000, 100, 40);
    assert.equal(moveRight.isMoving, true);
    assert.equal(moveRight.isFacingLeft, false);
    assert.equal(moveRight.nextX, 200);

    // Move left toward target
    const moveLeft = CopLogic.computeMove(500, 100, 1000, 100, 40);
    assert.equal(moveLeft.isMoving, true);
    assert.equal(moveLeft.isFacingLeft, true);
    assert.equal(moveLeft.nextX, 400);

    // Stop within stopDistance
    const stopped = CopLogic.computeMove(100, 130, 1000, 100, 40);
    assert.equal(stopped.isMoving, false);
    assert.equal(stopped.nextX, 100);
});

test('verifies native 352% zoom cop boxing assets exist on disk with valid 592x519 dimensions', () => {
    const assetsDir = path.resolve(__dirname, '../assets/images/prefabs/cop/boxing_native');
    const requiredFiles = [
        'cop_boxing_01.png',
        'cop_boxing_03.png',
        'cop_boxing_05.png',
        'cop_boxing_07.png',
        'cop_boxing_09.png',
        'cop_boxing_13.png',
    ];

    for (const fileName of requiredFiles) {
        const fullPath = path.join(assetsDir, fileName);
        assert.ok(fs.existsSync(fullPath), `Asset file must exist: ${fileName}`);
        const stat = fs.statSync(fullPath);
        assert.ok(stat.size > 0, `Asset file must not be empty: ${fileName}`);

        const buf = fs.readFileSync(fullPath);
        const w = buf.readUInt32BE(16);
        const h = buf.readUInt32BE(20);
        assert.equal(w, 592, `${fileName} width mismatch (expected 592)`);
        assert.equal(h, 519, `${fileName} height mismatch (expected 519)`);
    }
});

test('provides correct timing, 20-tick timeline, hit-window, and dimensions for Cop boxing in CopCombat', () => {
    assert.equal(CopCombat.TOTAL_TICKS, 20);
    assert.equal(CopCombat.FRAME_KEYS.length, 6);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX.length, 20);

    // Frame keys mapping:
    // Ticks 1..2 -> cop_boxing_01
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[0], 0);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[1], 0);
    // Ticks 3..4 -> cop_boxing_03
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[2], 1);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[3], 1);
    // Ticks 5..6 -> cop_boxing_05
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[4], 2);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[5], 2);
    // Ticks 7..8 -> cop_boxing_07
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[6], 3);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[7], 3);
    // Ticks 9..12 -> cop_boxing_09
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[8], 4);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[9], 4);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[10], 4);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[11], 4);
    // Ticks 13..20 -> cop_boxing_13
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[12], 5);
    assert.equal(CopCombat.TICK_TO_FRAME_INDEX[19], 5);

    assert.equal(CopCombat.FRAME_DIMENSIONS.width, 592);
    assert.equal(CopCombat.FRAME_DIMENSIONS.height, 519);
    assert.equal(CopCombat.SHAPE_ORIGIN.x, 0.37025);
    assert.equal(CopCombat.SHAPE_ORIGIN.y, 1.0);

    // Hit test window: Frame 9..10
    assert.equal(CopCombat.isHitTick(8), false);
    assert.equal(CopCombat.isHitTick(9), true);
    assert.equal(CopCombat.isHitTick(10), true);
    assert.equal(CopCombat.isHitTick(11), false);
});

test('computes boxing states and advances boxing ticks accurately in CopCombat', () => {
    // Tick 1
    const s1 = CopCombat.getBoxingState(1);
    assert.equal(s1.tick, 1);
    assert.equal(s1.frameKey, 'cop_boxing_01');
    assert.equal(s1.isHit, false);
    assert.equal(s1.isComplete, false);

    // Tick 9 (impact with hit star)
    const s9 = CopCombat.getBoxingState(9);
    assert.equal(s9.tick, 9);
    assert.equal(s9.frameKey, 'cop_boxing_09');
    assert.equal(s9.isHit, true);
    assert.equal(s9.isComplete, false);

    // Tick 20 (complete)
    const s20 = CopCombat.getBoxingState(20);
    assert.equal(s20.tick, 20);
    assert.equal(s20.frameKey, 'cop_boxing_13');
    assert.equal(s20.isHit, false);
    assert.equal(s20.isComplete, true);

    // advanceBoxing
    const adv = CopCombat.advanceBoxing(1, 84 * 8, 0); // advance to tick 9
    assert.equal(adv.tick, 9);
    assert.equal(adv.state.isHit, true);
    assert.equal(adv.isComplete, false);

    const advEnd = CopCombat.advanceBoxing(1, 84 * 25, 0); // past tick 20
    assert.equal(advEnd.tick, 20);
    assert.equal(advEnd.isComplete, true);
});

test('instantiates Cop prefab with container, shadow, walkSprite, boxingSprite, and anim registration', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600, 0, 1920 / 546);

    assert.equal(cop.x, 500);
    assert.equal(cop.y, 600);
    assert.equal(cop.depth, 37);
    assert.equal(cop.children.length, 10);
    assert.equal(cop.isFacingLeft, false);
    assert.equal(cop.isWalking, false);
    assert.equal(cop.isBoxing, false);
    assert.equal(cop.isHurt, false);
    assert.equal(cop.isDead, false);
    assert.ok(cop.shadow.visible);
    assert.ok(cop.walkSprite.visible);
    assert.equal(cop.boxingSprite.visible, false);
    assert.equal(cop.hurtSprite.visible, false);
    assert.equal(cop.hurtBloodDrop1.visible, false);
    assert.equal(cop.hurtBloodDrop2.visible, false);
    assert.equal(cop.deathSprite.visible, false);
    assert.equal(cop.deathCap.visible, false);
    assert.equal(cop.deathStar.visible, false);
    assert.equal(cop.punchHitStar.visible, false);

    // Verify Phaser animation was auto-registered
    assert.ok(scene.anims.exists('cop_walk'));
    const anim = scene.anims.get('cop_walk');
    assert.equal(anim.frames.length, 12);
    assert.equal(anim.frameRate, 12);
    assert.equal(anim.repeat, -1);
});

test('handles Cop walk animation play/stop and orientation flip', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600);

    cop.setFacingLeft(true);
    assert.equal(cop.isFacingLeft, true);
    assert.equal(cop.container.scaleX, -1);

    cop.setFacingLeft(false);
    assert.equal(cop.isFacingLeft, false);
    assert.equal(cop.container.scaleX, 1);

    // Play walk
    cop.playWalkAnimation();
    assert.equal(cop.isWalking, true);
    assert.equal(cop.walkSprite.anims.isPlaying, true);
    assert.equal(cop.walkSprite.anims.currentAnim.key, 'cop_walk');

    // Stop walk
    cop.stopWalkAnimation();
    assert.equal(cop.isWalking, false);
    assert.equal(cop.walkSprite.anims.isPlaying, false);
    assert.equal(cop.walkSprite.texture, 'cop_walk_01');

    // triggerWalk activates walk and hides other sprites
    cop.triggerBoxing();
    assert.equal(cop.isBoxing, true);
    assert.equal(cop.walkSprite.visible, false);
    cop.triggerWalk();
    assert.equal(cop.isWalking, true);
    assert.equal(cop.isBoxing, false);
    assert.equal(cop.boxingSprite.visible, false);
    assert.equal(cop.walkSprite.visible, true);

    // toggleWalk toggles off and on
    cop.toggleWalk();
    assert.equal(cop.isWalking, false);
    assert.equal(cop.walkSprite.texture, 'cop_walk_01');

    cop.toggleWalk();
    assert.equal(cop.isWalking, true);

    // Blocked if dead
    cop.triggerDeath();
    assert.equal(cop.isDead, true);
    cop.toggleWalk();
    assert.equal(cop.isWalking, false);
});

test('pursues target in update loop and halts within stop distance', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 200, 600);

    const state1 = cop.update(100, 1000, 40);
    assert.equal(state1, 'walking');
    assert.ok(cop.x > 200);
    assert.equal(cop.isFacingLeft, false);
    assert.equal(cop.isWalking, true);

    cop.setPosition(980, 600);
    const state2 = cop.update(100, 1000, 40);
    assert.equal(state2, 'idle');
    assert.equal(cop.isWalking, false);

    const state3 = cop.update(100, 100, 40);
    assert.equal(state3, 'walking');
    assert.ok(cop.x < 980);
    assert.equal(cop.isFacingLeft, true);
    assert.equal(cop.container.scaleX, -1);

    cop.destroy();
    assert.ok(cop.container.destroyed);
});

test('handles Cop boxing animation lifecycle, hit callback at tick 9, and completion', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600);
    let boxingCompleted = false;
    let hitFiredCount = 0;

    // Trigger boxing
    cop.triggerBoxing(() => {
        boxingCompleted = true;
    });

    assert.equal(cop.isBoxing, true);
    assert.equal(cop.isWalking, false);
    assert.equal(cop.walkSprite.visible, false);
    assert.equal(cop.boxingSprite.visible, true);
    assert.equal(cop.boxingSprite.texture, 'cop_boxing_01');

    // Advance 4 ticks (~336ms) -> tick 5 (cop_boxing_05)
    const s1 = cop.update(84 * 4, 1000, 40, () => { hitFiredCount++; });
    assert.equal(s1, 'boxing');
    assert.equal(cop.boxingTick, 5);
    assert.equal(cop.boxingSprite.texture, 'cop_boxing_05');
    assert.equal(hitFiredCount, 0);

    // Advance 4 more ticks (~336ms) -> tick 9 (cop_boxing_09, hit window!)
    const s2 = cop.update(84 * 4, 1000, 40, () => { hitFiredCount++; });
    assert.equal(s2, 'boxing');
    assert.equal(cop.boxingTick, 9);
    assert.equal(cop.boxingSprite.texture, 'cop_boxing_09');
    assert.equal(hitFiredCount, 1); // Hit fired!

    // Advance 1 tick -> tick 10 (still in hit window, but hit callback fires only once per punch!)
    cop.update(84, 1000, 40, () => { hitFiredCount++; });
    assert.equal(cop.boxingTick, 10);
    assert.equal(hitFiredCount, 1); // Not duplicate!

    // Advance to end of boxing (tick 20, ~900ms more)
    cop.update(84 * 12, 1000, 40, () => { hitFiredCount++; });
    assert.equal(cop.isBoxing, false);
    assert.equal(cop.boxingSprite.visible, false);
    assert.equal(cop.walkSprite.visible, true);
    assert.equal(boxingCompleted, true);
});

test('verifies native 130% zoom cop hurt assets exist on disk with valid dimensions', () => {
    const assetsDir = path.resolve(__dirname, '../assets/images/prefabs/cop/hurt_native');
    const characterPath = path.join(assetsDir, 'cop_hurt_character.png');
    const bloodPath = path.join(assetsDir, 'cop_hurt_blood_drop.png');

    assert.ok(fs.existsSync(characterPath), 'cop_hurt_character.png must exist');
    assert.ok(fs.existsSync(bloodPath), 'cop_hurt_blood_drop.png must exist');

    const charBuf = fs.readFileSync(characterPath);
    assert.equal(charBuf.readUInt32BE(16), 250, 'Character width must be 250');
    assert.equal(charBuf.readUInt32BE(20), 516, 'Character height must be 516');

    const bloodBuf = fs.readFileSync(bloodPath);
    assert.equal(bloodBuf.readUInt32BE(16), 30, 'Blood drop width must be 30');
    assert.equal(bloodBuf.readUInt32BE(20), 37, 'Blood drop height must be 37');
});

test('provides correct timing, 5-tick timeline, origins, offsets, and blood drop trajectories for Cop hurt in CopHurt', () => {
    assert.equal(CopHurt.TOTAL_TICKS, 5);
    assert.ok(Math.abs(CopHurt.TICK_DURATION_MS - (1000 / 12)) < 0.01);
    assert.equal(CopHurt.FRAME_KEYS.character, 'cop_hurt_character');
    assert.equal(CopHurt.FRAME_KEYS.bloodDrop, 'cop_hurt_blood_drop');

    assert.equal(CopHurt.FRAME_DIMENSIONS.cop_hurt_character.width, 250);
    assert.equal(CopHurt.FRAME_DIMENSIONS.cop_hurt_character.height, 516);
    assert.equal(CopHurt.FRAME_DIMENSIONS.cop_hurt_blood_drop.width, 30);
    assert.equal(CopHurt.FRAME_DIMENSIONS.cop_hurt_blood_drop.height, 37);

    assert.ok(Math.abs(CopHurt.SHAPE_ORIGINS.character.x - (1401 / 3838)) < 0.001);
    assert.equal(CopHurt.SHAPE_ORIGINS.character.y, 1.0);
    assert.equal(CopHurt.SHAPE_ORIGINS.bloodDrop.x, 0.5);
    assert.equal(CopHurt.SHAPE_ORIGINS.bloodDrop.y, 0.5);

    assert.equal(CopHurt.BLOOD_DROPS.length, 5);

    // Frame 1: uniform scale on drop 1, distorted on drop 2
    const f1 = CopHurt.BLOOD_DROPS[0];
    assert.equal(f1.drop1.scaleX, 0.1);
    assert.equal(f1.drop1.scaleY, 0.1);
    assert.equal(f1.drop2.scaleX, 0.1);
    assert.equal(f1.drop2.scaleY, 0.1);

    // Frame 5: uniform scale 0.94 on drop 1, vertical stretch (0.515 x 1.173) on drop 2
    const f5 = CopHurt.BLOOD_DROPS[4];
    assert.equal(f5.drop1.scaleX, 0.94);
    assert.equal(f5.drop1.scaleY, 0.94);
    assert.equal(f5.drop2.scaleX, 0.515);
    assert.equal(f5.drop2.scaleY, 1.173);
});

test('computes hurt states and advances hurt ticks accurately in CopHurt', () => {
    // Tick 1
    const s1 = CopHurt.getHurtState(1);
    assert.equal(s1.tick, 1);
    assert.equal(s1.frameKey, 'cop_hurt_character');
    assert.equal(s1.isComplete, false);
    assert.equal(s1.drop1.scaleX, 0.1);

    // Tick 5
    const s5 = CopHurt.getHurtState(5);
    assert.equal(s5.tick, 5);
    assert.equal(s5.isComplete, true);
    assert.equal(s5.drop1.scaleX, 0.94);

    // advanceHurt
    const adv1 = CopHurt.advanceHurt(1, 84 * 2, 0); // advance 2 ticks -> tick 3
    assert.equal(adv1.tick, 3);
    assert.equal(adv1.isComplete, false);

    const advPastEnd = CopHurt.advanceHurt(1, 84 * 10, 0); // past tick 5
    assert.equal(advPastEnd.tick, 5);
    assert.equal(advPastEnd.isComplete, true);
});

test('handles Cop hurt animation lifecycle, blood drop positioning, and completion in Cop prefab', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600);
    let hurtCompleted = false;

    // Trigger hurt
    cop.triggerHurt(() => {
        hurtCompleted = true;
    });

    assert.equal(cop.isHurt, true);
    assert.equal(cop.isWalking, false);
    assert.equal(cop.walkSprite.visible, false);
    assert.equal(cop.boxingSprite.visible, false);
    assert.equal(cop.hurtSprite.visible, true);
    assert.equal(cop.hurtBloodDrop1.visible, true);
    assert.equal(cop.hurtBloodDrop2.visible, true);
    assert.equal(cop.hurtSprite.texture, 'cop_hurt_character');

    // Update 2 ticks (~168ms) -> tick 3
    const stateMid = cop.update(84 * 2);
    assert.equal(stateMid, 'hurt');
    assert.equal(cop.hurtTick, 3);
    assert.equal(cop.hurtBloodDrop1.scaleX, 0.542);
    assert.equal(cop.hurtBloodDrop2.scaleX, 0.33);
    assert.equal(cop.hurtBloodDrop2.scaleY, 0.691);
    assert.equal(hurtCompleted, false);

    // Update 3 more ticks (~252ms) -> completion
    const stateEnd = cop.update(84 * 4);
    assert.equal(cop.isHurt, false);
    assert.equal(cop.hurtSprite.visible, false);
    assert.equal(cop.hurtBloodDrop1.visible, false);
    assert.equal(cop.hurtBloodDrop2.visible, false);
    assert.equal(cop.walkSprite.visible, true);
    assert.equal(hurtCompleted, true);
});

test('verifies native 130% zoom cop death assets exist on disk with valid dimensions', () => {
    const assetsDir = path.resolve(__dirname, '../assets/images/prefabs/cop/death_native');
    const characterPath = path.join(assetsDir, 'cop_death_character.png');
    const capPath = path.join(assetsDir, 'cop_death_cap.png');
    const starPath = path.join(assetsDir, 'cop_death_star.png');

    assert.ok(fs.existsSync(characterPath), 'cop_death_character.png must exist');
    assert.ok(fs.existsSync(capPath), 'cop_death_cap.png must exist');
    assert.ok(fs.existsSync(starPath), 'cop_death_star.png must exist');

    const charBuf = fs.readFileSync(characterPath);
    assert.equal(charBuf.readUInt32BE(16), 247, 'Character width must be 247');
    assert.equal(charBuf.readUInt32BE(20), 518, 'Character height must be 518');

    const capBuf = fs.readFileSync(capPath);
    assert.equal(capBuf.readUInt32BE(16), 187, 'Cap width must be 187');
    assert.equal(capBuf.readUInt32BE(20), 121, 'Cap height must be 121');

    const starBuf = fs.readFileSync(starPath);
    assert.equal(starBuf.readUInt32BE(16), 36, 'Star width must be 36');
    assert.equal(starBuf.readUInt32BE(20), 37, 'Star height must be 37');
});

test('provides correct timing, 30-tick timeline, origins, offsets, and trajectories for Cop death in CopDeath', () => {
    assert.equal(CopDeath.TOTAL_TICKS, 30);
    assert.ok(Math.abs(CopDeath.TICK_DURATION_MS - (1000 / 12)) < 0.01);
    assert.equal(CopDeath.FRAME_KEYS.character, 'cop_death_character');
    assert.equal(CopDeath.FRAME_KEYS.cap, 'cop_death_cap');
    assert.equal(CopDeath.FRAME_KEYS.star, 'cop_death_star');

    assert.equal(CopDeath.FRAME_DIMENSIONS.cop_death_character.width, 247);
    assert.equal(CopDeath.FRAME_DIMENSIONS.cop_death_character.height, 518);
    assert.equal(CopDeath.FRAME_DIMENSIONS.cop_death_cap.width, 187);
    assert.equal(CopDeath.FRAME_DIMENSIONS.cop_death_cap.height, 121);
    assert.equal(CopDeath.FRAME_DIMENSIONS.cop_death_star.width, 36);
    assert.equal(CopDeath.FRAME_DIMENSIONS.cop_death_star.height, 37);

    assert.equal(CopDeath.SHAPE_ORIGINS.character.x, 0.5);
    assert.equal(CopDeath.SHAPE_ORIGINS.character.y, 1.0);
    assert.equal(CopDeath.SHAPE_ORIGINS.cap.x, 0.0);
    assert.equal(CopDeath.SHAPE_ORIGINS.cap.y, 0.0);
    assert.equal(CopDeath.SHAPE_ORIGINS.star.x, 0.5);
    assert.equal(CopDeath.SHAPE_ORIGINS.star.y, 0.5);

    assert.equal(CopDeath.STAR_SCALES.length, 7);
    assert.equal(CopDeath.CAP_FRAMES.length, 30);
    assert.equal(CopDeath.CAP_ALPHAS.length, 30);

    // Frame 1: star scale 1.0, cap starts on head at x = -60.11, y = -258.85, character visible, alpha 1.0
    const s1 = CopDeath.getDeathState(1);
    assert.equal(s1.characterVisible, true);
    assert.equal(s1.star.visible, true);
    assert.equal(s1.star.scale, 1.0);
    assert.equal(s1.cap.x, -60.11);
    assert.equal(s1.cap.y, -258.85);
    assert.equal(s1.cap.alpha, 1.0);

    // Frame 2: character disappears (Flash: Remove depth 24)! Only cap & star continue
    const s2 = CopDeath.getDeathState(2);
    assert.equal(s2.characterVisible, false);

    // Frame 7: star scale 7.0 (maximum expansion), character hidden
    const s7 = CopDeath.getDeathState(7);
    assert.equal(s7.characterVisible, false);
    assert.equal(s7.star.visible, true);
    assert.equal(s7.star.scale, 7.0);

    // Frame 8: star pops/hidden
    const s8 = CopDeath.getDeathState(8);
    assert.equal(s8.star.visible, false);

    // Frames 22..30: Flash CXFORMWITHALPHA alpha fade-out on cap
    const s22 = CopDeath.getDeathState(22);
    assert.equal(s22.cap.alpha, 1.0);

    const s23 = CopDeath.getDeathState(23);
    assert.ok(Math.abs(s23.cap.alpha - (194 / 256)) < 0.001);

    const s26 = CopDeath.getDeathState(26);
    assert.ok(Math.abs(s26.cap.alpha - (66 / 256)) < 0.001);

    // Frame 30: cap landed at x = 66.88, y = -9.69, alpha 3/256
    const s30 = CopDeath.getDeathState(30);
    assert.equal(s30.characterVisible, false);
    assert.equal(s30.cap.x, 66.88);
    assert.equal(s30.cap.y, -9.69);
    assert.ok(Math.abs(s30.cap.alpha - (3 / 256)) < 0.001);
    assert.equal(s30.isComplete, true);
});

test('computes death states and advances death ticks accurately in CopDeath', () => {
    // advanceDeath
    const adv1 = CopDeath.advanceDeath(1, 84 * 6, 0); // advance to tick 7
    assert.equal(adv1.tick, 7);
    assert.equal(adv1.state.star.scale, 7.0);
    assert.equal(adv1.state.characterVisible, false);
    assert.equal(adv1.isComplete, false);

    const adv2 = CopDeath.advanceDeath(7, 84, 0); // advance to tick 8
    assert.equal(adv2.tick, 8);
    assert.equal(adv2.state.star.visible, false);

    const advEnd = CopDeath.advanceDeath(1, 84 * 35, 0); // past tick 30
    assert.equal(advEnd.tick, 30);
    assert.equal(advEnd.isComplete, true);
});

test('handles Cop death animation lifecycle, cap trajectory, star scaling, and completion in Cop prefab', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600);
    let deathCallbackFired = false;

    // Trigger death
    cop.triggerDeath(() => {
        deathCallbackFired = true;
    });

    assert.equal(cop.isDead, true);
    assert.equal(cop.isWalking, false);
    assert.equal(cop.isBoxing, false);
    assert.equal(cop.isHurt, false);
    assert.equal(cop.walkSprite.visible, false);
    assert.equal(cop.boxingSprite.visible, false);
    assert.equal(cop.hurtSprite.visible, false);
    // At tick 1, character body is visible
    assert.equal(cop.deathSprite.visible, true);
    assert.equal(cop.deathCap.visible, true);
    assert.equal(cop.deathStar.visible, true);

    // Update 6 ticks (~500ms) -> tick 7 (star maximum expansion 7.0, body disappeared!)
    const stateMid = cop.update(84 * 6);
    assert.equal(stateMid, 'death');
    assert.equal(cop.deathTick, 7);
    assert.equal(cop.deathSprite.visible, false); // Body has disappeared!
    assert.equal(cop.shadow.visible, false); // Shadow is gone!
    assert.equal(cop.deathStar.scaleX, 7.0);
    assert.equal(deathCallbackFired, false);

    // Trying to trigger boxing or hurt while dead is blocked
    cop.triggerBoxing();
    assert.equal(cop.isBoxing, false);
    assert.equal(cop.boxingSprite.visible, false);
    cop.triggerHurt();
    assert.equal(cop.isHurt, false);
    assert.equal(cop.hurtSprite.visible, false);

    // Update 1 more tick -> tick 8 (star hidden, cap glides alone!)
    cop.update(84);
    assert.equal(cop.deathTick, 8);
    assert.equal(cop.deathStar.visible, false);
    assert.equal(cop.deathCap.visible, true);
    assert.equal(cop.deathCap.alpha, 1.0);

    // Advance 15 ticks -> tick 23 (cap begins fading out)
    cop.update(84 * 15);
    assert.equal(cop.deathTick, 23);
    assert.ok(Math.abs(cop.deathCap.alpha - (194 / 256)) < 0.001);
    assert.equal(cop.deathCap.visible, true);

    // Advance 7 ticks -> tick 30 (cap landed at final position with alpha 3/256)
    cop.update(84 * 7);
    assert.equal(cop.deathTick, 30);
    assert.ok(Math.abs(cop.deathCap.alpha - (3 / 256)) < 0.001);
    assert.equal(cop.deathCap.visible, true);
    assert.equal(deathCallbackFired, false);

    // Advance 1 more tick -> past tick 30 (death completes, cap removed from stage)
    cop.update(84);
    assert.equal(deathCallbackFired, true);
    assert.equal(cop.deathComplete, true);
    assert.equal(cop.deathCap.visible, false);

    // Respawn restores alive state cleanly with cap alpha restored
    cop.respawn();
    assert.equal(cop.isDead, false);
    assert.equal(cop.walkSprite.visible, true);
    assert.equal(cop.shadow.visible, true);
    assert.equal(cop.deathSprite.visible, false);
    assert.equal(cop.deathCap.visible, false);
    assert.equal(cop.deathCap.alpha, 1.0);
    assert.equal(cop.deathStar.visible, false);
});

test('handles Cop applyHit progression (hits 1-2 hurt, hit 3 triggers death) and respawn reset', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 1000, 548.57, 518);

    assert.equal(cop.hitCount, 0);
    assert.equal(cop.maxHits, 3);
    assert.equal(cop.isDead, false);

    // Hit 1 from player at X=800 (player is to the left -> cop must face left)
    cop.applyHit(800);
    assert.equal(cop.hitCount, 1);
    assert.equal(cop.isHurt, true);
    assert.equal(cop.isDead, false);
    assert.equal(cop.isFacingLeft, true);

    // Finish hurt animation
    for (let i = 0; i < 6; i++) {
        cop.update(84);
    }
    assert.equal(cop.isHurt, false);

    // Hit 2 from player at X=1200 (player is to the right -> cop must face right)
    cop.applyHit(1200);
    assert.equal(cop.hitCount, 2);
    assert.equal(cop.isHurt, true);
    assert.equal(cop.isDead, false);
    assert.equal(cop.isFacingLeft, false);

    // Finish hurt animation
    for (let i = 0; i < 6; i++) {
        cop.update(84);
    }
    assert.equal(cop.isHurt, false);

    // Hit 3 (defeat)
    cop.applyHit(800);
    assert.equal(cop.hitCount, 3);
    assert.equal(cop.isDead, true);
    assert.equal(cop.isHurt, false);

    // Further hits while dead are ignored
    cop.applyHit(800);
    assert.equal(cop.hitCount, 3);

    // Respawn resets hitCount
    cop.respawn();
    assert.equal(cop.hitCount, 0);
    assert.equal(cop.isDead, false);
});

test('Cop calculates screenX correctly and dynamically faces towards attacker on applyHit', () => {
    const scene = createMockScene();
    scene.worldLayer = { x: -500 };
    const cop = new Cop(scene, 1400, 548.57, 518);

    // cop.x is 1400 (worldLayer), worldLayer.x is -500 -> cop.screenX should be 900
    assert.equal(cop.x, 1400);
    assert.equal(cop.screenX, 900);

    // Hit 1: Attacker at world X=1200 (attacker is left of cop at 1400) -> cop must face left
    cop.applyHit(1200, false);
    assert.equal(cop.isFacingLeft, true);

    // Finish hurt
    cop.endHurt();

    // Hit 2: Attacker at world X=1600 (attacker is right of cop at 1400) -> cop must face right
    cop.applyHit(1600, false);
    assert.equal(cop.isFacingLeft, false);

    // Finish hurt
    cop.endHurt();

    // Hit 3 via screen coordinate:
    // Cop screenX is 900. Attacker at screenX = 960 (attacker is right of cop) -> cop must face right
    cop.applyHit(960, true);
    assert.equal(cop.isFacingLeft, false);
});

test('handles Cop lifecycle: isSpawned initialization, spawn, despawn and death auto-despawn', () => {
    const scene = createMockScene();

    // 1. Initialized unspawned via options: container hidden, isSpawned = false
    const unspawnedCop = new Cop(scene, 0, 0, 0, 1, { isSpawned: false });
    assert.equal(unspawnedCop.isSpawned, false);
    assert.equal(unspawnedCop.container.visible, false);

    // Update on unspawned returns 'unspawned'
    const updateResult = unspawnedCop.update(16);
    assert.equal(updateResult, 'unspawned');

    // 2. Spawn at specific world position (e.g. 2200, facing left)
    unspawnedCop.spawn(2200, true);
    assert.equal(unspawnedCop.isSpawned, true);
    assert.equal(unspawnedCop.container.visible, true);
    assert.equal(unspawnedCop.x, 2200);
    assert.equal(unspawnedCop.isFacingLeft, true);
    assert.equal(unspawnedCop.isWalking, true);
    assert.equal(unspawnedCop.walkSprite.visible, true);

    // 3. Despawn hides container and sets isSpawned = false
    unspawnedCop.despawn();
    assert.equal(unspawnedCop.isSpawned, false);
    assert.equal(unspawnedCop.container.visible, false);
    assert.equal(unspawnedCop.update(16), 'unspawned');

    // 4. Auto-despawn on death completion
    const cop = new Cop(scene, 1000, 500);
    let deathNotified = false;
    cop.triggerDeath(() => {
        deathNotified = true;
    });
    assert.equal(cop.isSpawned, true);

    // Advance past tick 30 to complete death
    cop.update(84 * 35);
    assert.equal(deathNotified, true);
    assert.equal(cop.deathComplete, true);
    assert.equal(cop.isSpawned, false);
    assert.equal(cop.container.visible, false);
});
