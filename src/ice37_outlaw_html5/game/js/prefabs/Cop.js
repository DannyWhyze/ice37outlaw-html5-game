(function attachCopPrefab(globalScope) {
    'use strict';

    const CopLogic = (typeof globalScope.CopLogic !== 'undefined')
        ? globalScope.CopLogic
        : (typeof require !== 'undefined' ? require('../logic/copLogic.js') : null);

    const CopCombat = (typeof globalScope.CopCombat !== 'undefined')
        ? globalScope.CopCombat
        : (typeof require !== 'undefined' ? require('../logic/copCombat.js') : null);

    const CopHurt = (typeof globalScope.CopHurt !== 'undefined')
        ? globalScope.CopHurt
        : (typeof require !== 'undefined' ? require('../logic/copHurt.js') : null);

    const CopDeath = (typeof globalScope.CopDeath !== 'undefined')
        ? globalScope.CopDeath
        : (typeof require !== 'undefined' ? require('../logic/copDeath.js') : null);

    const SoundFx = (typeof globalScope.SoundFx !== 'undefined')
        ? globalScope.SoundFx
        : (typeof require !== 'undefined' ? require('../logic/soundFx.js') : null);

    class Cop {
        /**
         * @param {Phaser.Scene} scene
         * @param {number} x
         * @param {number} y
         * @param {number} [walkHeight=0] Vertical offset to ground feet line inside container
         * @param {number} [nativeScale=1920/546]
         */
        constructor(scene, x, y, walkHeight = 0, nativeScale = 1920 / 546, options = {}) {
            this.scene = scene;
            this.walkHeight = walkHeight;
            this.nativeScale = nativeScale;

            this.isSpawned = (options && options.isSpawned !== undefined) ? Boolean(options.isSpawned) : true;
            this.isFacingLeft = false;
            this.isWalking = false;
            this.isBoxing = false;
            this.isHurt = false;
            this.isDead = false;
            this.walkTick = 1;
            this.walkElapsed = 0;
            this.boxingTick = 1;
            this.boxingElapsed = 0;
            this.boxingCallback = null;
            this.hasHitThisPunch = false;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtCallback = null;
            this.deathTick = 1;
            this.deathElapsed = 0;
            this.deathCallback = null;
            this.deathComplete = false;
            this.hitCount = 0;
            this.maxHits = 3;
            this.speed = CopLogic ? CopLogic.NATIVE_COPSPEED_PER_SEC : 175.82;

            // Root container
            this.container = scene.add.container(x, y).setDepth(37);

            // Ground shadow (scaled to match cop proportions)
            const shadowKey = (scene.textures && scene.textures.exists('player_shadow'))
                ? 'player_shadow'
                : 'halloffame_player_shadow';
            this.shadow = scene.add.image(0, walkHeight, shadowKey)
                .setOrigin(0.5, 0.5)
                .setScale(nativeScale * 0.35 * 0.25 * 1.15)
                .setDepth(36)
                .setVisible(true);

            // Cop walk sprite (295x518 native)
            const walkDims = CopLogic ? CopLogic.FRAME_DIMENSIONS : { width: 295, height: 518 };
            const walkOrigin = CopLogic ? CopLogic.SHAPE_ORIGIN : { x: 0.5, y: 1.0 };
            const initialWalkFrame = (CopLogic && CopLogic.FRAME_KEYS) ? CopLogic.FRAME_KEYS[0] : 'cop_walk_01';

            this.walkSprite = scene.add.sprite(0, walkHeight, initialWalkFrame)
                .setOrigin(walkOrigin.x, walkOrigin.y)
                .setDepth(37)
                .setVisible(true);

            if (this.walkSprite.setDisplaySize) {
                this.walkSprite.setDisplaySize(walkDims.width, walkDims.height);
            }

            // Cop boxing sprite (592x519 native, origin 0.37025, 1.0)
            const boxingDims = CopCombat ? CopCombat.FRAME_DIMENSIONS : { width: 592, height: 519 };
            const boxingOrigin = CopCombat ? CopCombat.SHAPE_ORIGIN : { x: 0.37025, y: 1.0 };
            const initialBoxingFrame = (CopCombat && CopCombat.FRAME_KEYS) ? CopCombat.FRAME_KEYS[0] : 'cop_boxing_01';

            this.boxingSprite = scene.add.sprite(0, walkHeight, initialBoxingFrame)
                .setOrigin(boxingOrigin.x, boxingOrigin.y)
                .setDepth(37)
                .setVisible(false);

            if (this.boxingSprite.setDisplaySize) {
                this.boxingSprite.setDisplaySize(boxingDims.width, boxingDims.height);
            }

            // Cop hurt sprite (250x516 native, origin 0.36503, 1.0)
            const hurtDims = CopHurt ? CopHurt.FRAME_DIMENSIONS.cop_hurt_character : { width: 250, height: 516 };
            const hurtOrigin = CopHurt ? CopHurt.SHAPE_ORIGINS.character : { x: 0.36503, y: 1.0 };
            const initialHurtFrame = CopHurt ? CopHurt.FRAME_KEYS.character : 'cop_hurt_character';

            this.hurtSprite = scene.add.sprite(0, walkHeight, initialHurtFrame)
                .setOrigin(hurtOrigin.x, hurtOrigin.y)
                .setDepth(37)
                .setVisible(false);

            if (this.hurtSprite.setDisplaySize) {
                this.hurtSprite.setDisplaySize(hurtDims.width, hurtDims.height);
            }

            // Blood drops flying on hurt (depth 38)
            const bloodKey = CopHurt ? CopHurt.FRAME_KEYS.bloodDrop : 'cop_hurt_blood_drop';
            const bloodOrigin = CopHurt ? CopHurt.SHAPE_ORIGINS.bloodDrop : { x: 0.5, y: 0.5 };
            const bloodDims = CopHurt ? CopHurt.FRAME_DIMENSIONS.cop_hurt_blood_drop : { width: 30, height: 37 };

            this.hurtBloodDrop1 = scene.add.image(0, 0, bloodKey)
                .setOrigin(bloodOrigin.x, bloodOrigin.y)
                .setDepth(38)
                .setVisible(false);

            this.hurtBloodDrop2 = scene.add.image(0, 0, bloodKey)
                .setOrigin(bloodOrigin.x, bloodOrigin.y)
                .setDepth(38)
                .setVisible(false);

            if (this.hurtBloodDrop1.setDisplaySize) {
                this.hurtBloodDrop1.setDisplaySize(bloodDims.width, bloodDims.height);
                this.hurtBloodDrop2.setDisplaySize(bloodDims.width, bloodDims.height);
            }

            // Cop death sprite (247x518 native, origin 0.5, 1.0)
            const deathDims = CopDeath ? CopDeath.FRAME_DIMENSIONS.cop_death_character : { width: 247, height: 518 };
            const deathOrigin = CopDeath ? CopDeath.SHAPE_ORIGINS.character : { x: 0.5, y: 1.0 };
            const initialDeathFrame = CopDeath ? CopDeath.FRAME_KEYS.character : 'cop_death_character';

            this.deathSprite = scene.add.sprite(0, walkHeight, initialDeathFrame)
                .setOrigin(deathOrigin.x, deathOrigin.y)
                .setDepth(37)
                .setVisible(false);

            if (this.deathSprite.setDisplaySize) {
                this.deathSprite.setDisplaySize(deathDims.width, deathDims.height);
            }

            // Cop death cap (187x121 native, origin 0, 0)
            const capKey = CopDeath ? CopDeath.FRAME_KEYS.cap : 'cop_death_cap';
            const capOrigin = CopDeath ? CopDeath.SHAPE_ORIGINS.cap : { x: 0.0, y: 0.0 };
            const capDims = CopDeath ? CopDeath.FRAME_DIMENSIONS.cop_death_cap : { width: 187, height: 121 };

            this.deathCap = scene.add.image(0, 0, capKey)
                .setOrigin(capOrigin.x, capOrigin.y)
                .setDepth(38)
                .setVisible(false);

            if (this.deathCap.setDisplaySize) {
                this.deathCap.setDisplaySize(capDims.width, capDims.height);
            }

            // Cop death star (36x37 native, origin 0.5, 0.5)
            const starKey = CopDeath ? CopDeath.FRAME_KEYS.star : 'cop_death_star';
            const starOrigin = CopDeath ? CopDeath.SHAPE_ORIGINS.star : { x: 0.5, y: 0.5 };
            const starDims = CopDeath ? CopDeath.FRAME_DIMENSIONS.cop_death_star : { width: 36, height: 37 };

            this.deathStar = scene.add.image(0, 0, starKey)
                .setOrigin(starOrigin.x, starOrigin.y)
                .setDepth(38)
                .setVisible(false);

            if (this.deathStar.setDisplaySize) {
                this.deathStar.setDisplaySize(starDims.width, starDims.height);
            }

            // Cop punch hit star (147x153 native, origin 0.5, 0.5, depth 39)
            const punchStarKey = (scene.textures && scene.textures.exists('cop_hit_star'))
                ? 'cop_hit_star'
                : 'cop_hit_star';
            const punchStarDims = { width: 147, height: 153 };
            this.punchHitStar = scene.add.image(195, walkHeight - 300, punchStarKey)
                .setOrigin(0.5, 0.5)
                .setDepth(39)
                .setVisible(false);

            if (this.punchHitStar.setDisplaySize) {
                this.punchHitStar.setDisplaySize(punchStarDims.width, punchStarDims.height);
            }
            this.punchHitStarTimer = 0;

            if (scene.anims && typeof scene.anims.exists === 'function' && !scene.anims.exists('cop_walk')) {
                const frames = (CopLogic && CopLogic.TICK_TO_FRAME_INDEX)
                    ? CopLogic.TICK_TO_FRAME_INDEX.map((idx) => ({ key: CopLogic.FRAME_KEYS[idx] }))
                    : [
                        { key: 'cop_walk_01' }, { key: 'cop_walk_01' },
                        { key: 'cop_walk_02' }, { key: 'cop_walk_02' }, { key: 'cop_walk_02' },
                        { key: 'cop_walk_03' }, { key: 'cop_walk_03' },
                        { key: 'cop_walk_04' }, { key: 'cop_walk_04' },
                        { key: 'cop_walk_05' }, { key: 'cop_walk_05' }, { key: 'cop_walk_05' },
                    ];
                scene.anims.create({
                    key: 'cop_walk',
                    frames,
                    frameRate: 25,
                    repeat: -1,
                });
            }

            this.container.add([
                this.shadow,
                this.walkSprite,
                this.boxingSprite,
                this.hurtSprite,
                this.hurtBloodDrop1,
                this.hurtBloodDrop2,
                this.deathSprite,
                this.deathCap,
                this.deathStar,
                this.punchHitStar,
            ]);
            this.children = this.container.children;
            if (!this.isSpawned) {
                this.container.setVisible(false);
            }
        }

        get x() {
            return this.container.x;
        }

        set x(val) {
            this.container.x = val;
        }

        get screenX() {
            const worldOffsetX = (this.scene && this.scene.worldLayer && typeof this.scene.worldLayer.x === 'number')
                ? this.scene.worldLayer.x
                : 0;
            return this.container.x + worldOffsetX;
        }

        get y() {
            return this.container.y;
        }

        set y(val) {
            this.container.y = val;
        }

        get depth() {
            return this.container.depth;
        }

        set depth(val) {
            this.container.setDepth(val);
        }

        get visible() {
            return this.container.visible;
        }

        set visible(val) {
            this.container.setVisible(val);
        }

        setPosition(x, y) {
            this.container.setPosition(x, y);
            return this;
        }

        setFacingLeft(isLeft) {
            this.isFacingLeft = Boolean(isLeft);
            this.container.setScale(this.isFacingLeft ? -1 : 1, 1);
            return this;
        }

        playWalkAnimation() {
            this.isWalking = true;
            if (this.walkSprite.anims) {
                const animExists = this.scene.anims && typeof this.scene.anims.exists === 'function'
                    ? this.scene.anims.exists('cop_walk')
                    : true;
                if (animExists && (!this.walkSprite.anims.isPlaying || this.walkSprite.anims.currentAnim?.key !== 'cop_walk')) {
                    this.walkSprite.anims.play('cop_walk', true);
                }
            }
        }

        stopWalkAnimation() {
            this.isWalking = false;
            if (this.walkSprite.anims && typeof this.walkSprite.anims.stop === 'function') {
                this.walkSprite.anims.stop();
            }
            const initialFrame = (CopLogic && CopLogic.FRAME_KEYS) ? CopLogic.FRAME_KEYS[0] : 'cop_walk_01';
            this.walkSprite.setTexture(initialFrame);
        }

        triggerWalk() {
            if (this.isDead) return this;
            this.isBoxing = false;
            this.isHurt = false;
            if (this.boxingSprite) this.boxingSprite.setVisible(false);
            if (this.hurtSprite) this.hurtSprite.setVisible(false);
            if (this.hurtBloodDrop1) this.hurtBloodDrop1.setVisible(false);
            if (this.hurtBloodDrop2) this.hurtBloodDrop2.setVisible(false);
            if (this.deathSprite) this.deathSprite.setVisible(false);
            if (this.deathCap) this.deathCap.setVisible(false);
            if (this.deathStar) this.deathStar.setVisible(false);
            if (this.punchHitStar) {
                this.punchHitStar.setVisible(false);
                this.punchHitStarTimer = 0;
            }
            if (this.shadow) this.shadow.setVisible(true);
            if (this.walkSprite) this.walkSprite.setVisible(true);
            this.playWalkAnimation();
            return this;
        }

        toggleWalk() {
            if (this.isDead) return this;
            if (this.isWalking) {
                this.stopWalkAnimation();
            } else {
                this.triggerWalk();
            }
            return this;
        }

        updateWalkAnimation(deltaMs) {
            if (!this.isWalking || !CopLogic) {
                return;
            }

            // If Phaser anims is running, let Phaser update the texture
            if (this.walkSprite.anims && this.walkSprite.anims.isPlaying) {
                return;
            }

            // Fallback: manual tick advancement
            const result = CopLogic.advanceWalk(this.walkTick, deltaMs, this.walkElapsed);
            this.walkTick = result.tick;
            this.walkElapsed = result.remainingMs;
            this.walkSprite.setTexture(result.state.frameKey);
        }

        triggerBoxing(onComplete = null) {
            if (this.isDead) return this;
            this.isBoxing = true;
            this.isHurt = false;
            this.boxingTick = 1;
            this.boxingElapsed = 0;
            this.boxingCallback = onComplete || null;
            this.hasHitThisPunch = false;
            this.stopWalkAnimation();
            this.walkSprite.setVisible(false);
            this.hurtSprite.setVisible(false);
            this.hurtBloodDrop1.setVisible(false);
            this.hurtBloodDrop2.setVisible(false);
            this.deathSprite.setVisible(false);
            this.deathCap.setVisible(false);
            this.deathStar.setVisible(false);
            if (this.punchHitStar) {
                this.punchHitStar.setVisible(false);
                this.punchHitStarTimer = 0;
            }
            const initialFrame = (CopCombat && CopCombat.FRAME_KEYS) ? CopCombat.FRAME_KEYS[0] : 'cop_boxing_01';
            this.boxingSprite.setTexture(initialFrame).setVisible(true);
            return this;
        }

        updateBoxingAnimation(deltaMs, onHitCallback = null) {
            if (!this.isBoxing || !CopCombat) {
                return;
            }

            const result = CopCombat.advanceBoxing(this.boxingTick, deltaMs, this.boxingElapsed);
            this.boxingTick = result.tick;
            this.boxingElapsed = result.remainingMs;
            this.boxingSprite.setTexture(result.state.frameKey);

            if (result.state.isHit && !this.hasHitThisPunch) {
                this.hasHitThisPunch = true;
                if (typeof onHitCallback === 'function') {
                    onHitCallback();
                }
            }

            if (result.isComplete) {
                this.isBoxing = false;
                this.boxingSprite.setVisible(false);
                this.walkSprite.setVisible(true);
                const cb = this.boxingCallback;
                this.boxingCallback = null;
                if (typeof cb === 'function') {
                    cb();
                }
            }
        }

        triggerPunchHitStar(durationMs = 160) {
            if (!this.punchHitStar) return this;
            this.punchHitStar.setPosition(195, this.walkHeight - 300);
            this.punchHitStar.setVisible(true);
            this.punchHitStarTimer = durationMs;
            return this;
        }

        updatePunchHitStar(deltaMs) {
            if (this.punchHitStarTimer > 0) {
                this.punchHitStarTimer -= deltaMs;
                if (this.punchHitStarTimer <= 0) {
                    this.punchHitStarTimer = 0;
                    if (this.punchHitStar) {
                        this.punchHitStar.setVisible(false);
                    }
                }
            }
        }

        applyHit(attackerX = null, isScreenCoord = false) {
            if (this.isDead) {
                return this;
            }
            if (attackerX !== null && attackerX !== undefined) {
                const copCoord = isScreenCoord ? this.screenX : this.x;
                this.setFacingLeft(attackerX < copCoord);
            }
            this.hitCount = (this.hitCount || 0) + 1;
            if (this.hitCount >= this.maxHits) {
                this.triggerDeath();
            } else {
                this.triggerHurt();
            }
            return this;
        }

        triggerHurt(onComplete = null) {
            if (this.isDead) return this;
            if (SoundFx && typeof SoundFx.play === 'function') {
                SoundFx.play(this.scene, 'sfx_cop_hit');
            }
            this.isHurt = true;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtCallback = onComplete || null;

            this.isBoxing = false;
            this.boxingSprite.setVisible(false);
            this.deathSprite.setVisible(false);
            this.deathCap.setVisible(false);
            this.deathStar.setVisible(false);
            if (this.punchHitStar) {
                this.punchHitStar.setVisible(false);
                this.punchHitStarTimer = 0;
            }
            this.stopWalkAnimation();
            this.walkSprite.setVisible(false);

            this.applyHurtFrame();
            return this;
        }

        applyHurtFrame() {
            if (!CopHurt) return;
            const state = CopHurt.getHurtState(this.hurtTick);

            this.hurtSprite
                .setTexture(state.frameKey)
                .setOrigin(state.origin.x, state.origin.y)
                .setPosition(state.offsetX, this.walkHeight)
                .setVisible(true);

            const zeroX = state.offsetX;
            const zeroY = this.walkHeight - state.zeroFromFeetY;

            // Blood drop 1
            this.hurtBloodDrop1
                .setTexture(CopHurt.FRAME_KEYS.bloodDrop)
                .setPosition(zeroX + state.drop1.x, zeroY + state.drop1.y)
                .setScale(state.drop1.scaleX, state.drop1.scaleY)
                .setVisible(state.drop1.visible);
            if (this.hurtBloodDrop1.setRotation) {
                this.hurtBloodDrop1.setRotation(state.drop1.rotation);
            }

            // Blood drop 2
            this.hurtBloodDrop2
                .setTexture(CopHurt.FRAME_KEYS.bloodDrop)
                .setPosition(zeroX + state.drop2.x, zeroY + state.drop2.y)
                .setScale(state.drop2.scaleX, state.drop2.scaleY)
                .setVisible(state.drop2.visible);
            if (this.hurtBloodDrop2.setRotation) {
                this.hurtBloodDrop2.setRotation(state.drop2.rotation);
            }
        }

        updateHurtAnimation(deltaMs) {
            if (!this.isHurt || !CopHurt) return;

            const result = CopHurt.advanceHurt(this.hurtTick, deltaMs, this.hurtElapsed);
            this.hurtTick = result.tick;
            this.hurtElapsed = result.remainingMs;

            if (result.isComplete) {
                this.endHurt();
                return;
            }

            this.applyHurtFrame();
        }

        endHurt() {
            this.isHurt = false;
            this.hurtSprite.setVisible(false);
            this.hurtBloodDrop1.setVisible(false);
            this.hurtBloodDrop2.setVisible(false);
            this.walkSprite.setVisible(true);

            const cb = this.hurtCallback;
            this.hurtCallback = null;
            if (typeof cb === 'function') {
                cb();
            }
        }

        triggerDeath(onComplete = null) {
            if (this.isDead) return this;
            if (SoundFx && typeof SoundFx.play === 'function') {
                SoundFx.play(this.scene, 'sfx_cop_die');
            }
            this.isDead = true;
            this.deathTick = 1;
            this.deathElapsed = 0;
            if (typeof onComplete === 'function') {
                const prevCallback = this.deathCallback;
                this.deathCallback = typeof prevCallback === 'function'
                    ? () => { prevCallback(); onComplete(); }
                    : onComplete;
            }
            this.deathComplete = false;

            this.isWalking = false;
            this.isBoxing = false;
            this.isHurt = false;
            this.stopWalkAnimation();
            this.walkSprite.setVisible(false);
            this.boxingSprite.setVisible(false);
            this.hurtSprite.setVisible(false);
            if (this.punchHitStar) {
                this.punchHitStar.setVisible(false);
                this.punchHitStarTimer = 0;
            }
            this.hurtBloodDrop1.setVisible(false);
            this.hurtBloodDrop2.setVisible(false);

            this.applyDeathFrame();
            return this;
        }

        applyDeathFrame() {
            if (!CopDeath) return;
            const state = CopDeath.getDeathState(this.deathTick);

            const isCharVisible = state.characterVisible !== undefined ? state.characterVisible : (this.deathTick === 1);
            this.deathSprite
                .setTexture(state.frameKey)
                .setOrigin(state.origin.x, state.origin.y)
                .setPosition(state.offsetX, this.walkHeight)
                .setVisible(isCharVisible);

            // Hide ground shadow once character disappears (from tick 2 onward)
            if (this.shadow) {
                this.shadow.setVisible(isCharVisible);
            }

            const zeroX = state.offsetX;
            const zeroY = this.walkHeight - state.zeroFromFeetY;

            // Cap
            this.deathCap
                .setTexture(CopDeath.FRAME_KEYS.cap)
                .setPosition(zeroX + state.cap.x, zeroY + state.cap.y)
                .setAlpha(state.cap.alpha !== undefined ? state.cap.alpha : 1.0)
                .setVisible(state.cap.visible);

            // Star
            this.deathStar
                .setTexture(CopDeath.FRAME_KEYS.star)
                .setPosition(zeroX + state.star.x, zeroY + state.star.y)
                .setScale(state.star.scale)
                .setVisible(state.star.visible);
        }

        updateDeathAnimation(deltaMs) {
            if (!this.isDead || !CopDeath) return;

            const result = CopDeath.advanceDeath(this.deathTick, deltaMs, this.deathElapsed);
            this.deathTick = result.tick;
            this.deathElapsed = result.remainingMs;

            this.applyDeathFrame();

            if (result.isComplete && !this.deathComplete) {
                this.deathComplete = true;
                this.deathCap.setVisible(false);
                this.deathStar.setVisible(false);
                this.deathSprite.setVisible(false);
                this.despawn();
                const cb = this.deathCallback;
                this.deathCallback = null;
                if (typeof cb === 'function') {
                    cb();
                }
            }
        }

        /**
         * Update loop for the Cop actor
         * @param {number} deltaMs
         * @param {number|null} [targetX=null] Target X coordinate to pursue (e.g. player.x)
         * @param {number} [stopDistance=40]
         * @param {Function|null} [onHitCallback=null] Callback fired when punch connects (Frame 9..10)
         */
        update(deltaMs, targetX = null, stopDistance = 40, onHitCallback = null) {
            if (!this.isSpawned) {
                return 'unspawned';
            }

            this.updatePunchHitStar(deltaMs);

            if (this.isDead) {
                this.updateDeathAnimation(deltaMs);
                return 'death';
            }

            if (this.isHurt) {
                this.updateHurtAnimation(deltaMs);
                return 'hurt';
            }

            if (this.isBoxing) {
                this.updateBoxingAnimation(deltaMs, onHitCallback);
                return 'boxing';
            }

            if (targetX !== null && targetX !== undefined && CopLogic) {
                const moveResult = CopLogic.computeMove(this.x, targetX, deltaMs, this.speed, stopDistance);
                this.x = moveResult.nextX;
                this.setFacingLeft(moveResult.isFacingLeft);

                if (moveResult.isMoving) {
                    this.playWalkAnimation();
                } else {
                    this.stopWalkAnimation();
                }
            }

            this.updateWalkAnimation(deltaMs);
            return this.isWalking ? 'walking' : 'idle';
        }

        spawn(worldX, facingLeft = false) {
            this.respawn();
            this.x = worldX;
            this.setFacingLeft(facingLeft);
            this.isSpawned = true;
            if (this.container) {
                this.container.setVisible(true);
            }
            this.playWalkAnimation();
            return this;
        }

        despawn() {
            this.isSpawned = false;
            this.isWalking = false;
            this.isBoxing = false;
            this.isHurt = false;
            this.isDead = false;
            this.isDying = false;
            if (this.punchHitStar) {
                this.punchHitStar.setVisible(false);
                this.punchHitStarTimer = 0;
            }
            if (this.container) {
                this.container.setVisible(false);
            }
            return this;
        }

        respawn() {
            this.isSpawned = true;
            if (this.container) {
                this.container.setVisible(true);
            }
            this.isDead = false;
            this.isDying = false;
            this.isHurt = false;
            this.isBoxing = false;
            this.isWalking = false;
            if (this.punchHitStar) {
                this.punchHitStar.setVisible(false);
                this.punchHitStarTimer = 0;
            }
            this.walkTick = 1;
            this.walkElapsed = 0;
            this.boxingTick = 1;
            this.boxingElapsed = 0;
            this.boxingCallback = null;
            this.hasHitThisPunch = false;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtCallback = null;
            this.deathTick = 1;
            this.deathElapsed = 0;
            this.deathCallback = null;
            this.deathComplete = false;
            this.hitCount = 0;

            if (this.boxingSprite) this.boxingSprite.setVisible(false);
            if (this.hurtSprite) this.hurtSprite.setVisible(false);
            if (this.hurtBloodDrop1) this.hurtBloodDrop1.setVisible(false);
            if (this.hurtBloodDrop2) this.hurtBloodDrop2.setVisible(false);
            if (this.deathSprite) this.deathSprite.setVisible(false);
            if (this.deathCap) this.deathCap.setAlpha(1.0).setVisible(false);
            if (this.deathStar) this.deathStar.setVisible(false);
            if (this.walkSprite) {
                this.walkSprite.setTexture('cop_walk_01');
                this.walkSprite.setVisible(true);
            }
            if (this.shadow) this.shadow.setVisible(true);
        }

        destroy() {
            if (this.container) {
                this.container.destroy();
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Cop };
    } else {
        globalScope.Cop = Cop;
    }
})(typeof window !== 'undefined' ? window : global);
