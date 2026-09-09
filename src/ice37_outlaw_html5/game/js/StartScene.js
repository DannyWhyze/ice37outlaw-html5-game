(function attachStartScene(globalScope) {
    'use strict';

    const BaseScene = globalScope.Phaser ? globalScope.Phaser.Scene : class {};

    class StartScene extends BaseScene {
        constructor() {
            super({ key: 'StartScene' });
        }

        create() {
            const layoutConfig = (typeof StartNativeLayout !== 'undefined' && StartNativeLayout.LAYOUT)
                ? StartNativeLayout.LAYOUT
                : (globalScope.StartNativeLayout && globalScope.StartNativeLayout.LAYOUT);

            const LAYOUT = layoutConfig || {
                background: { x: 960.0, y: 540.0, width: 1920, height: 1054.945054945055 },
                button: {
                    x: 960.0,
                    y: 1000.0,
                    originX: 0.45345744680851063,
                    originY: 0.6619318181818182,
                    scaleNormal: 1.0,
                    scaleHover: 1.0625,
                    scalePress: 0.975,
                },
                transition: { fadeDurationMs: 300 },
            };

            // Layer 0: Authentic Flash Start Screen Artwork (Shape 19, native 1080p PNG)
            this.background = this.add.image(LAYOUT.background.x, LAYOUT.background.y, 'start_background')
                .setDisplaySize(LAYOUT.background.width, LAYOUT.background.height)
                .setOrigin(0.5, 0.5)
                .setDepth(1);

            // Layer 3: Authentic Flash ENTER Button Graphic (DefineSprite_11 at 366% zoom)
            // Interaction directly matches decompiled ActionScript 2.0:
            // rollOver -> scale 85 / 80 (1.0625)
            // press    -> scale 78 / 80 (0.975)
            // rollOut  -> scale 80 / 80 (1.0)
            this.btnEnter = this.add.image(LAYOUT.button.x, LAYOUT.button.y, 'btn_enter')
                .setOrigin(LAYOUT.button.originX, LAYOUT.button.originY)
                .setScale(LAYOUT.button.scaleNormal)
                .setDepth(10)
                .setInteractive({ useHandCursor: true });

            this.btnEnter.on('pointerover', () => {
                this.btnEnter.setScale(LAYOUT.button.scaleHover);
            });

            this.btnEnter.on('pointerout', () => {
                this.btnEnter.setScale(LAYOUT.button.scaleNormal);
            });

            this.btnEnter.on('pointerdown', () => {
                this.btnEnter.setScale(LAYOUT.button.scalePress);
                this.cameras.main.fadeOut(LAYOUT.transition.fadeDurationMs, 0, 0, 0);
                const fadeCompleteEvent = (globalScope.Phaser && globalScope.Phaser.Cameras && globalScope.Phaser.Cameras.Scene2D && globalScope.Phaser.Cameras.Scene2D.Events)
                    ? globalScope.Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE
                    : (typeof Phaser !== 'undefined' && Phaser.Cameras && Phaser.Cameras.Scene2D && Phaser.Cameras.Scene2D.Events
                        ? Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE
                        : 'camerafadeoutcomplete');
                this.cameras.main.once(fadeCompleteEvent, () => {
                    this.scene.start('MenuScene');
                });
            });
        }
    }

    globalScope.StartScene = StartScene;
    if (typeof module !== 'undefined') {
        module.exports = StartScene;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
