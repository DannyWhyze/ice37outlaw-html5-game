/**
 * Lords of Brooklyn - Option 2 (HTML5 Phaser 3 Remake)
 * PlayerControls Logic Module
 *
 * Centralized keyboard input mapping for the Player prefab:
 * - Primary Controls: WASD
 *   - A: Walk Left
 *   - D: Walk Right
 *   - W: Boxing / Punch
 *   - S: Kick
 * - Secondary Controls: Arrow Keys
 *   - ArrowLeft: Walk Left
 *   - ArrowRight: Walk Right
 *   - ArrowUp: Boxing / Punch
 *   - ArrowDown: Kick
 *
 * Provides getInputState(isBlocked) returning normalized intent:
 * { isMovingLeft, isMovingRight, isBoxingDown, isKickDown }
 */

(function attachPlayerControls(globalScope) {
    'use strict';

    class PlayerControls {
        /**
         * @param {Phaser.Scene} scene
         * @param {object} [options]
         */
        constructor(scene, options = {}) {
            this.scene = scene;
            this.enabled = options.enabled !== undefined ? Boolean(options.enabled) : true;

            this.cursors = null;
            this.keyA = null;
            this.keyD = null;
            this.keyW = null;
            this.keyS = null;
            this.keyUp = null;
            this.keyDown = null;

            if (scene && scene.input && scene.input.keyboard) {
                const keyboard = scene.input.keyboard;
                const KeyCodes = (typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.KeyCodes)
                    ? Phaser.Input.Keyboard.KeyCodes
                    : { A: 65, D: 68, W: 87, S: 83, LEFT: 37, RIGHT: 39, UP: 38, DOWN: 40 };

                if (typeof keyboard.createCursorKeys === 'function') {
                    this.cursors = keyboard.createCursorKeys();
                }

                if (typeof keyboard.addKey === 'function') {
                    this.keyA = keyboard.addKey(KeyCodes.A || 65);
                    this.keyD = keyboard.addKey(KeyCodes.D || 68);
                    this.keyW = keyboard.addKey(KeyCodes.W || 87);
                    this.keyS = keyboard.addKey(KeyCodes.S || 83);
                    this.keyUp = keyboard.addKey(KeyCodes.UP || 38);
                    this.keyDown = keyboard.addKey(KeyCodes.DOWN || 40);
                }
            }
        }

        /**
         * Returns normalized input state.
         * @param {boolean} [isBlocked=false] If true (e.g. Photo Mode / Menu), all inputs evaluate to false.
         * @returns {{ isMovingLeft: boolean, isMovingRight: boolean, isBoxingDown: boolean, isKickDown: boolean }}
         */
        getInputState(isBlocked = false) {
            if (isBlocked || !this.enabled) {
                return {
                    isMovingLeft: false,
                    isMovingRight: false,
                    isBoxingDown: false,
                    isKickDown: false,
                };
            }

            const leftDown = Boolean(
                (this.cursors && this.cursors.left && this.cursors.left.isDown) ||
                (this.keyA && this.keyA.isDown)
            );
            const rightDown = Boolean(
                (this.cursors && this.cursors.right && this.cursors.right.isDown) ||
                (this.keyD && this.keyD.isDown)
            );

            // Left movement takes precedence when both directions are pressed (authentic Flash AS2 behavior)
            const isMovingLeft = leftDown;
            const isMovingRight = !isMovingLeft && rightDown;

            const isBoxingDown = Boolean(
                (this.keyW && this.keyW.isDown) ||
                (this.keyUp && this.keyUp.isDown) ||
                (this.cursors && this.cursors.up && this.cursors.up.isDown)
            );
            const isKickDown = Boolean(
                (this.keyS && this.keyS.isDown) ||
                (this.keyDown && this.keyDown.isDown) ||
                (this.cursors && this.cursors.down && this.cursors.down.isDown)
            );

            return {
                isMovingLeft,
                isMovingRight,
                isBoxingDown,
                isKickDown,
            };
        }

        destroy() {
            this.cursors = null;
            this.keyA = null;
            this.keyD = null;
            this.keyW = null;
            this.keyS = null;
            this.keyUp = null;
            this.keyDown = null;
            this.scene = null;
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { PlayerControls };
    } else {
        globalScope.PlayerControls = PlayerControls;
    }
})(typeof window !== 'undefined' ? window : global);
