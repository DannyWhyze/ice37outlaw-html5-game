(function attachCopHurt(globalScope) {
    'use strict';

    const TOTAL_TICKS = 5;
    const TICK_DURATION_MS = 1000.0 / 25.0; // 40.0ms at 25 FPS

    const FRAME_KEYS = Object.freeze({
        character: 'cop_hurt_character',
        bloodDrop: 'cop_hurt_blood_drop',
    });

    const FRAME_DIMENSIONS = Object.freeze({
        cop_hurt_character: Object.freeze({ width: 250, height: 516 }),
        cop_hurt_blood_drop: Object.freeze({ width: 30, height: 37 }),
    });

    // In Flash Shape 32: xmin=-1401, xmax=2437 twips (w=3838). Axis X=0 is 1401 / 3838 from left.
    // ymin=-3845, ymax=4080 twips (feet at ymax, originY=1.0).
    const SHAPE_ORIGINS = Object.freeze({
        character: Object.freeze({ x: 1401.0 / 3838.0, y: 1.0 }), // ~0.3650, 1.0
        bloodDrop: Object.freeze({ x: 0.5, y: 0.5 }),
    });

    // Flash scale inside cop_move is 0.370; native stage scale is 1920 / 546.
    // Scale factor: 0.370 * (1920 / 546) ~= 1.3011
    // Ground line (feet) is at ymax=4080 twips = 204 px Flash => 204 * 1.3011 ~= 265.42 px.
    const NATIVE_OFFSETS = Object.freeze({
        characterX: 0.0,
        zeroFromFeetY: 265.42,
    });

    // Blood drop trajectories relative to Flash (0, 0) converted to native 1080p pixels
    // Drop 1 scales uniformly; Drop 2 is asymmetrically distorted (stretched vertically)
    const BLOOD_DROPS = Object.freeze([
        // Frame 1
        Object.freeze({
            drop1: Object.freeze({ x: 79.17, y: -109.75, scaleX: 0.100, scaleY: 0.100, rotation: 0.0, visible: true }),
            drop2: Object.freeze({ x: 67.20, y: -111.96, scaleX: 0.100, scaleY: 0.100, rotation: -0.010, visible: true }),
        }),
        // Frame 2
        Object.freeze({
            drop1: Object.freeze({ x: 81.58, y: -98.69, scaleX: 0.324, scaleY: 0.324, rotation: 0.027, visible: true }),
            drop2: Object.freeze({ x: 79.11, y: -104.28, scaleX: 0.218, scaleY: 0.404, rotation: -0.044, visible: true }),
        }),
        // Frame 3
        Object.freeze({
            drop1: Object.freeze({ x: 84.70, y: -88.15, scaleX: 0.542, scaleY: 0.542, rotation: 0.094, visible: true }),
            drop2: Object.freeze({ x: 90.10, y: -96.02, scaleX: 0.330, scaleY: 0.691, rotation: -0.103, visible: true }),
        }),
        // Frame 4
        Object.freeze({
            drop1: Object.freeze({ x: 88.60, y: -77.94, scaleX: 0.749, scaleY: 0.749, rotation: 0.198, visible: true }),
            drop2: Object.freeze({ x: 100.18, y: -86.85, scaleX: 0.430, scaleY: 0.950, rotation: -0.186, visible: true }),
        }),
        // Frame 5
        Object.freeze({
            drop1: Object.freeze({ x: 93.35, y: -67.92, scaleX: 0.940, scaleY: 0.940, rotation: 0.342, visible: true }),
            drop2: Object.freeze({ x: 109.23, y: -76.89, scaleX: 0.515, scaleY: 1.173, rotation: -0.291, visible: true }),
        }),
    ]);

    function getHurtState(tick) {
        const clampedTick = Math.max(1, Math.min(tick, TOTAL_TICKS));
        const isComplete = tick >= TOTAL_TICKS;
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

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.CopHurt = api;
    }
})(typeof window !== 'undefined' ? window : global);
