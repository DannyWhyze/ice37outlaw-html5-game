(function attachPlayerCombat(globalScope) {
    const FRAME_SHAPES = Object.freeze([16, 16, 17, 17, 18, 18, 19, 19, 19, 20, 20, 20, 20]);
    const BOXING_PLACEMENT = Object.freeze({ x: -943 / 20, y: 2062 / 20 });
    const KICK_FRAME_SHAPES = Object.freeze([22, 22, 23, 23, 23, 24, 24, 24, 25, 25, 25, 25]);
    const KICK_PLACEMENT = Object.freeze({ x: -1336 / 20, y: 1388 / 20 });
    const PLAYER_SHADOW = Object.freeze({
        key: 'halloffame_player_shadow',
        origin: Object.freeze({ x: 86.35 / 148.5, y: -365.8 / 23.2 }),
    });
    const SHAPE_ORIGINS = Object.freeze({
        16: Object.freeze({ x: 98 / 196, y: 104.7 / 381.15 }),
        17: Object.freeze({ x: 56.6 / 277.4, y: 88.35 / 364.95 }),
        18: Object.freeze({ x: 56.5 / 272.75, y: 81.6 / 358.2 }),
        19: Object.freeze({ x: 62.8 / 196, y: 96.95 / 373.5 }),
        20: Object.freeze({ x: 94.3 / 196, y: 102.9 / 378.75 }),
    });
    const KICK_SHAPE_ORIGINS = Object.freeze({
        22: Object.freeze({ x: 98 / 196, y: 62 / 374.1 }),
        23: Object.freeze({ x: 81.75 / 278.45, y: 54.35 / 365.7 }),
        24: Object.freeze({ x: 71 / 196, y: 62.8 / 375 }),
        25: Object.freeze({ x: 59.5 / 196, y: 66.45 / 378.4 }),
    });

    function getFrameKey(frameNumber) {
        if (!Number.isInteger(frameNumber) || frameNumber < 1 || frameNumber > FRAME_SHAPES.length) {
            throw new Error('Invalid boxing frame number');
        }
        return `halloffame_boxen_frame_${String(frameNumber).padStart(2, '0')}`;
    }

    function getFramePresentation(frameNumber) {
        const shapeId = FRAME_SHAPES[frameNumber - 1];
        const origin = SHAPE_ORIGINS[shapeId];

        if (!origin) {
            getFrameKey(frameNumber);
        }

        return {
            key: getFrameKey(frameNumber),
            origin: { x: origin.x, y: origin.y },
        };
    }

    const NATIVE_BOXING_ORIGIN = Object.freeze({
        x: 145.5 / 399,
        y: 0.0,
    });

    function getNativeFramePresentation(frameNumber) {
        return {
            key: getFrameKey(frameNumber),
            origin: { x: NATIVE_BOXING_ORIGIN.x, y: NATIVE_BOXING_ORIGIN.y },
        };
    }

    function getKickFrameKey(frameNumber) {
        if (!Number.isInteger(frameNumber) || frameNumber < 1 || frameNumber > KICK_FRAME_SHAPES.length) {
            throw new Error('Invalid kick frame number');
        }
        return `halloffame_kick_frame_${String(frameNumber).padStart(2, '0')}`;
    }

    function getKickFramePresentation(frameNumber) {
        const shapeId = KICK_FRAME_SHAPES[frameNumber - 1];
        const origin = KICK_SHAPE_ORIGINS[shapeId];

        if (!origin) {
            getKickFrameKey(frameNumber);
        }

        return {
            key: getKickFrameKey(frameNumber),
            origin: { x: origin.x, y: origin.y },
        };
    }

    const NATIVE_KICK_ORIGIN = Object.freeze({
        x: 142.5 / 369,
        y: 0.0,
    });

    function getNativeKickFramePresentation(frameNumber) {
        return {
            key: getKickFrameKey(frameNumber),
            origin: { x: NATIVE_KICK_ORIGIN.x, y: NATIVE_KICK_ORIGIN.y },
        };
    }

    function getPlayerPresentation({ boxingKeyDown, kickingKeyDown, isMoving }) {
        if (boxingKeyDown) {
            return 'boxing';
        }

        if (kickingKeyDown) {
            return 'kicking';
        }

        return isMoving ? 'walking' : 'idle';
    }

    function getFacingLeft({ isMovingLeft, isMovingRight, wasFacingLeft }) {
        if (isMovingLeft) {
            return true;
        }

        if (isMovingRight) {
            return false;
        }

        return wasFacingLeft;
    }

    function getShadowPresentation({ playerPresentation, isFacingLeft }) {
        return {
            key: PLAYER_SHADOW.key,
            origin: { x: PLAYER_SHADOW.origin.x, y: PLAYER_SHADOW.origin.y },
            visible: playerPresentation !== 'idle',
            flipX: isFacingLeft,
        };
    }

    const BOXING_FRAME_MS = 40;
    const KICK_FRAME_MS = 40;

    /**
     * @typedef {Object} BoxingScrollInput
     * @property {number} normalDistance
     * @property {number} worldScrollSpeed
     * @property {boolean} wasBoxing
     * @property {boolean} isBoxing
     */

    /**
     * Resolves the unsigned world-scroll distance for one scene update.
     * Direction remains a scene responsibility.
     * @param {BoxingScrollInput} input
     * @returns {number}
     */
    function resolveBoxingScrollDistance({ normalDistance, worldScrollSpeed, wasBoxing, isBoxing }) {
        if (wasBoxing) {
            return 0;
        }
        if (isBoxing) {
            return worldScrollSpeed * (BOXING_FRAME_MS / 1000);
        }
        return normalDistance;
    }

    /**
     * @typedef {Object} KickScrollInput
     * @property {number} normalDistance
     * @property {number} worldScrollSpeed
     * @property {boolean} wasKicking
     * @property {boolean} isKicking
     */

    /**
     * Resolves the unsigned world-scroll distance for one scene update during kicks.
     * @param {KickScrollInput} input
     * @returns {number}
     */
    function resolveKickScrollDistance({ normalDistance, worldScrollSpeed, wasKicking, isKicking }) {
        if (wasKicking) {
            return 0;
        }
        if (isKicking) {
            return worldScrollSpeed * (KICK_FRAME_MS / 1000);
        }
        return normalDistance;
    }

    /**
     * Resolves the unsigned world-scroll distance for one scene update considering both boxing and kicking attacks.
     * @param {Object} input
     * @param {number} input.normalDistance
     * @param {number} input.worldScrollSpeed
     * @param {boolean} [input.wasBoxing]
     * @param {boolean} [input.isBoxing]
     * @param {boolean} [input.wasKicking]
     * @param {boolean} [input.isKicking]
     * @returns {number}
     */
    function resolveCombatScrollDistance({ normalDistance, worldScrollSpeed, wasBoxing = false, isBoxing = false, wasKicking = false, isKicking = false }) {
        if (wasBoxing || wasKicking) {
            return 0;
        }
        if (isBoxing) {
            return worldScrollSpeed * (BOXING_FRAME_MS / 1000);
        }
        if (isKicking) {
            return worldScrollSpeed * (KICK_FRAME_MS / 1000);
        }
        return normalDistance;
    }

    const api = {
        BOXING_FRAME_MS,
        KICK_FRAME_MS,
        BOXING_PLACEMENT,
        FRAME_SHAPES,
        KICK_FRAME_SHAPES,
        KICK_PLACEMENT,
        NATIVE_BOXING_ORIGIN,
        NATIVE_KICK_ORIGIN,
        PLAYER_SHADOW,
        getFacingLeft,
        getFrameKey,
        getFramePresentation,
        getKickFrameKey,
        getKickFramePresentation,
        getNativeFramePresentation,
        getNativeKickFramePresentation,
        getPlayerPresentation,
        getShadowPresentation,
        resolveBoxingScrollDistance,
        resolveKickScrollDistance,
        resolveCombatScrollDistance,
    };

    globalScope.PlayerCombat = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
