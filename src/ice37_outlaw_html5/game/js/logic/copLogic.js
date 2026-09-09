(function attachCopLogic(globalScope) {
    'use strict';

    const TOTAL_WALK_TICKS = 12;
    const TICK_DURATION_MS = 1000.0 / 12.0; // 83.333ms per Flash tick at 12 FPS

    // 5 exported images at 125% zoom matching Flash DefineSprite 17
    const FRAME_KEYS = Object.freeze([
        'cop_walk_01', // Shape 12, ticks 1..2
        'cop_walk_02', // Shape 13, ticks 3..5
        'cop_walk_03', // Shape 14, ticks 6..7
        'cop_walk_04', // Shape 15, ticks 8..9
        'cop_walk_05', // Shape 16, ticks 10..12
    ]);

    // Flash timeline distribution: 12 ticks mapped to 0-based indices in FRAME_KEYS
    const TICK_TO_FRAME_INDEX = Object.freeze([
        0, 0,       // Ticks 1..2
        1, 1, 1,    // Ticks 3..5
        2, 2,       // Ticks 6..7
        3, 3,       // Ticks 8..9
        4, 4, 4,    // Ticks 10..12
    ]);

    const FRAME_DIMENSIONS = Object.freeze({
        width: 295,
        height: 518,
    });

    // Horizontal center (X=[-2262..2263] twips), vertical feet at bottom (ymax=+3982 twips)
    const SHAPE_ORIGIN = Object.freeze({
        x: 0.5,
        y: 1.0,
    });

    // Flash copspeed = 4 px/frame at 12 FPS -> 48 px/s Flash stage.
    // In native 1080p canvas (stage scale = 1920 / 546):
    const FLASH_COPSPEED = 4;
    const NATIVE_STAGE_SCALE = 1920.0 / 546.0;
    const NATIVE_COPSPEED_PER_SEC = FLASH_COPSPEED * NATIVE_STAGE_SCALE * 12.0; // ~168.79 px/s

    function getWalkState(tick) {
        // Clamp tick to 1..TOTAL_WALK_TICKS or wrap for looping
        const normalizedTick = ((Math.floor(tick) - 1) % TOTAL_WALK_TICKS + TOTAL_WALK_TICKS) % TOTAL_WALK_TICKS + 1;
        const frameIndex = TICK_TO_FRAME_INDEX[normalizedTick - 1];
        const frameKey = FRAME_KEYS[frameIndex];

        return {
            tick: normalizedTick,
            frameIndex,
            frameKey,
            dimensions: FRAME_DIMENSIONS,
            origin: SHAPE_ORIGIN,
        };
    }

    function advanceWalk(currentTick, deltaMs, elapsedAccumulator = 0) {
        const totalElapsed = elapsedAccumulator + deltaMs;
        const ticksToAdd = Math.floor(totalElapsed / TICK_DURATION_MS);
        const remainingMs = totalElapsed % TICK_DURATION_MS;

        const nextTick = ((currentTick - 1 + ticksToAdd) % TOTAL_WALK_TICKS) + 1;

        return {
            tick: nextTick,
            remainingMs,
            state: getWalkState(nextTick),
        };
    }

    function computeFacing(copX, targetX, currentFacingLeft = false) {
        if (copX < targetX) {
            return false; // Facing right towards target
        }
        if (copX > targetX) {
            return true; // Facing left towards target
        }
        return currentFacingLeft;
    }

    function computeMove(copX, targetX, deltaMs, speed = NATIVE_COPSPEED_PER_SEC, stopDistance = 40) {
        const distance = targetX - copX;
        const absDistance = Math.abs(distance);

        if (absDistance <= stopDistance) {
            return {
                nextX: copX,
                isMoving: false,
                isFacingLeft: distance < 0,
            };
        }

        const moveStep = (speed * deltaMs) / 1000.0;
        const isFacingLeft = distance < 0;
        const dir = isFacingLeft ? -1 : 1;
        const nextX = absDistance < moveStep ? targetX : copX + dir * moveStep;

        return {
            nextX,
            isMoving: true,
            isFacingLeft,
        };
    }

    const api = Object.freeze({
        TOTAL_WALK_TICKS,
        TICK_DURATION_MS,
        FRAME_KEYS,
        TICK_TO_FRAME_INDEX,
        FRAME_DIMENSIONS,
        SHAPE_ORIGIN,
        FLASH_COPSPEED,
        NATIVE_STAGE_SCALE,
        NATIVE_COPSPEED_PER_SEC,
        getWalkState,
        advanceWalk,
        computeFacing,
        computeMove,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.CopLogic = api;
    }
})(typeof window !== 'undefined' ? window : global);
