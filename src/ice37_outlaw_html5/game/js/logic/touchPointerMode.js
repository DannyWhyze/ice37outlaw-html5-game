(function attachTouchPointerMode(globalScope) {
    'use strict';

    const NATIVE_SCALE = 1920 / 546;

    /**
     * Determines whether the primary pointing device is coarse (touchscreen / mobile).
     * Uses standard W3C CSS Media Query '(pointer: coarse)' and mobile User Agent fallback.
     *
     * @param {Window} [win]
     * @param {Navigator} [nav]
     * @returns {boolean}
     */
    function isCoarsePointer(win, nav) {
        const targetWindow = win || (typeof window !== 'undefined' ? window : null);
        const targetNav = nav || (typeof navigator !== 'undefined' ? navigator : null);

        if (!targetWindow) {
            return false;
        }

        // Primary W3C Media Query check: coarse pointer indicates touchscreen / finger input
        if (typeof targetWindow.matchMedia === 'function') {
            try {
                const coarseQuery = targetWindow.matchMedia('(pointer: coarse)');
                if (coarseQuery && typeof coarseQuery.matches === 'boolean') {
                    return coarseQuery.matches;
                }
            } catch (_) {}
        }

        // Secondary fallback: Mobile User Agent string
        if (targetNav && typeof targetNav.userAgent === 'string') {
            const ua = targetNav.userAgent;
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolves whether the current pointer event should be treated as a touch interaction.
     *
     * @param {Object} pointer
     * @param {boolean} [defaultCoarse=false]
     * @returns {boolean}
     */
    function isTouchPointerEvent(pointer, defaultCoarse = undefined) {
        const fallbackCoarse = defaultCoarse !== undefined ? Boolean(defaultCoarse) : isCoarsePointer();
        if (!pointer) {
            return fallbackCoarse;
        }
        if (pointer.wasTouch === true || pointer.pointerType === 'touch') {
            return true;
        }
        if (pointer.pointerType === 'mouse' && pointer.wasTouch === false) {
            return false;
        }
        return fallbackCoarse;
    }

    const TOUCH_DRAW_OFFSET_Y = -65;

    /**
     * Calculates native brush reticle radius, coordinates and contrast styling for Phaser Graphics.
     *
     * @param {number} cap Flash cap size (e.g. 5 for skinny, 15 for fat, 25 for roller)
     * @param {number} [zoom=1.0] Camera zoom level
     * @param {number} [color=0x000000] Active spray color (hex)
     * @returns {{ worldRadius: number, visualRadius: number, innerColor: number, outerColor: number, crosshairLength: number, centerDotRadius: number }}
     */
    function calculateReticleGeometry(cap, zoom = 1.0, color = 0x000000) {
        const safeCap = Number(cap) > 0 ? Number(cap) : 5;
        const safeZoom = Number(zoom) > 0 ? Number(zoom) : 1.0;
        const worldRadius = (safeCap * NATIVE_SCALE) / 2;
        const visualRadius = Math.max(worldRadius, 28.0 / safeZoom);

        return {
            worldRadius,
            visualRadius,
            innerColor: Number(color) || 0x000000,
            outerColor: 0x000000,
            outerAlpha: 0.75,
            innerAlpha: 0.95,
            strokeWidth: 2.0 / safeZoom,
            crosshairLength: Math.max(12.0, visualRadius * 0.45) / safeZoom,
            centerDotRadius: 3.0 / safeZoom,
        };
    }

    const api = {
        NATIVE_SCALE,
        TOUCH_DRAW_OFFSET_Y,
        isCoarsePointer,
        isTouchPointerEvent,
        calculateReticleGeometry,
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.TouchPointerMode = api;
    }
})(typeof window !== 'undefined' ? window : global);
