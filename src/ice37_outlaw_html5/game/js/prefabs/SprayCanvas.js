(function (globalScope) {
    'use strict';

    const GeometryModule = (typeof globalScope !== 'undefined' && globalScope.PaintSurfaceGeometry)
        ? globalScope.PaintSurfaceGeometry
        : (typeof require === 'function' ? require('../logic/paintSurfaceGeometry.js') : null);

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
         * @param {number} [config.worldWidth=1920] Full scrollable width of the painting world (single RT mode)
         * @param {number} [config.worldHeight=1080] Full height of the canvas (single RT mode)
         * @param {number} [config.worldOffsetX=0] Positive world offset for negative coordinate spaces (single RT mode)
         * @param {number} [config.depth=10] Display depth in scene layers
         * @param {Phaser.GameObjects.Image|null} [config.maskImage=null] Optional bitmap mask source (single RT mode)
         * @param {Object|null} [config.surfaceBounds=null] Mask-local bounds {x, y, width, height} (chunked surface mode)
         * @param {number} [config.chunkWidth=4096] Maximum horizontal chunk width in pixels
         * @param {string[]} [config.maskKeys=[]] Preloaded texture keys for mask chunks
         */
        constructor(scene, config = {}) {
            this.scene = scene;
            this.config = Object.assign({
                worldWidth: 1920,
                worldHeight: 1080,
                worldOffsetX: 0,
                depth: 10,
                maskImage: null,
                surfaceBounds: null,
                chunkWidth: 4096,
                maskKeys: [],
            }, config);

            this.worldOffsetX = Number(this.config.worldOffsetX) || 0;
            this.worldWidth = Number(this.config.worldWidth) || 1920;
            this.worldHeight = Number(this.config.worldHeight) || 1080;
            this.depth = Number(this.config.depth) || 10;

            // Defensive GPU texture dimension limit detection
            this.maxTextureSize = this.detectMaxTextureSize();

            this.isSurfaceMode = Boolean(this.config.surfaceBounds);
            this.surfaceBounds = this.config.surfaceBounds || null;
            this.chunkWidth = Number(this.config.chunkWidth) || 4096;
            this.maskKeys = Array.isArray(this.config.maskKeys) ? this.config.maskKeys : [];
            this.chunks = [];

            if (this.isSurfaceMode) {
                if (!GeometryModule) {
                    throw new Error('PaintSurfaceGeometry module is required for mask-local surface chunks mode');
                }
                const chunkGeometries = GeometryModule.createSurfaceChunks(
                    this.surfaceBounds,
                    this.maxTextureSize,
                    this.chunkWidth
                );

                if (this.maskKeys.length !== chunkGeometries.length) {
                    throw new Error(
                        `Mismatch between generated chunks count (${chunkGeometries.length}) and maskKeys length (${this.maskKeys.length})`
                    );
                }

                for (let i = 0; i < chunkGeometries.length; i++) {
                    const geom = chunkGeometries[i];
                    const maskKey = this.maskKeys[i];
                    let rt;
                    let maskImg;
                    let bitmapMask = null;

                    if (this.scene && this.scene.add && typeof this.scene.add.renderTexture === 'function') {
                        rt = this.scene.add.renderTexture(geom.worldX, geom.worldY, geom.width, geom.height);
                        if (rt.setOrigin) {
                            rt.setOrigin(0, 0);
                        }
                        if (rt.setDepth) {
                            rt.setDepth(this.depth);
                        }

                        if (typeof this.scene.add.image === 'function') {
                            maskImg = this.scene.add.image(geom.worldX, geom.worldY, maskKey);
                            if (maskImg.setOrigin) {
                                maskImg.setOrigin(0, 0);
                            }
                            if (maskImg.setVisible) {
                                maskImg.setVisible(false);
                            }
                            if (typeof maskImg.createBitmapMask === 'function') {
                                bitmapMask = maskImg.createBitmapMask();
                                if (rt.setMask) {
                                    rt.setMask(bitmapMask);
                                }
                            }
                        }
                    } else {
                        // Fallback mock representation for testing
                        rt = {
                            x: geom.worldX,
                            y: geom.worldY,
                            depth: this.depth,
                            width: geom.width,
                            height: geom.height,
                            originX: 0,
                            originY: 0,
                            drawCalls: [],
                            batchDrawCalls: [],
                            beginDrawCalls: 0,
                            endDrawCalls: 0,
                            clearCalls: 0,
                            destroyed: false,
                            setOrigin: function (ox, oy) { this.originX = ox; this.originY = oy; return this; },
                            setDepth: function (d) { this.depth = d; return this; },
                            setPosition: function (x, y) { this.x = x; this.y = y; return this; },
                            setMask: function (m) { this.mask = m; return this; },
                            clearMask: function () { this.mask = null; return this; },
                            draw: function (entry, x, y) { this.drawCalls.push({ entry, x, y }); return this; },
                            beginDraw: function () { this.beginDrawCalls++; return this; },
                            batchDraw: function (entry, x, y) { this.batchDrawCalls.push({ entry, x, y }); return this; },
                            endDraw: function () { this.endDrawCalls++; return this; },
                            clear: function () { this.clearCalls++; return this; },
                            destroy: function () { this.destroyed = true; return this; },
                        };
                        maskImg = {
                            x: geom.worldX,
                            y: geom.worldY,
                            key: maskKey,
                            originX: 0,
                            originY: 0,
                            visible: false,
                            destroyed: false,
                            setOrigin: function (ox, oy) { this.originX = ox; this.originY = oy; return this; },
                            setVisible: function (v) { this.visible = v; return this; },
                            setPosition: function (x, y) { this.x = x; this.y = y; return this; },
                            createBitmapMask: function () {
                                return {
                                    type: 'BitmapMask',
                                    image: this,
                                    destroyed: false,
                                    destroy: function () { this.destroyed = true; },
                                };
                            },
                            destroy: function () { this.destroyed = true; return this; },
                        };
                        bitmapMask = maskImg.createBitmapMask();
                        rt.setMask(bitmapMask);
                    }

                    this.chunks.push({
                        geometry: geom,
                        renderTexture: rt,
                        maskImage: maskImg,
                        bitmapMask,
                        isBatchOpen: false,
                    });
                }

                this.renderTexture = this.chunks.length > 0 ? this.chunks[0].renderTexture : null;
            } else {
                // Single-RenderTexture baseline path
                const textureWidth = Math.min(this.worldWidth, this.maxTextureSize);
                const textureHeight = Math.min(this.worldHeight, this.maxTextureSize);
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
         * Draws a single spray stamp directly into the RenderTexture(s).
         *
         * @param {number} worldX World-relative X coordinate
         * @param {number} worldY World-relative Y coordinate
         * @param {number} [nativeCap=10] Native cap diameter
         * @param {boolean} [isBatch=false] Whether this call is part of an open beginBatch/endBatch session
         */
        stamp(worldX, worldY, nativeCap = 10, isBatch = false) {
            if (this.isSurfaceMode) {
                if (!GeometryModule || !this.chunks.length) return;
                const radius = nativeCap / 2;
                const chunkGeoms = this.chunks.map(c => c.geometry);
                const targets = GeometryModule.getStampTargets(this.surfaceBounds, chunkGeoms, worldX, worldY, radius);
                for (let i = 0; i < targets.length; i++) {
                    const target = targets[i];
                    const chunk = this.chunks[target.chunkIndex];
                    if (chunk && chunk.renderTexture) {
                        if (isBatch && chunk.isBatchOpen && typeof chunk.renderTexture.batchDraw === 'function') {
                            chunk.renderTexture.batchDraw(this.sprayBrush, target.localX, target.localY);
                        } else if (typeof chunk.renderTexture.draw === 'function') {
                            chunk.renderTexture.draw(this.sprayBrush, target.localX, target.localY);
                        }
                    }
                }
                return;
            }

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
            if (this.isSurfaceMode) {
                for (let i = 0; i < this.chunks.length; i++) {
                    const chunk = this.chunks[i];
                    if (chunk.renderTexture && typeof chunk.renderTexture.beginDraw === 'function') {
                        chunk.renderTexture.beginDraw();
                        chunk.isBatchOpen = true;
                    }
                }
                this.isBatchOpen = true;
                return;
            }
            if (this.renderTexture && typeof this.renderTexture.beginDraw === 'function') {
                this.renderTexture.beginDraw();
                this.isBatchOpen = true;
            }
        }

        /**
         * Closes a GPU batch draw session and flushes vertices.
         */
        endBatch() {
            if (this.isSurfaceMode) {
                for (let i = 0; i < this.chunks.length; i++) {
                    const chunk = this.chunks[i];
                    if (chunk.isBatchOpen && chunk.renderTexture && typeof chunk.renderTexture.endDraw === 'function') {
                        chunk.renderTexture.endDraw();
                        chunk.isBatchOpen = false;
                    }
                }
                this.isBatchOpen = false;
                return;
            }
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

            if (this.isSurfaceMode) {
                if (!GeometryModule || !this.chunks.length) return;
                const radius = nativeCap / 2;
                const chunkGeoms = this.chunks.map(c => c.geometry);

                const touchedChunkIndices = new Set();
                for (let i = 0; i < points.length; i++) {
                    const targets = GeometryModule.getStampTargets(this.surfaceBounds, chunkGeoms, points[i].x, points[i].y, radius);
                    for (let t = 0; t < targets.length; t++) {
                        touchedChunkIndices.add(targets[t].chunkIndex);
                    }
                }

                if (touchedChunkIndices.size === 0) return;

                for (const idx of touchedChunkIndices) {
                    const chunk = this.chunks[idx];
                    if (chunk && chunk.renderTexture && typeof chunk.renderTexture.beginDraw === 'function') {
                        chunk.renderTexture.beginDraw();
                        chunk.isBatchOpen = true;
                    }
                }

                for (let i = 0; i < points.length; i++) {
                    this.stamp(points[i].x, points[i].y, nativeCap, true);
                }

                for (const idx of touchedChunkIndices) {
                    const chunk = this.chunks[idx];
                    if (chunk && chunk.renderTexture && typeof chunk.renderTexture.endDraw === 'function') {
                        chunk.renderTexture.endDraw();
                        chunk.isBatchOpen = false;
                    }
                }
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
            if (this.isSurfaceMode) {
                for (let i = 0; i < this.chunks.length; i++) {
                    const chunk = this.chunks[i];
                    const displayX = x + chunk.geometry.worldX;
                    const displayY = y + chunk.geometry.worldY;

                    if (chunk.renderTexture && typeof chunk.renderTexture.setPosition === 'function') {
                        chunk.renderTexture.setPosition(displayX, displayY);
                    }
                    if (chunk.maskImage && typeof chunk.maskImage.setPosition === 'function') {
                        chunk.maskImage.setPosition(displayX, displayY);
                    }
                }
                return;
            }

            if (this.renderTexture && typeof this.renderTexture.setPosition === 'function') {
                this.renderTexture.setPosition(x, y);
            }
        }

        /**
         * Clears the painting texture.
         */
        clear() {
            if (this.isSurfaceMode) {
                for (let i = 0; i < this.chunks.length; i++) {
                    const chunk = this.chunks[i];
                    if (chunk.renderTexture && typeof chunk.renderTexture.clear === 'function') {
                        chunk.renderTexture.clear();
                    }
                }
                return;
            }

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

            if (this.isSurfaceMode) {
                for (let i = 0; i < this.chunks.length; i++) {
                    const chunk = this.chunks[i];
                    if (chunk.isBatchOpen && chunk.renderTexture && typeof chunk.renderTexture.endDraw === 'function') {
                        chunk.renderTexture.endDraw();
                        chunk.isBatchOpen = false;
                    }
                    if (chunk.renderTexture) {
                        if (typeof chunk.renderTexture.clearMask === 'function') {
                            chunk.renderTexture.clearMask(true);
                        }
                        if (typeof chunk.renderTexture.destroy === 'function') {
                            chunk.renderTexture.destroy();
                        }
                        chunk.renderTexture = null;
                    }
                    if (chunk.bitmapMask && typeof chunk.bitmapMask.destroy === 'function') {
                        chunk.bitmapMask.destroy();
                        chunk.bitmapMask = null;
                    }
                    if (chunk.maskImage && typeof chunk.maskImage.destroy === 'function') {
                        chunk.maskImage.destroy();
                        chunk.maskImage = null;
                    }
                }
                this.chunks = [];
                this.renderTexture = null;
                return;
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
