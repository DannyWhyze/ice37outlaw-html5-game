(function attachBackpackPrefab(globalScope) {
    'use strict';

    const Palette = (typeof BackpackPalette !== 'undefined')
        ? BackpackPalette
        : require('../logic/backpackPalette.js');
    const CanInventory = (typeof globalScope !== 'undefined' && globalScope.CanInventory)
        ? globalScope.CanInventory
        : ((typeof require !== 'undefined') ? (function() {
            try { return require('../logic/canInventory.js'); } catch (e) { return null; }
        })() : null);
    const SoundFx = (typeof globalScope !== 'undefined' && globalScope.SoundFx)
        ? globalScope.SoundFx
        : ((typeof require !== 'undefined') ? (function() {
            try { return require('../logic/soundFx.js'); } catch (e) { return null; }
        })() : null);

    class Backpack {
        constructor(scene, rootX, rootY, layoutBackpack, callbacks = {}) {
            this.scene = scene;
            this.rootX = rootX;
            this.rootY = rootY;
            this.layout = layoutBackpack;
            this.callbacks = callbacks;

            this.paletteState = 'closed';
            this.paletteVisuals = {};
            this.paletteHitZones = [];

            this.isHoveringBackpack = false;
            this.hoverTimer = null;

            // Container at root coordinates
            this.container = scene.add.container(rootX, rootY).setDepth(100);

            // Blind button hit zone for backpack icon
            this.backpackHitZone = scene.add.zone(rootX, rootY, 96 * layoutBackpack.scale, 98 * layoutBackpack.scale)
                .setOrigin(0, 0)
                .setDepth(101)
                .setInteractive();

            this.backpackHitZone.on('pointerover', () => {
                this.setBackpackHover(true);
                if (this.paletteState === 'closed') {
                    this.setState(Palette.setPaletteHover(this.paletteState, true));
                }
            });

            this.backpackHitZone.on('pointerout', () => {
                this.setBackpackHover(false);
                if (this.paletteState === 'hover') {
                    this.setState(Palette.setPaletteHover(this.paletteState, false));
                }
            });

            this.backpackHitZone.on('pointerdown', () => {
                this.toggle();
            });

            this.createPaletteHitZones();
            this.buildVisual(Palette.getBackpackVisualState(this.paletteState));
            this.updateInteractivity();

            const params = (typeof window !== 'undefined' && window.location && window.location.search)
                ? new URLSearchParams(window.location.search)
                : null;
            if (params && params.get('backpack') === 'open') {
                this.open();
                if (params.get('hover')) {
                    this.setPaletteHover(params.get('hover'), true);
                }
            }
        }

        getCanColors() {
            if (CanInventory && typeof CanInventory.getFloorColors === 'function') {
                return CanInventory.getFloorColors();
            }
            return [0x0000cc, 0xffffff, 0xffff33, 0x66ff33, 0xff0000, 0x000000];
        }

        setState(paletteState) {
            this.paletteState = paletteState;
            if (paletteState === 'closed') {
                this.isHoveringBackpack = false;
                if (this.callbacks.onHoverBackpack) {
                    this.callbacks.onHoverBackpack(false);
                }
            }
            this.buildVisual(Palette.getBackpackVisualState(paletteState));
            this.updateInteractivity();
            if (this.callbacks.onStateChange) {
                this.callbacks.onStateChange(paletteState);
            }
        }

        get isOpen() {
            return this.paletteState === 'open';
        }

        open() {
            this.setState(Palette.openPalette());
            return this;
        }

        close() {
            this.setBackpackHover(false);
            this.setState(Palette.closePalette());
            return this;
        }

        toggle() {
            if (this.isOpen) {
                return this.close();
            }
            return this.open();
        }

        buildVisual(state) {
            this.container.removeAll(true);
            const scale = this.layout.scale;
            const bodyKey = `halloffame_backpack_body_${state}`;
            const body = this.scene.add.image(0, 0, bodyKey).setOrigin(0, 0);
            if (state === 1) {
                body.setDisplaySize(this.layout.closedWidth, this.layout.closedHeight);
            } else if (state === 2) {
                body.setDisplaySize(this.layout.hoverWidth, this.layout.hoverHeight);
            } else if (state === 3) {
                body.setDisplaySize(this.layout.openWidth, this.layout.openHeight);
            }
            this.container.add(body);

            if (state !== 3) {
                return;
            }

            this.paletteVisuals = {};
            const tools = [
                { id: 'spraycan', key: 'halloffame_backpack_tool_1', x: 123.15, y: 35.05 },
                { id: 'fatcap', key: 'halloffame_backpack_tool_2', x: 123.15, y: 82.15 },
                { id: 'softcap', key: 'halloffame_backpack_tool_3', x: 123.15, y: 58.6 },
                { id: 'paintroller', key: 'halloffame_backpack_tool_4', x: 120, y: -1.55, scale: 0.8 },
            ];
            tools.forEach(({ id, key, x, y, scale: toolScale = 1 }) => {
                const image = this.scene.add.image(x * scale, y * scale, key)
                    .setOrigin(0.5, 0.5)
                    .setScale(toolScale);
                this.paletteVisuals[id] = image;
                this.container.add(image);
            });

            const currentColors = this.getCanColors();
            const cans = [
                { x: 145.05, y: 36.95, color: currentColors[0] },
                { x: 171.6, y: 36.95, color: currentColors[1] },
                { x: 198.15, y: 36.95, color: currentColors[2] },
                { x: 224.7, y: 36.95, color: currentColors[3] },
                { x: 251.25, y: 36.95, color: currentColors[4] },
                { x: 278.0, y: 36.95, color: currentColors[5] },
            ];
            cans.forEach(({ x, y, color }, index) => {
                const baseY = y * scale;
                const baseColorY = (y - 1.55) * scale;
                const bodyImage = this.scene.add.image(x * scale, baseY, 'halloffame_backpack_can_closed')
                    .setOrigin(0, 0);
                const colorImage = this.scene.add.image(
                    (x + 3.25) * scale,
                    baseColorY,
                    'halloffame_backpack_can_color',
                ).setOrigin(0, 0).setTintFill(color);
                this.paletteVisuals[`can${index + 1}`] = {
                    bodyImage,
                    colorImage,
                    baseY,
                    baseColorY,
                };
                this.container.add([bodyImage, colorImage]);
            });

            const phoneX = 304.55 * scale;
            const phoneBaseY = 49.07 * scale;
            const phoneImage = this.scene.add.image(phoneX, phoneBaseY, 'backpack_smartphone')
                .setOrigin(0, 0)
                .setDisplaySize(76, 114);
            this.paletteVisuals.smartphone = {
                image: phoneImage,
                baseY: phoneBaseY,
            };
            this.container.add(phoneImage);
        }

        createPaletteHitZones() {
            const root = { x: this.rootX, y: this.rootY };
            const scale = this.layout.scale;
            const createZone = (id, x, y, width, height, onPress, hoverScale = 1) => {
                const zone = this.scene.add.zone(
                    root.x + x * scale,
                    root.y + y * scale,
                    width * scale,
                    height * scale,
                ).setDepth(102).setInteractive();
                zone.on('pointerdown', () => onPress());
                zone.on('pointerover', () => {
                    this.setBackpackHover(true);
                    this.setPaletteHover(id, true, hoverScale);
                });
                zone.on('pointerout', () => {
                    this.setPaletteHover(id, false, hoverScale);
                    this.setBackpackHover(false);
                });
                return zone;
            };

            const selectTool = (tool, cap, opacity, cursorStyle) => () => {
                if (SoundFx && typeof SoundFx.play === 'function') {
                    SoundFx.play(this.scene, 'sfx_can_select');
                }
                if (this.callbacks.onSelectTool) {
                    this.callbacks.onSelectTool(tool, cap, opacity, cursorStyle);
                }
            };
            const selectCanIndex = (index) => () => {
                if (SoundFx && typeof SoundFx.play === 'function') {
                    SoundFx.play(this.scene, 'sfx_can_select');
                }
                const color = this.getCanColors()[index];
                if (this.callbacks.onSelectColor) {
                    this.callbacks.onSelectColor(color);
                }
            };
            const selectPhone = () => () => {
                if (this.callbacks.onSelectPhone) {
                    this.callbacks.onSelectPhone();
                }
            };

            this.paletteHitZones = [
                createZone('spraycan', 123.175, 35.05, 28.05, 22.4, selectTool('spraycan', 2, 98, 'can'), 1.05),
                createZone('fatcap', 123.175, 82.15, 28.05, 22.4, selectTool('fatcap', 10, 80, 'can'), 1.05),
                createZone('softcap', 123.175, 58.625, 27.45, 21.95, selectTool('softcap', 5, 90, 'can'), 1.05),
                createZone('paintroller', 119.975, -1.575, 42.28, 45.72, selectTool('paintroller', 28, 90, 'streiche'), 1.025),
                createZone('can1', 157.25, 62.525, 24.4, 55.65, selectCanIndex(0)),
                createZone('can2', 183.8, 62.525, 24.4, 55.65, selectCanIndex(1)),
                createZone('can3', 210.35, 62.525, 24.4, 55.65, selectCanIndex(2)),
                createZone('can4', 236.9, 62.525, 24.4, 55.65, selectCanIndex(3)),
                createZone('can5', 263.45, 62.525, 24.4, 55.65, selectCanIndex(4)),
                createZone('can6', 290.2, 62.525, 24.4, 55.65, selectCanIndex(5)),
                createZone('smartphone', 320.0, 72.23, 30.88, 46.31, selectPhone()),
            ];
        }

        updateInteractivity() {
            if (!this.paletteHitZones) {
                return;
            }
            this.paletteHitZones.forEach((zone) => {
                if (this.paletteState === 'open') {
                    zone.setActive(true).setVisible(true).setInteractive();
                } else {
                    zone.disableInteractive().setActive(false).setVisible(false);
                }
            });
        }

        setPaletteHover(id, isHovering, hoverScale) {
            const visual = this.paletteVisuals[id];
            if (!visual) {
                return;
            }
            if (visual.colorImage) {
                const scale = this.layout.scale;
                visual.bodyImage.setTexture(isHovering ? 'halloffame_backpack_can_open' : 'halloffame_backpack_can_closed');
                visual.bodyImage.y = visual.baseY - (isHovering ? 12.75 * scale : 0);
                visual.colorImage.y = visual.baseColorY - (isHovering ? 12.6 * scale : 0);
                return;
            }
            if (visual.image) {
                const scale = this.layout.scale;
                visual.image.y = visual.baseY - (isHovering ? 12.75 * scale : 0);
                return;
            }
            visual.setScale(visual.scaleX * (isHovering ? hoverScale : 1 / hoverScale));
        }

        setBackpackHover(isHovering) {
            if (isHovering) {
                if (this.hoverTimer) {
                    if (typeof this.hoverTimer.remove === 'function') {
                        this.hoverTimer.remove(false);
                    }
                    this.hoverTimer = null;
                }
                if (!this.isHoveringBackpack) {
                    this.isHoveringBackpack = true;
                    if (this.callbacks.onHoverBackpack) {
                        this.callbacks.onHoverBackpack(true);
                    }
                }
            } else {
                if (this.hoverTimer) {
                    if (typeof this.hoverTimer.remove === 'function') {
                        this.hoverTimer.remove(false);
                    }
                    this.hoverTimer = null;
                }
                const checkLeave = () => {
                    const activePointer = (this.scene && this.scene.input) ? this.scene.input.activePointer : null;
                    if (activePointer && this.containsPoint(activePointer.x, activePointer.y)) {
                        return;
                    }
                    this.isHoveringBackpack = false;
                    if (this.callbacks.onHoverBackpack) {
                        this.callbacks.onHoverBackpack(false);
                    }
                };
                if (this.scene && this.scene.time && typeof this.scene.time.delayedCall === 'function') {
                    this.hoverTimer = this.scene.time.delayedCall(40, checkLeave);
                } else {
                    checkLeave();
                }
            }
        }

        containsPoint(x, y) {
            if (typeof x !== 'number' || typeof y !== 'number') {
                return false;
            }
            const scale = this.layout.scale;
            if (this.paletteState === 'open') {
                const minX = 0;
                const maxX = this.rootX + 345 * scale;
                const minY = this.rootY - 25 * scale;
                const maxY = 1080;
                return x >= minX && x <= maxX && y >= minY && y <= maxY;
            }
            const minX = this.rootX;
            const maxX = this.rootX + (this.paletteState === 'hover' ? this.layout.hoverWidth : this.layout.closedWidth);
            const minY = this.rootY;
            const maxY = this.rootY + (this.paletteState === 'hover' ? this.layout.hoverHeight : this.layout.closedHeight);
            return x >= minX && x <= maxX && y >= minY && y <= maxY;
        }

        add(obj) { this.container.add(obj); }
        removeAll(destroy) { this.container.removeAll(destroy); }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Backpack };
    } else {
        globalScope.Backpack = Backpack;
    }
})(typeof window !== 'undefined' ? window : global);
