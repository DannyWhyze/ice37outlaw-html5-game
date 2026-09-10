(function attachTouchBrushReticle(globalScope) {
    'use strict';

    const TouchPointerMode = (typeof globalScope.TouchPointerMode !== 'undefined')
        ? globalScope.TouchPointerMode
        : (typeof require !== 'undefined' ? (function() {
            try { return require('../logic/touchPointerMode.js'); } catch (_) { return null; }
        })() : null);

    function createMockGraphics() {
        const dummy = {
            depth: 201,
            visible: true,
            clear: () => dummy,
            lineStyle: () => dummy,
            strokeCircle: () => dummy,
            lineBetween: () => dummy,
            fillStyle: () => dummy,
            fillCircle: () => dummy,
            setVisible: () => dummy,
            setDepth: () => dummy,
            destroy: () => dummy,
        };
        return dummy;
    }

    class TouchBrushReticle {
        /**
         * @param {Phaser.Scene} scene
         * @param {Object} [options]
         * @param {number} [options.depth=201]
         */
        constructor(scene, options = {}) {
            this.scene = scene;
            this.depth = options.depth !== undefined ? Number(options.depth) : 201;
            this.isVisible = false;

            if (scene && scene.add && typeof scene.add.graphics === 'function') {
                this.graphics = scene.add.graphics().setDepth(this.depth);
                if (typeof this.graphics.setVisible === 'function') {
                    this.graphics.setVisible(false);
                }
            } else {
                this.graphics = createMockGraphics();
            }
        }

        /**
         * Renders the high-contrast dual-stroke brush reticle at world coordinates.
         *
         * @param {number} worldX
         * @param {number} worldY
         * @param {number} cap Flash cap size (5, 15, 25)
         * @param {number} color Active spray color (hex)
         * @param {number} [zoom=1.0] Camera zoom level
         */
        show(worldX, worldY, cap, color, zoom = 1.0) {
            if (!this.graphics) return;

            const safeZoom = Number(zoom) > 0 ? Number(zoom) : 1.0;
            const geom = TouchPointerMode
                ? TouchPointerMode.calculateReticleGeometry(cap, safeZoom, color)
                : {
                    worldRadius: (Number(cap) || 5) * (1920 / 546) / 2,
                    innerColor: Number(color) || 0x000000,
                    outerColor: 0x000000,
                    outerAlpha: 0.65,
                    innerAlpha: 0.95,
                    strokeWidth: 2.0 / safeZoom,
                    crosshairLength: 6.0 / safeZoom,
                    centerDotRadius: 2.0 / safeZoom,
                };

            const r = geom.worldRadius;
            const vr = geom.visualRadius || r;
            const chLen = geom.crosshairLength;

            if (typeof this.graphics.clear === 'function') {
                this.graphics.clear();

                // 1. Outer high-contrast black outline
                this.graphics.lineStyle(geom.strokeWidth + (1.5 / safeZoom), geom.outerColor, geom.outerAlpha);
                this.graphics.strokeCircle(worldX, worldY, r);

                // 2. Inner vibrant spray-colored ring
                this.graphics.lineStyle(geom.strokeWidth, geom.innerColor, geom.innerAlpha);
                this.graphics.strokeCircle(worldX, worldY, r);

                // Subtle outer guide ring if visualRadius > worldRadius (small caps)
                if (vr > r) {
                    this.graphics.lineStyle(1.5 / safeZoom, geom.outerColor, 0.4);
                    this.graphics.strokeCircle(worldX, worldY, vr);
                }

                // 3. 4 Extended Crosshair ticks on the perimeter
                const tickExt = Math.max(chLen, 10.0 / safeZoom);
                // Top
                this.graphics.lineStyle(geom.strokeWidth + (1.5 / safeZoom), geom.outerColor, geom.outerAlpha);
                this.graphics.lineBetween(worldX, worldY - r, worldX, worldY - r - tickExt);
                this.graphics.lineBetween(worldX, worldY + r, worldX, worldY + r + tickExt);
                this.graphics.lineBetween(worldX - r, worldY, worldX - r - tickExt, worldY);
                this.graphics.lineBetween(worldX + r, worldY, worldX + r + tickExt, worldY);

                this.graphics.lineStyle(geom.strokeWidth, geom.innerColor, geom.innerAlpha);
                this.graphics.lineBetween(worldX, worldY - r, worldX, worldY - r - tickExt);
                this.graphics.lineBetween(worldX, worldY + r, worldX, worldY + r + tickExt);
                this.graphics.lineBetween(worldX - r, worldY, worldX - r - tickExt, worldY);
                this.graphics.lineBetween(worldX + r, worldY, worldX + r + tickExt, worldY);

                // 4. Center target dot
                this.graphics.fillStyle(0xffffff, 0.95);
                this.graphics.fillCircle(worldX, worldY, geom.centerDotRadius);
            }

            if (typeof this.graphics.setVisible === 'function') {
                this.graphics.setVisible(true);
            }
            this.isVisible = true;
        }

        /**
         * Clears and hides the reticle.
         */
        hide() {
            if (this.graphics) {
                if (typeof this.graphics.clear === 'function') {
                    this.graphics.clear();
                }
                if (typeof this.graphics.setVisible === 'function') {
                    this.graphics.setVisible(false);
                }
            }
            this.isVisible = false;
        }

        destroy() {
            if (this.graphics && typeof this.graphics.destroy === 'function') {
                this.graphics.destroy();
            }
            this.graphics = null;
        }
    }

    const api = { TouchBrushReticle };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.TouchBrushReticle = TouchBrushReticle;
    }
})(typeof window !== 'undefined' ? window : global);
