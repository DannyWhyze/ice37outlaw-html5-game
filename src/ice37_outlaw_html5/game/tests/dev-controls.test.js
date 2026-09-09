const assert = require('node:assert/strict');
const test = require('node:test');

const { DevControls } = require('../js/prefabs/DevControls.js');

function createMockScene() {
    return {
        scene: {
            input: {
                keyboard: {
                    addKey: (code) => ({ code, isDown: false }),
                },
            },
        },
    };
}

function createMockPlayer() {
    return {
        container: { x: 960 },
        isFacingLeft: false,
        isDead: false,
        deathCalled: false,
        reviveCalled: false,
        hurtCalled: false,
        setFacingLeft(isLeft) {
            this.isFacingLeft = Boolean(isLeft);
        },
        triggerDeath(onComplete) {
            this.isDead = true;
            this.deathCalled = true;
            if (onComplete) onComplete();
        },
        revive() {
            this.isDead = false;
            this.reviveCalled = true;
        },
        triggerHurt() {
            this.hurtCalled = true;
        },
    };
}

function createMockCop() {
    return {
        container: { x: 1200 },
        isFacingLeft: false,
        isDead: false,
        walkToggled: false,
        boxingCalled: false,
        hurtCalled: false,
        deathCalled: false,
        respawnCalled: false,
        setFacingLeft(isLeft) {
            this.isFacingLeft = Boolean(isLeft);
        },
        toggleWalk() {
            this.walkToggled = true;
        },
        triggerBoxing(onComplete) {
            this.boxingCalled = true;
            if (onComplete) onComplete();
        },
        triggerHurt(onComplete) {
            this.hurtCalled = true;
            if (onComplete) onComplete();
        },
        triggerDeath(onComplete) {
            this.isDead = true;
            this.deathCalled = true;
            if (onComplete) onComplete();
        },
        respawn() {
            this.isDead = false;
            this.respawnCalled = true;
        },
    };
}

test('instantiates DevControls and registers keyboard shortcuts K, H, G, B, T, O, R, X', () => {
    const { scene } = createMockScene();
    const player = createMockPlayer();
    const cop = createMockCop();
    const devControls = new DevControls(scene, player, cop);

    assert.ok(devControls.dieKey);
    assert.ok(devControls.hurtKey);
    assert.ok(devControls.copWalkKey);
    assert.ok(devControls.copBoxKey);
    assert.ok(devControls.copHurtKey);
    assert.ok(devControls.copDieKey);
    assert.ok(devControls.copRespawnKey);
    assert.ok(devControls.hitboxKey);

    assert.equal(devControls.dieKey.code, 75); // 'K'
    assert.equal(devControls.hurtKey.code, 72); // 'H'
    assert.equal(devControls.copWalkKey.code, 71); // 'G'
    assert.equal(devControls.copBoxKey.code, 66); // 'B'
    assert.equal(devControls.copHurtKey.code, 84); // 'T'
    assert.equal(devControls.copDieKey.code, 79); // 'O'
    assert.equal(devControls.copRespawnKey.code, 82); // 'R'
    assert.equal(devControls.hitboxKey.code, 88); // 'X'
});

test('disables cop keyboard shortcuts when enableCopKeys is false', () => {
    const { scene } = createMockScene();
    const player = createMockPlayer();
    const cop = createMockCop();
    const devControls = new DevControls(scene, player, cop, { enableCopKeys: false });

    // Player and hitbox keys remain active
    assert.ok(devControls.dieKey);
    assert.ok(devControls.hurtKey);
    assert.ok(devControls.hitboxKey);

    // Cop shortcuts are disabled / null
    assert.equal(devControls.copWalkKey, null);
    assert.equal(devControls.copBoxKey, null);
    assert.equal(devControls.copHurtKey, null);
    assert.equal(devControls.copDieKey, null);
    assert.equal(devControls.copRespawnKey, null);
});

test('toggles death: triggers death, revives on second toggle', () => {
    const { scene } = createMockScene();
    const player = createMockPlayer();
    const devControls = new DevControls(scene, player);

    assert.equal(player.isDead, false);

    // Toggle to die
    devControls.toggleDeath();
    assert.equal(player.isDead, true);
    assert.equal(player.deathCalled, true);

    // Toggle again to revive
    devControls.toggleDeath();
    assert.equal(player.isDead, false);
    assert.equal(player.reviveCalled, true);
});

test('triggers hurt on triggerHurt()', () => {
    const { scene } = createMockScene();
    const player = createMockPlayer();
    const devControls = new DevControls(scene, player);

    assert.equal(player.hurtCalled, false);
    devControls.triggerHurt();
    assert.equal(player.hurtCalled, true);
});

test('triggers cop actions: walk, boxing, hurt, death, and respawn', () => {
    const { scene } = createMockScene();
    const player = createMockPlayer();
    const cop = createMockCop();
    const devControls = new DevControls(scene, player, cop);

    assert.equal(cop.walkToggled, false);
    devControls.toggleCopWalk();
    assert.equal(cop.walkToggled, true);

    assert.equal(cop.boxingCalled, false);
    devControls.triggerCopBoxing();
    assert.equal(cop.boxingCalled, true);

    assert.equal(cop.hurtCalled, false);
    // Player at 960, Cop at 1200 -> Cop must face left towards player
    devControls.triggerCopHurt();
    assert.equal(cop.hurtCalled, true);
    assert.equal(cop.isFacingLeft, true);

    // Cop moves to 800 (left of player at 960) -> Cop must face right towards player
    cop.container.x = 800;
    devControls.triggerCopDeath();
    assert.equal(cop.deathCalled, true);
    assert.equal(cop.isDead, true);
    assert.equal(cop.isFacingLeft, false);

    assert.equal(cop.respawnCalled, false);
    devControls.respawnCop();
    assert.equal(cop.respawnCalled, true);
    assert.equal(cop.isDead, false);
});

test('toggles hitbox debug mode on toggleHitboxDebug()', () => {
    let clearCalled = false;
    const scene = {
        input: {
            keyboard: {
                addKey: (code) => ({ code, isDown: false }),
            },
        },
        add: {
            graphics: () => ({
                setDepth: () => {},
                clear: () => { clearCalled = true; },
                lineStyle: () => {},
                strokeRect: () => {},
            }),
        },
    };
    const player = createMockPlayer();
    const devControls = new DevControls(scene, player);

    assert.equal(devControls.showHitboxes, false);

    // Toggle on
    devControls.toggleHitboxDebug();
    assert.equal(devControls.showHitboxes, true);

    // Update triggers render
    devControls.update();
    assert.ok(devControls.hitboxGraphics);

    // Toggle off clears graphics
    devControls.toggleHitboxDebug();
    assert.equal(devControls.showHitboxes, false);
    assert.equal(clearCalled, true);
});

test('renders cop hitboxes only when cop is spawned and alive', () => {
    let strokes = [];
    const scene = {
        input: {
            keyboard: {
                addKey: (code) => ({ code, isDown: false }),
            },
        },
        add: {
            graphics: () => ({
                setDepth: () => {},
                clear: () => { strokes = []; },
                lineStyle: () => {},
                strokeRect: (x, y, w, h) => { strokes.push({ x, y, w, h }); },
            }),
        },
    };
    const player = createMockPlayer();
    const cop = createMockCop();
    cop.isSpawned = false;
    cop.isDead = false;

    const devControls = new DevControls(scene, player, cop);
    devControls.toggleHitboxDebug();
    devControls.update();

    // Cop is unspawned -> only player body box drawn (1 box)
    assert.equal(strokes.length, 1);

    // Spawn cop -> player body (1) + cop body (1) + sensor (1) = 3 boxes
    strokes = [];
    cop.isSpawned = true;
    devControls.renderHitboxes();
    assert.equal(strokes.length, 3);

    // Cop dies -> only player box drawn
    strokes = [];
    cop.isDead = true;
    devControls.renderHitboxes();
    assert.equal(strokes.length, 1);
});


test('verifies index.html header title is Outlaw, dev-buttons and footer are deactivated, and fullscreen button is present', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const htmlPath = path.resolve(__dirname, '../index.html');
    const content = fs.readFileSync(htmlPath, 'utf8');

    assert.ok(content.includes('<header>'));
    assert.ok(content.includes('<h1>Outlaw</h1>'));
    assert.ok(content.includes('class="controls-bar"'));
    assert.ok(content.includes('id="btn-fullscreen"'));

    // Dev buttons, subtitle, and footer are deactivated / removed
    assert.equal(content.includes('id="btn-hurt"'), false);
    assert.equal(content.includes('id="btn-die"'), false);
    assert.equal(content.includes('id="btn-revive"'), false);
    assert.equal(content.includes('id="btn-hitboxes"'), false);
    assert.equal(content.includes('class="subtitle"'), false);
    assert.equal(content.includes('<footer>'), false);

    // Cop dev buttons are deactivated / removed from controls bar
    assert.equal(content.includes('id="btn-cop-walk"'), false);
    assert.equal(content.includes('id="btn-cop-box"'), false);
    assert.equal(content.includes('id="btn-cop-hurt"'), false);
    assert.equal(content.includes('id="btn-cop-die"'), false);
    assert.equal(content.includes('id="btn-cop-respawn"'), false);

    const headerStart = content.indexOf('<header>');
    const headerEnd = content.indexOf('</header>');
    const controlsIndex = content.indexOf('class="controls-bar"');
    assert.ok(controlsIndex > headerStart && controlsIndex < headerEnd, 'Controls must be located inside header');
});
