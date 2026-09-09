(function attachPlayerHurt(globalScope) {
    'use strict';

    const TOTAL_TICKS = 5;
    const TICK_DURATION_MS = 1000 / 12; // ~83.33 ms at 12 FPS

    const FRAME_KEYS = Object.freeze({
        character: 'player_hurt_character',
        bloodDrop: 'player_hurt_blood_drop',
    });

    const FRAME_DIMENSIONS = Object.freeze({
        player_hurt_character: Object.freeze({ width: 192, height: 456 }),
        player_hurt_blood_drop: Object.freeze({ width: 28, height: 35 }),
    });

    const SHAPE_ORIGINS = Object.freeze({
        character: Object.freeze({ x: 1705.0 / 3065.0, y: 1.0 }), // ~0.5563, 1.0
        bloodDrop: Object.freeze({ x: 0.5, y: 0.5 }),
    });

    // Native pixel offset of Shape 110 origin in player container
    // Flash matrix: tx = -1336 twips, ty = 1388 twips; feet at Ymax = 6242 twips
    const NATIVE_OFFSETS = Object.freeze({
        characterX: -83.5, // -1336 / 20 * 1.25
        zeroFromFeetY: 390.125, // 6242 / 20 * 1.25 px from feet to Flash (0, 0)
    });

    // Trajectories for the two blood drops across frames 1..5 (in native 125% px relative to Flash (0, 0))
    // Rotations match Flash Sprite 111 where bulb leads flight (down-left) and pointy tip trails (up-right)
    const BLOOD_DROPS = Object.freeze([
        // Frame 1
        Object.freeze({
            drop1: Object.freeze({ x: -32.625, y: 78.375, scale: 0.35, rotation: 1.571, visible: true }),
            drop2: Object.freeze({ x: -35.4375, y: 76.1875, scale: 0.30, rotation: 1.239, visible: true }),
        }),
        // Frame 2
        Object.freeze({
            drop1: Object.freeze({ x: -56.5, y: 89.5, scale: 0.55, rotation: 1.571, visible: true }),
            drop2: Object.freeze({ x: -62.8125, y: 97.8125, scale: 0.50, rotation: 1.407, visible: true }),
        }),
        // Frame 3
        Object.freeze({
            drop1: Object.freeze({ x: -80.25, y: 100.625, scale: 0.75, rotation: 1.571, visible: true }),
            drop2: Object.freeze({ x: -90.5625, y: 118.625, scale: 0.70, rotation: 1.548, visible: true }),
        }),
        // Frame 4
        Object.freeze({
            drop1: Object.freeze({ x: -104.125, y: 111.6875, scale: 0.95, rotation: 1.571, visible: true }),
            drop2: Object.freeze({ x: -119.0625, y: 139.0625, scale: 0.90, rotation: 1.678, visible: true }),
        }),
        // Frame 5
        Object.freeze({
            drop1: Object.freeze({ x: -128.0, y: 122.8125, scale: 1.15, rotation: 1.571, visible: true }),
            drop2: Object.freeze({ x: -148.5, y: 158.75, scale: 1.10, rotation: 1.810, visible: true }),
        }),
    ]);

    function getHurtState(tick) {
        const clampedTick = Math.max(1, Math.min(tick, TOTAL_TICKS));
        const isComplete = tick > TOTAL_TICKS;
        const drops = BLOOD_DROPS[clampedTick - 1];

        return {
            tick: clampedTick,
            frameKey: FRAME_KEYS.character,
            origin: SHAPE_ORIGINS.character,
            offsetX: NATIVE_OFFSETS.characterX,
            zeroFromFeetY: NATIVE_OFFSETS.zeroFromFeetY,
            drop1: drops.drop1,
            drop2: drops.drop2,
            isComplete,
        };
    }

    function advanceHurt(currentTick, deltaMs, elapsedAccumulator = 0) {
        const totalElapsed = elapsedAccumulator + deltaMs;
        const ticksToAdd = Math.floor(totalElapsed / TICK_DURATION_MS);
        const remainingMs = totalElapsed % TICK_DURATION_MS;
        const targetTick = currentTick + ticksToAdd;
        const isComplete = targetTick > TOTAL_TICKS;
        const nextTick = Math.min(targetTick, TOTAL_TICKS);

        return {
            tick: nextTick,
            remainingMs,
            isComplete,
            state: {
                ...getHurtState(nextTick),
                isComplete,
            },
        };
    }

    function getHurtPresentation(tick, isFacingLeft = false) {
        const state = getHurtState(tick);
        return {
            ...state,
            flipX: isFacingLeft,
            offsetX: isFacingLeft ? -state.offsetX : state.offsetX,
            drop1: {
                ...state.drop1,
                x: isFacingLeft ? -state.drop1.x : state.drop1.x,
                rotation: isFacingLeft ? -state.drop1.rotation : state.drop1.rotation,
            },
            drop2: {
                ...state.drop2,
                x: isFacingLeft ? -state.drop2.x : state.drop2.x,
                rotation: isFacingLeft ? -state.drop2.rotation : state.drop2.rotation,
            },
        };
    }

    const api = Object.freeze({
        TOTAL_TICKS,
        TICK_DURATION_MS,
        FRAME_KEYS,
        FRAME_DIMENSIONS,
        SHAPE_ORIGINS,
        NATIVE_OFFSETS,
        BLOOD_DROPS,
        getHurtState,
        advanceHurt,
        getHurtPresentation,
    });

    globalScope.PlayerHurt = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
