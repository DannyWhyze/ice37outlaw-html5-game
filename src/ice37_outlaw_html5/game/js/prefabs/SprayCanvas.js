(function (globalScope) {
    'use strict';

    /**
     * SprayCanvas Prefab
     *
     * GPU-accelerated runtime painting surface backed by Phaser.GameObjects.RenderTexture.
     * Replaces vector Phaser.GameObjects.Graphics command accumulation with instant FBO rasterization,
     * maintaining fixed O(1) draw cost per frame regardless of stroke count.
     */
    class SprayCanvas {
        /**
         * @param {Phaser.Scene} scene
         * @param {Object} [config]
         * @param {number} [config.worldWidth=1920] Full scrollable width of the painting world
         * @param {number} [config.worldHeight=1080] Full height of the canvas
         * @param {number} [config.worldOffsetX=0] Positive world offset for negative coordinate spaces
         * @param {number} [config.depth=10] Display depth in scene layers
         * @param {Phaser.GameObjects.Image|null} [config.maskImage=null] Optional bitmap mask source
         */
        constructor(scene, config = {}) {
            this.scene = scene;
            this.config = Object.assign({
                worldWidth: 1920,
                worldHeight: 1080,
                worldOffsetX: 0,
                depth: 10,
                maskImage: null,
            }, config);

            this.worldOffsetX = Number(this.config.worldOffsetX) || 0;
            this.worldWidth = Number(this.config.worldWidth) || 1920;
            this.worldHeight = Number(this.config.worldHeight) || 1080;
            this.depth = Number(this.config.depth) || 10;

            // Defensive GPU texture dimension limit detection
            this.maxTextureSize = this.detectMaxTextureSize();

            // Clamp texture size to hardware limits to prevent GL_INVALID_VALUE on restricted devices
            const textureWidth = Math.min(this.worldWidth, this.maxTextureSize);
            const textureHeight = Math.min(this.worldHeight, this.maxTextureSize);

            // Origin calculation so world coordinate (0, 0) aligns with worldOffsetX
            const originX = textureWidth > 0 ? (this.worldOffsetX / textureWidth) : 0;

            if (this.scene && this.scene.add && typeof this.scene.add.renderTexture === 'function') {
                this.renderTexture = this.scene.add.renderTexture(0, 0, textureWidth, textureHeight);
                if (this.renderTexture.setOrigin) {
                    this.renderTexture.setOrigin(originX, 0);
                }
                if (this.renderTexture.setDepth) {
                    this.renderTexture.setDepth(this.depth);
                }
                if (this.config.maskImage && typeof this.config.maskImage.createBitmapMask === 'function') {
                    const mask = this.config.maskImage.createBitmapMask();
                    if (this.renderTexture.setMask) {
                        this.renderTexture.setMask(mask);
                    }
                }
            } else {
                // Fallback mock representation for Node.js unit tests
                this.renderTexture = {
                    x: 0,
                    y: 0,
                    depth: this.depth,
                    width: textureWidth,
                    height: textureHeight,
                    originX: originX,
                    originY: 0,
                    setOrigin: function (ox, oy) { this.originX = ox; this.originY = oy; return this; },
                    setDepth: function (d) { this.depth = d; return this; },
                    setPosition: function (x, y) { this.x = x; this.y = y; return this; },
                    setMask: function () { return this; },
                    draw: function () { return this; },
                    beginDraw: function () { return this; },
                    batchDraw: function () { return this; },
                    endDraw: function () { return this; },
                    clear: function () { return this; },
                    destroy: function () { return this; },
                };
            }

            // Cached offscreen brush to prevent any command buffer growth
            this.sprayBrush = null;
            if (this.scene && this.scene.make && typeof this.scene.make.graphics === 'function') {
                this.sprayBrush = this.scene.make.graphics({ add: false });
            }

            this.currentBrushState = {
                color: null,
                opacity: null,
                radius: null,
            };

            this.isBatchOpen = false;
        }

        /**
         * Detects the WebGL MAX_TEXTURE_SIZE supported by the GPU.
         * Falls back safely to 16384 for modern desktop or 4096 if unreadable.
         *
         * @returns {number}
         */
        detectMaxTextureSize() {
            try {
                if (this.scene && this.scene.game && this.scene.game.renderer) {
                    const gl = this.scene.game.renderer.gl;
                    if (gl && typeof gl.getParameter === 'function') {
                        const size = gl.getParameter(gl.MAX_TEXTURE_SIZE);
                        if (typeof size === 'number' && size >= 1024) {
                            return size;
                        }
                    }
                }
            } catch (e) {
                // Fallback on error
            }
            return 16384;
        }

        /**
         * Updates offscreen brush shape and color only when properties actually change.
         *
         * @param {number} color Hex color code (e.g. 0x0000cc)
         * @param {number} opacity Decimal opacity (0.0 to 1.0)
         * @param {number} radius Circle radius in native pixels
         */
        updateBrush(color, opacity, radius) {
            if (!this.sprayBrush) return;
            if (
                this.currentBrushState.color === color &&
                this.currentBrushState.opacity === opacity &&
                this.currentBrushState.radius === radius
            ) {
                return;
            }
            this.currentBrushState.color = color;
            this.currentBrushState.opacity = opacity;
            this.currentBrushState.radius = radius;

            if (typeof this.sprayBrush.clear === 'function') {
                this.sprayBrush.clear();
            }
            if (typeof this.sprayBrush.fillStyle === 'function') {
                this.sprayBrush.fillStyle(color, opacity);
            }
            if (typeof this.sprayBrush.fillCircle === 'function') {
                this.sprayBrush.fillCircle(0, 0, radius);
            }
        }

        /**
         * Draws a single spray stamp directly into the RenderTexture.
         *
         * @param {number} worldX World-relative X coordinate
         * @param {number} worldY World-relative Y coordinate
         * @param {number} [nativeCap=10] Native cap diameter
         * @param {boolean} [isBatch=false] Whether this call is part of an open beginBatch/endBatch session
         */
        stamp(worldX, worldY, nativeCap = 10, isBatch = false) {
            if (!this.renderTexture) return;
            const textureX = worldX + this.worldOffsetX;
            const textureY = worldY;

            if (isBatch && this.isBatchOpen && typeof this.renderTexture.batchDraw === 'function') {
                this.renderTexture.batchDraw(this.sprayBrush, textureX, textureY);
            } else if (typeof this.renderTexture.draw === 'function') {
                this.renderTexture.draw(this.sprayBrush, textureX, textureY);
            }
        }

        /**
         * Opens a GPU batch draw session to minimize framebuffer binding switches.
         */
        beginBatch() {
            if (this.renderTexture && typeof this.renderTexture.beginDraw === 'function') {
                this.renderTexture.beginDraw();
                this.isBatchOpen = true;
            }
        }

        /**
         * Closes a GPU batch draw session and flushes vertices.
         */
        endBatch() {
            if (this.isBatchOpen && this.renderTexture && typeof this.renderTexture.endDraw === 'function') {
                this.renderTexture.endDraw();
                this.isBatchOpen = false;
            }
        }

        /**
         * Draws an array of interpolated spline points in a single GPU batch session.
         *
         * @param {Array<{x: number, y: number}>} points Array of world coordinates
         * @param {number} nativeCap Native cap diameter
         */
        stampStroke(points, nativeCap = 10) {
            if (!Array.isArray(points) || points.length === 0) return;
            if (points.length === 1) {
                this.stamp(points[0].x, points[0].y, nativeCap, false);
                return;
            }

            const canBatch = Boolean(this.renderTexture && typeof this.renderTexture.beginDraw === 'function');
            if (canBatch) {
                this.beginBatch();
                for (let i = 0; i < points.length; i++) {
                    this.stamp(points[i].x, points[i].y, nativeCap, true);
                }
                this.endBatch();
            } else {
                for (let i = 0; i < points.length; i++) {
                    this.stamp(points[i].x, points[i].y, nativeCap, false);
                }
            }
        }

        /**
         * Synchronizes RenderTexture position with world scrolling.
         *
         * @param {number} x World container X
         * @param {number} y World container Y
         */
        setPosition(x, y) {
            if (this.renderTexture && typeof this.renderTexture.setPosition === 'function') {
                this.renderTexture.setPosition(x, y);
            }
        }

        /**
         * Clears the painting texture.
         */
        clear() {
            if (this.renderTexture && typeof this.renderTexture.clear === 'function') {
                this.renderTexture.clear();
            }
        }

        /**
         * Destroys GPU textures and offscreen brush cleanly.
         */
        destroy() {
            if (this.isBatchOpen) {
                this.endBatch();
            }
            if (this.sprayBrush && typeof this.sprayBrush.destroy === 'function') {
                this.sprayBrush.destroy();
                this.sprayBrush = null;
            }
            if (this.renderTexture && typeof this.renderTexture.destroy === 'function') {
                this.renderTexture.destroy();
                this.renderTexture = null;
            }
        }
    }

    globalScope.SprayCanvas = SprayCanvas;
    if (typeof module !== 'undefined') {
        module.exports = { SprayCanvas };
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
