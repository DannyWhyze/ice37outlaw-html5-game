(function (globalScope) {
    'use strict';

    /**
     * Blende Prefab
     *
     * Authentic reproduction of the Flash full-screen screen transition overlay ('blende', DefineSprite_2 / DefineSprite_5).
     * Used for smooth scene transitions (fade to black and fade in) and player death transitions back to MenuScene.
     * Rendered at depth 500 across 1080p native stage.
     */
    class Blende {
        /**
         * @param {Phaser.Scene} scene
         * @param {Object} [options]
         * @param {number} [options.depth=500]
         * @param {number} [options.width=1920]
         * @param {number} [options.height=1056]
         */
        constructor(scene, options = {}) {
            this.scene = scene;
            this.depth = options.depth !== undefined ? options.depth : 500;
            this.stageWidth = options.width || 1920;
            this.stageHeight = options.height || 1056;

            const offsetY = (scene && scene.offsetY !== undefined) ? scene.offsetY : 0;
            this.y = offsetY;
            this.x = 0;

            this.image = scene.add.image(this.x, this.y, 'blende')
                .setOrigin(0, 0)
                .setDepth(this.depth)
                .setAlpha(0)
                .setVisible(false);

            if (this.image.setDisplaySize) {
                this.image.setDisplaySize(this.stageWidth, this.stageHeight);
            }

            this.isFading = false;
        }

        /**
         * Fades the screen to black (Alpha 0 -> 1).
         * Matches Flash frames 3..9 (7 frames @ 25 FPS = 280 ms).
         *
         * @param {number} [duration=280] Transition duration in milliseconds
         * @param {Function} [onComplete] Callback when fade to black is finished
         */
        fadeOut(duration = 280, onComplete = null) {
            this.isFading = true;
            this.image.setVisible(true);

            if (this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function') {
                this.scene.tweens.add({
                    targets: this.image,
                    alpha: 1,
                    duration,
                    ease: 'Linear',
                    onComplete: () => {
                        this.isFading = false;
                        if (typeof onComplete === 'function') {
                            onComplete();
                        }
                    },
                });
            } else {
                // Headless test / immediate fallback
                this.image.setAlpha(1);
                this.isFading = false;
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }
            return this;
        }

        /**
         * Fades the screen from black to transparent (Alpha 1 -> 0).
         *
         * @param {number} [duration=280] Transition duration in milliseconds
         * @param {Function} [onComplete] Callback when fade in is finished
         */
        fadeIn(duration = 280, onComplete = null) {
            this.isFading = true;
            this.image.setVisible(true);
            this.image.setAlpha(1);

            if (this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function') {
                this.scene.tweens.add({
                    targets: this.image,
                    alpha: 0,
                    duration,
                    ease: 'Linear',
                    onComplete: () => {
                        this.image.setVisible(false);
                        this.isFading = false;
                        if (typeof onComplete === 'function') {
                            onComplete();
                        }
                    },
                });
            } else {
                // Headless test / immediate fallback
                this.image.setAlpha(0);
                this.image.setVisible(false);
                this.isFading = false;
                if (typeof onComplete === 'function') {
                    onComplete();
                }
            }
            return this;
        }

        /**
         * Cleans up display object.
         */
        destroy() {
            if (this.image) {
                this.image.destroy();
                this.image = null;
            }
            this.scene = null;
        }
    }

    globalScope.Blende = Blende;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Blende;
        module.exports.Blende = Blende;
    }
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)));
