const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { PlayerControls } = require('../js/logic/playerControls.js');
const { Player } = require('../js/prefabs/Player.js');

function createMockSceneWithKeyboard() {
    const keys = new Map();
    const getKey = (code) => {
        if (!keys.has(code)) {
            keys.set(code, { code, isDown: false, justDown: false });
        }
        return keys.get(code);
    };

    const cursorKeys = {
        left: { isDown: false },
        right: { isDown: false },
        up: { isDown: false },
        down: { isDown: false },
    };

    const scene = {
        input: {
            keyboard: {
                createCursorKeys: () => cursorKeys,
                addKey: (code) => getKey(code),
            },
        },
    };

    return { scene, getKey, cursorKeys };
}

test('verifies index.html loads playerControls.js with cache-buster under Global Logic Modules', () => {
    const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert.ok(
        indexHtml.includes('<script src="js/logic/playerControls.js?v=1080p"></script>'),
        'index.html must include playerControls.js?v=1080p'
    );
});

test('instantiates PlayerControls and registers WASD and Arrow keys', () => {
    const { scene, getKey, cursorKeys } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    assert.ok(controls.keyA, 'Key A must be registered');
    assert.ok(controls.keyD, 'Key D must be registered');
    assert.ok(controls.keyW, 'Key W must be registered');
    assert.ok(controls.keyS, 'Key S must be registered');
    assert.ok(controls.keyUp, 'Key Up must be registered');
    assert.ok(controls.keyDown, 'Key Down must be registered');
    assert.equal(controls.cursors, cursorKeys, 'Cursor keys must be bound');

    assert.equal(controls.keyA.code, 65);
    assert.equal(controls.keyD.code, 68);
    assert.equal(controls.keyW.code, 87);
    assert.equal(controls.keyS.code, 83);
    assert.equal(controls.keyUp.code, 38);
    assert.equal(controls.keyDown.code, 40);
});

test('evaluates initial input state as all false', () => {
    const { scene } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    const state = controls.getInputState();
    assert.deepEqual(state, {
        isMovingLeft: false,
        isMovingRight: false,
        isBoxingDown: false,
        isKickDown: false,
    });
});

test('evaluates WASD inputs for walking, boxing, and kicking', () => {
    const { scene, getKey } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    const keyA = getKey(65);
    const keyD = getKey(68);
    const keyW = getKey(87);
    const keyS = getKey(83);

    // Left walking with A
    keyA.isDown = true;
    assert.equal(controls.getInputState().isMovingLeft, true);
    assert.equal(controls.getInputState().isMovingRight, false);
    keyA.isDown = false;

    // Right walking with D
    keyD.isDown = true;
    assert.equal(controls.getInputState().isMovingRight, true);
    assert.equal(controls.getInputState().isMovingLeft, false);
    keyD.isDown = false;

    // Boxing with W
    keyW.isDown = true;
    assert.equal(controls.getInputState().isBoxingDown, true);
    keyW.isDown = false;

    // Kicking with S
    keyS.isDown = true;
    assert.equal(controls.getInputState().isKickDown, true);
    keyS.isDown = false;
});

test('evaluates Arrow key inputs as secondary fallback controls', () => {
    const { scene, cursorKeys, getKey } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    // ArrowLeft
    cursorKeys.left.isDown = true;
    assert.equal(controls.getInputState().isMovingLeft, true);
    cursorKeys.left.isDown = false;

    // ArrowRight
    cursorKeys.right.isDown = true;
    assert.equal(controls.getInputState().isMovingRight, true);
    cursorKeys.right.isDown = false;

    // ArrowUp
    cursorKeys.up.isDown = true;
    assert.equal(controls.getInputState().isBoxingDown, true);
    cursorKeys.up.isDown = false;

    // ArrowDown
    cursorKeys.down.isDown = true;
    assert.equal(controls.getInputState().isKickDown, true);
    cursorKeys.down.isDown = false;

    // Fallback addKey for UP and DOWN
    const keyUp = getKey(38);
    keyUp.isDown = true;
    assert.equal(controls.getInputState().isBoxingDown, true);
    keyUp.isDown = false;

    const keyDown = getKey(40);
    keyDown.isDown = true;
    assert.equal(controls.getInputState().isKickDown, true);
    keyDown.isDown = false;
});

test('prioritizes left movement when both left and right directions are pressed', () => {
    const { scene, getKey } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    const keyA = getKey(65);
    const keyD = getKey(68);

    keyA.isDown = true;
    keyD.isDown = true;

    const state = controls.getInputState();
    assert.equal(state.isMovingLeft, true, 'Left must take precedence');
    assert.equal(state.isMovingRight, false, 'Right must be suppressed');
});

test('supports simultaneous movement and combat actions (e.g. running punch)', () => {
    const { scene, getKey } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    const keyD = getKey(68); // Walk Right
    const keyW = getKey(87); // Punch

    keyD.isDown = true;
    keyW.isDown = true;

    const state = controls.getInputState();
    assert.equal(state.isMovingRight, true);
    assert.equal(state.isBoxingDown, true);
    assert.equal(state.isMovingLeft, false);
    assert.equal(state.isKickDown, false);
});

test('suppresses all inputs when isBlocked is true (e.g. Photo Mode or transitions)', () => {
    const { scene, getKey } = createMockSceneWithKeyboard();
    const controls = new PlayerControls(scene);

    getKey(65).isDown = true;
    getKey(68).isDown = true;
    getKey(87).isDown = true;
    getKey(83).isDown = true;

    const state = controls.getInputState(true);
    assert.deepEqual(state, {
        isMovingLeft: false,
        isMovingRight: false,
        isBoxingDown: false,
        isKickDown: false,
    });
});

test('integrates PlayerControls into Player prefab', () => {
    const { scene } = createMockSceneWithKeyboard();
    const makeDisplayObject = () => ({
        x: 0, y: 0, width: 0, height: 0, depth: 0, scaleX: 1, scaleY: 1, visible: true,
        children: [],
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setOrigin() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setTexture(k) { this.texture = k; return this; },
        setVisible(v) { this.visible = v; return this; },
        on() { return this; },
        destroy() { this.destroyed = true; },
    });

    scene.add = {
        container: (x, y) => {
            const c = makeDisplayObject();
            c.x = x;
            c.y = y;
            return c;
        },
        image: () => makeDisplayObject(),
        sprite: () => makeDisplayObject(),
    };
    scene.anims = { exists: () => true };

    const layout = {
        idleWidth: 100, idleHeight: 200,
        walkWidth: 100, walkHeight: 200,
        boxWidth: 100, boxHeight: 200,
        kickWidth: 100, kickHeight: 200,
    };

    const player = new Player(scene, 960, 540, layout);
    assert.ok(player.controls, 'Player must have controls instance');
    assert.equal(typeof player.getInputState, 'function');

    const initialState = player.getInputState(false);
    assert.deepEqual(initialState, {
        isMovingLeft: false,
        isMovingRight: false,
        isBoxingDown: false,
        isKickDown: false,
    });

    player.destroy();
    assert.equal(player.controls, null);
    assert.equal(player.container, null);
});
