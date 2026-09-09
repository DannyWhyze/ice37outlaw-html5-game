const BaseMenuScene = (typeof Phaser !== 'undefined' && Phaser.Scene) ? Phaser.Scene : class {};

// Measured against the native 1920 x 1080 main menu background. The right poster
// belongs to DefineShape 108 and therefore has no separate Flash placement matrix.
const MAIN_MENU_GALLERY_POSTER = Object.freeze({
    x: 487.5,
    y: 96.0,
    width: 78.0,
    height: 85.0,
});

class MenuScene extends BaseMenuScene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        // Phaser destroys the previous scene display list before calling create() again.
        // The prefab instance remains a JavaScript property, so it must not be reused.
        this.galleryOverlay = null;

        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        const scaleS = width / 546;
        const offsetY = (height - 300 * scaleS) / 2;

        const registeredSceneKeys = this.registeredSceneKeys || [
            'BootScene',
            'StartScene',
            'MenuScene',
            'HomeScene',
            'HallOfFameScene',
            'StreetScene',
            'TrainyardScene',
        ];

        // Render Authentic Flash Main Menu Vector Background (image_02__main.png)
        let bg = this.add.image(width / 2, height / 2, 'mainmenu_bg');
        bg.setDisplaySize(width, height);

        // Layer 2: Interactive Cat Easter Egg (Sprite 17 'catwoman', Depth 26)
        this.createCatEasterEgg(scaleS, offsetY);

        const GalleryStorageModule = (typeof GalleryStorage !== 'undefined')
            ? GalleryStorage
            : (typeof require !== 'undefined' ? require('./logic/galleryStorage.js') : null);
        if (!this.galleryStorage && GalleryStorageModule && GalleryStorageModule.GalleryStorageService) {
            this.galleryStorage = new GalleryStorageModule.GalleryStorageService();
        }
        const GalleryOverlayPrefab = (typeof GalleryOverlay !== 'undefined')
            ? GalleryOverlay
            : (typeof require !== 'undefined' ? require('./prefabs/GalleryOverlay.js').GalleryOverlay : null);
        this.createGalleryOverlay = () => {
            if (!this.galleryOverlay && GalleryOverlayPrefab) {
                this.galleryOverlay = new GalleryOverlayPrefab(this, {
                    storage: this.galleryStorage,
                });
            }
            return this.galleryOverlay;
        };

        // Layer 3: Gallery entry on the poster embedded in the main menu background.
        const galleryPosterX = MAIN_MENU_GALLERY_POSTER.x * scaleS;
        const galleryPosterY = MAIN_MENU_GALLERY_POSTER.y * scaleS + offsetY;
        const galleryPosterButton = this.add.zone(
            galleryPosterX,
            galleryPosterY,
            MAIN_MENU_GALLERY_POSTER.width * scaleS,
            MAIN_MENU_GALLERY_POSTER.height * scaleS
        )
            .setDepth(60)
            .setInteractive({ useHandCursor: true });
        let galleryLabel = null;
        if (this.add && typeof this.add.text === 'function') {
            galleryLabel = this.add.text(galleryPosterX, galleryPosterY, 'GALLERY', {
                fontFamily: "'Stencil', sans-serif",
                fontSize: `${15 * scaleS}px`,
                color: '#333333',
                strokeThickness: 0,
            })
                .setOrigin(0.5, 0.5)
                .setDepth(61);
        }
        galleryPosterButton.on('pointerover', () => {
            if (galleryLabel && typeof galleryLabel.setTint === 'function') {
                galleryLabel.setTint(0x000000);
            }
        });
        galleryPosterButton.on('pointerout', () => {
            if (galleryLabel && typeof galleryLabel.clearTint === 'function') {
                galleryLabel.clearTint();
            }
        });
        galleryPosterButton.on('pointerdown', () => {
            const galleryOverlay = this.createGalleryOverlay();
            if (galleryOverlay) {
                galleryOverlay.open();
            }
        });

        // Define the 4 Navigation Text Options matching exact Flash SWF coordinates and matrix bounds
        // outlaw300_mainmenue.swf:
        // Root stage: X = 270.0, scale = 0.70
        // Home: Y = 119.25 (Sprite 73 -> Sprite 71, Shape 70)
        // Hall: Y = 148.40 (Sprite 60 -> Sprite 59, Shape 58)
        // Street: Y = 177.55 (Sprite 97 -> Sprite 95, MorphShape 84 / Shape 94)
        // Train: Y = 206.75 (Sprite 40 -> Sprite 37, Shape 36)
        // Hitbox: Shape 38 [-130..130, -21..21] (260 x 42 Flash units)
        const BUTTON_SCALE = 0.70;
        const menuButtons = [
            { id: 'home', texture: 'btn_home_hover', y: 119.25, originX: 0.3855, originY: 0.2563, scene: 'HomeScene' },
            { id: 'hall', texture: 'btn_hall_hover', y: 148.40, originX: 0.4479, originY: 0.2563, scene: 'HallOfFameScene' },
            { id: 'street', texture: 'btn_streetbombing_hover', y: 177.55, originX: 0.4573, originY: 0.2428, scene: 'StreetScene' },
            { id: 'train', texture: 'btn_train_hover', y: 206.75, originX: 0.4425, originY: 0.2326, scene: 'TrainyardScene' }
        ];

        menuButtons.forEach((item) => {
            const btnX = 270.0 * scaleS;
            const btnY = item.y * scaleS + offsetY;
            const defaultTexture = `menu_btn_${item.id}_1`;
            let btnSprite = this.add.image(btnX, btnY, defaultTexture);

            btnSprite.setScale(BUTTON_SCALE);
            if (typeof btnSprite.setOrigin === 'function') {
                btnSprite.setOrigin(item.originX, item.originY);
            }
            btnSprite.setAlpha(1.0);

            const navigationState = (typeof MenuNavigation !== 'undefined' && typeof MenuNavigation.getMenuNavigationState === 'function')
                ? MenuNavigation.getMenuNavigationState(item, registeredSceneKeys)
                : { isAvailable: registeredSceneKeys.includes(item.scene), sceneKey: item.scene };
            if (!navigationState.isAvailable) {
                return;
            }

            btnSprite.setInteractive({ useHandCursor: true });

            let animTimer = null;
            let currentFrame = 1;

            btnSprite.on('pointerover', () => {
                if (animTimer) {
                    animTimer.remove(false);
                    animTimer = null;
                }
                currentFrame = 1;
                if (this.time && typeof this.time.addEvent === 'function') {
                    animTimer = this.time.addEvent({
                        delay: 40, // 25 FPS matching authentic Flash frame tempo
                        repeat: 24, // frames 2 to 25
                        callback: () => {
                            currentFrame++;
                            if (currentFrame <= 25 && typeof btnSprite.setTexture === 'function') {
                                btnSprite.setTexture(`menu_btn_${item.id}_${currentFrame}`);
                            }
                        }
                    });
                } else if (typeof btnSprite.setTexture === 'function') {
                    currentFrame = 25;
                    btnSprite.setTexture(`menu_btn_${item.id}_25`);
                }
            });

            btnSprite.on('pointerout', () => {
                if (animTimer) {
                    animTimer.remove(false);
                    animTimer = null;
                }
                currentFrame = 1;
                if (typeof btnSprite.setTexture === 'function') {
                    btnSprite.setTexture(`menu_btn_${item.id}_1`);
                }
            });

            btnSprite.on('pointerdown', () => {
                this.cameras.main.fadeOut(300, 0, 0, 0);
                const fadeEvent = (typeof Phaser !== 'undefined' && Phaser.Cameras && Phaser.Cameras.Scene2D && Phaser.Cameras.Scene2D.Events)
                    ? Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE
                    : 'camerafadeoutcomplete';
                this.cameras.main.once(fadeEvent, () => {
                    this.scene.start(navigationState.sceneKey);
                });
            });
        });
    }

    createCatEasterEgg(scaleS, offsetY) {
        if (!this.add || typeof this.add.container !== 'function') {
            return;
        }

        // Flash stage root placement for Sprite 17 (catwoman):
        // X = 451.35, Y = 121.15, scale = 0.70
        const catX = 451.35 * scaleS;
        const catY = 121.15 * scaleS + offsetY;
        const CAT_SCALE = 0.70;

        this.isCatBusy = false;

        // Container to hold the cat components and clip mask
        const catContainer = this.add.container(catX, catY);
        if (typeof catContainer.setDepth === 'function') {
            catContainer.setDepth(26);
        }

        // 1. Shape 15: Leaping Cat (on press/click)
        // SWF Bounds: [-63, 63, 28, 94], W=126, H=66
        // Origin: x = 0.5 (centered), y = -28.00 / 66.00 = -0.42424
        let catBody = null;
        if (this.add && typeof this.add.image === 'function') {
            catBody = this.add.image(catContainer ? 0 : catX, catContainer ? 0 : catY, 'mainmenu_cat_15');
            catBody.setScale(CAT_SCALE);
            catBody.setOrigin(0.5, -0.42424);
            catBody.setVisible(false);
            if (catContainer) {
                catContainer.add(catBody);
            } else if (typeof catBody.setDepth === 'function') {
                catBody.setDepth(26);
            }
        }

        // 2. Shape 10 & 12: Swiping Paw (on rollover)
        // Shape 10 SWF Bounds: [-78.95, 16.55, 35.95, 100.05], W=95.5, H=64.1
        // Origin: x = 78.95 / 95.5 = 0.8267, y = -35.95 / 64.1 = -0.5608
        let catPaw = null;
        if (this.add && typeof this.add.image === 'function') {
            catPaw = this.add.image(catContainer ? 0 : catX, catContainer ? 0 : catY, 'mainmenu_cat_10');
            catPaw.setScale(CAT_SCALE);
            catPaw.setOrigin(0.8267, -0.5608);
            catPaw.setVisible(false);
            if (catContainer) {
                catContainer.add(catPaw);
            } else if (typeof catPaw.setDepth === 'function') {
                catPaw.setDepth(26);
            }
        }

        // 3. Shape 8 Clip Mask:
        // SWF Bounds: [-79.35, 80.65, -72.55, 37.90], W=160, H=110.45
        // Origin: x = 79.35 / 160.0 = 0.4959, y = 72.55 / 110.45 = 0.6569
        if (this.make && typeof this.make.image === 'function' && catContainer) {
            const maskImage = this.make.image({
                x: catX,
                y: catY,
                key: 'mainmenu_cat_mask_8',
                add: false
            });
            maskImage.setScale(CAT_SCALE);
            maskImage.setOrigin(0.4959, 0.6569);
            if (typeof maskImage.createBitmapMask === 'function' && typeof catContainer.setMask === 'function') {
                const mask = maskImage.createBitmapMask();
                catContainer.setMask(mask);
            }
        }

        // 4. Hit Area: cathittest_2 (Shape 5 at 2.05, 121.8)
        // SWF Bounds: [-79.2, 79.2, -96.55, 96.55], W=158.4, H=193.1
        // Center in scene coordinates: catX + 2.05 * scaleS * 0.70, catY + 121.8 * scaleS * 0.70
        const hitWidth = 158.4 * scaleS * CAT_SCALE;
        const hitHeight = 193.1 * scaleS * CAT_SCALE;
        const hitLocalX = 2.05 * scaleS * CAT_SCALE;
        const hitLocalY = 121.8 * scaleS * CAT_SCALE;

        let hitArea = null;
        if (this.add && typeof this.add.zone === 'function') {
            hitArea = this.add.zone(catX + hitLocalX, catY + hitLocalY, hitWidth, hitHeight);
        } else if (this.add && typeof this.add.rectangle === 'function') {
            hitArea = this.add.rectangle(catX + hitLocalX, catY + hitLocalY, hitWidth, hitHeight, 0x000000, 0.0);
        }

        if (hitArea && typeof hitArea.setInteractive === 'function') {
            hitArea.setInteractive({ useHandCursor: true });
            if (typeof hitArea.setDepth === 'function') {
                hitArea.setDepth(27);
            }

            // Rollover event -> Paw swipe + Meow audio
            hitArea.on('pointerover', () => {
                this.triggerCatRollover(catPaw, scaleS);
            });

            // Pointer down / click -> Leap + Screech audio
            hitArea.on('pointerdown', () => {
                this.triggerCatClick(catBody, scaleS);
            });
        }

        this.catContainer = catContainer;
        this.catBody = catBody;
        this.catPaw = catPaw;
        this.catHitArea = hitArea;
    }

    triggerCatRollover(catPaw, scaleS) {
        if (this.isCatBusy || !catPaw) {
            return;
        }
        this.isCatBusy = true;

        if (this.sound && typeof this.sound.play === 'function') {
            this.sound.play('cat_meow');
        }

        const CAT_SCALE = 0.70;
        // Phase 1: Shape 10 (Paw reaching up & rotating, Flash Frames 2-6)
        if (typeof catPaw.setTexture === 'function') {
            catPaw.setTexture('mainmenu_cat_10');
        }
        if (typeof catPaw.setOrigin === 'function') {
            catPaw.setOrigin(0.8267, -0.5608);
        }
        if (typeof catPaw.setPosition === 'function') {
            catPaw.setPosition(0, 0);
        }
        if (typeof catPaw.setRotation === 'function') {
            catPaw.setRotation(0);
        }
        if (typeof catPaw.setVisible === 'function') {
            catPaw.setVisible(true);
        }

        const targetX1 = 62.55 * scaleS * CAT_SCALE;
        const targetY1 = -15.85 * scaleS * CAT_SCALE;
        const targetRot1 = 1.002; // 57.4 deg

        if (this.tweens && typeof this.tweens.add === 'function') {
            this.tweens.add({
                targets: catPaw,
                x: targetX1,
                y: targetY1,
                rotation: targetRot1,
                duration: 160,
                ease: 'Quad.easeOut',
                onComplete: () => {
                    // Phase 2: Shape 12 (Paw returning down, Flash Frames 7-14)
                    if (typeof catPaw.setTexture === 'function') {
                        catPaw.setTexture('mainmenu_cat_12');
                    }
                    if (typeof catPaw.setOrigin === 'function') {
                        catPaw.setOrigin(0.6201, 0.5760);
                    }
                    if (typeof catPaw.setPosition === 'function') {
                        catPaw.setPosition(0, 0);
                    }
                    if (typeof catPaw.setRotation === 'function') {
                        catPaw.setRotation(0);
                    }

                    const targetX2 = 1.05 * scaleS * CAT_SCALE;
                    const targetY2 = 66.45 * scaleS * CAT_SCALE;
                    const targetRot2 = 0.35;

                    this.tweens.add({
                        targets: catPaw,
                        x: targetX2,
                        y: targetY2,
                        rotation: targetRot2,
                        duration: 260,
                        ease: 'Quad.easeIn',
                        onComplete: () => {
                            // Phase 3: Pause / tuck away (Flash Frames 15-24)
                            const finishCall = () => {
                                if (typeof catPaw.setVisible === 'function') {
                                    catPaw.setVisible(false);
                                }
                                if (typeof catPaw.setPosition === 'function') {
                                    catPaw.setPosition(0, 0);
                                }
                                if (typeof catPaw.setRotation === 'function') {
                                    catPaw.setRotation(0);
                                }
                                this.isCatBusy = false;
                            };

                            if (this.time && typeof this.time.delayedCall === 'function') {
                                this.time.delayedCall(320, finishCall);
                            } else {
                                finishCall();
                            }
                        }
                    });
                }
            });
        } else {
            if (typeof catPaw.setVisible === 'function') {
                catPaw.setVisible(false);
            }
            this.isCatBusy = false;
        }
    }

    triggerCatClick(catBody, scaleS) {
        if (this.isCatBusy || !catBody) {
            return;
        }
        this.isCatBusy = true;

        if (this.sound && typeof this.sound.play === 'function') {
            this.sound.play('cat_screech');
        }

        const CAT_SCALE = 0.70;
        const jumpDeltaY = -61.0 * scaleS * CAT_SCALE;

        if (typeof catBody.setTexture === 'function') {
            catBody.setTexture('mainmenu_cat_15');
        }
        if (typeof catBody.setOrigin === 'function') {
            catBody.setOrigin(0.5, -0.42424);
        }
        if (typeof catBody.setPosition === 'function') {
            catBody.setPosition(0, 0);
        }
        if (typeof catBody.setVisible === 'function') {
            catBody.setVisible(true);
        }

        if (this.tweens && typeof this.tweens.add === 'function') {
            // Leap up (Frames 25-34, ~300ms)
            this.tweens.add({
                targets: catBody,
                y: jumpDeltaY,
                duration: 300,
                ease: 'Sine.easeOut',
                onComplete: () => {
                    // Hold at peak (Frames 34-75, ~1300ms)
                    const fallBack = () => {
                        this.tweens.add({
                            targets: catBody,
                            y: 0,
                            duration: 300,
                            ease: 'Sine.easeIn',
                            onComplete: () => {
                                if (typeof catBody.setVisible === 'function') {
                                    catBody.setVisible(false);
                                }
                                if (typeof catBody.setPosition === 'function') {
                                    catBody.setPosition(0, 0);
                                }
                                this.isCatBusy = false;
                            }
                        });
                    };

                    if (this.time && typeof this.time.delayedCall === 'function') {
                        this.time.delayedCall(1300, fallBack);
                    } else {
                        fallBack();
                    }
                }
            });
        } else {
            if (typeof catBody.setVisible === 'function') {
                catBody.setVisible(false);
            }
            this.isCatBusy = false;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MenuScene;
}
