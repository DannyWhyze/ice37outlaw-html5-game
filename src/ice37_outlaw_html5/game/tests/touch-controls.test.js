const assert = require('node:assert/strict');
const test = require('node:test');

const TouchControlsLogic = require('../js/logic/touchControlsLogic.js');

test('provides valid 1920x1080 layout coordinates, button dimensions, and exclusion zones', () => {
    assert.equal(TouchControlsLogic.LAYOUT.canvasWidth, 1920);
    assert.equal(TouchControlsLogic.LAYOUT.canvasHeight, 1080);

    const { buttons, moveZone, exclusionZones } = TouchControlsLogic.LAYOUT;

    // Movement buttons (offset to the right to avoid closed backpack at X=3..243)
    assert.equal(buttons.left.centerX, 290);
    assert.equal(buttons.left.centerY, 940);
    assert.equal(buttons.left.width, 110);
    assert.equal(buttons.left.height, 110);

    assert.equal(buttons.right.centerX, 420);
    assert.equal(buttons.right.centerY, 940);
    assert.equal(buttons.right.width, 110);
    assert.equal(buttons.right.height, 110);

    // Combat buttons
    assert.equal(buttons.box.centerX, 1600);
    assert.equal(buttons.box.centerY, 940);
    assert.equal(buttons.box.width, 120);
    assert.equal(buttons.box.height, 120);

    assert.equal(buttons.kick.centerX, 1760);
    assert.equal(buttons.kick.centerY, 940);
    assert.equal(buttons.kick.width, 120);
    assert.equal(buttons.kick.height, 120);

    // Continuous movement zone
    assert.equal(moveZone.minX, 210);
    assert.equal(moveZone.maxX, 500);
    assert.equal(moveZone.splitX, 355);
    assert.equal(moveZone.deadzone, 15);

    // Exclusion zones for spray isolation
    assert.equal(exclusionZones.length, 2);
    assert.equal(exclusionZones[0].minX, 200);
    assert.equal(exclusionZones[0].maxX, 520);
    assert.equal(exclusionZones[1].minX, 1480);
    assert.equal(exclusionZones[1].maxX, 1920);
});

test('isPointInButton accurately detects points inside button boundaries', () => {
    const { buttons } = TouchControlsLogic.LAYOUT;

    // Center of left button
    assert.equal(TouchControlsLogic.isPointInButton(290, 940, buttons.left), true);
    // Margins of left button
    assert.equal(TouchControlsLogic.isPointInButton(235, 885, buttons.left), true);
    assert.equal(TouchControlsLogic.isPointInButton(345, 995, buttons.left), true);
    // Outside left button
    assert.equal(TouchControlsLogic.isPointInButton(200, 940, buttons.left), false);
    assert.equal(TouchControlsLogic.isPointInButton(350, 940, buttons.left), false);

    // Right button
    assert.equal(TouchControlsLogic.isPointInButton(420, 940, buttons.right), true);
    assert.equal(TouchControlsLogic.isPointInButton(290, 940, buttons.right), false);

    // Box button
    assert.equal(TouchControlsLogic.isPointInButton(1600, 940, buttons.box), true);
    assert.equal(TouchControlsLogic.isPointInButton(1760, 940, buttons.box), false);

    // Kick button
    assert.equal(TouchControlsLogic.isPointInButton(1760, 940, buttons.kick), true);
    assert.equal(TouchControlsLogic.isPointInButton(1600, 940, buttons.kick), false);
});

test('isPointInControlZone identifies exclusion areas preventing unwanted spray paint', () => {
    // Inside left control cluster
    assert.equal(TouchControlsLogic.isPointInControlZone(290, 940), true);
    assert.equal(TouchControlsLogic.isPointInControlZone(210, 800), true);
    // Inside right control cluster
    assert.equal(TouchControlsLogic.isPointInControlZone(1600, 940), true);
    assert.equal(TouchControlsLogic.isPointInControlZone(1800, 800), true);

    // Upper/middle spray area on wall/train
    assert.equal(TouchControlsLogic.isPointInControlZone(960, 500), false);
    assert.equal(TouchControlsLogic.isPointInControlZone(100, 300), false);
    assert.equal(TouchControlsLogic.isPointInControlZone(1700, 400), false);
});

test('resolveMovementState resolves discrete taps on movement buttons', () => {
    // Tap on left button (x=290)
    const leftRes = TouchControlsLogic.resolveMovementState([{ x: 290, y: 940, isDown: true }]);
    assert.equal(leftRes.isMovingLeft, true);
    assert.equal(leftRes.isMovingRight, false);

    // Tap on right button (x=420)
    const rightRes = TouchControlsLogic.resolveMovementState([{ x: 420, y: 940, isDown: true }]);
    assert.equal(rightRes.isMovingLeft, false);
    assert.equal(rightRes.isMovingRight, true);

    // Empty or pointerup
    const emptyRes = TouchControlsLogic.resolveMovementState([]);
    assert.equal(emptyRes.isMovingLeft, false);
    assert.equal(emptyRes.isMovingRight, false);

    const upRes = TouchControlsLogic.resolveMovementState([{ x: 290, y: 940, isDown: false }]);
    assert.equal(upRes.isMovingLeft, false);
    assert.equal(upRes.isMovingRight, false);
});

test('resolveMovementState resolves continuous slide/swipe drag across the movement zone', () => {
    // 1. Thumb lands on left side (x=250) -> Moving Left (< splitX 355 - deadzone 15)
    const step1 = TouchControlsLogic.resolveMovementState([{ x: 250, y: 940, isDown: true }]);
    assert.equal(step1.isMovingLeft, true);
    assert.equal(step1.isMovingRight, false);

    // 2. Thumb reaches central deadzone (x=355) -> Neutral / Idle
    const step2 = TouchControlsLogic.resolveMovementState([{ x: 355, y: 940, isDown: true }]);
    assert.equal(step2.isMovingLeft, false);
    assert.equal(step2.isMovingRight, false);

    // 3. Thumb slides further right (x=450) -> Moving Right (> splitX 355 + deadzone 15)
    const step3 = TouchControlsLogic.resolveMovementState([{ x: 450, y: 940, isDown: true }]);
    assert.equal(step3.isMovingLeft, false);
    assert.equal(step3.isMovingRight, true);

    // 4. Thumb slides back left (x=260) without releasing -> Smooth reversal to Moving Left
    const step4 = TouchControlsLogic.resolveMovementState([{ x: 260, y: 940, isDown: true }]);
    assert.equal(step4.isMovingLeft, true);
    assert.equal(step4.isMovingRight, false);
});

test('resolveCombatState resolves actions for boxing and kicking', () => {
    // Box
    const boxRes = TouchControlsLogic.resolveCombatState([{ x: 1600, y: 940, isDown: true }]);
    assert.equal(boxRes.isBoxingDown, true);
    assert.equal(boxRes.isKickDown, false);

    // Kick
    const kickRes = TouchControlsLogic.resolveCombatState([{ x: 1760, y: 940, isDown: true }]);
    assert.equal(kickRes.isBoxingDown, false);
    assert.equal(kickRes.isKickDown, true);

    // Outside
    const noneRes = TouchControlsLogic.resolveCombatState([{ x: 1000, y: 500, isDown: true }]);
    assert.equal(noneRes.isBoxingDown, false);
    assert.equal(noneRes.isKickDown, false);
});

test('resolveTouchInput handles multi-touch simultaneous movement and combat', () => {
    // Pointer 1 (Left thumb moving right at x=420) + Pointer 2 (Right thumb punching at x=1600)
    const multiPointers = [
        { x: 420, y: 940, isDown: true },
        { x: 1600, y: 940, isDown: true },
    ];

    const input = TouchControlsLogic.resolveTouchInput(multiPointers);
    assert.equal(input.isMovingLeft, false);
    assert.equal(input.isMovingRight, true);
    assert.equal(input.isBoxingDown, true);
    assert.equal(input.isKickDown, false);
});

test('blendInput blends touch inputs and keyboard inputs without locking', () => {
    // Keyboard moving left, Touch kicking
    const blended = TouchControlsLogic.blendInput(
        { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: true },
        { isMovingLeft: true, isMovingRight: false, isBoxingDown: false, isKickDown: false }
    );

    assert.equal(blended.isMovingLeft, true);
    assert.equal(blended.isMovingRight, false);
    assert.equal(blended.isBoxingDown, false);
    assert.equal(blended.isKickDown, true);
});

test('isTouchDevice detects touch capabilities accurately via coarse pointer', () => {
    const mockWindowCoarse = { matchMedia: (q) => ({ matches: q === '(pointer: coarse)' }) };
    const mockWindowFine = { matchMedia: (q) => ({ matches: false }) };

    assert.equal(TouchControlsLogic.isTouchDevice(null, mockWindowCoarse), true);
    assert.equal(TouchControlsLogic.isTouchDevice(null, mockWindowFine), false);
});

const { TouchControls } = require('../js/prefabs/TouchControls.js');

function createMockScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        visible: true,
        children: [],
        listeners: {},
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        setDepth(d) { this.depth = d; return this; },
        setVisible(v) { this.visible = v; return this; },
        setOrigin() { return this; },
        setStrokeStyle() { return this; },
        setFillStyle(color, alpha) { this.fillColor = color; this.fillAlpha = alpha; return this; },
        setColor(c) { this.textColor = c; return this; },
        setInteractive() { return this; },
        on(evt, cb) {
            this.listeners[evt] = cb;
            return this;
        },
        emit(evt, ...args) {
            if (this.listeners[evt]) return this.listeners[evt](...args);
        },
        destroy() { this.destroyed = true; },
    });

    return {
        add: {
            container: (x, y) => {
                const c = makeDisplayObject();
                c.x = x;
                c.y = y;
                return c;
            },
            rectangle: () => makeDisplayObject(),
            text: () => makeDisplayObject(),
            zone: () => makeDisplayObject(),
        },
        input: {
            listeners: {},
            on(evt, cb) { this.listeners[evt] = cb; return this; },
            off(evt) { delete this.listeners[evt]; return this; },
            emit(evt, ...args) { if (this.listeners[evt]) return this.listeners[evt](...args); },
        },
    };
}

test('instantiates TouchControls prefab with layer 3 depth, interactive zones, and buttons', () => {
    const scene = createMockScene();
    const touchControls = new TouchControls(scene, { visible: true });

    assert.equal(touchControls.container.depth, 250);
    assert.equal(touchControls.container.visible, true);
    assert.equal(touchControls.isVisible, true);
    assert.equal(touchControls.isMovingLeft, false);
    assert.equal(touchControls.isMovingRight, false);
    assert.equal(touchControls.isBoxingDown, false);
    assert.equal(touchControls.isKickDown, false);

    const state = touchControls.getState();
    assert.equal(state.isMovingLeft, false);
    assert.equal(state.isMovingRight, false);
    assert.equal(state.isBoxingDown, false);
    assert.equal(state.isKickDown, false);
});

test('handles movement zone pointerdown and pointermove slide-drag in TouchControls prefab', () => {
    const scene = createMockScene();
    const touchControls = new TouchControls(scene, { visible: true });

    const moveZone = touchControls.moveZoneObject;
    assert.ok(moveZone);

    // 1. Pointerdown on left side (x=290)
    moveZone.emit('pointerdown', { id: 1, x: 290, y: 940, isDown: true });
    assert.equal(touchControls.isMovingLeft, true);
    assert.equal(touchControls.isMovingRight, false);

    // 2. Pointermove slide to right (x=420) without release
    moveZone.emit('pointermove', { id: 1, x: 420, y: 940, isDown: true });
    assert.equal(touchControls.isMovingLeft, false);
    assert.equal(touchControls.isMovingRight, true);

    // 3. Pointermove into deadzone (x=355)
    moveZone.emit('pointermove', { id: 1, x: 355, y: 940, isDown: true });
    assert.equal(touchControls.isMovingLeft, false);
    assert.equal(touchControls.isMovingRight, false);

    // 4. Pointerup releases movement
    moveZone.emit('pointerup', { id: 1 });
    assert.equal(touchControls.isMovingLeft, false);
    assert.equal(touchControls.isMovingRight, false);
});

test('toggles visibility and cleans up on destroy in TouchControls prefab', () => {
    const scene = createMockScene();
    const touchControls = new TouchControls(scene, { visible: true });

    assert.equal(touchControls.isVisible, true);
    touchControls.toggleVisibility();
    assert.equal(touchControls.isVisible, false);
    assert.equal(touchControls.container.visible, false);

    // When hidden, getState returns all false
    touchControls.isMovingLeft = true;
    const hiddenState = touchControls.getState();
    assert.equal(hiddenState.isMovingLeft, false);

    touchControls.destroy();
    assert.equal(touchControls.container.destroyed, true);
});

test('handles backpack open/close pause lifecycle without revealing on desktop hover', () => {
    const scene = createMockScene();
    // Desktop case: starts disabled/invisible
    const desktopControls = new TouchControls(scene, { visible: false });
    assert.equal(desktopControls.isEnabled, false);
    assert.equal(desktopControls.isVisible, false);

    // Hover on backpack (paletteState = 'hover' -> setBackpackOpen(false)) does NOT make it visible
    desktopControls.setBackpackOpen(false);
    assert.equal(desktopControls.isVisible, false);

    // Open backpack (paletteState = 'open' -> setBackpackOpen(true)) marks paused
    desktopControls.setBackpackOpen(true);
    assert.equal(desktopControls.isPaused, true);
    assert.equal(desktopControls.isVisible, false);

    // Close backpack (paletteState = 'closed' -> setBackpackOpen(false)) still keeps desktop hidden
    desktopControls.setBackpackOpen(false);
    assert.equal(desktopControls.isPaused, false);
    assert.equal(desktopControls.isVisible, false);

    // Mobile case: starts enabled/visible
    const mobileControls = new TouchControls(scene, { visible: true });
    assert.equal(mobileControls.isEnabled, true);
    assert.equal(mobileControls.isVisible, true);

    // Opening backpack hides mobile touch buttons completely
    mobileControls.setBackpackOpen(true);
    assert.equal(mobileControls.isPaused, true);
    assert.equal(mobileControls.isVisible, false);
    assert.equal(mobileControls.container.visible, false);

    // Touch event while backpack is open does NOT un-pause
    scene.input.emit('pointerdown', { wasTouch: true, pointerType: 'touch' });
    assert.equal(mobileControls.isPaused, true);
    assert.equal(mobileControls.isVisible, false);

    // Closing backpack restores mobile touch buttons
    mobileControls.setBackpackOpen(false);
    assert.equal(mobileControls.isPaused, false);
    assert.equal(mobileControls.isVisible, true);
    assert.equal(mobileControls.container.visible, true);
});

