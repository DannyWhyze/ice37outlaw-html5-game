(function attachPlayerPrefab(globalScope) {
    'use strict';

    const Combat = (typeof PlayerCombat !== 'undefined')
        ? PlayerCombat
        : require('../logic/playerCombat.js');
    const Death = (typeof PlayerDeath !== 'undefined')
        ? PlayerDeath
        : require('../logic/playerDeath.js');
    const Hurt = (typeof PlayerHurt !== 'undefined')
        ? PlayerHurt
        : require('../logic/playerHurt.js');
    const Controls = (typeof PlayerControls !== 'undefined')
        ? PlayerControls
        : (typeof require !== 'undefined' ? require('../logic/playerControls.js').PlayerControls : null);
    const SoundFx = (typeof globalScope !== 'undefined' && globalScope.SoundFx)
        ? globalScope.SoundFx
        : ((typeof require !== 'undefined') ? (function() {
            try { return require('../logic/soundFx.js'); } catch (e) { return null; }
        })() : null);

    const walkNativeMapping = {
        1: 'walk_frame_01', 2: 'walk_frame_01',
        3: 'walk_frame_03', 4: 'walk_frame_03', 5: 'walk_frame_03',
        6: 'walk_frame_06', 7: 'walk_frame_06', 8: 'walk_frame_08',
        9: 'walk_frame_08', 10: 'walk_frame_10', 11: 'walk_frame_10',
        12: 'walk_frame_10', 13: 'walk_frame_10', 14: 'walk_frame_14',
    };

    class Player {
        constructor(scene, x, y, layoutPlayer, nativeScale = 1920 / 546) {
            this.scene = scene;
            this.layout = layoutPlayer;
            this.scaleFactor = nativeScale;
            this.sprayerScale = 0.35 * nativeScale;

            this.isFacingLeft = false;
            this.health = 100;
            this.maxHealth = 100;
            this.hasHitThisAttack = false;
            this.isBoxing = false;
            this.boxingFrameNumber = 1;
            this.boxingFrameElapsed = 0;
            this.isKicking = false;
            this.kickFrameNumber = 1;
            this.kickFrameElapsed = 0;

            // Hurt state (character_kassiert)
            this.isHurt = false;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtCallback = null;

            // Death state
            this.isDead = false;
            this.deathTick = 1;
            this.deathElapsed = 0;
            this.deathComplete = false;
            this.deathCallback = null;
            this.onDeathComplete = null;

            // Input controls
            this.controls = (Controls && scene) ? new Controls(scene) : null;

            // Root container
            this.container = scene.add.container(x, y).setDepth(37);

            // Blood pool (rendered at bottom of container, depth 35)
            this.bloodPool = scene.add.image(0, layoutPlayer.walkHeight, Death.FRAME_KEYS.blood)
                .setOrigin(Death.SHAPE_ORIGINS.blood.x, Death.SHAPE_ORIGINS.blood.y)
                .setDepth(35)
                .setVisible(false);

            // Shadow beneath active presentation
            const shadowPresentation = Combat.getShadowPresentation({
                playerPresentation: 'idle',
                isFacingLeft: false,
            });
            this.playerShadow = scene.add.image(0, layoutPlayer.walkHeight, shadowPresentation.key)
                .setOrigin(0.5, 0.5)
                .setScale(this.sprayerScale / 4)
                .setDepth(36)
                .setVisible(shadowPresentation.visible);

            // Idle sprite
            this.idleSprayer = scene.add.image(0, 0, 'halloffame_sprayer')
                .setOrigin(0.5, 0.0)
                .setDisplaySize(layoutPlayer.idleWidth, layoutPlayer.idleHeight)
                .setDepth(37);

            // Walk animation & sprite
            if (scene.anims && !scene.anims.exists('halloffame_walk')) {
                scene.anims.create({
                    key: 'halloffame_walk',
                    frames: Array.from(
                        { length: 14 },
                        (_, index) => ({ key: `halloffame_walk_native_${walkNativeMapping[index + 1]}` }),
                    ),
                    frameRate: 25,
                    repeat: -1,
                });
            }

            this.walkingSprayer = scene.add.sprite(0, 0, 'halloffame_walk_native_walk_frame_01')
                .setOrigin(0.5, 0.0)
                .setDisplaySize(layoutPlayer.walkWidth, layoutPlayer.walkHeight)
                .setDepth(37)
                .setVisible(false);
            if (this.walkingSprayer.on) {
                this.walkingSprayer.on('animationupdate', () => {
                    this.walkingSprayer
                        .setOrigin(0.5, 0.0)
                        .setDisplaySize(this.layout.walkWidth, this.layout.walkHeight);
                });
            }

            // Boxing sprite
            const boxingPresentation = Combat.getNativeFramePresentation(1);
            this.boxingSprayer = scene.add.image(0, 0, boxingPresentation.key)
                .setOrigin(boxingPresentation.origin.x, boxingPresentation.origin.y)
                .setDisplaySize(layoutPlayer.boxingWidth, layoutPlayer.boxingHeight)
                .setDepth(37)
                .setVisible(false);

            // Kick sprite
            const kickPresentation = Combat.getNativeKickFramePresentation(1);
            this.kickSprayer = scene.add.image(0, 0, kickPresentation.key)
                .setOrigin(kickPresentation.origin.x, kickPresentation.origin.y)
                .setDisplaySize(layoutPlayer.kickWidth, layoutPlayer.kickHeight)
                .setDepth(37)
                .setVisible(false);

            // Die sprite (depth 37, anchored to walkHeight ground line)
            this.dieSprayer = scene.add.image(0, layoutPlayer.walkHeight, Death.FRAME_KEYS.frame1)
                .setOrigin(Death.SHAPE_ORIGINS.frame1.x, Death.SHAPE_ORIGINS.frame1.y)
                .setDepth(37)
                .setVisible(false);

            // Eyes white sclera mask (depth 38, overlay fading on top of die sprite)
            this.eyesMask = scene.add.image(0, 0, Death.FRAME_KEYS.eyes)
                .setOrigin(Death.SHAPE_ORIGINS.eyes.x, Death.SHAPE_ORIGINS.eyes.y)
                .setDepth(38)
                .setVisible(false);

            // Hurt sprite (depth 37, anchored to walkHeight ground line)
            this.hurtSprayer = scene.add.image(Hurt.NATIVE_OFFSETS.characterX, layoutPlayer.walkHeight, Hurt.FRAME_KEYS.character)
                .setOrigin(Hurt.SHAPE_ORIGINS.character.x, Hurt.SHAPE_ORIGINS.character.y)
                .setDepth(37)
                .setVisible(false);

            // Blood drops flying from face on hit (depth 38)
            this.hurtBloodDrop1 = scene.add.image(0, 0, Hurt.FRAME_KEYS.bloodDrop)
                .setOrigin(Hurt.SHAPE_ORIGINS.bloodDrop.x, Hurt.SHAPE_ORIGINS.bloodDrop.y)
                .setDepth(38)
                .setVisible(false);

            this.hurtBloodDrop2 = scene.add.image(0, 0, Hurt.FRAME_KEYS.bloodDrop)
                .setOrigin(Hurt.SHAPE_ORIGINS.bloodDrop.x, Hurt.SHAPE_ORIGINS.bloodDrop.y)
                .setDepth(38)
                .setVisible(false);

            // Player attack hit star (128x133 native, origin 0.5, 0.5, depth 39)
            const attackStarKey = (scene.textures && scene.textures.exists('player_hit_star'))
                ? 'player_hit_star'
                : 'player_hit_star';
            const attackStarDims = { width: 128, height: 133 };
            this.attackHitStar = scene.add.image(0, 0, attackStarKey)
                .setOrigin(0.5, 0.5)
                .setDepth(39)
                .setVisible(false);

            if (this.attackHitStar.setDisplaySize) {
                this.attackHitStar.setDisplaySize(attackStarDims.width, attackStarDims.height);
            }
            this.attackHitStarTimer = 0;

            this.container.add([
                this.bloodPool,
                this.playerShadow,
                this.idleSprayer,
                this.walkingSprayer,
                this.boxingSprayer,
                this.kickSprayer,
                this.dieSprayer,
                this.eyesMask,
                this.hurtSprayer,
                this.hurtBloodDrop1,
                this.hurtBloodDrop2,
                this.attackHitStar,
            ]);

            // Delegated properties
            this.depth = this.container.depth;
            this.children = this.container.children;
        }

        setDepth(depth) {
            this.container.setDepth(depth);
            this.depth = depth;
            return this;
        }

        setScale(x, y) {
            this.container.setScale(x, y);
            return this;
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

        get x() { return this.container.x; }
        set x(val) { this.container.x = val; }
        get y() { return this.container.y; }
        set y(val) { this.container.y = val; }
        getInputState(isBlocked = false) {
            if (this.controls && typeof this.controls.getInputState === 'function') {
                return this.controls.getInputState(isBlocked);
            }
            return {
                isMovingLeft: false,
                isMovingRight: false,
                isBoxingDown: false,
                isKickDown: false,
            };
        }

        update(delta, input = null) {
            this.updateAttackHitStar(delta);

            if (this.isDead) {
                this.updateDeathAnimation(delta);
                return 'die';
            }
            if (this.isHurt) {
                this.updateHurtAnimation(delta);
                if (this.isHurt) {
                    return 'hurt';
                }
            }

            const inputState = (input !== null && input !== undefined)
                ? input
                : this.getInputState(false);
            const { isMovingLeft, isMovingRight, isBoxingDown, isKickDown } = inputState;

            if (this.isBoxing) {
                this.stopKickAnimation();
                const boxingActive = this.playBoxingAnimation(delta, isBoxingDown);
                if (boxingActive) {
                    this.updateShadow('boxing');
                    return 'boxing';
                }
            }

            if (this.isKicking) {
                this.stopBoxingAnimation();
                const kickActive = this.playKickAnimation(delta, isKickDown);
                if (kickActive) {
                    this.updateShadow('kicking');
                    return 'kicking';
                }
            }

            this.isFacingLeft = Combat.getFacingLeft({
                isMovingLeft,
                isMovingRight,
                wasFacingLeft: this.isFacingLeft,
            });
            this.container.setScale(this.isFacingLeft ? -1 : 1, 1);

            if (isBoxingDown) {
                this.stopKickAnimation();
                this.playBoxingAnimation(delta, true);
                this.updateShadow('boxing');
                return 'boxing';
            }

            const playerPresentation = Combat.getPlayerPresentation({
                boxingKeyDown: false,
                kickingKeyDown: isKickDown,
                isMoving: isMovingLeft || isMovingRight,
            });
            this.updateShadow(playerPresentation);

            if (playerPresentation === 'kicking') {
                this.stopBoxingAnimation();
                this.playKickAnimation(delta, true);
            } else if (playerPresentation === 'walking') {
                this.stopBoxingAnimation();
                this.stopKickAnimation();
                this.playWalkAnimation();
            } else {
                this.stopBoxingAnimation();
                this.stopKickAnimation();
                this.idleSprayer.setVisible(true);
                this.walkingSprayer.setVisible(false);
                if (this.walkingSprayer.anims) {
                    this.walkingSprayer.anims.stop();
                }
            }
            return playerPresentation;
        }

        /**
         * Advances the 13-frame boxing animation cycle.
         * @param {number} delta
         * @param {boolean} [boxingKeyDown=true]
         * @returns {boolean} True if boxing remains active after this update.
         */
        playBoxingAnimation(delta, boxingKeyDown = true) {
            if (!this.isBoxing) {
                this.isBoxing = true;
                this.boxingFrameNumber = 1;
                this.boxingFrameElapsed = 0;
                this.hasHitThisAttack = false;
                this.applyBoxingFrame();
                if (SoundFx && typeof SoundFx.play === 'function') {
                    SoundFx.play(this.scene, 'sfx_combat_punch');
                }
            }

            this.boxingFrameElapsed += delta;
            while (this.boxingFrameElapsed >= Combat.BOXING_FRAME_MS) {
                this.boxingFrameElapsed -= Combat.BOXING_FRAME_MS;
                if (this.boxingFrameNumber === Combat.FRAME_SHAPES.length) {
                    if (!boxingKeyDown) {
                        this.stopBoxingAnimation();
                        return false;
                    }
                    this.boxingFrameNumber = 1;
                    this.hasHitThisAttack = false;
                    if (SoundFx && typeof SoundFx.play === 'function') {
                        SoundFx.play(this.scene, 'sfx_combat_punch');
                    }
                } else {
                    this.boxingFrameNumber += 1;
                }
                this.applyBoxingFrame();
            }

            this.idleSprayer.setVisible(false);
            this.walkingSprayer.setVisible(false);
            if (this.walkingSprayer.anims) {
                this.walkingSprayer.anims.stop();
            }
            this.boxingSprayer.setVisible(true);
            return true;
        }

        applyBoxingFrame() {
            const presentation = Combat.getNativeFramePresentation(this.boxingFrameNumber);
            this.boxingSprayer
                .setTexture(presentation.key)
                .setOrigin(presentation.origin.x, presentation.origin.y)
                .setDisplaySize(this.layout.boxingWidth, this.layout.boxingHeight);
        }

        stopBoxingAnimation() {
            if (!this.isBoxing) {
                return;
            }
            this.isBoxing = false;
            this.boxingFrameNumber = 1;
            this.boxingFrameElapsed = 0;
            this.hasHitThisAttack = false;
            this.boxingSprayer.setVisible(false);
        }

        /**
         * Advances the 12-frame kick animation cycle.
         * @param {number} delta
         * @param {boolean} [kickKeyDown=true]
         * @returns {boolean} True if kick remains active after this update.
         */
        playKickAnimation(delta, kickKeyDown = true) {
            if (!this.isKicking) {
                this.isKicking = true;
                this.kickFrameNumber = 1;
                this.kickFrameElapsed = 0;
                this.hasHitThisAttack = false;
                this.applyKickFrame();
                if (SoundFx && typeof SoundFx.play === 'function') {
                    SoundFx.play(this.scene, 'sfx_combat_kick');
                }
            }

            this.kickFrameElapsed += delta;
            const frameMs = Combat.KICK_FRAME_MS || 40;
            while (this.kickFrameElapsed >= frameMs) {
                this.kickFrameElapsed -= frameMs;
                if (this.kickFrameNumber === Combat.KICK_FRAME_SHAPES.length) {
                    if (!kickKeyDown) {
                        this.stopKickAnimation();
                        return false;
                    }
                    this.kickFrameNumber = 1;
                    this.hasHitThisAttack = false;
                    if (SoundFx && typeof SoundFx.play === 'function') {
                        SoundFx.play(this.scene, 'sfx_combat_kick');
                    }
                } else {
                    this.kickFrameNumber += 1;
                }
                this.applyKickFrame();
            }

            this.idleSprayer.setVisible(false);
            this.walkingSprayer.setVisible(false);
            if (this.walkingSprayer.anims) {
                this.walkingSprayer.anims.stop();
            }
            this.kickSprayer.setVisible(true);
            return true;
        }

        applyKickFrame() {
            const presentation = Combat.getNativeKickFramePresentation(this.kickFrameNumber);
            this.kickSprayer
                .setTexture(presentation.key)
                .setOrigin(presentation.origin.x, presentation.origin.y)
                .setDisplaySize(this.layout.kickWidth, this.layout.kickHeight);
        }

        stopKickAnimation() {
            if (!this.isKicking) {
                return;
            }
            this.isKicking = false;
            this.kickFrameNumber = 1;
            this.kickFrameElapsed = 0;
            this.hasHitThisAttack = false;
            this.kickSprayer.setVisible(false);
        }

        triggerAttackHitStar(type = 'boxing', durationMs = 160) {
            if (!this.attackHitStar) {
                return this;
            }
            const isKick = (type === 'kicking' || type === 'kick');
            const posX = isKick ? 149 : 208;
            const posY = isKick
                ? this.layout.walkHeight - 270
                : this.layout.walkHeight - 314;
            this.attackHitStar.setPosition(posX, posY);
            this.attackHitStar.setVisible(true);
            this.attackHitStarTimer = durationMs;
            return this;
        }

        updateAttackHitStar(deltaMs) {
            if (this.attackHitStarTimer > 0) {
                this.attackHitStarTimer -= deltaMs;
                if (this.attackHitStarTimer <= 0) {
                    this.attackHitStarTimer = 0;
                    if (this.attackHitStar) {
                        this.attackHitStar.setVisible(false);
                    }
                }
            }
        }

        updateShadow(playerPresentation) {
            const presentation = Combat.getShadowPresentation({
                playerPresentation,
                isFacingLeft: this.isFacingLeft,
            });
            this.playerShadow.setVisible(presentation.visible);
        }

        playWalkAnimation() {
            this.idleSprayer.setVisible(false);
            this.walkingSprayer.setVisible(true);
            if (this.walkingSprayer.play) {
                this.walkingSprayer.play('halloffame_walk', true);
            }
        }

        triggerDeath(onComplete) {
            if (this.isDead) {
                return;
            }
            if (SoundFx && typeof SoundFx.play === 'function') {
                SoundFx.play(this.scene, 'sfx_player_die');
            }
            if (this.isHurt) {
                this.isHurt = false;
                this.hurtSprayer.setVisible(false);
                this.hurtBloodDrop1.setVisible(false);
                this.hurtBloodDrop2.setVisible(false);
            }
            this.isDead = true;
            this.deathTick = 1;
            this.deathElapsed = 0;
            this.deathComplete = false;
            this.deathCallback = typeof onComplete === 'function' ? onComplete : null;

            // Stop any ongoing spray paint action immediately upon player death
            if (this.scene && typeof this.scene.endSpray === 'function') {
                this.scene.endSpray();
            }

            this.stopBoxingAnimation();
            this.stopKickAnimation();
            if (this.attackHitStar) {
                this.attackHitStar.setVisible(false);
            }
            this.attackHitStarTimer = 0;
            this.idleSprayer.setVisible(false);
            this.walkingSprayer.setVisible(false);
            if (this.walkingSprayer.anims) {
                this.walkingSprayer.anims.stop();
            }

            this.applyDeathFrame();
        }

        updateDeathAnimation(delta) {
            if (!this.isDead || this.deathComplete) {
                return;
            }

            const advanceResult = Death.advanceDeath(this.deathTick, delta, this.deathElapsed);
            this.deathTick = advanceResult.tick;
            this.deathElapsed = advanceResult.remainingMs;

            this.applyDeathFrame();
        }

        applyDeathFrame() {
            const state = Death.getDeathState(this.deathTick);
            const dims = Death.FRAME_DIMENSIONS[state.frameKey] || {
                width: this.dieSprayer.width || 498,
                height: this.dieSprayer.height || 158,
            };

            this.dieSprayer
                .setTexture(state.frameKey)
                .setOrigin(state.origin.x, state.origin.y)
                .setPosition(state.slideX, this.layout.walkHeight)
                .setVisible(true);
            if (this.dieSprayer.setDisplaySize) {
                this.dieSprayer.setDisplaySize(dims.width, dims.height);
            }

            // Stretched shadow
            if (state.shadow.visible) {
                const baseShadowScale = this.sprayerScale / 4;
                const scaleX = baseShadowScale * (state.shadow.scaleX || 1);
                const scaleY = baseShadowScale * (state.shadow.scaleY || 1);
                this.playerShadow
                    .setVisible(true)
                    .setOrigin(Death.SHAPE_ORIGINS.shadow.x, Death.SHAPE_ORIGINS.shadow.y)
                    .setScale(scaleX, scaleY);

                const topLeftX = state.slideX - (state.origin.x * dims.width);
                const topLeftY = this.layout.walkHeight - (state.origin.y * dims.height);
                this.playerShadow.setPosition(
                    topLeftX + Death.GROUND_OFFSETS.shadowCenter.x,
                    topLeftY + Death.GROUND_OFFSETS.shadowCenter.y,
                );
            } else {
                this.playerShadow.setVisible(false);
            }

            // Blood pool
            if (state.blood.visible) {
                const topLeftX = state.slideX - (state.origin.x * dims.width);
                const topLeftY = this.layout.walkHeight - (state.origin.y * dims.height);
                this.bloodPool
                    .setVisible(true)
                    .setOrigin(Death.SHAPE_ORIGINS.blood.x, Death.SHAPE_ORIGINS.blood.y)
                    .setPosition(
                        topLeftX + Death.GROUND_OFFSETS.bloodCenter.x,
                        topLeftY + Death.GROUND_OFFSETS.bloodCenter.y,
                    )
                    .setScale(state.blood.scaleX, state.blood.scaleY);
            } else {
                this.bloodPool.setVisible(false);
            }

            // Eye mask
            if (state.eyes.visible) {
                const topLeftX = state.slideX - (state.origin.x * dims.width);
                const topLeftY = this.layout.walkHeight - (state.origin.y * dims.height);
                this.eyesMask
                    .setVisible(true)
                    .setOrigin(Death.SHAPE_ORIGINS.eyes.x, Death.SHAPE_ORIGINS.eyes.y)
                    .setPosition(
                        topLeftX + Death.GROUND_OFFSETS.eyes.x,
                        topLeftY + Death.GROUND_OFFSETS.eyes.y,
                    );
                if (this.eyesMask.setTint) {
                    this.eyesMask.setTint(state.eyes.tint);
                }
                if (this.eyesMask.setAlpha) {
                    this.eyesMask.setAlpha(state.eyes.alpha);
                }
            } else {
                this.eyesMask.setVisible(false);
            }

            if (state.isComplete && !this.deathComplete) {
                this.deathComplete = true;
                if (this.deathCallback) {
                    const cb = this.deathCallback;
                    this.deathCallback = null;
                    cb();
                }
                if (typeof this.onDeathComplete === 'function') {
                    this.onDeathComplete();
                }
            }
        }

        triggerHurt(onComplete) {
            if (this.isDead || this.isHurt) {
                return;
            }
            if (SoundFx && typeof SoundFx.play === 'function') {
                SoundFx.play(this.scene, 'sfx_player_hit');
            }
            this.isHurt = true;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtCallback = typeof onComplete === 'function' ? onComplete : null;

            this.stopBoxingAnimation();
            this.stopKickAnimation();
            if (this.attackHitStar) {
                this.attackHitStar.setVisible(false);
            }
            this.attackHitStarTimer = 0;
            this.idleSprayer.setVisible(false);
            this.walkingSprayer.setVisible(false);
            if (this.walkingSprayer.anims) {
                this.walkingSprayer.anims.stop();
            }

            this.applyHurtFrame();
        }

        updateHurtAnimation(delta) {
            if (!this.isHurt) {
                return;
            }

            const advanceResult = Hurt.advanceHurt(this.hurtTick, delta, this.hurtElapsed);
            this.hurtTick = advanceResult.tick;
            this.hurtElapsed = advanceResult.remainingMs;

            if (advanceResult.isComplete) {
                this.endHurt();
                return;
            }

            this.applyHurtFrame();
        }

        applyHurtFrame() {
            const state = Hurt.getHurtState(this.hurtTick);
            const dims = Hurt.FRAME_DIMENSIONS.player_hurt_character;

            this.hurtSprayer
                .setTexture(state.frameKey)
                .setOrigin(state.origin.x, state.origin.y)
                .setPosition(state.offsetX, this.layout.walkHeight)
                .setVisible(true);
            if (this.hurtSprayer.setDisplaySize) {
                this.hurtSprayer.setDisplaySize(dims.width, dims.height);
            }

            // Origin (0,0) in container coordinates is zeroFromFeetY above ground line
            const zeroX = state.offsetX;
            const zeroY = this.layout.walkHeight - state.zeroFromFeetY;
            const bloodDims = Hurt.FRAME_DIMENSIONS.player_hurt_blood_drop;

            // Blood drop 1
            this.hurtBloodDrop1
                .setTexture(Hurt.FRAME_KEYS.bloodDrop)
                .setPosition(zeroX + state.drop1.x, zeroY + state.drop1.y)
                .setScale(state.drop1.scale)
                .setRotation(state.drop1.rotation)
                .setVisible(state.drop1.visible);
            if (this.hurtBloodDrop1.setDisplaySize) {
                this.hurtBloodDrop1.setDisplaySize(bloodDims.width * state.drop1.scale, bloodDims.height * state.drop1.scale);
            }

            // Blood drop 2
            this.hurtBloodDrop2
                .setTexture(Hurt.FRAME_KEYS.bloodDrop)
                .setPosition(zeroX + state.drop2.x, zeroY + state.drop2.y)
                .setScale(state.drop2.scale)
                .setRotation(state.drop2.rotation)
                .setVisible(state.drop2.visible);
            if (this.hurtBloodDrop2.setDisplaySize) {
                this.hurtBloodDrop2.setDisplaySize(bloodDims.width * state.drop2.scale, bloodDims.height * state.drop2.scale);
            }
        }

        endHurt() {
            this.isHurt = false;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtSprayer.setVisible(false);
            this.hurtBloodDrop1.setVisible(false);
            this.hurtBloodDrop2.setVisible(false);
            this.idleSprayer.setVisible(true);

            if (this.hurtCallback) {
                const cb = this.hurtCallback;
                this.hurtCallback = null;
                cb();
            }
        }

        applyDamage(amount = 20, attackerX = null) {
            if (this.isDead) {
                return this;
            }
            if (attackerX !== null && attackerX !== undefined) {
                this.setFacingLeft(attackerX < this.container.x);
            }
            this.health = Math.max(0, this.health - amount);
            if (this.health <= 0) {
                this.triggerDeath();
            } else {
                this.triggerHurt();
            }
            return this;
        }

        revive() {
            this.isDead = false;
            this.isHurt = false;
            this.health = this.maxHealth;
            this.hasHitThisAttack = false;
            this.hurtTick = 1;
            this.hurtElapsed = 0;
            this.hurtCallback = null;
            if (this.hurtSprayer) this.hurtSprayer.setVisible(false);
            if (this.hurtBloodDrop1) this.hurtBloodDrop1.setVisible(false);
            if (this.hurtBloodDrop2) this.hurtBloodDrop2.setVisible(false);
            this.deathTick = 1;
            this.deathElapsed = 0;
            this.deathComplete = false;
            this.deathCallback = null;
            this.dieSprayer.setVisible(false);
            this.bloodPool.setVisible(false);
            if (this.eyesMask.clearTint) {
                this.eyesMask.clearTint();
            }
            this.eyesMask.setVisible(false);
            if (this.attackHitStar) {
                this.attackHitStar.setVisible(false);
            }
            this.attackHitStarTimer = 0;
            this.idleSprayer.setVisible(true);
            this.playerShadow
                .setPosition(0, this.layout.walkHeight)
                .setScale(this.sprayerScale / 4)
                .setOrigin(0.5, 0.5)
                .setVisible(false);
        }

        destroy() {
            if (this.controls && typeof this.controls.destroy === 'function') {
                this.controls.destroy();
                this.controls = null;
            }
            if (this.container && typeof this.container.destroy === 'function') {
                this.container.destroy();
                this.container = null;
            }
        }
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { Player };
    } else {
        globalScope.Player = Player;
    }
})(typeof window !== 'undefined' ? window : global);
