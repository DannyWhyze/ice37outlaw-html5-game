(function attachTouchControlsLogic(globalScope) {
    'use strict';

    const TouchPointerMode = (typeof globalScope.TouchPointerMode !== 'undefined')
        ? globalScope.TouchPointerMode
        : (typeof require !== 'undefined' ? (function() {
            try { return require('./touchPointerMode.js'); } catch (_) { return null; }
        })() : null);

    const LAYOUT = Object.freeze({
        canvasWidth: 1920,
        canvasHeight: 1080,
        toggleKey: 'V',
        moveZone: Object.freeze({
            minX: 210,
            maxX: 500,
            minY: 820,
            maxY: 1060,
            splitX: 355,
            deadzone: 15,
        }),
        buttons: Object.freeze({
            left: Object.freeze({
                key: 'left',
                label: '◀',
                centerX: 290,
                centerY: 940,
                width: 110,
                height: 110,
                minX: 235,
                maxX: 345,
                minY: 885,
                maxY: 995,
            }),
            right: Object.freeze({
                key: 'right',
                label: '▶',
                centerX: 420,
                centerY: 940,
                width: 110,
                height: 110,
                minX: 365,
                maxX: 475,
                minY: 885,
                maxY: 995,
            }),
            box: Object.freeze({
                key: 'box',
                label: 'BOX',
                centerX: 1600,
                centerY: 940,
                width: 120,
                height: 120,
                minX: 1540,
                maxX: 1660,
                minY: 880,
                maxY: 1000,
            }),
            kick: Object.freeze({
                key: 'kick',
                label: 'KICK',
                centerX: 1760,
                centerY: 940,
                width: 120,
                height: 120,
                minX: 1700,
                maxX: 1820,
                minY: 880,
                maxY: 1000,
            }),
        }),
        exclusionZones: Object.freeze([
            // Left control cluster (D-pad & slide area, offset from backpack at X=0..200)
            Object.freeze({ minX: 200, maxX: 520, minY: 780, maxY: 1080 }),
            // Right control cluster (Box & Kick buttons)
            Object.freeze({ minX: 1480, maxX: 1920, minY: 780, maxY: 1080 }),
        ]),
    });

    /**
     * Checks if a point (x, y) falls inside a specific button's bounding box.
     * @param {number} x
     * @param {number} y
     * @param {Object} button
     * @returns {boolean}
     */
    function isPointInButton(x, y, button) {
        return x >= button.minX && x <= button.maxX && y >= button.minY && y <= button.maxY;
    }

    /**
     * Checks if a point (x, y) falls inside any UI control exclusion zone (where spraying is disallowed).
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    function isPointInControlZone(x, y) {
        for (let i = 0; i < LAYOUT.exclusionZones.length; i++) {
            const zone = LAYOUT.exclusionZones[i];
            if (x >= zone.minX && x <= zone.maxX && y >= zone.minY && y <= zone.maxY) {
                return true;
            }
        }
        return false;
    }

    /**
     * Resolves movement state (left, right, idle) from active pointer coordinates in the movement zone.
     * Supports both discrete button hit and continuous slide-drag across the moveZone.
     * @param {Array<{x: number, y: number, isDown?: boolean}>} pointers
     * @returns {{isMovingLeft: boolean, isMovingRight: boolean}}
     */
    function resolveMovementState(pointers) {
        if (!Array.isArray(pointers) || pointers.length === 0) {
            return { isMovingLeft: false, isMovingRight: false };
        }

        let isMovingLeft = false;
        let isMovingRight = false;

        const zone = LAYOUT.moveZone;

        for (let i = 0; i < pointers.length; i++) {
            const p = pointers[i];
            if (p.isDown === false) {
                continue;
            }

            if (p.x >= zone.minX && p.x <= zone.maxX && p.y >= zone.minY && p.y <= zone.maxY) {
                if (p.x < zone.splitX - zone.deadzone) {
                    isMovingLeft = true;
                } else if (p.x > zone.splitX + zone.deadzone) {
                    isMovingRight = true;
                }
            }
        }

        return {
            isMovingLeft,
            isMovingRight,
        };
    }

    /**
     * Resolves combat state (box, kick) from active pointer coordinates on action buttons.
     * @param {Array<{x: number, y: number, isDown?: boolean}>} pointers
     * @returns {{isBoxingDown: boolean, isKickDown: boolean}}
     */
    function resolveCombatState(pointers) {
        if (!Array.isArray(pointers) || pointers.length === 0) {
            return { isBoxingDown: false, isKickDown: false };
        }

        let isBoxingDown = false;
        let isKickDown = false;

        for (let i = 0; i < pointers.length; i++) {
            const p = pointers[i];
            if (p.isDown === false) {
                continue;
            }

            if (isPointInButton(p.x, p.y, LAYOUT.buttons.box)) {
                isBoxingDown = true;
            }
            if (isPointInButton(p.x, p.y, LAYOUT.buttons.kick)) {
                isKickDown = true;
            }
        }

        return {
            isBoxingDown,
            isKickDown,
        };
    }

    /**
     * Resolves complete touch input state from active pointers.
     * @param {Array<{x: number, y: number, isDown?: boolean}>} pointers
     * @returns {{isMovingLeft: boolean, isMovingRight: boolean, isBoxingDown: boolean, isKickDown: boolean}}
     */
    function resolveTouchInput(pointers) {
        const move = resolveMovementState(pointers);
        const combat = resolveCombatState(pointers);

        return {
            isMovingLeft: move.isMovingLeft,
            isMovingRight: move.isMovingRight,
            isBoxingDown: combat.isBoxingDown,
            isKickDown: combat.isKickDown,
        };
    }

    /**
     * Seamlessly blends touch inputs with physical keyboard inputs.
     * @param {Object} touchState
     * @param {Object} keyboardState
     * @returns {{isMovingLeft: boolean, isMovingRight: boolean, isBoxingDown: boolean, isKickDown: boolean}}
     */
    function blendInput(touchState = {}, keyboardState = {}) {
        return {
            isMovingLeft: Boolean(touchState.isMovingLeft || keyboardState.isMovingLeft),
            isMovingRight: Boolean(touchState.isMovingRight || keyboardState.isMovingRight),
            isBoxingDown: Boolean(touchState.isBoxingDown || keyboardState.isBoxingDown),
            isKickDown: Boolean(touchState.isKickDown || keyboardState.isKickDown),
        };
    }

    /**
     * Detects if runtime environment is a touch-capable coarse pointer device (touchscreen / mobile).
     * @param {Object} [nav]
     * @param {Object} [win]
     * @returns {boolean}
     */
    function isTouchDevice(nav = (typeof navigator !== 'undefined' ? navigator : null), win = (typeof window !== 'undefined' ? window : null)) {
        if (TouchPointerMode && typeof TouchPointerMode.isCoarsePointer === 'function') {
            return TouchPointerMode.isCoarsePointer(win, nav);
        }
        if (win && typeof win.matchMedia === 'function') {
            try {
                const q = win.matchMedia('(pointer: coarse)');
                if (q && q.matches) return true;
            } catch (_) {}
        }
        if (nav && typeof nav.userAgent === 'string') {
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(nav.userAgent)) {
                return true;
            }
        }
        return false;
    }

    const api = Object.freeze({
        LAYOUT,
        isPointInButton,
        isPointInControlZone,
        resolveMovementState,
        resolveCombatState,
        resolveTouchInput,
        blendInput,
        isTouchDevice,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.TouchControlsLogic = api;
    }
})(typeof window !== 'undefined' ? window : global);
