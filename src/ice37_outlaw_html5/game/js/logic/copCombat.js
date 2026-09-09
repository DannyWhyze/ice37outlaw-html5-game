(function attachCopCombat(globalScope) {
    'use strict';

    // 20 Flash frames at 25 FPS
    const TOTAL_TICKS = 20;
    const TICK_DURATION_MS = 1000.0 / 25.0; // 40.0ms per Flash tick at 25 FPS

    // 6 exported keyframes at 352% zoom matching Flash DefineSprite 29 (or 26 in street)
    const FRAME_KEYS = Object.freeze([
        'cop_boxing_01', // Ticks 1..2 (idle stance)
        'cop_boxing_03', // Ticks 3..4 (windup 1)
        'cop_boxing_05', // Ticks 5..6 (windup 2)
        'cop_boxing_07', // Ticks 7..8 (punch begins)
        'cop_boxing_09', // Ticks 9..12 (full punch extension, hit star on 9..10)
        'cop_boxing_13', // Ticks 13..20 (recovery to stance)
    ]);

    // Flash timeline distribution: 20 ticks mapped to index in FRAME_KEYS
    const TICK_TO_FRAME_INDEX = Object.freeze([
        0, 0,                   // Ticks 1..2
        1, 1,                   // Ticks 3..4
        2, 2,                   // Ticks 5..6
        3, 3,                   // Ticks 7..8
        4, 4, 4, 4,             // Ticks 9..12
        5, 5, 5, 5, 5, 5, 5, 5, // Ticks 13..20
    ]);

    const FRAME_DIMENSIONS = Object.freeze({
        width: 592,
        height: 519,
    });

    // Body center aligned at X=37.025% of 592px canvas, feet at bottom
    const SHAPE_ORIGIN = Object.freeze({
        x: 0.37025,
        y: 1.0,
    });

    // In Flash DefineSprite 29, cop_faust tests hitTest on Frame 9..10
    const HIT_TICKS = Object.freeze({
        start: 9,
        end: 10,
    });

    function getBoxingState(tick) {
        const clampedTick = Math.max(1, Math.min(TOTAL_TICKS, Math.floor(tick)));
        const frameIndex = TICK_TO_FRAME_INDEX[clampedTick - 1];
        const frameKey = FRAME_KEYS[frameIndex];
        const isHit = clampedTick >= HIT_TICKS.start && clampedTick <= HIT_TICKS.end;
        const isComplete = clampedTick >= TOTAL_TICKS;

        return {
            tick: clampedTick,
            frameIndex,
            frameKey,
            dimensions: FRAME_DIMENSIONS,
            origin: SHAPE_ORIGIN,
            isHit,
            isComplete,
        };
    }

    function advanceBoxing(currentTick, deltaMs, elapsedAccumulator = 0) {
        const totalElapsed = elapsedAccumulator + deltaMs;
        const ticksToAdd = Math.floor(totalElapsed / TICK_DURATION_MS);
        const remainingMs = totalElapsed % TICK_DURATION_MS;

        const nextTick = Math.min(TOTAL_TICKS, currentTick + ticksToAdd);
        const isComplete = (currentTick + ticksToAdd) > TOTAL_TICKS;

        return {
            tick: nextTick,
            remainingMs,
            isComplete,
            state: getBoxingState(nextTick),
        };
    }

    function isHitTick(tick) {
        const t = Math.floor(tick);
        return t >= HIT_TICKS.start && t <= HIT_TICKS.end;
    }

    const api = Object.freeze({
        TOTAL_TICKS,
        TICK_DURATION_MS,
        FRAME_KEYS,
        TICK_TO_FRAME_INDEX,
        FRAME_DIMENSIONS,
        SHAPE_ORIGIN,
        HIT_TICKS,
        getBoxingState,
        advanceBoxing,
        isHitTick,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.CopCombat = api;
    }
})(typeof window !== 'undefined' ? window : global);
