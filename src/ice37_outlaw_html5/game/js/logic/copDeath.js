(function attachCopDeath(globalScope) {
    'use strict';

    const TOTAL_TICKS = 30;
    const TICK_DURATION_MS = 1000.0 / 12.0; // ~83.33 ms at 12 FPS

    const FRAME_KEYS = Object.freeze({
        character: 'cop_death_character',
        cap: 'cop_death_cap',
        star: 'cop_death_star',
    });

    const FRAME_DIMENSIONS = Object.freeze({
        cop_death_character: Object.freeze({ width: 247, height: 518 }),
        cop_death_cap: Object.freeze({ width: 187, height: 121 }),
        cop_death_star: Object.freeze({ width: 36, height: 37 }),
    });

    // In Flash Shape 36: xmin=-1898, xmax=1899 twips (symmetric w=3797 twips, originX=0.5).
    // ymin=-3979, ymax=3982 twips (feet at ymax, originY=1.0).
    // In Flash Shape 38 (Cap): bounds [-10, 2852, -10, 1849] twips (top-left origin (0, 0)).
    // In Flash Shape 5 (Star): bounds [-270, 270, -280, 280] twips (center origin (0.5, 0.5)).
    const SHAPE_ORIGINS = Object.freeze({
        character: Object.freeze({ x: 0.5, y: 1.0 }),
        cap: Object.freeze({ x: 0.0, y: 0.0 }),
        star: Object.freeze({ x: 0.5, y: 0.5 }),
    });

    // Flash scale inside cop_move is 0.370; native stage scale is 1920 / 546.
    // Scale factor: 0.370 * (1920 / 546) ~= 1.3011
    // Ground line (feet) is at ymax=3982 twips = 199.1 px Flash => 199.1 * 1.3011 ~= 259.05 px.
    const NATIVE_OFFSETS = Object.freeze({
        characterX: 0.0,
        zeroFromFeetY: 259.05,
    });

    // Star scales across frames 1..7. Disappears on frame 8..30.
    const STAR_SCALES = Object.freeze([1.0, 1.75, 2.5, 3.25, 4.0, 5.5, 7.0]);

    // Cap positions across frames 1..30 relative to Flash (0, 0) converted to native 1080p pixels
    // Frame 1 starts on head at tx=-46.2, ty=-198.95; flies in arc and lands on ground at frame 30
    const CAP_FRAMES = Object.freeze([
        Object.freeze({ x: -60.11, y: -258.85 }), // Frame 1
        Object.freeze({ x: -66.75, y: -267.12 }), // Frame 2
        Object.freeze({ x: -73.38, y: -275.44 }), // Frame 3
        Object.freeze({ x: -80.02, y: -283.70 }), // Frame 4
        Object.freeze({ x: -86.65, y: -292.03 }), // Frame 5
        Object.freeze({ x: -86.65, y: -292.03 }), // Frame 6
        Object.freeze({ x: -86.65, y: -292.03 }), // Frame 7
        Object.freeze({ x: -66.75, y: -252.22 }), // Frame 8
        Object.freeze({ x: -39.62, y: -224.57 }), // Frame 9
        Object.freeze({ x: -13.47, y: -206.94 }), // Frame 10
        Object.freeze({ x:   8.20, y: -195.75 }), // Frame 11
        Object.freeze({ x:  24.14, y: -188.98 }), // Frame 12
        Object.freeze({ x:  33.76, y: -185.28 }), // Frame 13
        Object.freeze({ x:  37.02, y: -184.11 }), // Frame 14
        Object.freeze({ x: -13.27, y: -148.13 }), // Frame 15
        Object.freeze({ x: -66.10, y: -131.09 }), // Frame 16
        Object.freeze({ x: -111.50, y: -123.21 }), // Frame 17
        Object.freeze({ x: -148.65, y: -119.64 }), // Frame 18
        Object.freeze({ x: -177.34, y: -118.20 }), // Frame 19
        Object.freeze({ x: -197.77, y: -117.68 }), // Frame 20
        Object.freeze({ x: -210.00, y: -117.62 }), // Frame 21
        Object.freeze({ x: -214.10, y: -117.62 }), // Frame 22
        Object.freeze({ x: -163.87, y: -66.75 }), // Frame 23
        Object.freeze({ x: -103.05, y: -41.77 }), // Frame 24
        Object.freeze({ x: -50.94, y: -28.30 }), // Frame 25
        Object.freeze({ x:  -8.39, y: -20.10 }), // Frame 26
        Object.freeze({ x:  24.59, y: -15.03 }), // Frame 27
        Object.freeze({ x:  48.14, y: -11.91 }), // Frame 28
        Object.freeze({ x:  62.19, y: -10.21 }), // Frame 29
        Object.freeze({ x:  66.88, y:  -9.69 }), // Frame 30
    ]);

    /**
     * Exact Flash CXFORMWITHALPHA (a_mult) factors for the police cap (depth 27) across 30 frames.
     * Frames 1..22 are 1.0 (fully opaque), frames 23..30 fade out transparently.
     */
    const CAP_ALPHAS = Object.freeze([
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
        1.0, 1.0, 0.7578, 0.5625, 0.3945, 0.2578, 0.1484, 0.0742, 0.0273, 0.0117
    ]);

    function getDeathState(tick) {
        const clampedTick = Math.max(1, Math.min(tick, TOTAL_TICKS));
        const isComplete = tick >= TOTAL_TICKS;
        const cap = CAP_FRAMES[clampedTick - 1];

        const starVisible = clampedTick <= STAR_SCALES.length;
        const starScale = starVisible ? STAR_SCALES[clampedTick - 1] : 0;
        const characterVisible = (clampedTick === 1);
        const capAlpha = (tick > TOTAL_TICKS) ? 0 : CAP_ALPHAS[clampedTick - 1];
        const capVisible = (tick <= TOTAL_TICKS) && capAlpha > 0;

        return {
            tick: clampedTick,
            frameKey: FRAME_KEYS.character,
            characterVisible,
            origin: SHAPE_ORIGINS.character,
            offsetX: NATIVE_OFFSETS.characterX,
            zeroFromFeetY: NATIVE_OFFSETS.zeroFromFeetY,
            star: {
                visible: starVisible,
                scale: starScale,
                x: 0,
                y: 0,
            },
            cap: {
                visible: capVisible,
                alpha: capAlpha,
                x: cap.x,
                y: cap.y,
            },
            isComplete,
        };
    }

    function advanceDeath(currentTick, deltaMs, elapsedAccumulator = 0) {
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
                ...getDeathState(nextTick),
                isComplete,
            },
        };
    }

    function getDeathPresentation(tick, isFacingLeft = false) {
        const state = getDeathState(tick);
        return {
            ...state,
            flipX: isFacingLeft,
            offsetX: isFacingLeft ? -state.offsetX : state.offsetX,
            star: {
                ...state.star,
                x: isFacingLeft ? -state.star.x : state.star.x,
            },
            cap: {
                ...state.cap,
                x: isFacingLeft ? -state.cap.x : state.cap.x,
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
        STAR_SCALES,
        CAP_FRAMES,
        CAP_ALPHAS,
        getDeathState,
        advanceDeath,
        getDeathPresentation,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.CopDeath = api;
    }
})(typeof window !== 'undefined' ? window : global);
