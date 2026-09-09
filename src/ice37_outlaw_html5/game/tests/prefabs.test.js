const assert = require('node:assert/strict');
const test = require('node:test');

const { Player } = require('../js/prefabs/Player.js');
const { Backpack } = require('../js/prefabs/Backpack.js');
const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');

function createMockScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        visible: true,
        children: [],
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        listeners: {},
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setInteractive() { return this; },
        disableInteractive() { return this; },
        setActive(a) { this.active = a; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setOrigin() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setSize() { return this; },
        setTexture(k) { this.texture = k; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setTint(t) { this.tint = t; return this; },
        setTintFill(t) { this.tintFill = t; return this; },
        clearTint() { delete this.tint; delete this.tintFill; return this; },
        setVisible(v) { this.visible = v; return this; },
        play() { return this; },
        stop() { return this; },
        on(evt, cb) { this.listeners[evt] = cb; return this; },
        emit(evt, ...args) {
            if (this.listeners && this.listeners[evt]) return this.listeners[evt](...args);
        },
    });

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
            zone: (x, y) => {
                const z = makeDisplayObject();
                z.x = x;
                z.y = y;
                return z;
            },
        },
        anims: {
            exists: () => true,
            create: () => {},
        },
    };
}

test('instantiates Player prefab with unified container, shadow, and sprites', () => {
    const scene = createMockScene();
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    assert.equal(player.x, 960);
    assert.equal(player.y, 548.57);
    assert.equal(player.depth, 37);
    assert.equal(player.children.length, 12);
    assert.equal(player.isFacingLeft, false);
    assert.equal(player.isBoxing, false);
    assert.equal(player.isKicking, false);
    assert.equal(player.isHurt, false);
    assert.equal(player.isDead, false);
    assert.equal(player.bloodPool.visible, false);
    assert.equal(player.dieSprayer.visible, false);
    assert.equal(player.eyesMask.visible, false);
    assert.equal(player.hurtSprayer.visible, false);
    assert.equal(player.hurtBloodDrop1.visible, false);
    assert.equal(player.hurtBloodDrop2.visible, false);
    assert.equal(player.attackHitStar.visible, false);
});

const idleInput = { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: false };
const walkRightInput = { isMovingLeft: false, isMovingRight: true, isBoxingDown: false, isKickDown: false };
const boxLeftInput = { isMovingLeft: true, isMovingRight: false, isBoxingDown: true, isKickDown: false };

test('updates Player prefab orientation and presentation states on input', () => {
    const scene = createMockScene();
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    // Walk left
    const p1 = player.update(16, { isMovingLeft: true, isMovingRight: false, isBoxingDown: false, isKickDown: false });
    assert.equal(p1, 'walking');
    assert.equal(player.isFacingLeft, true);
    assert.equal(player.container.scaleX, -1);

    // Box
    const p2 = player.update(16, { isMovingLeft: false, isMovingRight: false, isBoxingDown: true, isKickDown: false });
    assert.equal(p2, 'boxing');
    assert.equal(player.isBoxing, true);

    // Stop boxing and start kick on a fresh player instance
    const player2 = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);
    const p3 = player2.update(16, { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: true });
    assert.equal(p3, 'kicking');
    assert.equal(player2.isKicking, true);

    // Complete kick cycle to return to idle (12 frames = 480ms)
    for (let i = 0; i < 11; i += 1) {
        player2.update(40, { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: false });
    }
    const p4 = player2.update(40, { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: false });
    assert.equal(p4, 'idle');
    assert.equal(player2.isBoxing, false);
    assert.equal(player2.isKicking, false);
});

const kickLeftInput = { isMovingLeft: true, isMovingRight: false, isBoxingDown: false, isKickDown: true };

test('finishes all 12 kick frames after the kick key is released', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);

    assert.equal(player.update(0, kickLeftInput), 'kicking');
    assert.equal(player.kickFrameNumber, 1);
    assert.equal(player.isFacingLeft, true);
    assert.equal(player.container.scaleX, -1);

    for (let step = 0; step < 11; step += 1) {
        assert.equal(player.update(40, walkRightInput), 'kicking');
    }
    assert.equal(player.kickFrameNumber, 12);
    assert.equal(player.isFacingLeft, true);

    assert.equal(player.update(40, walkRightInput), 'walking');
    assert.equal(player.isKicking, false);
    assert.equal(player.isFacingLeft, false);
    assert.equal(player.container.scaleX, 1);
});

test('restarts kick at frame 1 without a cooldown while the kick key remains held', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);

    player.update(0, kickLeftInput);
    player.hasHitThisAttack = true;
    for (let step = 0; step < 12; step += 1) {
        player.update(40, kickLeftInput);
    }

    assert.equal(player.isKicking, true);
    assert.equal(player.kickFrameNumber, 1);
    assert.equal(player.hasHitThisAttack, false);
});

test('finishes all 13 boxing frames after the punch key is released', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);

    assert.equal(player.update(0, boxLeftInput), 'boxing');
    assert.equal(player.boxingFrameNumber, 1);
    assert.equal(player.isFacingLeft, true);
    assert.equal(player.container.scaleX, -1);

    for (let step = 0; step < 12; step += 1) {
        assert.equal(player.update(40, walkRightInput), 'boxing');
    }
    assert.equal(player.boxingFrameNumber, 13);
    assert.equal(player.isFacingLeft, true);

    assert.equal(player.update(40, walkRightInput), 'walking');
    assert.equal(player.isBoxing, false);
    assert.equal(player.isFacingLeft, false);
    assert.equal(player.container.scaleX, 1);
});

test('restarts boxing at frame 1 without a cooldown while the punch key remains held', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);

    player.update(0, boxLeftInput);
    player.hasHitThisAttack = true;
    for (let step = 0; step < 13; step += 1) {
        player.update(40, boxLeftInput);
    }

    assert.equal(player.isBoxing, true);
    assert.equal(player.boxingFrameNumber, 1);
    assert.equal(player.hasHitThisAttack, false);
});

test('preserves boxing accumulator remainder across a held cycle boundary', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);

    player.update(0, boxLeftInput);
    player.update(545, boxLeftInput);

    assert.equal(player.isBoxing, true);
    assert.equal(player.boxingFrameNumber, 1);
    assert.equal(player.boxingFrameElapsed, 25);
});

test('defers a held kick until the active punch completion update', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);
    const kickInput = { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: true };

    player.update(0, boxLeftInput);
    for (let step = 0; step < 12; step += 1) {
        assert.equal(player.update(40, kickInput), 'boxing');
    }
    assert.equal(player.update(40, kickInput), 'kicking');
    assert.equal(player.isBoxing, false);
    assert.equal(player.isKicking, true);
});

test('advances boxing only after the complete 40 ms frame interval', () => {
    const player = new Player(createMockScene(), 960, 548.57, LAYOUT.player, 1920 / 546);

    player.update(0, boxLeftInput);
    player.update(39, boxLeftInput);
    assert.equal(player.boxingFrameNumber, 1);
    assert.equal(player.boxingFrameElapsed, 39);

    player.update(1, boxLeftInput);
    assert.equal(player.boxingFrameNumber, 2);
    assert.equal(player.boxingFrameElapsed, 0);
});

test('instantiates Backpack prefab with state machine and hit zones', () => {
    const scene = createMockScene();
    let selectedColor = null;
    let selectedTool = null;
    let selectedPhoneCalled = false;

    const backpack = new Backpack(scene, LAYOUT.backpack.rootX, LAYOUT.backpack.rootY, LAYOUT.backpack, {
        onSelectColor: (c) => { selectedColor = c; },
        onSelectTool: (t) => { selectedTool = t; },
        onSelectPhone: () => { selectedPhoneCalled = true; },
    });

    assert.equal(backpack.paletteState, 'closed');
    assert.equal(backpack.paletteHitZones.length, 11);

    // Open backpack
    backpack.setState('open');
    assert.equal(backpack.paletteState, 'open');
    assert.ok(backpack.paletteVisuals.can1);
    assert.ok(backpack.paletteVisuals.spraycan);
    assert.ok(backpack.paletteVisuals.smartphone);

    // Hover can
    backpack.setPaletteHover('can1', true);
    assert.equal(backpack.paletteVisuals.can1.bodyImage.texture, 'halloffame_backpack_can_open');

    // Hover off can
    backpack.setPaletteHover('can1', false);
    assert.equal(backpack.paletteVisuals.can1.bodyImage.texture, 'halloffame_backpack_can_closed');

    // Hover smartphone
    const phoneScale = LAYOUT.backpack.scale;
    const phoneBaseY = backpack.paletteVisuals.smartphone.baseY;
    backpack.setPaletteHover('smartphone', true);
    assert.ok(Math.abs(backpack.paletteVisuals.smartphone.image.y - (phoneBaseY - 12.75 * phoneScale)) < 0.001);

    // Hover off smartphone
    backpack.setPaletteHover('smartphone', false);
    assert.equal(backpack.paletteVisuals.smartphone.image.y, phoneBaseY);

    // Click smartphone zone
    backpack.paletteHitZones[10].emit('pointerdown');
    assert.equal(selectedPhoneCalled, true);

    // Close via close()
    assert.equal(backpack.isOpen, true);
    backpack.close();
    assert.equal(backpack.isOpen, false);
    assert.equal(backpack.paletteState, 'closed');

    // Open via open()
    backpack.open();
    assert.equal(backpack.isOpen, true);
    assert.equal(backpack.paletteState, 'open');

    // Toggle via toggle()
    backpack.toggle();
    assert.equal(backpack.isOpen, false);
    assert.equal(backpack.paletteState, 'closed');

    // Toggle via backpackHitZone pointerdown
    backpack.backpackHitZone.emit('pointerdown');
    assert.equal(backpack.isOpen, true);
    assert.equal(backpack.paletteState, 'open');

    backpack.backpackHitZone.emit('pointerdown');
    assert.equal(backpack.isOpen, false);
    assert.equal(backpack.paletteState, 'closed');
});

test('Backpack maintains hand cursor across tools, cans, and smartphone, and provides containsPoint bounds check', () => {
    const scene = createMockScene();
    let hoverStates = [];
    const backpack = new Backpack(scene, LAYOUT.backpack.rootX, LAYOUT.backpack.rootY, LAYOUT.backpack, {
        onHoverBackpack: (hovering) => { hoverStates.push(hovering); },
    });

    // 1. Closed backpack bounds check
    assert.equal(backpack.containsPoint(10, 850), true, 'Inside closed backpack icon');
    assert.equal(backpack.containsPoint(500, 850), false, 'Outside closed backpack icon');

    // 2. Hover over closed backpackHitZone
    backpack.backpackHitZone.emit('pointerover');
    assert.equal(hoverStates[hoverStates.length - 1], true, 'onHoverBackpack(true) on icon hover');

    // 3. Open backpack
    backpack.open();
    assert.equal(backpack.isOpen, true);

    // 4. Open backpack bounds check covers entire palette up to smartphone (X ~ 800)
    assert.equal(backpack.containsPoint(50, 900), true, 'Inside tools area');
    assert.equal(backpack.containsPoint(400, 900), true, 'Inside cans area');
    assert.equal(backpack.containsPoint(780, 900), true, 'Inside smartphone area');
    assert.equal(backpack.containsPoint(950, 900), false, 'Outside palette width');
    assert.equal(backpack.containsPoint(400, 600), false, 'Above palette height');

    // 5. Palette hit zones emit pointerover and maintain hover
    // tools: spraycan (0), fatcap (1), softcap (2), paintroller (3)
    // cans: can1 (4) .. can6 (9)
    // smartphone: (10)
    for (let i = 0; i < 11; i++) {
        backpack.paletteHitZones[i].emit('pointerover');
        assert.equal(hoverStates[hoverStates.length - 1], true, `Zone ${i} must trigger onHoverBackpack(true)`);
    }

    // 6. Close backpack resets hover
    backpack.close();
    assert.equal(hoverStates[hoverStates.length - 1], false, 'onHoverBackpack(false) on backpack close');
});

test('Backpack dynamically reflects CanInventory floor colors on visual and selection', () => {
    const CanInventory = require('../js/logic/canInventory.js');
    CanInventory.resetFloorColors();
    CanInventory.setFloorColor(0, 0x660066);
    CanInventory.setFloorColor(2, 0xff00ff);

    const scene = createMockScene();
    let selectedColor = null;

    const backpack = new Backpack(scene, LAYOUT.backpack.rootX, LAYOUT.backpack.rootY, LAYOUT.backpack, {
        onSelectColor: (c) => { selectedColor = c; },
    });

    backpack.setState('open');
    assert.equal(backpack.paletteVisuals.can1.colorImage.tintFill, 0x660066);
    assert.equal(backpack.paletteVisuals.can3.colorImage.tintFill, 0xff00ff);

    // Click can1 zone (index 4 in paletteHitZones)
    backpack.paletteHitZones[4].emit('pointerdown');
    assert.equal(selectedColor, 0x660066);

    // Click can3 zone (index 6 in paletteHitZones)
    backpack.paletteHitZones[6].emit('pointerdown');
    assert.equal(selectedColor, 0xff00ff);

    CanInventory.resetFloorColors();
});

test('handles Player death trigger, blocks inputs, advances animation, and calls onComplete', () => {
    const scene = createMockScene();
    let deathCompleted = false;
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    // Trigger death
    player.triggerDeath(() => {
        deathCompleted = true;
    });

    assert.equal(player.isDead, true);
    assert.equal(player.deathTick, 1);
    assert.equal(player.idleSprayer.visible, false);
    assert.equal(player.walkingSprayer.visible, false);
    assert.equal(player.dieSprayer.visible, true);
    assert.equal(player.dieSprayer.texture, 'player_die_frame_01');
    assert.equal(player.bloodPool.visible, false);
    assert.equal(player.eyesMask.visible, false);

    // Update with movement and combat inputs -> all inputs must be blocked!
    const state1 = player.update(100, {
        isMovingLeft: true,
        isMovingRight: false,
        isBoxingDown: true,
        isKickDown: true,
    });
    assert.equal(state1, 'die');
    assert.equal(player.isBoxing, false);
    assert.equal(player.isKicking, false);
    assert.ok(player.deathTick > 1);

    // Advance to ground slide phase (ticks 7..24, e.g. ~800ms)
    player.update(700);
    assert.ok(player.deathTick >= 7);
    assert.equal(player.dieSprayer.texture, 'player_die_frame_04');
    assert.equal(player.playerShadow.visible, true);

    // Advance to bleed and eye fade phase (tick 40..90, e.g. ~3000ms)
    player.update(3000);
    assert.ok(player.deathTick >= 40);
    assert.equal(player.bloodPool.visible, true);
    assert.ok(player.bloodPool.scaleX > 0);
    assert.equal(player.eyesMask.visible, true);
    assert.equal(typeof player.eyesMask.tint, 'number');
    assert.equal(deathCompleted, false);

    // Advance to completion (tick 116, e.g. ~7000ms)
    player.update(7000);
    assert.equal(player.deathTick, 116);
    assert.equal(player.deathComplete, true);
    assert.equal(deathCompleted, true);
    assert.equal(player.eyesMask.visible, true);
    assert.equal(player.eyesMask.tint, 0x000000);

    // Revive resets player cleanly
    player.revive();
    assert.equal(player.isDead, false);
    assert.equal(player.deathTick, 1);
    assert.equal(player.deathComplete, false);
    assert.equal(player.dieSprayer.visible, false);
    assert.equal(player.bloodPool.visible, false);
    assert.equal(player.eyesMask.visible, false);
    assert.equal(player.eyesMask.tint, undefined);
    assert.equal(player.idleSprayer.visible, true);
});

test('handles Player hurt trigger, blocks inputs, advances 5-tick animation, and restores idle', () => {
    const scene = createMockScene();
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    // Initial state
    assert.equal(player.isHurt, false);
    assert.equal(player.hurtSprayer.visible, false);
    assert.equal(player.hurtBloodDrop1.visible, false);
    assert.equal(player.hurtBloodDrop2.visible, false);

    // Trigger hurt
    player.triggerHurt();
    assert.equal(player.isHurt, true);
    assert.equal(player.hurtTick, 1);
    assert.equal(player.hurtSprayer.visible, true);
    assert.equal(player.hurtBloodDrop1.visible, true);
    assert.equal(player.hurtBloodDrop2.visible, true);
    assert.equal(player.idleSprayer.visible, false);

    // Inputs while hurt must be blocked!
    const state = player.update(16, {
        isMovingLeft: true,
        isMovingRight: false,
        isBoxingDown: true,
        isKickDown: true,
    });
    assert.equal(state, 'hurt');
    assert.equal(player.isBoxing, false);
    assert.equal(player.isKicking, false);

    // Advance through ticks (84ms per tick at 12 FPS)
    player.update(84);
    assert.equal(player.hurtTick, 2);
    assert.equal(player.hurtBloodDrop1.visible, true);
    assert.equal(player.hurtBloodDrop2.visible, true);

    player.update(84);
    assert.equal(player.hurtTick, 3);

    player.update(84);
    assert.equal(player.hurtTick, 4);

    // Tick 5 is the final frame
    player.update(84);
    assert.equal(player.hurtTick, 5);

    // Next update completes hurt animation and restores idle
    const endState = player.update(84);
    assert.equal(endState, 'idle');
    assert.equal(player.isHurt, false);
    assert.equal(player.hurtSprayer.visible, false);
    assert.equal(player.hurtBloodDrop1.visible, false);
    assert.equal(player.hurtBloodDrop2.visible, false);
    assert.equal(player.idleSprayer.visible, true);
});

test('handles Player applyDamage progression (-20 HP per hit, triggers hurt until 0 HP triggers death) and revive', () => {
    const scene = createMockScene();
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    assert.equal(player.health, 100);
    assert.equal(player.maxHealth, 100);
    assert.equal(player.isDead, false);

    // Hit 1 from cop at X=800 (attacker is left -> player faces left)
    player.applyDamage(20, 800);
    assert.equal(player.health, 80);
    assert.equal(player.isHurt, true);
    assert.equal(player.isDead, false);
    assert.equal(player.isFacingLeft, true);

    // End hurt
    player.endHurt();
    assert.equal(player.isHurt, false);

    // Hit 2 from cop at X=1100 (attacker is right -> player faces right)
    player.applyDamage(20, 1100);
    assert.equal(player.health, 60);
    assert.equal(player.isHurt, true);
    assert.equal(player.isFacingLeft, false);
    player.endHurt();

    // Hit 3
    player.applyDamage(20);
    assert.equal(player.health, 40);
    player.endHurt();

    // Hit 4
    player.applyDamage(20);
    assert.equal(player.health, 20);
    player.endHurt();

    // Hit 5 (0 HP -> death)
    player.applyDamage(20);
    assert.equal(player.health, 0);
    assert.equal(player.isDead, true);

    // Further damage while dead is ignored
    player.applyDamage(20);
    assert.equal(player.health, 0);

    // Revive restores health to 100
    player.revive();
    assert.equal(player.health, 100);
    assert.equal(player.isDead, false);
});
