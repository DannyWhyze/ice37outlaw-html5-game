/**
 * Lords of Brooklyn - Option 2 (HTML5 Phaser 3 Remake)
 * Hud Prefab (Player Health Bar & Police Skull)
 *
 * Implements the authentic Flash HUD display extracted from outlaw300_trainyard.swf
 * and outlaw300_street.swf:
 * - Health Bar (Shape 67, Sprite 68/90): 458x39 native HD gradient (red -> yellow -> green),
 *   dynamically cropped from left to right according to player health (0..100).
 * - Police Skull (Shape 69, Sprite 70 inside 166/183): 352% HD skull with blue police hat,
 *   scaled by 0.10 and anchored at Flash relative coordinates (-23.74, 39.03) px.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        const cls = factory();
        module.exports = cls;
        module.exports.Hud = cls;
    } else {
        root.Hud = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {

    const FLASH_HUD_X = 10.0;
    const FLASH_HUD_Y = 10.0;
    const FLASH_SKULL_OFFSET_X = -6.75;
    const FLASH_SKULL_OFFSET_Y = 11.10; // (25.0 - 10.0 - 3.9) Flash units
    const FLASH_SCORE_OFFSET_X = 43.40;
    const FLASH_SCORE_OFFSET_Y = 19.15; // (25.0 - 10.0 + 4.15) Flash units
    const FLASH_SCORE_FONT_SIZE = 24.0;

    const HEALTH_BAR_WIDTH = 458;
    const HEALTH_BAR_HEIGHT = 39;
    const SKULL_SCALE = 0.10;
    const DEFAULT_DEPTH = 150;

    class Hud {
        /**
         * @param {Phaser.Scene} scene
         * @param {object} player Player prefab instance
         * @param {object} [options]
         */
        constructor(scene, player = null, options = {}) {
            this.scene = scene;
            this.player = player;
            this.depth = options.depth !== undefined ? options.depth : DEFAULT_DEPTH;

            const scaleS = scene.scaleS !== undefined ? scene.scaleS : (1920 / 546);
            const offsetY = scene.offsetY !== undefined ? scene.offsetY : ((1080 - 300 * scaleS) / 2);

            this.rootX = options.x !== undefined ? options.x : (FLASH_HUD_X * scaleS);
            this.rootY = options.y !== undefined ? options.y : (FLASH_HUD_Y * scaleS + offsetY);

            this.skullOffsetX = options.skullOffsetX !== undefined ? options.skullOffsetX : (FLASH_SKULL_OFFSET_X * scaleS);
            this.skullOffsetY = options.skullOffsetY !== undefined ? options.skullOffsetY : (FLASH_SKULL_OFFSET_Y * scaleS);

            this.scoreOffsetX = options.scoreOffsetX !== undefined ? options.scoreOffsetX : (FLASH_SCORE_OFFSET_X * scaleS);
            this.scoreOffsetY = options.scoreOffsetY !== undefined ? options.scoreOffsetY : (FLASH_SCORE_OFFSET_Y * scaleS);
            this.scoreFontSize = options.fontSize !== undefined ? options.fontSize : Math.round(FLASH_SCORE_FONT_SIZE * scaleS);

            this.currentHealth = player && player.health !== undefined ? player.health : 100;
            this.maxHealth = player && player.maxHealth !== undefined ? player.maxHealth : 100;
            this.currentVisibleWidth = HEALTH_BAR_WIDTH;

            // Score initialization (reads from options, scene.copSpawner.copkill, or scene.registry)
            this.currentScore = 0;
            if (options.score !== undefined) {
                this.currentScore = Math.max(0, Number(options.score) || 0);
            } else if (scene && scene.copSpawner && typeof scene.copSpawner.copkill === 'number') {
                this.currentScore = scene.copSpawner.copkill;
            } else if (scene && scene.registry && typeof scene.registry.get === 'function') {
                const regScore = scene.registry.get('copkill');
                if (typeof regScore === 'number') {
                    this.currentScore = regScore;
                }
            }

            this.create();
        }

        create() {
            this.container = this.scene.add.container(this.rootX, this.rootY).setDepth(this.depth);

            // 1. Health Bar (Shape 67, 458x39 native HD)
            this.healthBar = this.scene.add.image(0, 0, 'hud_health_bar')
                .setOrigin(0, 0);

            // 2. Police Skull (Shape 69, 1313x1241 native HD, scaled 0.10)
            this.skull = this.scene.add.image(this.skullOffsetX, this.skullOffsetY, 'hud_skull')
                .setOrigin(0, 0)
                .setScale(SKULL_SCALE);

            // 3. Score Counter Text (_global.copkill, Font Typist)
            const style = {
                fontFamily: "'Typist', monospace",
                fontSize: `${this.scoreFontSize}px`,
                color: '#FFFFFF',
                align: 'left'
            };

            if (this.scene && this.scene.add && typeof this.scene.add.text === 'function') {
                this.scoreText = this.scene.add.text(this.scoreOffsetX, this.scoreOffsetY, String(this.currentScore), style)
                    .setOrigin(0, 0);
            } else {
                // Defensive fallback for test runners / mocks
                this.scoreText = {
                    x: this.scoreOffsetX,
                    y: this.scoreOffsetY,
                    text: String(this.currentScore),
                    style,
                    originX: 0,
                    originY: 0,
                    setText(t) { this.text = String(t); return this; },
                    setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
                    setVisible(v) { this.visible = v; return this; }
                };
            }

            this.container.add([this.healthBar, this.skull, this.scoreText]);

            // Initial health crop
            this.setHealth(this.currentHealth, this.maxHealth);
        }

        /**
         * Updates the visible health crop based on current / max health.
         * @param {number} currentHealth
         * @param {number} [maxHealth]
         * @returns {Hud}
         */
        setHealth(currentHealth, maxHealth = this.maxHealth) {
            this.maxHealth = Math.max(1, maxHealth);
            this.currentHealth = Math.max(0, Math.min(currentHealth, this.maxHealth));

            const pct = this.currentHealth / this.maxHealth;
            this.currentVisibleWidth = Math.round(HEALTH_BAR_WIDTH * pct);

            if (this.healthBar) {
                if (typeof this.healthBar.setCrop === 'function') {
                    this.healthBar.setCrop(0, 0, this.currentVisibleWidth, HEALTH_BAR_HEIGHT);
                } else {
                    // Fallback for mocks/tests
                    this.healthBar.cropWidth = this.currentVisibleWidth;
                }
            }

            return this;
        }

        /**
         * Updates the score text display.
         * @param {number} score
         * @returns {Hud}
         */
        setScore(score) {
            this.currentScore = Math.max(0, Number(score) || 0);
            if (this.scoreText && typeof this.scoreText.setText === 'function') {
                this.scoreText.setText(String(this.currentScore));
            }
            return this;
        }

        /**
         * Frame update cycle - synchronizes with player and score sources.
         */
        update() {
            if (this.player) {
                if (this.player.health !== this.currentHealth || this.player.maxHealth !== this.maxHealth) {
                    this.setHealth(this.player.health, this.player.maxHealth);
                }
            }

            // Sync score from scene copSpawner or registry
            let latestScore = null;
            if (this.scene) {
                if (this.scene.copSpawner && typeof this.scene.copSpawner.copkill === 'number') {
                    latestScore = this.scene.copSpawner.copkill;
                } else if (this.scene.registry && typeof this.scene.registry.get === 'function') {
                    const regScore = this.scene.registry.get('copkill');
                    if (typeof regScore === 'number') {
                        latestScore = regScore;
                    }
                }
            }
            if (latestScore !== null && latestScore !== this.currentScore) {
                this.setScore(latestScore);
            }
        }

        /**
         * Cleans up all HUD GameObjects.
         */
        destroy() {
            if (this.container) {
                this.container.destroy();
                this.container = null;
            }
            this.healthBar = null;
            this.skull = null;
            this.scoreText = null;
        }
    }

    Hud.HEALTH_BAR_WIDTH = HEALTH_BAR_WIDTH;
    Hud.HEALTH_BAR_HEIGHT = HEALTH_BAR_HEIGHT;
    Hud.SKULL_SCALE = SKULL_SCALE;
    Hud.DEFAULT_DEPTH = DEFAULT_DEPTH;
    Hud.FLASH_SCORE_OFFSET_X = FLASH_SCORE_OFFSET_X;
    Hud.FLASH_SCORE_OFFSET_Y = FLASH_SCORE_OFFSET_Y;
    Hud.FLASH_SCORE_FONT_SIZE = FLASH_SCORE_FONT_SIZE;

    return Hud;
}));
