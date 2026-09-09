const BaseHomeScene = (typeof Phaser !== 'undefined' && Phaser.Scene) ? Phaser.Scene : class {};

function getCanInventory() {
    if (typeof window !== 'undefined' && window.CanInventory) {
        return window.CanInventory;
    }
    if (typeof CanInventory !== 'undefined' && CanInventory) {
        return CanInventory;
    }
    if (typeof require !== 'undefined') {
        try {
            return require('./logic/canInventory.js');
        } catch (e) {
            return null;
        }
    }
    return null;
}

function getSoundFx() {
    if (typeof window !== 'undefined' && window.SoundFx) {
        return window.SoundFx;
    }
    if (typeof SoundFx !== 'undefined' && SoundFx) {
        return SoundFx;
    }
    if (typeof require !== 'undefined') {
        try {
            return require('./logic/soundFx.js');
        } catch (e) {
            return null;
        }
    }
    return null;
}

class HomeScene extends BaseHomeScene {
    constructor() {
        super({ key: 'HomeScene' });
    }

    create() {
        const inventory = getCanInventory();
        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        const scaleS = width / 546;
        const offsetY = (height - 300 * scaleS) / 2;

        // Layer 0: Authentic Flash Clean Room Vector Artwork (120.svg - 546x300 px)
        let bg = this.add.image(0, offsetY, 'home_bg')
            .setOrigin(0, 0)
            .setDisplaySize(width, 300 * scaleS);

        // Flash PlaceObject2 Scaling Factor for 352% HD Shapes (scale 0.70)
        const CAN_SCALE = 0.70;

        // Layer 1: Floor Inventory Spray Cans (rs_can_1..6, 352% HD zoom = 86x196 px, scaled with Flash matrix 0.70)
        const floorCans = [
            { name: 'rs_can_1', x: 4.65, y: 258.95 },
            { name: 'rs_can_2', x: 27.05, y: 258.95 },
            { name: 'rs_can_3', x: 49.45, y: 258.95 },
            { name: 'rs_can_4', x: 71.85, y: 258.95 },
            { name: 'rs_can_5', x: 94.25, y: 258.95 },
            { name: 'rs_can_6', x: 116.75, y: 258.95 }
        ];

        // Authentic Flash starter colors for floor inventory cans (canone..cansix)
        const initialFloorColors = (inventory && typeof inventory.getFloorColors === 'function')
            ? inventory.getFloorColors()
            : [0x0000cc, 0xffffff, 0xffff33, 0x66ff33, 0xff0000, 0x000000];

        const floorCanSlots = [];

        floorCans.forEach((canData, index) => {
            const posX = canData.x * scaleS;
            const posY = canData.y * scaleS + offsetY;

            let can = this.add.image(posX, posY, canData.name)
                .setOrigin(0, 0)
                .setScale(CAN_SCALE)
                .setDepth(10);

            let cap = this.add.image(
                posX + 2.50 * scaleS * CAN_SCALE,
                posY + 0.70 * scaleS * CAN_SCALE,
                'rs_deckelfarbe'
            )
                .setOrigin(0, 0)
                .setScale(CAN_SCALE)
                .setDepth(11);

            cap.setTint(initialFloorColors[index]);
            if (typeof cap.setTintFill === 'function') {
                cap.setTintFill(initialFloorColors[index]);
            }

            // Hit zone bounding box for dropping shelf cans (86x196 px at CAN_SCALE 0.70)
            const canW = 86 * CAN_SCALE;
            const canH = 196 * CAN_SCALE;
            floorCanSlots.push({
                index,
                can,
                cap,
                bounds: {
                    index,
                    x: posX,
                    y: posY,
                    width: canW,
                    height: canH
                }
            });
        });

        // Layer 1: Shelf Spray Cans (farbdose_1..33)
        const shelfCans = [
            // Top Shelf (12 cans, Y ~ 48..51)
            { name: 'farbdose_1', x: 306.70, y: 50.50 },
            { name: 'farbdose_2', x: 323.90, y: 48.60 },
            { name: 'farbdose_3', x: 342.95, y: 50.30 },
            { name: 'farbdose_4', x: 358.05, y: 50.30 },
            { name: 'farbdose_5', x: 373.65, y: 50.30 },
            { name: 'farbdose_6', x: 390.95, y: 50.85 },
            { name: 'farbdose_7', x: 408.25, y: 48.60 },
            { name: 'farbdose_8', x: 426.70, y: 50.30 },
            { name: 'farbdose_9', x: 442.35, y: 49.75 },
            { name: 'farbdose_10', x: 461.85, y: 49.15 },
            { name: 'farbdose_29', x: 478.35, y: 49.75 },
            { name: 'farbdose_30', x: 495.70, y: 49.75 },

            // Middle Shelf (13 cans, Y ~ 113..118)
            { name: 'farbdose_11', x: 296.90, y: 118.15 },
            { name: 'farbdose_12', x: 312.80, y: 117.05 },
            { name: 'farbdose_13', x: 329.55, y: 118.15 },
            { name: 'farbdose_14', x: 349.65, y: 118.15 },
            { name: 'farbdose_15', x: 365.85, y: 117.60 },
            { name: 'farbdose_16', x: 382.05, y: 116.50 },
            { name: 'farbdose_17', x: 397.70, y: 113.10 },
            { name: 'farbdose_18', x: 416.05, y: 116.50 },
            { name: 'farbdose_19', x: 432.80, y: 117.05 },
            { name: 'farbdose_20', x: 449.00, y: 114.25 },
            { name: 'farbdose_21', x: 465.20, y: 116.50 },
            { name: 'farbdose_32', x: 481.55, y: 116.50 },
            { name: 'farbdose_31', x: 500.80, y: 116.50 },

            // Bottom Shelf (8 cans, Y ~ 179..185)
            { name: 'farbdose_22', x: 363.15, y: 181.35 },
            { name: 'farbdose_33', x: 385.90, y: 184.75 },
            { name: 'farbdose_23', x: 406.80, y: 184.15 },
            { name: 'farbdose_24', x: 424.20, y: 184.70 },
            { name: 'farbdose_25', x: 442.55, y: 182.50 },
            { name: 'farbdose_26', x: 459.05, y: 184.15 },
            { name: 'farbdose_27', x: 475.45, y: 179.15 },
            { name: 'farbdose_28', x: 497.25, y: 185.25 }
        ];

        // Layer 1: Shelf Spray Cans (farbdose_1..33, 352% HD zoom = 86x229 px, scaled with Flash matrix 0.70)
        shelfCans.forEach((canData) => {
            const origX = canData.x * scaleS;
            const origY = canData.y * scaleS + offsetY;
            const origDepth = 20;

            let can = this.add.image(origX, origY, canData.name)
                .setOrigin(0.5, 0.5)
                .setScale(0.70)
                .setDepth(origDepth)
                .setInteractive({ draggable: true, useHandCursor: true });

            if (this.input && typeof this.input.setDraggable === 'function') {
                this.input.setDraggable(can);
            }

            can.origX = origX;
            can.origY = origY;
            can.origDepth = origDepth;
            can.canName = canData.name;

            can.on('dragstart', () => {
                const sfx = getSoundFx();
                if (sfx && typeof sfx.play === 'function') {
                    sfx.play(this, 'sfx_can_select');
                }
                if (this.tweens && typeof this.tweens.killTweensOf === 'function') {
                    this.tweens.killTweensOf(can);
                }
                can.setDepth(200);
            });

            can.on('drag', (pointer, dragX, dragY) => {
                can.x = dragX;
                can.y = dragY;
            });

            can.on('dragend', (pointer) => {
                const inventory = getCanInventory();
                const floorBoxes = floorCanSlots.map(slot => slot.bounds);
                let hitIndex = -1;
                const pointerX = pointer ? pointer.x : can.x;
                const pointerY = pointer ? pointer.y : can.y;
                const shelfBounds = {
                    x: can.x - 30.1,
                    y: can.y - 80.15,
                    width: 60.2,
                    height: 160.3
                };

                if (inventory && typeof inventory.findTargetFloorCan === 'function') {
                    hitIndex = inventory.findTargetFloorCan(pointerX, pointerY, floorBoxes, shelfBounds, 25);
                    if (hitIndex === -1) {
                        hitIndex = inventory.findTargetFloorCan(can.x, can.y, floorBoxes, shelfBounds, 25);
                    }
                }

                if (hitIndex >= 0 && hitIndex < floorCanSlots.length) {
                    const shelfColor = (inventory && typeof inventory.getShelfColor === 'function')
                        ? inventory.getShelfColor(canData.name)
                        : null;
                    if (shelfColor !== null) {
                        const sfx = getSoundFx();
                        if (sfx && typeof sfx.play === 'function') {
                            sfx.play(this, 'sfx_can_select');
                        }
                        const targetCap = floorCanSlots[hitIndex].cap;
                        targetCap.setTint(shelfColor);
                        if (typeof targetCap.setTintFill === 'function') {
                            targetCap.setTintFill(shelfColor);
                        }
                        if (inventory && typeof inventory.setFloorColor === 'function') {
                            inventory.setFloorColor(hitIndex, shelfColor);
                        }
                    }
                }

                // Snap back to shelf with smooth easeOut tween
                if (this.tweens && typeof this.tweens.add === 'function') {
                    this.tweens.add({
                        targets: can,
                        x: origX,
                        y: origY,
                        duration: 150,
                        ease: 'Quad.easeOut',
                        onComplete: () => {
                            can.setDepth(origDepth);
                        }
                    });
                } else {
                    can.setPosition(origX, origY);
                    can.setDepth(origDepth);
                }
            });
        });

        // Layer 2: Trainspotting is Flash depth 437, above all can sprites.
        // For 352% HD assets, the visual scale is the authentic Flash matrix scale 0.70.
        const TRAINSPOTTING_SCALE = 0.70;
        const TRAINSPOTTING_POS_SCALE = 0.70 * scaleS;
        const TRAINSPOTTING_X = -6.60 * scaleS;
        const TRAINSPOTTING_Y = 105.95 * scaleS + offsetY;
        const TRAIN_BITMAP_X_MIN = 321.90;
        const TRAIN_BITMAP_Y_MIN = -11.00;
        const FLASH_FRAME_MS = 40;
        const BACK_SHAKE_X = [
            ...[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
                .flatMap((offset) => [offset, 0]),
            ...Array(22).fill([1.0, 0]).flat(),
            ...[0.9, 0.9, 0.8, 0.8, 0.7, 0.7, 0.6, 0.6, 0.5, 0.5,
                0.4, 0.4, 0.3, 0.3, 0.2, 0.2, 0.1, 0.1]
                .flatMap((offset) => [offset, 0])
        ];
        const trainMaskSource = this.make.image({
            x: 77.75 * scaleS,
            y: 86.00 * scaleS + offsetY,
            key: 'home_train_window_mask',
            add: false
        })
            .setOrigin(0, 0)
            .setScale(TRAINSPOTTING_SCALE);
        const train = this.add.image(0, 0, 'home_train')
            .setOrigin(0, 0)
            .setScale(TRAINSPOTTING_SCALE)
            .setMask(trainMaskSource.createBitmapMask())
            .setVisible(false);

        // Shape 9 (depth 3) and lamp clip 7 (depth 5) stay above the train.
        this.add.image(74.25 * scaleS, 84.04 * scaleS + offsetY, 'home_train_window_foreground')
            .setOrigin(0, 0)
            .setScale(TRAINSPOTTING_SCALE);
        const lamp = this.add.image(0, 0, 'home_lamp')
            .setOrigin(176.90 / 352.80, 0)
            .setScale(TRAINSPOTTING_SCALE)
            .setDepth(50);

        const trainFrames = this.cache.json.get('home_train_timeline').frames;
        const lampFrames = this.cache.json.get('home_lamp_timeline').frames;
        if (trainFrames.length !== lampFrames.length) {
            throw new Error('Trainspotting timelines must have the same frame count.');
        }

        const applyTrainFrame = (frame) => {
            if (frame === null) {
                train.setVisible(false);
                return;
            }
            train
                .setVisible(true)
                .setPosition(
                    TRAINSPOTTING_X + TRAINSPOTTING_POS_SCALE * (frame.x + TRAIN_BITMAP_X_MIN * frame.scaleX),
                    TRAINSPOTTING_Y + TRAINSPOTTING_POS_SCALE * (frame.y + TRAIN_BITMAP_Y_MIN * frame.scaleY)
                )
                .setScale(TRAINSPOTTING_SCALE * frame.scaleX, TRAINSPOTTING_SCALE * frame.scaleY);
        };
        const applyLampFrame = (frame) => {
            lamp
                .setPosition(
                    TRAINSPOTTING_X + TRAINSPOTTING_POS_SCALE * frame.x,
                    TRAINSPOTTING_Y + TRAINSPOTTING_POS_SCALE * frame.y
                )
                .setScale(TRAINSPOTTING_SCALE * frame.scaleX, TRAINSPOTTING_SCALE * frame.scaleY)
                .setRotation(frame.rotation || 0);
        };
        const applyTrainspottingFrame = (frameIndex) => {
            const flashFrame = frameIndex + 1;
            if (flashFrame === 1) {
                bg.x = 0;
            }
            if (flashFrame === 110) {
                const sfx = getSoundFx();
                if (sfx && typeof sfx.play === 'function') {
                    sfx.play(this, 'home_trainspotting');
                }
            }
            if (flashFrame >= 110 && flashFrame <= 308 && (flashFrame - 110) % 2 === 0) {
                bg.x = BACK_SHAKE_X[(flashFrame - 110) / 2] * scaleS;
            }
            applyTrainFrame(trainFrames[frameIndex]);
            applyLampFrame(lampFrames[frameIndex]);
        };

        let trainspottingFrame = 0;
        applyTrainspottingFrame(trainspottingFrame);
        const trainspottingTimer = this.time.addEvent({
            delay: FLASH_FRAME_MS,
            loop: true,
            callback: () => {
                trainspottingFrame = (trainspottingFrame + 1) % trainFrames.length;
                applyTrainspottingFrame(trainspottingFrame);
            }
        });
        let trainspottingReset = false;
        const stopAndResetTrainspotting = () => {
            if (trainspottingReset) {
                return;
            }
            trainspottingReset = true;
            if (trainspottingTimer && typeof trainspottingTimer.remove === 'function') {
                trainspottingTimer.remove(false);
            }
            const sfx = getSoundFx();
            if (sfx && typeof sfx.stop === 'function') {
                sfx.stop(this, 'home_trainspotting');
            }
            trainspottingFrame = 0;
            applyTrainspottingFrame(trainspottingFrame);
        };
        const shutdownEvent = (typeof Phaser !== 'undefined' && Phaser.Scenes && Phaser.Scenes.Events)
            ? Phaser.Scenes.Events.SHUTDOWN
            : 'shutdown';
        this.events.once(shutdownEvent, stopAndResetTrainspotting);

        // Layer 3: MAIN MENUE return button (Flash PlaceObject2: 474.20, 284.45, 352% HD scale 0.70)
        let btnMainMenu = this.add.image(474.20 * scaleS, 284.45 * scaleS + offsetY, 'btn_mainmenu_hover')
            .setOrigin(0.5, 0.5)
            .setScale(0.70)
            .setDepth(60)
            .setInteractive({ useHandCursor: true });

        btnMainMenu.on('pointerover', () => {
            btnMainMenu.setScale(0.74);
            btnMainMenu.setTint(0xe6ff66);
        });

        btnMainMenu.on('pointerout', () => {
            btnMainMenu.setScale(0.70);
            btnMainMenu.clearTint();
        });

        btnMainMenu.on('pointerdown', () => {
            stopAndResetTrainspotting();
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('MenuScene');
            });
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomeScene;
}
