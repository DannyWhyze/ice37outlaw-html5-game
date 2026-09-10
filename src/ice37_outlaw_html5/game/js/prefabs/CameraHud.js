(function attachCameraHudPrefab(globalScope) {
    'use strict';

    class CameraHud {
        constructor(scene, callbacks = {}) {
            this.scene = scene;
            this.callbacks = callbacks;
            this.isOpenState = false;

            if (this.scene && !this.scene.cameraHud) {
                this.scene.cameraHud = this;
            }

            // Main container at high depth (above game scenes and backpack, below cursor at depth 300)
            this.container = scene.add.container(0, 0).setDepth(200);

            // Ensure toolCursor sits on top of Camera HUD (depth 300)
            if (this.scene && this.scene.toolCursor && typeof this.scene.toolCursor.setDepth === 'function') {
                this.scene.toolCursor.setDepth(300);
            }

            // 1. Transparent Camera Frame (1920x1080)
            this.frameImage = scene.add.image(0, 0, 'hud_camera_frame')
                .setOrigin(0, 0)
                .setDisplaySize(1920, 1080);
            this.container.add(this.frameImage);

            // 2. Viewfinder Autofocus Bracket in Center (960, 536)
            this.focusImage = scene.add.image(960, 536, 'hud_camera_focus')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(188, 181);
            this.container.add(this.focusImage);

            // 3. Close [X] Button (1642.5, 56)
            this.closeButton = scene.add.image(1642.5, 56, 'hud_camera_close')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(215, 113)
                .setInteractive();
            this.closeButton.on('pointerdown', () => {
                this.close();
            });
            this.closeButton.on('pointerover', () => {
                this.closeButton.setScale(1.05);
            });
            this.closeButton.on('pointerout', () => {
                this.closeButton.setScale(1.0);
            });
            this.container.add(this.closeButton);

            this.storage = callbacks.storage || (
                (this.scene && this.scene.galleryStorage)
                    ? this.scene.galleryStorage
                    : ((typeof GalleryStorage !== 'undefined' && GalleryStorage.GalleryStorageService)
                        ? new GalleryStorage.GalleryStorageService()
                        : null)
            );

            // 4. Polaroid Gallery Thumbnail Button (685.4, 944.6)
            this.galleryButton = scene.add.image(685.4, 944.6, 'hud_camera_gallery')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(225, 221)
                .setInteractive();
            this.galleryButton.on('pointerdown', () => {
                const SoundHelper = (typeof SoundFx !== 'undefined')
                    ? SoundFx
                    : (typeof require !== 'undefined' ? require('../logic/soundFx.js') : null);
                if (SoundHelper && typeof SoundHelper.play === 'function') {
                    SoundHelper.play(this.scene, 'sfx_can_select');
                }
                if (this.callbacks.onOpenGallery) {
                    this.callbacks.onOpenGallery();
                } else if (this.scene && this.scene.galleryOverlay) {
                    this.container.setVisible(false);
                    this.scene.galleryOverlay.open();
                }
            });
            this.galleryButton.on('pointerover', () => {
                this.galleryButton.setScale(1.05);
            });
            this.galleryButton.on('pointerout', () => {
                this.galleryButton.setScale(1.0);
            });
            this.container.add(this.galleryButton);

            // 5. Round Red Shutter Button in Bottom Center (960, 919.8)
            this.shutterButton = scene.add.image(960, 919.8, 'hud_camera_shutter')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(283, 276)
                .setInteractive();
            this.shutterButton.on('pointerdown', () => {
                this.takePhoto();
            });
            this.shutterButton.on('pointerover', () => {
                this.shutterButton.setScale(1.04);
            });
            this.shutterButton.on('pointerout', () => {
                this.shutterButton.setScale(1.0);
            });
            this.container.add(this.shutterButton);

            // 5b. Player Visibility Toggle Button in Bottom Right (1234.6, 944.6)
            this.isPlayerVisibleState = false; // Default: Piece Only
            this.playerToggleButton = scene.add.image(1234.6, 944.6, 'hud_camera_player_toggle')
                .setOrigin(0.5, 0.5)
                .setDisplaySize(225, 221)
                .setAlpha(0.6)
                .setInteractive();
            this.playerToggleButton.on('pointerdown', () => {
                this.togglePlayerVisibility();
            });
            this.playerToggleButton.on('pointerover', () => {
                this.playerToggleButton.setScale(1.05);
            });
            this.playerToggleButton.on('pointerout', () => {
                this.playerToggleButton.setScale(1.0);
            });
            this.container.add(this.playerToggleButton);

            // Keyboard shortcut 'P' for toggling player visibility
            if (this.scene && this.scene.input && this.scene.input.keyboard && typeof this.scene.input.keyboard.on === 'function') {
                this.scene.input.keyboard.on('keydown-P', () => {
                    if (this.isOpen) {
                        this.togglePlayerVisibility();
                    }
                });
            }

            // 5c. Zoom Preset Buttons (1x, 1.5x, 2x, 2.5x) above shutter button (Y = 746)
            this.zoomLevel = 1.0;
            this.zoomLevels = [1.0, 1.5, 2.0, 2.5];
            this.zoomButtons = [];
            const zoomPillWidth = 76;
            const zoomPillHeight = 40;
            const zoomGap = 12;
            const hitPadding = 8;
            const totalSpan = (this.zoomLevels.length * zoomPillWidth) + ((this.zoomLevels.length - 1) * zoomGap);
            const startX = 960 - (totalSpan / 2) + (zoomPillWidth / 2);
            const pillY = 746;

            for (let i = 0; i < this.zoomLevels.length; i += 1) {
                const level = this.zoomLevels[i];
                const btnX = startX + (i * (zoomPillWidth + zoomGap));
                const bg = (scene.add && typeof scene.add.rectangle === 'function')
                    ? scene.add.rectangle(0, 0, zoomPillWidth, zoomPillHeight, 0x000000, 0.55).setOrigin(0.5, 0.5)
                    : null;
                if (bg && typeof bg.setStrokeStyle === 'function') {
                    bg.setStrokeStyle(1.5, 0xffffff, 0.35);
                }
                const label = `${level}×`;
                const text = (scene.add && typeof scene.add.text === 'function')
                    ? scene.add.text(0, 0, label, {
                        fontFamily: "'Typist', monospace",
                        fontSize: '20px',
                        color: '#ffffff',
                    }).setOrigin(0.5, 0.5)
                    : {
                        text: label,
                        originX: 0.5,
                        originY: 0.5,
                        style: {},
                        setColor(c) { this.color = c; return this; },
                        setText(t) { this.text = t; return this; },
                        setOrigin() { return this; },
                    };

                const btnContainer = (scene.add && typeof scene.add.container === 'function')
                    ? scene.add.container(btnX, pillY)
                    : null;
                if (btnContainer && bg) {
                    btnContainer.add(bg);
                }
                if (btnContainer && text) {
                    btnContainer.add(text);
                }
                if (btnContainer && typeof btnContainer.setInteractive === 'function') {
                    const hitWidth = zoomPillWidth + hitPadding;
                    const hitHeight = zoomPillHeight + hitPadding;
                    if (typeof btnContainer.setSize === 'function') {
                        btnContainer.setSize(hitWidth, hitHeight);
                    }
                    const hitRect = (typeof Phaser !== 'undefined' && Phaser.Geom && Phaser.Geom.Rectangle)
                        ? new Phaser.Geom.Rectangle(-hitWidth / 2, -hitHeight / 2, hitWidth, hitHeight)
                        : { x: -hitWidth / 2, y: -hitHeight / 2, width: hitWidth, height: hitHeight };
                    const hitCallback = (typeof Phaser !== 'undefined' && Phaser.Geom && Phaser.Geom.Rectangle && Phaser.Geom.Rectangle.Contains)
                        ? Phaser.Geom.Rectangle.Contains
                        : undefined;
                    btnContainer.setInteractive(hitRect, hitCallback);
                    btnContainer.on('pointerdown', () => {
                        const SoundHelper = (typeof SoundFx !== 'undefined') ? SoundFx : (typeof require !== 'undefined' ? require('../logic/soundFx.js') : null);
                        if (SoundHelper && typeof SoundHelper.play === 'function') {
                            SoundHelper.play(this.scene, 'sfx_can_select');
                        }
                        this.setZoom(level);
                    });
                    btnContainer.on('pointerover', () => {
                        if (bg && Math.abs(level - this.zoomLevel) >= 0.05) {
                            bg.fillAlpha = 0.8;
                            if (typeof bg.setStrokeStyle === 'function') {
                                bg.setStrokeStyle(2, 0xffffff, 0.7);
                            }
                        }
                    });
                    btnContainer.on('pointerout', () => {
                        if (bg && Math.abs(level - this.zoomLevel) >= 0.05) {
                            bg.fillAlpha = 0.55;
                            if (typeof bg.setStrokeStyle === 'function') {
                                bg.setStrokeStyle(1.5, 0xffffff, 0.35);
                            }
                        }
                    });
                    this.container.add(btnContainer);
                } else if (bg) {
                    this.container.add(bg);
                    if (text && text.setOrigin) this.container.add(text);
                }

                this.zoomButtons.push({
                    level,
                    container: btnContainer,
                    bg,
                    text,
                });
            }

            // Mouse wheel zoom listener (deltaY < 0 is zoom in, deltaY > 0 is zoom out)
            if (this.scene && this.scene.input && typeof this.scene.input.on === 'function') {
                this.wheelHandler = (pointer, gameObjects, deltaX, deltaY) => {
                    if (!this.isOpen) {
                        return;
                    }
                    if (deltaY < 0) {
                        this.stepZoom(1);
                    } else if (deltaY > 0) {
                        this.stepZoom(-1);
                    }
                };
                this.scene.input.on('wheel', this.wheelHandler);
            }

            this.updateZoomButtons();

            // 6. White Screen Flash Overlay (1920x1080) for camera flash
            this.flashOverlay = (scene.add && typeof scene.add.rectangle === 'function')
                ? scene.add.rectangle(960, 540, 1920, 1080, 0xffffff).setOrigin(0.5, 0.5).setAlpha(0)
                : ((scene.add && typeof scene.add.image === 'function')
                    ? scene.add.image(960, 540, 'hud_camera_frame').setOrigin(0.5, 0.5).setAlpha(0)
                    : null);
            if (this.flashOverlay) {
                this.container.add(this.flashOverlay);
            }

            // Start autofocus pulse animation
            this.startFocusAnimation();

            // Default: closed
            this.container.setVisible(false);

            // Developer / query parameter support (?camera=open)
            const params = (typeof window !== 'undefined' && window.location && window.location.search)
                ? new URLSearchParams(window.location.search)
                : null;
            if (params && params.get('camera') === 'open') {
                this.open();
                if (params.get('player') === 'visible') {
                    this.togglePlayerVisibility();
                }
                if (this.scene && this.scene.toolCursor && typeof this.scene.toolCursor.setPosition === 'function') {
                    this.scene.toolCursor.setPosition(960, 750).setVisible(true);
                }
            }
        }

        startFocusAnimation() {
            if (!this.scene || !this.scene.tweens || typeof this.scene.tweens.add !== 'function') {
                return;
            }
            this.focusTween = this.scene.tweens.add({
                targets: this.focusImage,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 750,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut',
            });
        }

        get isOpen() {
            return this.isOpenState;
        }

        get isPlayerVisible() {
            return this.isPlayerVisibleState;
        }

        applyPlayerVisibility() {
            if (this.scene && this.scene.player && this.scene.player.container && typeof this.scene.player.container.setVisible === 'function') {
                this.scene.player.container.setVisible(this.isPlayerVisibleState);
            }
            if (this.playerToggleButton && typeof this.playerToggleButton.setAlpha === 'function') {
                this.playerToggleButton.setAlpha(this.isPlayerVisibleState ? 1.0 : 0.6);
            }
            return this;
        }

        togglePlayerVisibility() {
            this.isPlayerVisibleState = !this.isPlayerVisibleState;
            this.applyPlayerVisibility();

            if (this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function' && this.playerToggleButton) {
                this.scene.tweens.add({
                    targets: this.playerToggleButton,
                    scaleX: 0.94,
                    scaleY: 0.94,
                    duration: 60,
                    yoyo: true,
                    ease: 'Power1',
                    onComplete: () => {
                        if (this.playerToggleButton && typeof this.playerToggleButton.setScale === 'function') {
                            this.playerToggleButton.setScale(1.0);
                        }
                    },
                });
            }

            if (this.callbacks.onTogglePlayer) {
                this.callbacks.onTogglePlayer(this.isPlayerVisibleState);
            }
            return this;
        }

        setZoom(level) {
            const minZoom = 1.0;
            const maxZoom = 2.5;
            const numericLevel = Number(level) || 1.0;
            const clamped = Math.min(maxZoom, Math.max(minZoom, Math.round(numericLevel * 10) / 10));
            this.zoomLevel = clamped;
            this.applyZoom(this.zoomLevel);
            this.updateZoomButtons();
            if (this.scene && typeof this.scene.updateToolCursor === 'function') {
                const pointer = (this.scene.input && this.scene.input.activePointer)
                    ? this.scene.input.activePointer
                    : null;
                if (pointer && this.scene.cameras && this.scene.cameras.main && typeof this.scene.cameras.main.getWorldPoint === 'function') {
                    if (typeof pointer.x === 'number' && typeof pointer.y === 'number') {
                        this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y, pointer);
                    }
                }
                this.scene.updateToolCursor(pointer);
            }
            return this.zoomLevel;
        }

        applyZoom(level) {
            if (this.scene && this.scene.cameras && this.scene.cameras.main && typeof this.scene.cameras.main.setZoom === 'function') {
                this.scene.cameras.main.setZoom(level);
            }
            if (this.container && typeof this.container.setScale === 'function') {
                const invZoom = 1 / level;
                this.container.setScale(invZoom);
                if (typeof this.container.setPosition === 'function') {
                    this.container.setPosition(960 * (1 - invZoom), 540 * (1 - invZoom));
                }
            }
        }

        stepZoom(direction) {
            if (direction > 0) {
                for (let i = 0; i < this.zoomLevels.length; i += 1) {
                    if (this.zoomLevels[i] > this.zoomLevel + 0.01) {
                        return this.setZoom(this.zoomLevels[i]);
                    }
                }
                return this.setZoom(2.5);
            }
            if (direction < 0) {
                for (let i = this.zoomLevels.length - 1; i >= 0; i -= 1) {
                    if (this.zoomLevels[i] < this.zoomLevel - 0.01) {
                        return this.setZoom(this.zoomLevels[i]);
                    }
                }
                return this.setZoom(1.0);
            }
            return this.zoomLevel;
        }

        updateZoomButtons() {
            if (!Array.isArray(this.zoomButtons)) {
                return;
            }
            for (let i = 0; i < this.zoomButtons.length; i += 1) {
                const btn = this.zoomButtons[i];
                const isActive = Math.abs(btn.level - this.zoomLevel) < 0.05;
                if (btn.bg) {
                    btn.bg.fillColor = isActive ? 0xffcc00 : 0x000000;
                    btn.bg.fillAlpha = isActive ? 0.95 : 0.55;
                    if (typeof btn.bg.setStrokeStyle === 'function') {
                        btn.bg.setStrokeStyle(isActive ? 2 : 1.5, 0xffffff, isActive ? 0.9 : 0.35);
                    }
                }
                if (btn.text && typeof btn.text.setColor === 'function') {
                    btn.text.setColor(isActive ? '#111111' : '#ffffff');
                }
            }
        }

        open() {
            this.isOpenState = true;
            this.container.setVisible(true);
            this.focusImage.setPosition(960, 536);

            // Hide/pause touch controls while camera HUD is active
            if (this.scene && this.scene.touchControls && typeof this.scene.touchControls.setBackpackOpen === 'function') {
                this.scene.touchControls.setBackpackOpen(true);
            }

            // Default to Piece Only on camera open
            this.isPlayerVisibleState = false;
            this.applyPlayerVisibility();

            // Default to 1.0x normal zoom on camera open
            this.setZoom(1.0);

            if (this.scene && this.scene.input && typeof this.scene.input.setDefaultCursor === 'function') {
                this.scene.input.setDefaultCursor('none');
            }
            if (this.scene && this.scene.game && this.scene.game.canvas && this.scene.game.canvas.style) {
                this.scene.game.canvas.style.cursor = 'none';
            }
            if (this.scene && this.scene.toolCursor && typeof this.scene.toolCursor.setDepth === 'function') {
                this.scene.toolCursor.setDepth(300);
            }
            if (this.scene && typeof this.scene.updateToolCursor === 'function') {
                const pointer = (this.scene.input && this.scene.input.activePointer)
                    ? this.scene.input.activePointer
                    : null;
                this.scene.updateToolCursor(pointer);
            }
            if (this.callbacks.onOpen) {
                this.callbacks.onOpen();
            }
            return this;
        }

        close() {
            this.isOpenState = false;
            this.container.setVisible(false);

            // Restore touch controls for regular gameplay
            if (this.scene && this.scene.touchControls && typeof this.scene.touchControls.setBackpackOpen === 'function') {
                this.scene.touchControls.setBackpackOpen(false);
            }

            // Defensively restore player visibility for regular gameplay
            if (this.scene && this.scene.player && this.scene.player.container && typeof this.scene.player.container.setVisible === 'function') {
                this.scene.player.container.setVisible(true);
            }

            // Defensively restore normal zoom and container placement for regular gameplay
            this.setZoom(1.0);
            if (this.container && typeof this.container.setPosition === 'function') {
                this.container.setPosition(0, 0);
            }

            if (this.scene && this.scene.input && typeof this.scene.input.setDefaultCursor === 'function') {
                this.scene.input.setDefaultCursor('none');
            }
            if (this.scene && this.scene.game && this.scene.game.canvas && this.scene.game.canvas.style) {
                this.scene.game.canvas.style.cursor = 'none';
            }
            if (this.scene && typeof this.scene.updateToolCursor === 'function') {
                const pointer = (this.scene.input && this.scene.input.activePointer)
                    ? this.scene.input.activePointer
                    : null;
                this.scene.updateToolCursor(pointer);
            }
            if (this.callbacks.onClose) {
                this.callbacks.onClose();
            }
            return this;
        }

        destroy() {
            if (this.scene && this.scene.input && typeof this.scene.input.off === 'function' && this.wheelHandler) {
                this.scene.input.off('wheel', this.wheelHandler);
            }
        }

        toggle() {
            if (this.isOpen) {
                return this.close();
            }
            return this.open();
        }

        takePhoto(callback) {
            if (!this.isOpen) {
                return null;
            }

            // Haptic button squeeze tween
            if (this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function') {
                this.scene.tweens.add({
                    targets: this.shutterButton,
                    scaleX: 0.92,
                    scaleY: 0.92,
                    duration: 60,
                    yoyo: true,
                    ease: 'Power1',
                });

                // Gallery thumbnail wobble animation
                this.scene.tweens.add({
                    targets: this.galleryButton,
                    angle: -10,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        if (this.galleryButton && typeof this.galleryButton.setAngle === 'function') {
                            this.galleryButton.setAngle(0);
                        }
                    },
                });
            }

            // Capture photo first (without HUD buttons or white flash), then trigger flash overlay
            return this.capturePhoto((dataUrl) => {
                if (this.flashOverlay && this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function') {
                    this.flashOverlay.setAlpha(1);
                    this.scene.tweens.add({
                        targets: this.flashOverlay,
                        alpha: 0,
                        duration: 180,
                        ease: 'Linear',
                    });
                }
                if (typeof callback === 'function') {
                    callback(dataUrl);
                }
            });
        }

        capturePhoto(callback) {
            const onCaptured = (dataUrl) => {
                if (this.storage && typeof this.storage.savePhoto === 'function') {
                    const sceneKey = (this.scene && (this.scene.sceneKey || (this.scene.sys && this.scene.sys.settings && this.scene.sys.settings.key))) || 'HallOfFameScene';
                    this.storage.savePhoto(dataUrl, {
                        scene: sceneKey,
                        zoom: this.zoomLevel || 1.0,
                        timestamp: Date.now(),
                    }).catch((err) => {
                        console.warn('Gallery savePhoto failed:', err.message);
                    });
                }
                if (this.callbacks.onTakePhoto) {
                    this.callbacks.onTakePhoto(dataUrl);
                }
                if (typeof callback === 'function') {
                    callback(dataUrl);
                }
            };

            try {
                // If Phaser renderer has snapshot capability (WebGL / Canvas)
                if (this.scene && this.scene.game && this.scene.game.renderer && typeof this.scene.game.renderer.snapshot === 'function') {
                    const containerWasVisible = this.container ? this.container.visible : false;
                    const cursorWasVisible = (this.scene.toolCursor && this.scene.toolCursor.visible);
                    const touchControlsWereVisible = (this.scene.touchControls && this.scene.touchControls.isVisible);
                    const reticleWasVisible = (this.scene.brushReticle && this.scene.brushReticle.container && this.scene.brushReticle.container.visible);

                    if (this.container) {
                        this.container.setVisible(false);
                    }
                    if (this.scene.toolCursor) {
                        this.scene.toolCursor.setVisible(false);
                    }
                    if (reticleWasVisible && this.scene.brushReticle && this.scene.brushReticle.container) {
                        this.scene.brushReticle.container.setVisible(false);
                    }
                    if (touchControlsWereVisible && this.scene.touchControls) {
                        this.scene.touchControls.setVisible(false);
                    }

                    this.scene.game.renderer.snapshot((image) => {
                        if (containerWasVisible && this.container) {
                            this.container.setVisible(true);
                        }
                        const isTouch = Boolean(this.scene && this.scene.touchControls && this.scene.touchControls.isEnabled);
                        if (cursorWasVisible && this.scene.toolCursor && !isTouch) {
                            this.scene.toolCursor.setVisible(true);
                        }
                        if (reticleWasVisible && this.scene.brushReticle && this.scene.brushReticle.container) {
                            this.scene.brushReticle.container.setVisible(true);
                        }
                        if (touchControlsWereVisible && this.scene.touchControls) {
                            this.scene.touchControls.setVisible(true);
                        }

                        const dataUrl = (image && image.src)
                            ? image.src
                            : (typeof image === 'string' ? image : null);

                        if (dataUrl) {
                            onCaptured(dataUrl);
                        } else if (this.scene.game.canvas) {
                            const rawUrl = this.scene.game.canvas.toDataURL('image/png');
                            onCaptured(rawUrl);
                        }
                    });
                    return null;
                }

                // Fallback for environments without renderer.snapshot (e.g. mock test canvas)
                if (this.scene && this.scene.game && this.scene.game.canvas) {
                    const canvas = this.scene.game.canvas;
                    const dataUrl = canvas.toDataURL('image/png');
                    onCaptured(dataUrl);
                    return dataUrl;
                }
            } catch (err) {
                // Ignore security or canvas taint errors in constrained environments
            }
            return null;
        }

        triggerDownload(dataUrl, filename) {
            if (typeof document === 'undefined' || !dataUrl) {
                return;
            }
            try {
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } catch (e) {
                // Ignore download trigger errors in test runners
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { CameraHud };
    } else {
        globalScope.CameraHud = CameraHud;
    }
})(typeof window !== 'undefined' ? window : global);
