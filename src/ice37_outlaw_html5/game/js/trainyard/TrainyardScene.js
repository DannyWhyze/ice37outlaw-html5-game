(function attachTrainyardScene(globalScope) {
    'use strict';

    const BaseScene = (typeof Phaser !== 'undefined' && Phaser.Scene) ? Phaser.Scene : class {};

    class TrainyardScene extends BaseScene {
    constructor() {
        super({ key: 'TrainyardScene' });
    }

    create() {
        const LAYOUT = (typeof TrainyardNativeLayout !== 'undefined')
            ? TrainyardNativeLayout.LAYOUT
            : require('./trainyardNativeLayout.js').LAYOUT;
        this.layout = LAYOUT;

        const nativeScale = 1920 / 546;
        this.nativeScale = nativeScale;
        this.worldScrollSpeed = LAYOUT.scroll.worldScrollSpeed;

        this.playerCombatLogic = (typeof PlayerCombat !== 'undefined')
            ? PlayerCombat
            : require('../logic/playerCombat.js');

        const PlayerClass = (typeof Player !== 'undefined')
            ? Player
            : require('../prefabs/Player.js').Player;
        const CopClass = (typeof Cop !== 'undefined')
            ? Cop
            : require('../prefabs/Cop.js').Cop;
        const BackpackClass = (typeof Backpack !== 'undefined')
            ? Backpack
            : require('../prefabs/Backpack.js').Backpack;
        const HudClass = (typeof Hud !== 'undefined')
            ? Hud
            : (typeof require !== 'undefined' ? (require('../prefabs/Hud.js').Hud || require('../prefabs/Hud.js')) : null);
        const SoundFx = (typeof globalScope !== 'undefined' && globalScope.SoundFx)
            ? globalScope.SoundFx
            : ((typeof require !== 'undefined') ? (function() {
                try { return require('../logic/soundFx.js'); } catch (e) { return null; }
            })() : null);
        this.soundFx = SoundFx;

        // Layer 0: Trainyard 1080p Panorama Background (145.jpg / 9592.97 x 1054.95)
        this.worldLayer = this.add.container(0, 0);
        this.background = this.add.image(LAYOUT.background.x, LAYOUT.background.y, 'trainyard_background')
            .setOrigin(0, 0)
            .setDisplaySize(LAYOUT.background.width, LAYOUT.background.height)
            .setDepth(1);
        this.worldLayer.add(this.background);

        // Layer 1: Emergency Exits (Left and Right Doors & Shadows)
        const doorScale = 1.0;
        const shadowScale = 1.0;
        const doorOrigin = { x: 0.0375234521575985, y: 0.0410958904109589 };
        const shadowOrigin = { x: 0.8064516129032258, y: 0.043478260869565216 };

        // Left Exit (Door & Shadow)
        this.exitShadowLeft = this.add.image(LAYOUT.exits.leftDoor.x, LAYOUT.exits.leftDoor.y, 'halloffame_exit_shadow')
            .setOrigin(shadowOrigin.x, shadowOrigin.y)
            .setScale(shadowScale, shadowScale)
            .setDepth(4);
        this.exitLeft = this.add.image(LAYOUT.exits.leftDoor.x, LAYOUT.exits.leftDoor.y, 'halloffame_exit_door')
            .setOrigin(doorOrigin.x, doorOrigin.y)
            .setScale(doorScale, doorScale)
            .setDepth(5);

        // Right Exit (Door & Shadow, mirrored scaleX)
        this.exitShadowRight = this.add.image(LAYOUT.exits.rightDoor.x, LAYOUT.exits.rightDoor.y, 'halloffame_exit_shadow')
            .setOrigin(shadowOrigin.x, shadowOrigin.y)
            .setScale(-shadowScale, shadowScale)
            .setDepth(4);
        this.exitRight = this.add.image(LAYOUT.exits.rightDoor.x, LAYOUT.exits.rightDoor.y, 'halloffame_exit_door')
            .setOrigin(doorOrigin.x, doorOrigin.y)
            .setScale(-doorScale, doorScale)
            .setDepth(5);

        this.worldLayer.add([this.exitShadowLeft, this.exitLeft, this.exitShadowRight, this.exitRight]);

        // Layer 1: thePad (Spray effects canvas via SprayCanvas prefab) and paintmask (Shape 143)
        if (this.make && this.make.image) {
            this.maskImage = this.make.image({
                x: LAYOUT.paintmask.x,
                y: LAYOUT.paintmask.y,
                key: 'trainyard_paintmask',
                add: false,
            }).setOrigin(0, 0);
        }

        const SprayCanvasClass = (typeof SprayCanvas !== 'undefined')
            ? SprayCanvas
            : ((typeof require !== 'undefined') ? require('../prefabs/SprayCanvas.js').SprayCanvas : null);
        if (SprayCanvasClass) {
            this.sprayCanvas = new SprayCanvasClass(this, {
                worldWidth: 11000,
                worldHeight: 1080,
                worldOffsetX: 1000,
                depth: 10,
                maskImage: this.maskImage,
            });
            this.sprayEffects = this.sprayCanvas.renderTexture;
        } else {
            this.sprayEffects = this.add.graphics();
            this.sprayEffects.setDepth(10);
            if (this.maskImage && this.maskImage.createBitmapMask) {
                const mask = this.maskImage.createBitmapMask();
                this.sprayEffects.setMask(mask);
            }
        }
        this.syncPaintWorldPosition();

        this.paintInput = this.add.zone(0, 0, LAYOUT.canvas.width, LAYOUT.canvas.height)
            .setOrigin(0, 0)
            .setDepth(2)
            .setInteractive();
        this.isSpraying = false;
        this.activeSprayPointerId = null;
        this.lastSprayPoint = null;
        this.paintInput.on('pointerdown', (pointer) => this.beginSpray(pointer));
        this.paintInput.on('pointermove', (pointer) => this.continueSpray(pointer));
        this.paintInput.on('pointerout', (pointer) => this.endSpray(pointer));
        this.input.on('pointerup', (pointer) => this.endSpray(pointer));

        // Layer 2: Player Prefab (Unified Container: shadow, idle, walk, boxing, kick)
        this.player = new PlayerClass(this, LAYOUT.player.rootX, LAYOUT.player.rootY, LAYOUT.player, nativeScale);

        // Layer 2: Cop Prefab & Spawner (World space, copLayer container at depth 35 in front of sprayEffects, ground baseline matching player feet)
        const CopSpawnerHelper = (typeof CopSpawner !== 'undefined')
            ? CopSpawner
            : (typeof require !== 'undefined' ? require('../logic/copSpawner.js') : null);
        if (this.registry && typeof this.registry.set === 'function') {
            this.registry.set('copkill', 0);
        }
        this.copSpawner = CopSpawnerHelper ? new CopSpawnerHelper.CopSpawner({
            copdichte: CopSpawnerHelper.DEFAULT_TRAINYARD_COPDICHTE,
            copkill: 0,
        }) : null;


        this.copLayer = this.add.container(0, 0).setDepth(35);
        this.cop = new CopClass(this, 1350, LAYOUT.player.rootY + LAYOUT.player.walkHeight, 0, nativeScale, { isSpawned: false });
        this.cop.setFacingLeft(true);
        this.copLayer.add(this.cop.container);
        this.syncPaintWorldPosition();

        // Layer 3: Backpack Prefab (Backpack container, cans, tools, hit zones)
        this.sprayState = {
            color: 0x0000cc,
            cap: 5,
            opacity: 90,
            cursorStyle: 'can',
            tool: 'softcap',
        };

        // Multi-touch registration for simultaneous thumb movement & actions
        if (this.input && typeof this.input.addPointer === 'function') {
            this.input.addPointer(2);
        }

        // Prefab: Touch Controls Overlay (Layer 3: depth 250)
        const TouchControlsPrefab = (typeof TouchControls !== 'undefined')
            ? TouchControls
            : (typeof require !== 'undefined' ? require('../prefabs/TouchControls.js').TouchControls : null);
        if (TouchControlsPrefab) {
            this.touchControls = new TouchControlsPrefab(this);
        }

        // Prefab: Touch Brush Reticle (Layer 3: depth 201)
        const TouchBrushReticlePrefab = (typeof TouchBrushReticle !== 'undefined')
            ? TouchBrushReticle
            : (typeof require !== 'undefined' ? (function() { try { return require('../prefabs/TouchBrushReticle.js').TouchBrushReticle; } catch (_) { return null; } })() : null);
        if (TouchBrushReticlePrefab) {
            this.brushReticle = new TouchBrushReticlePrefab(this);
        }

        const PaletteHelper = (typeof BackpackPalette !== 'undefined')
            ? BackpackPalette
            : require('../logic/backpackPalette.js');
        this.backpack = new BackpackClass(this, LAYOUT.backpack.rootX, LAYOUT.backpack.rootY, LAYOUT.backpack, {
            onSelectTool: (tool, cap, opacity, cursorStyle) => {
                const selection = PaletteHelper.selectTool(this.sprayState, tool, cap, opacity, cursorStyle);
                this.sprayState = selection.sprayState;
                if (this.input && this.input.activePointer) {
                    this.updateToolCursor(this.input.activePointer);
                }
                if (this.backpack && this.backpack.setState) {
                    this.backpack.setState(selection.paletteState);
                }
            },
            onSelectColor: (color) => {
                const selection = PaletteHelper.selectColor(this.sprayState, color);
                this.sprayState = selection.sprayState;
                if (this.input && this.input.activePointer) {
                    this.updateToolCursor(this.input.activePointer);
                }
                if (this.backpack && this.backpack.setState) {
                    this.backpack.setState(selection.paletteState);
                }
            },
            onSelectPhone: () => {
                if (this.backpack && this.backpack.close) {
                    this.backpack.close();
                }
                if (this.cameraHud) {
                    this.cameraHud.open();
                }
            },
            onHoverBackpack: (isHovering) => {
                this.isBackpackCursor = isHovering;
                if (this.input && this.input.activePointer) {
                    this.updateToolCursor(this.input.activePointer);
                }
            },
            onStateChange: (paletteState) => {
                if (this.touchControls && typeof this.touchControls.setBackpackOpen === 'function') {
                    this.touchControls.setBackpackOpen(paletteState === 'open');
                }
            },
        });

        // Interactive Tool Cursor (matching Hall of Fame and Street)
        this.isBackpackCursor = false;
        this.game.canvas.style.cursor = 'none';
        if (this.input && typeof this.input.setDefaultCursor === 'function') {
            this.input.setDefaultCursor('none');
        }
        const CursorHelper = (typeof ToolCursor !== 'undefined')
            ? ToolCursor
            : require('../logic/toolCursor.js');
        const initialCursor = CursorHelper.getCursorPresentation(false, 'can');
        this.toolCursor = this.add.image(0, 0, initialCursor.key)
            .setOrigin(initialCursor.origin.x, initialCursor.origin.y)
            .setDepth(300)
            .setVisible(false);
        this.input.on('pointermove', (pointer) => this.updateToolCursor(pointer));
        this.input.on('gameout', () => this.toolCursor && this.toolCursor.setVisible(false));
        const params = (typeof window !== 'undefined' && window.location && window.location.search)
            ? new URLSearchParams(window.location.search)
            : null;
        if (params && params.get('cursor_x') && params.get('cursor_y')) {
            const cx = parseFloat(params.get('cursor_x'));
            const cy = parseFloat(params.get('cursor_y'));
            if (this.time && typeof this.time.delayedCall === 'function') {
                this.time.delayedCall(400, () => {
                    this.updateToolCursor({ x: cx, y: cy });
                });
            }
        }

        // Layer 3: HUD (Player Health Bar & Police Skull)
        if (HudClass) {
            this.hud = new HudClass(this, this.player);
        }

        // Layer 4: Screen Transition Blende (Highest depth 500)
        const BlendeClass = (typeof Blende !== 'undefined')
            ? Blende
            : (typeof require !== 'undefined' ? require('../prefabs/Blende.js').Blende : null);
        if (BlendeClass) {
            this.blende = new BlendeClass(this);
        }

        // Enterprise Gallery Storage Service & Prefab Overlay
        const GalleryStorageModule = (typeof GalleryStorage !== 'undefined')
            ? GalleryStorage
            : (typeof require !== 'undefined' ? require('../logic/galleryStorage.js') : null);
        if (GalleryStorageModule && GalleryStorageModule.GalleryStorageService) {
            this.galleryStorage = new GalleryStorageModule.GalleryStorageService();
        }

        const GalleryOverlayPrefab = (typeof GalleryOverlay !== 'undefined')
            ? GalleryOverlay
            : (typeof require !== 'undefined' ? require('../prefabs/GalleryOverlay.js').GalleryOverlay : null);
        if (GalleryOverlayPrefab) {
            this.galleryOverlay = new GalleryOverlayPrefab(this, {
                storage: this.galleryStorage,
                onClose: () => {
                    if (this.cameraHud && this.cameraHud.isOpen) {
                        this.cameraHud.container.setVisible(true);
                    }
                },
            });
        }

        // Prefab: Camera HUD (Photo Mode Overlay)
        const CameraHudClass = (typeof CameraHud !== 'undefined')
            ? CameraHud
            : (typeof require !== 'undefined' ? require('../prefabs/CameraHud.js').CameraHud : null);
        if (CameraHudClass) {
            this.cameraHud = new CameraHudClass(this, {
                storage: this.galleryStorage,
                onOpenGallery: () => {
                    if (this.cameraHud) {
                        this.cameraHud.container.setVisible(false);
                    }
                    if (this.galleryOverlay) {
                        this.galleryOverlay.open();
                    }
                },
            });
        }

        if (this.player) {
            this.player.onDeathComplete = () => {
                if (this.blende) {
                    this.blende.fadeOut(280, () => {
                        this.scene.start('MenuScene');
                    });
                } else {
                    this.scene.start('MenuScene');
                }
            };
        }

        this.input.on('pointermove', (pointer) => this.updateToolCursor(pointer));
        this.input.on('gameout', () => this.toolCursor.setVisible(false));

        if (this.events && this.events.once && typeof Phaser !== 'undefined' && Phaser.Scenes && Phaser.Scenes.Events) {
            this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                if (this.input && typeof this.input.setDefaultCursor === 'function') {
                    this.input.setDefaultCursor('default');
                }
                if (this.game && this.game.canvas && this.game.canvas.style) {
                    this.game.canvas.style.cursor = '';
                }
                this.endSpray();
            });
        }

        // Keyboard Controls (Scene-level Navigation)
        this.escKey = (this.input && this.input.keyboard && typeof this.input.keyboard.addKey === 'function' && typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard)
            ? this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
            : null;

        // Developer controls
        const DevControlsClass = (typeof DevControls !== 'undefined')
            ? DevControls
            : (typeof require !== 'undefined' ? require('../prefabs/DevControls.js').DevControls : null);
        if (DevControlsClass) {
            this.devControls = new DevControlsClass(this, this.player, this.cop, { enableCopKeys: false });
        }

        const CombatCollisionHelper = (typeof CombatCollision !== 'undefined')
            ? CombatCollision
            : (typeof require !== 'undefined' ? require('../logic/combatCollision.js') : null);
        this.combatCollision = CombatCollisionHelper;

        // Scene State Guard
        this.isLeavingTrainyard = false;
    }

    spawnCop(side = 'right', screenX = null) {
        if (!this.cop) return;
        if (this.copSpawner) {
            this.copSpawner.copanz = 1;
        }
        const targetScreenX = screenX !== null
            ? screenX
            : (side === 'left' ? -280 : 2200);
        const worldSpawnX = targetScreenX - this.worldLayer.x;
        this.cop.spawn(worldSpawnX, side === 'right');
        this.cop.deathCallback = () => {
            if (this.copSpawner) {
                const killResult = this.copSpawner.onCopKilled();
                if (this.registry && typeof this.registry.set === 'function') {
                    this.registry.set('copkill', killResult.copkill);
                    const currentBest = (typeof this.registry.get === 'function')
                        ? (this.registry.get('highscore') || 0)
                        : 0;
                    if (killResult.copkill > currentBest) {
                        this.registry.set('highscore', killResult.copkill);
                    }
                }
                if (this.hud) {
                    this.hud.setScore(killResult.copkill);
                }
            }
        };
    }

    update(_time, delta) {
        if (this.devControls) {
            this.devControls.update();
        }

        if (this.copSpawner) {
            const spawnResult = this.copSpawner.update(delta);
            if (spawnResult && spawnResult.shouldSpawn) {
                this.spawnCop(spawnResult.side, spawnResult.screenX);
            }
        }

        const playerScreenX = this.layout.player.rootX;
        const copScreenX = (this.cop && this.cop.isSpawned) ? (this.cop.x + this.worldLayer.x) : 0;
        const playerWorldX = playerScreenX - this.worldLayer.x;
        const combat = this.combatCollision;

        if (this.cop && this.cop.isSpawned && combat) {
            const isPlayerAlive = !this.player.isDead;
            const isCopAlive = !this.cop.isDead;

            if (isCopAlive && isPlayerAlive) {
                const distToPlayer = Math.abs(copScreenX - playerScreenX);
                if (!this.cop.isBoxing && !this.cop.isHurt && distToPlayer <= combat.NATIVE_COP_SENSOR_REACH) {
                    this.cop.setFacingLeft(copScreenX > playerScreenX);
                    this.cop.triggerBoxing();
                }

                this.cop.update(delta, playerWorldX, combat.NATIVE_COP_SENSOR_REACH, () => {
                    if (!this.player.isDead && combat.isTargetInReach(copScreenX, playerScreenX, this.cop.isFacingLeft, combat.NATIVE_COP_PUNCH_REACH)) {
                        if (typeof this.cop.triggerPunchHitStar === 'function') {
                            this.cop.triggerPunchHitStar();
                        }
                        this.player.applyDamage(combat.ATTACK_DAMAGE_PLAYER, copScreenX);
                    }
                });
            } else {
                this.cop.update(delta);
            }
        } else if (this.cop && this.cop.isSpawned) {
            this.cop.update(delta);
        }

        if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
            this.returnToMenu();
            return;
        }

        const scrollDistance = this.worldScrollSpeed * (delta / 1000);
        const isCameraActive = Boolean(this.cameraHud && this.cameraHud.isOpen);
        const input = (this.player && typeof this.player.getInputState === 'function')
            ? this.player.getInputState(isCameraActive)
            : { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: false };

        const wasBoxing = this.player ? this.player.isBoxing : false;
        const wasKicking = this.player ? this.player.isKicking : false;
        this.player.update(delta, input);

        const effectiveScrollDistance = this.playerCombatLogic.resolveCombatScrollDistance({
            normalDistance: scrollDistance,
            worldScrollSpeed: this.worldScrollSpeed,
            wasBoxing,
            isBoxing: this.player ? this.player.isBoxing : false,
            wasKicking,
            isKicking: this.player ? this.player.isKicking : false,
        });

        if (this.hud) {
            this.hud.update();
        }

        // Player attack collision with Cop
        if (this.cop && this.cop.isSpawned && combat && !this.cop.isDead && !this.player.isDead && !this.player.hasHitThisAttack) {
            let inImpactWindow = false;
            let attackReach = combat.NATIVE_PUNCH_REACH;

            if (this.player.isBoxing && combat.isPlayerPunchImpactFrame(this.player.boxingFrameNumber)) {
                inImpactWindow = true;
                attackReach = combat.NATIVE_PUNCH_REACH;
            } else if (this.player.isKicking && combat.isPlayerKickImpactFrame(this.player.kickFrameNumber)) {
                inImpactWindow = true;
                attackReach = combat.NATIVE_KICK_REACH;
            }

            if (inImpactWindow && combat.isTargetInReach(playerScreenX, copScreenX, this.player.isFacingLeft, attackReach)) {
                this.player.hasHitThisAttack = true;
                const attackType = this.player.isKicking ? 'kicking' : 'boxing';
                if (typeof this.player.triggerAttackHitStar === 'function') {
                    this.player.triggerAttackHitStar(attackType);
                }
                this.cop.applyHit(playerWorldX);
            }
        }

        if (!this.player.isDead && !this.player.isHurt) {
            if (input.isMovingLeft) {
                this.worldLayer.x += effectiveScrollDistance;
                this.syncPaintWorldPosition();
            } else if (input.isMovingRight) {
                this.worldLayer.x -= effectiveScrollDistance;
                this.syncPaintWorldPosition();
            }
        }

        if (this.hasReachedExit()) {
            this.returnToMenu();
        }
    }

    syncPaintWorldPosition() {
        const { x, y } = this.worldLayer;
        if (this.sprayCanvas) {
            this.sprayCanvas.setPosition(x, y);
        } else if (this.sprayEffects) {
            this.sprayEffects.setPosition(x, y);
        }
        if (this.maskImage) {
            this.maskImage.setPosition(this.layout.paintmask.x + x, this.layout.paintmask.y + y);
        }
        if (this.copLayer) {
            this.copLayer.setPosition(x, y);
        }
    }

    beginSpray(pointer) {
        if (this.cameraHud && this.cameraHud.isOpen) {
            return;
        }
        if (this.backpack && this.backpack.isOpen) {
            this.backpack.close();
            return;
        }
        if (this.touchControls && this.touchControls.isVisible) {
            const TouchLogic = (typeof TouchControlsLogic !== 'undefined') ? TouchControlsLogic : require('../logic/touchControlsLogic.js');
            if (TouchLogic && TouchLogic.isPointInControlZone(pointer.x, pointer.y)) {
                return;
            }
        }
        const TouchPointerModeModule = (typeof TouchPointerMode !== 'undefined')
            ? TouchPointerMode
            : (typeof require !== 'undefined' ? (function() { try { return require('../logic/touchPointerMode.js'); } catch (_) { return null; } })() : null);
        const isTouch = Boolean(this.touchControls && this.touchControls.isEnabled)
            || (TouchPointerModeModule ? TouchPointerModeModule.isTouchPointerEvent(pointer) : Boolean(pointer && (pointer.wasTouch || pointer.pointerType === 'touch')));
        const drawOffsetY = isTouch ? ((TouchPointerModeModule && typeof TouchPointerModeModule.TOUCH_DRAW_OFFSET_Y === 'number') ? TouchPointerModeModule.TOUCH_DRAW_OFFSET_Y : -65) : 0;

        const Spray = (typeof SprayPaint !== 'undefined') ? SprayPaint : require('../logic/sprayPaint.js');
        if (!Spray.canSpray(this.isLeavingTrainyard) || this.isBackpackCursor || (this.player && this.player.isDead)) {
            return;
        }
        this.activeSprayPointerId = pointer && pointer.id !== undefined ? pointer.id : 1;
        const nativeCap = Spray.getNativeCapSize(this.sprayState.cap);
        const canvas = (this.game && this.game.canvas) ? this.game.canvas : null;
        const worldX = (this.worldLayer && this.worldLayer.x) || 0;
        const startPoint = { x: pointer.x - worldX, y: pointer.y + drawOffsetY };
        this.isSpraying = true;
        this.sprayStroke = new Spray.SprayStroke(startPoint, nativeCap);
        this.lastSprayPoint = startPoint;
        if (this.sprayCanvas) {
            this.sprayCanvas.updateBrush(this.sprayState.color, this.sprayState.opacity / 100, nativeCap / 2);
        }
        this.stampSpray(startPoint.x, startPoint.y, nativeCap);
        this.updateToolCursor(pointer);
    }

    continueSpray(pointer) {
        const Spray = (typeof SprayPaint !== 'undefined') ? SprayPaint : require('../logic/sprayPaint.js');
        if (!Spray.canSpray(this.isLeavingTrainyard) || !this.isSpraying || !pointer.isDown || this.isBackpackCursor || (this.player && this.player.isDead)) {
            return;
        }
        const pointerId = pointer && pointer.id !== undefined ? pointer.id : 1;
        if (this.activeSprayPointerId !== null && pointerId !== this.activeSprayPointerId) {
            return;
        }
        const TouchPointerModeModule = (typeof TouchPointerMode !== 'undefined')
            ? TouchPointerMode
            : (typeof require !== 'undefined' ? (function() { try { return require('../logic/touchPointerMode.js'); } catch (_) { return null; } })() : null);
        const isTouch = Boolean(this.touchControls && this.touchControls.isEnabled)
            || (TouchPointerModeModule ? TouchPointerModeModule.isTouchPointerEvent(pointer) : Boolean(pointer && (pointer.wasTouch || pointer.pointerType === 'touch')));
        const drawOffsetY = isTouch ? ((TouchPointerModeModule && typeof TouchPointerModeModule.TOUCH_DRAW_OFFSET_Y === 'number') ? TouchPointerModeModule.TOUCH_DRAW_OFFSET_Y : -65) : 0;

        const nativeCap = Spray.getNativeCapSize(this.sprayState.cap);
        const canvas = (this.game && this.game.canvas) ? this.game.canvas : null;
        const worldX = (this.worldLayer && this.worldLayer.x) || 0;
        const points = Spray.extractPointerPoints(pointer, worldX, canvas, this.scale, drawOffsetY);
        if (this.sprayStroke) {
            const newStamps = this.sprayStroke.addPoints(points);
            if (this.sprayCanvas) {
                this.sprayCanvas.stampStroke(newStamps, nativeCap);
            } else {
                for (let i = 0; i < newStamps.length; i++) {
                    this.stampSpray(newStamps[i].x, newStamps[i].y, nativeCap);
                }
            }
        }
        if (points && points.length > 0) {
            this.lastSprayPoint = points[points.length - 1];
        }
        this.updateToolCursor(pointer);
    }

    endSpray(pointer) {
        if (pointer) {
            const pointerId = pointer.id !== undefined ? pointer.id : 1;
            if (this.activeSprayPointerId !== null && pointerId !== this.activeSprayPointerId) {
                return;
            }
        }
        this.activeSprayPointerId = null;
        const Spray = (typeof SprayPaint !== 'undefined') ? SprayPaint : require('../logic/sprayPaint.js');
        const nativeCap = (this.sprayState && this.sprayState.cap) ? Spray.getNativeCapSize(this.sprayState.cap) : 5;
        if (this.sprayStroke) {
            const finalStamps = this.sprayStroke.finish();
            if (this.sprayCanvas) {
                this.sprayCanvas.stampStroke(finalStamps, nativeCap);
            } else {
                for (let i = 0; i < finalStamps.length; i++) {
                    this.stampSpray(finalStamps[i].x, finalStamps[i].y, nativeCap);
                }
            }
        }
        this.isSpraying = false;
        this.sprayStroke = null;
        this.lastSprayPoint = null;
        if (this.brushReticle) {
            this.brushReticle.hide();
        }
    }

    stampSpray(x, y, nativeCap) {
        const Spray = (typeof SprayPaint !== 'undefined') ? SprayPaint : require('../logic/sprayPaint.js');
        const cap = nativeCap !== undefined ? nativeCap : Spray.getNativeCapSize(this.sprayState.cap);
        if (this.sprayCanvas) {
            this.sprayCanvas.updateBrush(this.sprayState.color, this.sprayState.opacity / 100, cap / 2);
            this.sprayCanvas.stamp(x, y, cap);
        } else if (this.sprayEffects && this.sprayEffects.fillStyle) {
            this.sprayEffects.fillStyle(this.sprayState.color, this.sprayState.opacity / 100);
            this.sprayEffects.fillCircle(x, y, cap / 2);
        }
    }

    hasReachedExit() {
        if (this.isLeavingTrainyard) {
            return false;
        }
        const playerX = this.layout.player.rootX;
        const playerHalfWidth = 100;

        // Left door in screen space
        const leftDoorScreenX = this.layout.exits.leftDoor.x + this.worldLayer.x;
        if (Math.abs(playerX - leftDoorScreenX) < playerHalfWidth) {
            return true;
        }

        // Right door in screen space
        const rightDoorScreenX = this.layout.exits.rightDoor.x + this.worldLayer.x;
        if (Math.abs(playerX - rightDoorScreenX) < playerHalfWidth) {
            return true;
        }

        return false;
    }

    updateToolCursor(pointer) {
        if (!this.toolCursor) return;

        // Check if active pointer interaction is touch or coarse mobile device
        const TouchPointerModeModule = (typeof TouchPointerMode !== 'undefined')
            ? TouchPointerMode
            : (typeof require !== 'undefined' ? (function() { try { return require('../logic/touchPointerMode.js'); } catch (_) { return null; } })() : null);

        const isCoarse = TouchPointerModeModule ? TouchPointerModeModule.isCoarsePointer() : false;
        const isTouch = Boolean(this.touchControls && this.touchControls.isEnabled)
            || isCoarse
            || (TouchPointerModeModule ? TouchPointerModeModule.isTouchPointerEvent(pointer) : Boolean(pointer && (pointer.wasTouch || pointer.pointerType === 'touch')));

        if (isTouch) {
            // Touchscreen / Mobile mode: virtual mouse cursor (tool/hand) is NEVER shown!
            this.toolCursor.setVisible(false);
            if (this.isSpraying && this.brushReticle && pointer) {
                const drawOffsetY = (TouchPointerModeModule && typeof TouchPointerModeModule.TOUCH_DRAW_OFFSET_Y === 'number') ? TouchPointerModeModule.TOUCH_DRAW_OFFSET_Y : -65;
                const cam = (this.cameras && this.cameras.main) ? this.cameras.main : null;
                const zoom = (cam && typeof cam.zoom === 'number') ? cam.zoom : 1.0;
                const scrollX = (cam && typeof cam.scrollX === 'number') ? cam.scrollX : 0;
                const scrollY = (cam && typeof cam.scrollY === 'number') ? cam.scrollY : 0;
                const targetX = (pointer.x - 960) / zoom + 960 + scrollX;
                const targetY = (pointer.y + drawOffsetY - 540) / zoom + 540 + scrollY;
                const cap = (this.sprayState && this.sprayState.cap) ? this.sprayState.cap : 5;
                const color = (this.sprayState && this.sprayState.color) ? this.sprayState.color : 0x000000;
                this.brushReticle.show(targetX, targetY, cap, color, zoom);
            } else if (this.brushReticle) {
                this.brushReticle.hide();
            }
            return;
        }

        // Desktop Mouse Pointer: Classic Retro Tool Cursor
        if (this.brushReticle) {
            this.brushReticle.hide();
        }

        const isCameraActive = Boolean(this.cameraHud && this.cameraHud.isOpen);
        const isGalleryActive = Boolean(this.galleryOverlay && this.galleryOverlay.isOpen);
        const isBackpackHovered = Boolean(
            this.isBackpackCursor ||
            (this.backpack && this.backpack.containsPoint && pointer && this.backpack.containsPoint(pointer.x, pointer.y))
        );
        const showHandCursor = Boolean(isBackpackHovered || isCameraActive || isGalleryActive);

        const CursorHelper = (typeof ToolCursor !== 'undefined') ? ToolCursor : require('../logic/toolCursor.js');
        const cursor = CursorHelper.getCursorPresentation(showHandCursor, this.sprayState ? this.sprayState.cursorStyle : 'can');
        this.toolCursor.setTexture(cursor.key);
        this.toolCursor.setOrigin(cursor.origin.x, cursor.origin.y);
        this.positionToolCursor(pointer);
        this.toolCursor.setVisible(true);
    }

    positionToolCursor(pointer) {
        if (!pointer || !this.toolCursor) return;
        const cam = (this.cameras && this.cameras.main) ? this.cameras.main : null;
        const zoom = (cam && typeof cam.zoom === 'number') ? cam.zoom : 1.0;
        const scrollX = (cam && typeof cam.scrollX === 'number') ? cam.scrollX : 0;
        const scrollY = (cam && typeof cam.scrollY === 'number') ? cam.scrollY : 0;
        let targetX;
        let targetY;
        if (typeof pointer.x === 'number' && typeof pointer.y === 'number') {
            targetX = (pointer.x - 960) / zoom + 960 + scrollX;
            targetY = (pointer.y - 540) / zoom + 540 + scrollY;
        } else {
            targetX = (typeof pointer.worldX === 'number') ? pointer.worldX : (pointer.x || 960);
            targetY = (typeof pointer.worldY === 'number') ? pointer.worldY : (pointer.y || 540);
        }
        this.toolCursor.setPosition(targetX, targetY).setScale(1 / zoom);
    }

    playTrainPassSound() {
        const soundFx = this.soundFx || ((typeof SoundFx !== 'undefined') ? SoundFx : null);
        if (soundFx && typeof soundFx.play === 'function') {
            return soundFx.play(this, 'sfx_train_pass');
        }
        return false;
    }

    returnToMenu() {
        if (this.isLeavingTrainyard) {
            return;
        }
        this.isLeavingTrainyard = true;
        if (this.blende) {
            this.blende.fadeOut(280, () => {
                this.scene.start('MenuScene');
            });
        } else {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('MenuScene');
            });
        }
    }
}

globalScope.TrainyardScene = TrainyardScene;
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrainyardScene };
}
}(typeof window !== 'undefined' ? window : (typeof globalThis === 'undefined' ? this : globalThis)));

