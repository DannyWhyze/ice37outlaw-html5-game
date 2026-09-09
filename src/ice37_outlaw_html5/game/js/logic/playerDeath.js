(function attachPlayerDeath(globalScope) {
    'use strict';

    const TOTAL_TICKS = 116;
    const TICK_DURATION_MS = 1000 / 12; // ~83.33 ms at 12 FPS

    const SLIDE_DISTANCE_NATIVE = 128.6; // 102.9 Flash px * 1.25 zoom factor

    const FRAME_KEYS = Object.freeze({
        frame1: 'player_die_frame_01', // Shape 105 (Recoil standing)
        frame2: 'player_die_frame_02', // Shape 107 (Buckle 45 degrees)
        frame3: 'player_die_frame_03', // Shape 108 (Midair horizontal)
        frame4: 'player_die_frame_04', // Shape 103 (Lying on ground)
        blood: 'player_die_blood_pool', // Shape 101 (Red blood puddle)
        eyes: 'player_die_eyes_white',  // Shape 99 (White eye mask)
        shadow: 'halloffame_player_shadow',
    });

    const FRAME_DIMENSIONS = Object.freeze({
        player_die_frame_01: Object.freeze({ width: 284, height: 477 }),
        player_die_frame_02: Object.freeze({ width: 427, height: 434 }),
        player_die_frame_03: Object.freeze({ width: 522, height: 319 }),
        player_die_frame_04: Object.freeze({ width: 498, height: 158 }),
        player_die_blood_pool: Object.freeze({ width: 50, height: 12 }),
        player_die_eyes_white: Object.freeze({ width: 25, height: 92 }),
    });

    const SHAPE_ORIGINS = Object.freeze({
        frame1: Object.freeze({ x: 98.0 / 226.45, y: 1.0 }), // ~0.4328
        frame2: Object.freeze({ x: 269.85 / 341.45, y: 1.0 }), // ~0.7903
        frame3: Object.freeze({ x: 393.7 / 417.25, y: 1.0 }), // ~0.9436
        frame4: Object.freeze({ x: 7493.0 / 7964.0, y: 1.0 }), // ~0.9409 (aligned with frame 3 ground impact)
        blood: Object.freeze({ x: 0.5, y: 0.5 }),
        eyes: Object.freeze({ x: 0.0, y: 0.0 }),
        shadow: Object.freeze({ x: 0.5, y: 0.5 }),
    });

    const GROUND_OFFSETS = Object.freeze({
        // Offsets from Shape 103's top-left in native 1080p pixels (125% zoom factor)
        eyes: Object.freeze({ x: 98.5625, y: 38.0625 }),
        bloodCenter: Object.freeze({ x: 128.625, y: 136.125 }),
        shadowCenter: Object.freeze({ x: 244.8125, y: 134.70625 }),
    });

    // Blood puddle max scale from Flash matrix at frame 91 (sx=9.675, sy=4.945)
    const BLOOD_MAX_SCALE = Object.freeze({
        scaleX: 9.675125,
        scaleY: 4.944794,
    });

    // Stretched shadow scale from Flash matrix at frame 7..116 (sx=5.955, sy=2.379)
    const SHADOW_STRETCH_SCALE = Object.freeze({
        scaleX: 5.955093,
        scaleY: 2.379486,
    });

    function getDeathState(tick) {
        const clampedTick = Math.max(1, Math.min(tick, TOTAL_TICKS));
        const isComplete = tick >= TOTAL_TICKS;

        if (clampedTick <= 2) {
            return {
                tick: clampedTick,
                phase: 'fall_recoil',
                frameKey: FRAME_KEYS.frame1,
                origin: SHAPE_ORIGINS.frame1,
                slideX: 0,
                shadow: { visible: false },
                blood: { visible: false, scaleX: 0, scaleY: 0 },
                eyes: { visible: false, tint: 0xffffff, alpha: 0, greyLevel: 255 },
                isComplete: false,
            };
        }

        if (clampedTick <= 4) {
            return {
                tick: clampedTick,
                phase: 'fall_buckle',
                frameKey: FRAME_KEYS.frame2,
                origin: SHAPE_ORIGINS.frame2,
                slideX: 0,
                shadow: { visible: false },
                blood: { visible: false, scaleX: 0, scaleY: 0 },
                eyes: { visible: false, tint: 0xffffff, alpha: 0, greyLevel: 255 },
                isComplete: false,
            };
        }

        if (clampedTick <= 6) {
            return {
                tick: clampedTick,
                phase: 'fall_midair',
                frameKey: FRAME_KEYS.frame3,
                origin: SHAPE_ORIGINS.frame3,
                slideX: 0,
                shadow: { visible: false },
                blood: { visible: false, scaleX: 0, scaleY: 0 },
                eyes: { visible: false, tint: 0xffffff, alpha: 0, greyLevel: 255 },
                isComplete: false,
            };
        }

        if (clampedTick <= 24) {
            const slideProgress = (clampedTick - 7) / (24 - 7);
            const slideX = slideProgress === 0 ? 0 : -slideProgress * SLIDE_DISTANCE_NATIVE;
            return {
                tick: clampedTick,
                phase: 'ground_slide',
                frameKey: FRAME_KEYS.frame4,
                origin: SHAPE_ORIGINS.frame4,
                slideX,
                shadow: {
                    visible: true,
                    scaleX: SHADOW_STRETCH_SCALE.scaleX,
                    scaleY: SHADOW_STRETCH_SCALE.scaleY,
                },
                blood: { visible: false, scaleX: 0, scaleY: 0 },
                eyes: { visible: false, tint: 0xffffff, alpha: 0, greyLevel: 255 },
                isComplete: false,
            };
        }

        if (clampedTick <= 39) {
            return {
                tick: clampedTick,
                phase: 'ground_still',
                frameKey: FRAME_KEYS.frame4,
                origin: SHAPE_ORIGINS.frame4,
                slideX: -SLIDE_DISTANCE_NATIVE,
                shadow: {
                    visible: true,
                    scaleX: SHADOW_STRETCH_SCALE.scaleX,
                    scaleY: SHADOW_STRETCH_SCALE.scaleY,
                },
                blood: { visible: false, scaleX: 0, scaleY: 0 },
                eyes: { visible: false, tint: 0xffffff, alpha: 0, greyLevel: 255 },
                isComplete: false,
            };
        }

        if (clampedTick <= 90) {
            const progress = (clampedTick - 40) / 50;
            const bloodScaleX = progress * BLOOD_MAX_SCALE.scaleX;
            const bloodScaleY = progress * BLOOD_MAX_SCALE.scaleY;
            // Flash ActionScript ColorTransform: AddTerm declines linearly from 255 (frame 40) to 5 (frame 90) at -5/frame
            const greyLevel = Math.max(0, Math.min(255, 255 - (clampedTick - 40) * 5));
            const eyeTint = (greyLevel << 16) | (greyLevel << 8) | greyLevel;

            return {
                tick: clampedTick,
                phase: 'bleed_and_fade',
                frameKey: FRAME_KEYS.frame4,
                origin: SHAPE_ORIGINS.frame4,
                slideX: -SLIDE_DISTANCE_NATIVE,
                shadow: {
                    visible: true,
                    scaleX: SHADOW_STRETCH_SCALE.scaleX,
                    scaleY: SHADOW_STRETCH_SCALE.scaleY,
                },
                blood: {
                    visible: true,
                    scaleX: bloodScaleX,
                    scaleY: bloodScaleY,
                },
                eyes: {
                    visible: true,
                    tint: eyeTint,
                    alpha: 1.0,
                    greyLevel,
                },
                isComplete: false,
            };
        }

        // Ticks 91..116
        return {
            tick: clampedTick,
            phase: 'dead_hold',
            frameKey: FRAME_KEYS.frame4,
            origin: SHAPE_ORIGINS.frame4,
            slideX: -SLIDE_DISTANCE_NATIVE,
            shadow: {
                visible: true,
                scaleX: SHADOW_STRETCH_SCALE.scaleX,
                scaleY: SHADOW_STRETCH_SCALE.scaleY,
            },
            blood: {
                visible: true,
                scaleX: BLOOD_MAX_SCALE.scaleX,
                scaleY: BLOOD_MAX_SCALE.scaleY,
            },
            eyes: {
                visible: true,
                tint: 0x000000,
                alpha: 1.0,
                greyLevel: 0,
            },
            isComplete,
        };
    }

    function advanceDeath(currentTick, deltaMs, elapsedAccumulator = 0) {
        const totalElapsed = elapsedAccumulator + deltaMs;
        const ticksToAdd = Math.floor(totalElapsed / TICK_DURATION_MS);
        const remainingMs = totalElapsed % TICK_DURATION_MS;
        const nextTick = Math.min(currentTick + ticksToAdd, TOTAL_TICKS);

        return {
            tick: nextTick,
            remainingMs,
            state: getDeathState(nextTick),
        };
    }

    function getDeathPresentation(tick, isFacingLeft = false) {
        const state = getDeathState(tick);
        return {
            ...state,
            flipX: isFacingLeft,
            slideX: isFacingLeft ? -state.slideX : state.slideX,
        };
    }

    const api = Object.freeze({
        TOTAL_TICKS,
        TICK_DURATION_MS,
        SLIDE_DISTANCE_NATIVE,
        FRAME_KEYS,
        FRAME_DIMENSIONS,
        SHAPE_ORIGINS,
        GROUND_OFFSETS,
        BLOOD_MAX_SCALE,
        SHADOW_STRETCH_SCALE,
        getDeathState,
        advanceDeath,
        getDeathPresentation,
    });

    globalScope.PlayerDeath = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
