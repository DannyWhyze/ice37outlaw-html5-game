(function attachDevControls(globalScope) {
    'use strict';

    class DevControls {
        constructor(scene, player, cop = null, options = {}) {
            this.scene = scene;
            this.player = player;
            this.cop = cop;
            this.enableCopKeys = options.enableCopKeys !== undefined ? Boolean(options.enableCopKeys) : true;
            this.dieKey = null;
            this.hurtKey = null;
            this.copWalkKey = null;
            this.copBoxKey = null;
            this.copHurtKey = null;
            this.copDieKey = null;
            this.copRespawnKey = null;
            this.hitboxKey = null;
            this.showHitboxes = false;
            this.hitboxGraphics = null;

            if (scene.input && scene.input.keyboard) {
                const KeyCodes = (typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.KeyCodes)
                    ? Phaser.Input.Keyboard.KeyCodes
                    : { K: 75, H: 72, G: 71, B: 66, T: 84, O: 79, R: 82, X: 88 };
                const kCode = KeyCodes.K || 75;
                const hCode = KeyCodes.H || 72;
                const xCode = KeyCodes.X || 88;
                this.dieKey = scene.input.keyboard.addKey(kCode);
                this.hurtKey = scene.input.keyboard.addKey(hCode);
                this.hitboxKey = scene.input.keyboard.addKey(xCode);

                if (this.enableCopKeys) {
                    const gCode = KeyCodes.G || 71;
                    const bCode = KeyCodes.B || 66;
                    const tCode = KeyCodes.T || 84;
                    const oCode = KeyCodes.O || 79;
                    const rCode = KeyCodes.R || 82;
                    this.copWalkKey = scene.input.keyboard.addKey(gCode);
                    this.copBoxKey = scene.input.keyboard.addKey(bCode);
                    this.copHurtKey = scene.input.keyboard.addKey(tCode);
                    this.copDieKey = scene.input.keyboard.addKey(oCode);
                    this.copRespawnKey = scene.input.keyboard.addKey(rCode);
                }
            }
        }

        orientPlayerTowardsCop() {
            if (!this.player || typeof this.player.setFacingLeft !== 'function' || !this.cop) {
                return;
            }
            const playerScreenX = this.player.container ? this.player.container.x : (typeof this.player.x === 'number' ? this.player.x : 960);
            const copScreenX = (typeof this.cop.screenX === 'number')
                ? this.cop.screenX
                : ((this.cop.container ? this.cop.container.x : (typeof this.cop.x === 'number' ? this.cop.x : 0)) + ((this.scene && this.scene.worldLayer && typeof this.scene.worldLayer.x === 'number') ? this.scene.worldLayer.x : 0));
            this.player.setFacingLeft(copScreenX < playerScreenX);
        }

        orientCopTowardsPlayer() {
            if (!this.cop || typeof this.cop.setFacingLeft !== 'function') {
                return;
            }
            const player = this.player;
            if (!player) {
                return;
            }
            const playerScreenX = player.container ? player.container.x : (typeof player.x === 'number' ? player.x : 960);
            const copScreenX = (typeof this.cop.screenX === 'number')
                ? this.cop.screenX
                : ((this.cop.container ? this.cop.container.x : (typeof this.cop.x === 'number' ? this.cop.x : 0)) + ((this.scene && this.scene.worldLayer && typeof this.scene.worldLayer.x === 'number') ? this.scene.worldLayer.x : 0));
            this.cop.setFacingLeft(playerScreenX < copScreenX);
        }

        triggerHurt() {
            if (!this.player || typeof this.player.triggerHurt !== 'function') {
                return;
            }
            this.orientPlayerTowardsCop();
            this.player.triggerHurt();
        }

        toggleDeath() {
            if (!this.player) {
                return;
            }
            if (this.player.isDead) {
                this.player.revive();
            } else {
                this.player.triggerDeath();
            }
        }

        toggleCopWalk() {
            if (!this.cop || typeof this.cop.toggleWalk !== 'function') {
                return;
            }
            this.cop.toggleWalk();
        }

        triggerCopBoxing() {
            if (!this.cop || typeof this.cop.triggerBoxing !== 'function') {
                return;
            }
            this.cop.triggerBoxing();
        }

        triggerCopHurt() {
            if (!this.cop || typeof this.cop.triggerHurt !== 'function') {
                return;
            }
            this.orientCopTowardsPlayer();
            this.cop.triggerHurt();
        }

        triggerCopDeath() {
            if (!this.cop || typeof this.cop.triggerDeath !== 'function') {
                return;
            }
            this.orientCopTowardsPlayer();
            this.cop.triggerDeath();
        }

        respawnCop() {
            if (!this.cop || typeof this.cop.respawn !== 'function') {
                return;
            }
            this.cop.respawn();
        }

        toggleHitboxDebug() {
            this.showHitboxes = !this.showHitboxes;
            if (!this.showHitboxes && this.hitboxGraphics && typeof this.hitboxGraphics.clear === 'function') {
                this.hitboxGraphics.clear();
            }
            return this.showHitboxes;
        }

        renderHitboxes() {
            if (!this.scene || !this.scene.add || typeof this.scene.add.graphics !== 'function') {
                return;
            }
            if (!this.hitboxGraphics) {
                this.hitboxGraphics = this.scene.add.graphics();
                if (this.hitboxGraphics && this.hitboxGraphics.setDepth) {
                    this.hitboxGraphics.setDepth(150);
                }
            }
            if (!this.hitboxGraphics || typeof this.hitboxGraphics.clear !== 'function') {
                return;
            }

            const g = this.hitboxGraphics;
            g.clear();

            // 1. Player hitboxes (Green)
            if (this.player && this.player.container) {
                const playerScreenX = this.player.container.x;
                const feetY = this.player.container.y + (this.player.layout ? this.player.layout.walkHeight : 470);

                // Body box (width 200, height 470)
                if (typeof g.lineStyle === 'function') g.lineStyle(2, 0x00ff00, 1.0);
                if (typeof g.strokeRect === 'function') g.strokeRect(playerScreenX - 100, feetY - 470, 200, 470);

                // Attack reach box
                const isLeft = this.player.isFacingLeft;
                if (this.player.isBoxing) {
                    const reach = 210;
                    const reachX = isLeft ? (playerScreenX - reach) : playerScreenX;
                    if (typeof g.lineStyle === 'function') g.lineStyle(2, 0x33ff33, 0.8);
                    if (typeof g.strokeRect === 'function') g.strokeRect(reachX, feetY - 380, reach, 180);
                } else if (this.player.isKicking) {
                    const reach = 250;
                    const reachX = isLeft ? (playerScreenX - reach) : playerScreenX;
                    if (typeof g.lineStyle === 'function') g.lineStyle(2, 0x33ff33, 0.8);
                    if (typeof g.strokeRect === 'function') g.strokeRect(reachX, feetY - 300, reach, 250);
                }
            }

            // 2. Cop hitboxes (Red) & Sensor (Yellow)
            if (this.cop && this.cop.container && this.cop.isSpawned && !this.cop.isDead) {
                const worldOffsetX = (this.scene.worldLayer && typeof this.scene.worldLayer.x === 'number')
                    ? this.scene.worldLayer.x
                    : 0;
                const copScreenX = this.cop.x + worldOffsetX;
                const copFeetY = this.cop.y;

                // Cop Body box (width 180, height 470)
                if (typeof g.lineStyle === 'function') g.lineStyle(2, 0xff0000, 1.0);
                if (typeof g.strokeRect === 'function') g.strokeRect(copScreenX - 90, copFeetY - 470, 180, 470);

                const isLeft = this.cop.isFacingLeft;

                // Approach Sensor 'ht' (Yellow - reach 200)
                const sensorReach = 200;
                const sensorX = isLeft ? (copScreenX - sensorReach) : copScreenX;
                if (typeof g.lineStyle === 'function') g.lineStyle(2, 0xffff00, 0.8);
                if (typeof g.strokeRect === 'function') g.strokeRect(sensorX, copFeetY - 420, sensorReach, 420);

                // Punch reach (Red - reach 180)
                if (this.cop.isBoxing) {
                    const punchReach = 180;
                    const punchX = isLeft ? (copScreenX - punchReach) : copScreenX;
                    if (typeof g.lineStyle === 'function') g.lineStyle(2, 0xff3333, 0.9);
                    if (typeof g.strokeRect === 'function') g.strokeRect(punchX, copFeetY - 380, punchReach, 180);
                }
            }
        }

        update() {
            if (typeof Phaser !== 'undefined' && Phaser.Input && Phaser.Input.Keyboard && Phaser.Input.Keyboard.JustDown) {
                if (this.dieKey && Phaser.Input.Keyboard.JustDown(this.dieKey)) {
                    this.toggleDeath();
                }
                if (this.hurtKey && Phaser.Input.Keyboard.JustDown(this.hurtKey)) {
                    this.triggerHurt();
                }
                if (this.copWalkKey && Phaser.Input.Keyboard.JustDown(this.copWalkKey)) {
                    this.toggleCopWalk();
                }
                if (this.copBoxKey && Phaser.Input.Keyboard.JustDown(this.copBoxKey)) {
                    this.triggerCopBoxing();
                }
                if (this.copHurtKey && Phaser.Input.Keyboard.JustDown(this.copHurtKey)) {
                    this.triggerCopHurt();
                }
                if (this.copDieKey && Phaser.Input.Keyboard.JustDown(this.copDieKey)) {
                    this.triggerCopDeath();
                }
                if (this.copRespawnKey && Phaser.Input.Keyboard.JustDown(this.copRespawnKey)) {
                    this.respawnCop();
                }
                if (this.hitboxKey && Phaser.Input.Keyboard.JustDown(this.hitboxKey)) {
                    this.toggleHitboxDebug();
                }
            }

            if (this.showHitboxes) {
                this.renderHitboxes();
            } else if (this.hitboxGraphics && typeof this.hitboxGraphics.clear === 'function') {
                this.hitboxGraphics.clear();
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { DevControls };
    } else {
        globalScope.DevControls = DevControls;
    }
})(typeof window !== 'undefined' ? window : global);
