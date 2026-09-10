class HallOfFameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'HallOfFameScene' });
    }

    create() {
        const LAYOUT = (typeof HallOfFameNativeLayout !== 'undefined')
            ? HallOfFameNativeLayout.LAYOUT
            : require('./halloffameNativeLayout.js').LAYOUT;
        this.layout = LAYOUT;

        this.playerCombatLogic = (typeof PlayerCombat !== 'undefined')
            ? PlayerCombat
            : require('../logic/playerCombat.js');

        const nativeScale = 1920 / 546;
        const sprayerRoot = { x: LAYOUT.player.rootX, y: LAYOUT.player.rootY, scale: 0.35 * nativeScale };
        const flashScale = 0.6994781494140625 * nativeScale;

        // Layer 0: Native 1920 panorama background placement
        this.worldLayer = this.add.container(0, 0);
        this.background = this.add.image(LAYOUT.background.x, LAYOUT.background.y, 'halloffame_background')
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

        // Stage Edges (border pillars at depth 193)
        this.stageEdges = this.add.image(0, LAYOUT.stage.offsetY, 'halloffame_stage_edges')
            .setOrigin(0.1773049645390071, 0)
            .setScale(1.0, 1.0)
            .setDepth(193);

        this.isLeavingHallOfFame = false;

        // Layer 1: thePad (Spray effects canvas via SprayCanvas prefab) and paintmask (Shape 114)
        if (this.make && this.make.image) {
            this.maskImage = this.make.image({
                x: LAYOUT.paintmask.x,
                y: LAYOUT.paintmask.y,
                key: 'halloffame_paintmask',
                add: false,
            }).setOrigin(0, 0);
        }

        const SprayCanvasClass = (typeof SprayCanvas !== 'undefined')
            ? SprayCanvas
            : ((typeof require !== 'undefined') ? require('../prefabs/SprayCanvas.js').SprayCanvas : null);
        if (SprayCanvasClass) {
            this.sprayCanvas = new SprayCanvasClass(this, {
                worldWidth: 6000,
                worldHeight: 1080,
                worldOffsetX: 1000,
                depth: 33,
                maskImage: this.maskImage,
            });
            this.sprayEffects = this.sprayCanvas.renderTexture;
        } else {
            this.sprayEffects = this.add.graphics();
            this.sprayEffects.setDepth(33);
            if (this.maskImage && this.maskImage.createBitmapMask) {
                const mask = this.maskImage.createBitmapMask();
                this.sprayEffects.setMask(mask);
            }
        }

        this.syncSprayMaskWorldPosition();
        this.worldLayer.sort('depth');

        this.sprayState = {
            color: 0x0000cc,
            cap: 5,
            opacity: 90,
            cursorStyle: 'can',
            tool: 'softcap',
        };
        this.isBackpackCursor = false;
        this.game.canvas.style.cursor = 'none';
        if (this.input && typeof this.input.setDefaultCursor === 'function') {
            this.input.setDefaultCursor('none');
        }
        const CursorHelper = (typeof ToolCursor !== 'undefined') ? ToolCursor : require('../logic/toolCursor.js');
        const initialCursor = CursorHelper.getCursorPresentation(false, 'can');
        this.toolCursor = this.add.image(0, 0, initialCursor.key)
            .setOrigin(initialCursor.origin.x, initialCursor.origin.y)
            .setDepth(300)
            .setVisible(false);
        this.input.on('pointermove', (pointer) => this.updateToolCursor(pointer));
        this.input.on('gameout', () => this.toolCursor.setVisible(false));
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
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            if (this.input && typeof this.input.setDefaultCursor === 'function') {
                this.input.setDefaultCursor('default');
            }
            this.game.canvas.style.cursor = '';
        });
        this.paintInput = this.add.zone(0, 0, LAYOUT.canvas.width, LAYOUT.canvas.height)
            .setOrigin(0, 0)
            .setDepth(1)
            .setInteractive();
        this.isSpraying = false;
        this.activeSprayPointerId = null;
        this.lastSprayPoint = null;
        this.paintInput.on('pointerdown', (pointer) => this.beginSpray(pointer));
        this.paintInput.on('pointermove', (pointer) => this.continueSpray(pointer));
        this.paintInput.on('pointerout', (pointer) => this.endSpray(pointer));
        this.input.on('pointerup', (pointer) => this.endSpray(pointer));

        // Prefab 1: Player (Layer 1: CharID 113 at depth 37)
        const PlayerPrefab = (typeof Player !== 'undefined')
            ? Player
            : require('../prefabs/Player.js').Player;
        this.player = new PlayerPrefab(this, sprayerRoot.x, sprayerRoot.y, LAYOUT.player, sprayerRoot.scale);
        this.playerContainer = this.player.container;
        this.playerShadow = this.player.playerShadow;
        this.idleSprayer = this.player.idleSprayer;
        this.walkingSprayer = this.player.walkingSprayer;
        this.boxingSprayer = this.player.boxingSprayer;
        this.kickSprayer = this.player.kickSprayer;

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

        // Prefab 2: Backpack (Layer 3: CharID 74 at depth 100)
        const BackpackPrefab = (typeof Backpack !== 'undefined')
            ? Backpack
            : require('../prefabs/Backpack.js').Backpack;
        const PaletteHelper = (typeof BackpackPalette !== 'undefined')
            ? BackpackPalette
            : require('../logic/backpackPalette.js');
        this.backpack = new BackpackPrefab(this, LAYOUT.backpack.rootX, LAYOUT.backpack.rootY, LAYOUT.backpack, {
            onSelectTool: (tool, cap, opacity, cursorStyle) => {
                const selection = PaletteHelper.selectTool(this.sprayState, tool, cap, opacity, cursorStyle);
                this.sprayState = selection.sprayState;
                this.updateToolCursor(this.input.activePointer);
                this.setBackpackState(selection.paletteState);
            },
            onSelectColor: (color) => {
                const selection = PaletteHelper.selectColor(this.sprayState, color);
                this.sprayState = selection.sprayState;
                this.setBackpackState(selection.paletteState);
            },
            onHoverBackpack: (isHovering) => {
                this.isBackpackCursor = isHovering;
                this.updateToolCursor(this.input.activePointer);
            },
            onSelectPhone: () => {
                if (this.backpack && this.backpack.close) {
                    this.backpack.close();
                }
                if (this.cameraHud) {
                    this.cameraHud.open();
                }
            },
            onStateChange: (paletteState) => {
                this.paletteState = paletteState;
                if (this.touchControls && typeof this.touchControls.setBackpackOpen === 'function') {
                    this.touchControls.setBackpackOpen(paletteState === 'open');
                }
            },
        });
        this.paletteState = this.backpack.paletteState;
        this.backpackHitZone = this.backpack.backpackHitZone;
        this.paletteHitZones = this.backpack.paletteHitZones;

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

        // Prefab: Camera HUD (Layer 3: Photo Mode Overlay)
        const CameraHudPrefab = (typeof CameraHud !== 'undefined')
            ? CameraHud
            : (typeof require !== 'undefined' ? require('../prefabs/CameraHud.js').CameraHud : null);
        if (CameraHudPrefab) {
            this.cameraHud = new CameraHudPrefab(this, {
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

        // Native 1920 scroll speed (527.47 px/s, corresponds to 150 px/s in Flash)
        this.worldScrollSpeed = LAYOUT.scroll.worldScrollSpeed;

        // Developer controls
        const DevControlsClass = (typeof DevControls !== 'undefined')
            ? DevControls
            : (typeof require !== 'undefined' ? require('../prefabs/DevControls.js').DevControls : null);
        if (DevControlsClass) {
            this.devControls = new DevControlsClass(this, this.player);
        }

        // Screen Transition Blende (Highest depth 500)
        const BlendeClass = (typeof Blende !== 'undefined')
            ? Blende
            : (typeof require !== 'undefined' ? require('../prefabs/Blende.js').Blende : null);
        if (BlendeClass) {
            this.blende = new BlendeClass(this);
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
    }

    update(_time, delta) {
        if (this.devControls) {
            this.devControls.update();
        }

        const scrollDistance = this.worldScrollSpeed * (delta / 1000);
        const isCameraActive = Boolean(this.cameraHud && this.cameraHud.isOpen);
        const input = (this.player && typeof this.player.getInputState === 'function')
            ? this.player.getInputState(isCameraActive)
            : { isMovingLeft: false, isMovingRight: false, isBoxingDown: false, isKickDown: false };

        const wasBoxing = this.player ? this.player.isBoxing : false;
        const wasKicking = this.player ? this.player.isKicking : false;
        this.player.update(delta, input);
        this.isFacingLeft = this.player.isFacingLeft;

        const effectiveScrollDistance = this.playerCombatLogic.resolveCombatScrollDistance({
            normalDistance: scrollDistance,
            worldScrollSpeed: this.worldScrollSpeed,
            wasBoxing,
            isBoxing: this.player ? this.player.isBoxing : false,
            wasKicking,
            isKicking: this.player ? this.player.isKicking : false,
        });

        if (input.isMovingLeft) {
            this.worldLayer.x += effectiveScrollDistance;
        } else if (input.isMovingRight) {
            this.worldLayer.x -= effectiveScrollDistance;
        }
        this.syncSprayMaskWorldPosition();

        if (this.hasReachedExit()) {
            this.returnToMenu();
        }
    }

    playBoxingAnimation(delta) {
        this.player.playBoxingAnimation(delta);
    }

    applyBoxingFrame() {
        this.player.applyBoxingFrame();
    }

    stopBoxingAnimation() {
        this.player.stopBoxingAnimation();
    }

    playKickAnimation(delta) {
        this.player.playKickAnimation(delta);
    }

    applyKickFrame() {
        this.player.applyKickFrame();
    }

    stopKickAnimation() {
        this.player.stopKickAnimation();
    }

    updatePlayerShadow(playerPresentation) {
        this.player.updateShadow(playerPresentation);
    }

    playWalkAnimation() {
        this.player.playWalkAnimation();
    }

    setBackpackState(paletteState) {
        this.paletteState = paletteState;
        this.backpack.setState(paletteState);
    }

    buildBackpackVisual(state) {
        this.backpack.buildVisual(state);
    }

    createPaletteHitZones() {
        this.backpack.createPaletteHitZones();
    }

    updatePaletteInteractivity() {
        this.backpack.updateInteractivity();
    }

    setPaletteHover(id, isHovering, hoverScale) {
        this.backpack.setPaletteHover(id, isHovering, hoverScale);
    }

    syncSprayMaskWorldPosition() {
        const x = (this.worldLayer && typeof this.worldLayer.x === 'number') ? this.worldLayer.x : 0;
        const y = (this.worldLayer && typeof this.worldLayer.y === 'number') ? this.worldLayer.y : 0;
        if (this.sprayCanvas) {
            this.sprayCanvas.setPosition(x, y);
        } else if (this.sprayEffects) {
            this.sprayEffects.setPosition(x, y);
        }
        if (this.maskImage && this.layout && this.layout.paintmask) {
            this.maskImage.x = this.layout.paintmask.x + x;
            this.maskImage.y = this.layout.paintmask.y + y;
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
        const TouchLogic = (typeof TouchControlsLogic !== 'undefined')
            ? TouchControlsLogic
            : (typeof require !== 'undefined' ? require('../logic/touchControlsLogic.js') : null);
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
        if (!Spray.canSpray(this.isLeavingHallOfFame) || (this.player && this.player.isDead)) {
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
        if (!Spray.canSpray(this.isLeavingHallOfFame) || !this.isSpraying || !pointer.isDown || (this.player && this.player.isDead)) {
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

    hasReachedExit() {
        if (this.isLeavingHallOfFame) {
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

    returnToMenu() {
        if (this.isLeavingHallOfFame) {
            return;
        }
        this.isLeavingHallOfFame = true;
        this.endSpray();
        if (this.blende) {
            this.blende.fadeOut(280, () => {
                this.scene.start('MenuScene');
            });
        } else if (this.cameras && this.cameras.main) {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('MenuScene');
            });
        } else {
            this.scene.start('MenuScene');
        }
    }
}

if (typeof window !== 'undefined') {
    window.HallOfFameScene = HallOfFameScene;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { HallOfFameScene };
}

