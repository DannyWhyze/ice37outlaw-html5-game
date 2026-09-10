(function attachTouchControlsPrefab(globalScope) {
    'use strict';

    const TouchControlsLogic = (typeof globalScope.TouchControlsLogic !== 'undefined')
        ? globalScope.TouchControlsLogic
        : (typeof require !== 'undefined' ? require('../logic/touchControlsLogic.js') : null);

    function createMockDisplayObject() {
        const dummy = {
            setStrokeStyle: () => dummy,
            setFillStyle: () => dummy,
            setColor: () => dummy,
            setOrigin: () => dummy,
            setPosition: () => dummy,
            setVisible: () => dummy,
            setDepth: () => dummy,
            setInteractive: () => dummy,
            on: () => dummy,
            destroy: () => dummy,
        };
        return dummy;
    }

    class TouchControls {
        /**
         * @param {Phaser.Scene} scene
         * @param {Object} [options]
         * @param {boolean} [options.visible] Explicit visibility override
         * @param {boolean} [options.autoDetect=true] Automatically show only on touch-capable devices
         */
        constructor(scene, options = {}) {
            this.scene = scene;
            this.autoDetect = options.autoDetect !== undefined ? Boolean(options.autoDetect) : true;

            const detectedTouch = TouchControlsLogic ? TouchControlsLogic.isTouchDevice() : false;
            this.isEnabled = (options.visible !== undefined)
                ? Boolean(options.visible)
                : (this.autoDetect ? detectedTouch : true);
            this.isPaused = Boolean(options.paused);

            this.isMovingLeft = false;
            this.isMovingRight = false;
            this.isBoxingDown = false;
            this.isKickDown = false;
            this.activeMovePointerId = null;

            const layout = TouchControlsLogic ? TouchControlsLogic.LAYOUT : {
                moveZone: { minX: 40, maxX: 440, minY: 820, maxY: 1060, splitX: 240, deadzone: 15 },
                buttons: {
                    left: { centerX: 160, centerY: 940, width: 120, height: 120 },
                    right: { centerX: 320, centerY: 940, width: 120, height: 120 },
                    box: { centerX: 1600, centerY: 940, width: 120, height: 120 },
                    kick: { centerX: 1760, centerY: 940, width: 120, height: 120 },
                },
            };
            this.layout = layout;

            // Root UI Container on Layer 3 (depth 250)
            if (scene && scene.add && typeof scene.add.container === 'function') {
                this.container = scene.add.container(0, 0).setDepth(250);
                if (typeof this.container.setVisible === 'function') {
                    this.container.setVisible(this.isVisible);
                }
            } else {
                this.container = {
                    add: () => {},
                    setVisible: () => {},
                    destroy: () => {},
                    children: [],
                };
            }

            // Create buttons & visuals
            this.elements = {};
            this.createMovementControls(scene, layout);
            this.createCombatControls(scene, layout);

            this.children = (this.container && this.container.children) ? this.container.children : [];

            // Dev toggle key (V key)
            this.toggleKey = null;
            if (scene && scene.input && scene.input.keyboard && typeof scene.input.keyboard.addKey === 'function') {
                const KeyCodes = (typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.KeyCodes)
                    ? Phaser.Input.Keyboard.KeyCodes
                    : { V: 86 };
                const vCode = KeyCodes.V || 86;
                this.toggleKey = scene.input.keyboard.addKey(vCode);
                if (this.toggleKey && typeof this.toggleKey.on === 'function') {
                    this.toggleKey.on('down', () => {
                        this.toggleVisibility();
                    });
                }
            }

            // Auto-reveal on first physical touch event
            this.touchDownHandler = (pointer) => {
                if (pointer && (pointer.wasTouch || pointer.pointerType === 'touch')) {
                    if (!this.isEnabled) {
                        this.setEnabled(true);
                    }
                }
            };
            if (scene && scene.input && typeof scene.input.on === 'function') {
                scene.input.on('pointerdown', this.touchDownHandler);
            }
        }

        createButtonVisual(scene, centerX, centerY, width, height, labelText, fontSize = '28px') {
            const bg = (scene && scene.add && typeof scene.add.rectangle === 'function')
                ? scene.add.rectangle(centerX, centerY, width, height, 0x111111, 0.65)
                    .setStrokeStyle(2, 0x99CC00, 0.85)
                    .setOrigin(0.5, 0.5)
                : createMockDisplayObject();

            const text = (scene && scene.add && typeof scene.add.text === 'function')
                ? scene.add.text(centerX, centerY, labelText, {
                    fontFamily: 'Typist, "Segoe UI", Arial, sans-serif',
                    fontSize,
                    color: '#99CC00',
                    align: 'center',
                }).setOrigin(0.5, 0.5)
                : createMockDisplayObject();

            if (this.container && typeof this.container.add === 'function') {
                this.container.add([bg, text]);
            }
            return { bg, text };
        }

        createMovementControls(scene, layout) {
            const btnLeft = layout.buttons.left;
            const btnRight = layout.buttons.right;
            const moveZone = layout.moveZone;

            this.elements.btnLeft = this.createButtonVisual(scene, btnLeft.centerX, btnLeft.centerY, btnLeft.width, btnLeft.height, '◀', '32px');
            this.elements.btnRight = this.createButtonVisual(scene, btnRight.centerX, btnRight.centerY, btnRight.width, btnRight.height, '▶', '32px');

            // Interactive zone spanning entire left movement area for smooth slide/drag
            const zoneWidth = moveZone.maxX - moveZone.minX;
            const zoneHeight = moveZone.maxY - moveZone.minY;
            const zoneCenterX = moveZone.minX + zoneWidth / 2;
            const zoneCenterY = moveZone.minY + zoneHeight / 2;

            const moveInteractiveZone = (scene && scene.add && typeof scene.add.zone === 'function')
                ? scene.add.zone(zoneCenterX, zoneCenterY, zoneWidth, zoneHeight)
                    .setOrigin(0.5, 0.5)
                    .setInteractive({ useHandCursor: true })
                : createMockDisplayObject();

            if (typeof moveInteractiveZone.on === 'function') {
                moveInteractiveZone.on('pointerdown', (pointer) => {
                    this.activeMovePointerId = pointer && pointer.id !== undefined ? pointer.id : 1;
                    const px = pointer ? pointer.x : 0;
                    const py = pointer ? pointer.y : 0;
                    this.handleMovePointer(px, py);
                });

                moveInteractiveZone.on('pointermove', (pointer) => {
                    if (pointer && pointer.isDown && this.activeMovePointerId === (pointer.id !== undefined ? pointer.id : 1)) {
                        this.handleMovePointer(pointer.x, pointer.y);
                    }
                });

                const releaseMove = (pointer) => {
                    const pointerId = pointer ? (pointer.id !== undefined ? pointer.id : 1) : null;
                    if (pointerId === null || pointerId === this.activeMovePointerId) {
                        this.activeMovePointerId = null;
                        this.isMovingLeft = false;
                        this.isMovingRight = false;
                        this.updateMovementVisuals();
                    }
                };

                moveInteractiveZone.on('pointerup', releaseMove);
                moveInteractiveZone.on('pointerout', releaseMove);
            }

            if (this.container && typeof this.container.add === 'function') {
                this.container.add(moveInteractiveZone);
            }
            this.moveZoneObject = moveInteractiveZone;
        }

        handleMovePointer(x, y) {
            const moveState = TouchControlsLogic
                ? TouchControlsLogic.resolveMovementState([{ x, y, isDown: true }])
                : { isMovingLeft: x < 225, isMovingRight: x > 255 };

            this.isMovingLeft = moveState.isMovingLeft;
            this.isMovingRight = moveState.isMovingRight;
            this.updateMovementVisuals();
        }

        updateMovementVisuals() {
            if (this.elements.btnLeft && this.elements.btnLeft.bg && typeof this.elements.btnLeft.bg.setFillStyle === 'function') {
                this.elements.btnLeft.bg.setFillStyle(this.isMovingLeft ? 0x99CC00 : 0x111111, this.isMovingLeft ? 0.9 : 0.65);
                this.elements.btnLeft.text.setColor(this.isMovingLeft ? '#111111' : '#99CC00');
            }
            if (this.elements.btnRight && this.elements.btnRight.bg && typeof this.elements.btnRight.bg.setFillStyle === 'function') {
                this.elements.btnRight.bg.setFillStyle(this.isMovingRight ? 0x99CC00 : 0x111111, this.isMovingRight ? 0.9 : 0.65);
                this.elements.btnRight.text.setColor(this.isMovingRight ? '#111111' : '#99CC00');
            }
        }

        createCombatControls(scene, layout) {
            const btnBox = layout.buttons.box;
            const btnKick = layout.buttons.kick;

            this.elements.btnBox = this.createButtonVisual(scene, btnBox.centerX, btnBox.centerY, btnBox.width, btnBox.height, 'BOX', '24px');
            this.elements.btnKick = this.createButtonVisual(scene, btnKick.centerX, btnKick.centerY, btnKick.width, btnKick.height, 'KICK', '24px');

            // Interactive zone for BOX
            const boxZone = (scene && scene.add && typeof scene.add.zone === 'function')
                ? scene.add.zone(btnBox.centerX, btnBox.centerY, btnBox.width, btnBox.height)
                    .setOrigin(0.5, 0.5)
                    .setInteractive({ useHandCursor: true })
                : createMockDisplayObject();

            if (typeof boxZone.on === 'function') {
                boxZone.on('pointerdown', () => {
                    this.isBoxingDown = true;
                    this.updateCombatVisuals();
                });

                const releaseBox = () => {
                    this.isBoxingDown = false;
                    this.updateCombatVisuals();
                };
                boxZone.on('pointerup', releaseBox);
                boxZone.on('pointerout', releaseBox);
            }

            // Interactive zone for KICK
            const kickZone = (scene && scene.add && typeof scene.add.zone === 'function')
                ? scene.add.zone(btnKick.centerX, btnKick.centerY, btnKick.width, btnKick.height)
                    .setOrigin(0.5, 0.5)
                    .setInteractive({ useHandCursor: true })
                : createMockDisplayObject();

            if (typeof kickZone.on === 'function') {
                kickZone.on('pointerdown', () => {
                    this.isKickDown = true;
                    this.updateCombatVisuals();
                });

                const releaseKick = () => {
                    this.isKickDown = false;
                    this.updateCombatVisuals();
                };
                kickZone.on('pointerup', releaseKick);
                kickZone.on('pointerout', releaseKick);
            }

            if (this.container && typeof this.container.add === 'function') {
                this.container.add([boxZone, kickZone]);
            }
        }

        updateCombatVisuals() {
            if (this.elements.btnBox && this.elements.btnBox.bg) {
                this.elements.btnBox.bg.setFillStyle(this.isBoxingDown ? 0x99CC00 : 0x111111, this.isBoxingDown ? 0.9 : 0.65);
                this.elements.btnBox.text.setColor(this.isBoxingDown ? '#111111' : '#99CC00');
            }
            if (this.elements.btnKick && this.elements.btnKick.bg) {
                this.elements.btnKick.bg.setFillStyle(this.isKickDown ? 0x99CC00 : 0x111111, this.isKickDown ? 0.9 : 0.65);
                this.elements.btnKick.text.setColor(this.isKickDown ? '#111111' : '#99CC00');
            }
        }

        /**
         * @returns {{isMovingLeft: boolean, isMovingRight: boolean, isBoxingDown: boolean, isKickDown: boolean}}
         */
        getState() {
            if (!this.isVisible) {
                return {
                    isMovingLeft: false,
                    isMovingRight: false,
                    isBoxingDown: false,
                    isKickDown: false,
                };
            }
            return {
                isMovingLeft: this.isMovingLeft,
                isMovingRight: this.isMovingRight,
                isBoxingDown: this.isBoxingDown,
                isKickDown: this.isKickDown,
            };
        }

        get isVisible() {
            return Boolean(this.isEnabled && !this.isPaused);
        }

        set isVisible(value) {
            this.isEnabled = Boolean(value);
            this.applyVisibility();
        }

        applyVisibility() {
            const visible = this.isVisible;
            if (this.container && typeof this.container.setVisible === 'function') {
                this.container.setVisible(visible);
            }
            if (!visible) {
                this.isMovingLeft = false;
                this.isMovingRight = false;
                this.isBoxingDown = false;
                this.isKickDown = false;
                this.activeMovePointerId = null;
                this.updateMovementVisuals();
                this.updateCombatVisuals();
            }
            return this;
        }

        setEnabled(enabled) {
            this.isEnabled = Boolean(enabled);
            return this.applyVisibility();
        }

        setPaused(paused) {
            this.isPaused = Boolean(paused);
            return this.applyVisibility();
        }

        setBackpackOpen(isOpen) {
            return this.setPaused(Boolean(isOpen));
        }

        setVisible(visible) {
            this.isEnabled = Boolean(visible);
            return this.applyVisibility();
        }

        toggleVisibility() {
            this.isEnabled = !this.isEnabled;
            return this.applyVisibility();
        }

        destroy() {
            if (this.scene && this.scene.input && typeof this.scene.input.off === 'function' && this.touchDownHandler) {
                this.scene.input.off('pointerdown', this.touchDownHandler);
            }
            if (this.toggleKey && typeof this.toggleKey.destroy === 'function') {
                this.toggleKey.destroy();
            }
            if (this.container && typeof this.container.destroy === 'function') {
                this.container.destroy();
            }
        }
    }

    const api = { TouchControls };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        globalScope.TouchControls = TouchControls;
    }
})(typeof window !== 'undefined' ? window : global);
