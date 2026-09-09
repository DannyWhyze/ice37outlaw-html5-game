(function attachCombatCollision(globalScope) {
    'use strict';

    // Flash Stage to 1080p Canvas scale
    const NATIVE_STAGE_SCALE = 1920.0 / 546.0; // ~3.5164835

    // Combat rules matching Flash ActionScript 2.0 1:1
    const MAX_PLAYER_HEALTH = 100;
    const ATTACK_DAMAGE_PLAYER = 20; // _root.leben -= 20
    const MAX_COP_HITS = 3;          // _root.cophit < 3 -> Hurt, >= 3 -> Tot

    // Native 1080p Hitbox dimensions & reaches (empirically extracted from Flash AS2 DefineShapes)
    const NATIVE_PUNCH_REACH = 330;       // Player fist reach (Shape 144 + Cop body half-width, Flash: 329.94px)
    const NATIVE_KICK_REACH = 280;        // Player foot reach (Shape 134 + Cop body half-width, Flash: 276.11px)
    const NATIVE_COP_PUNCH_REACH = 460;   // Cop fist reach (Shape 21 + Player body half-width, Flash: 464.62px)
    const NATIVE_COP_SENSOR_REACH = 320;  // Cop approach sensor 'ht' (Shape 7 + Player body half-width, Flash: 321.14px)

    // Body bounding box dimensions
    const PLAYER_BODY = Object.freeze({ width: 320, height: 470 });
    const COP_BODY = Object.freeze({ width: 230, height: 470 });

    function isFacingTarget(attackerX, targetX, isFacingLeft) {
        if (attackerX < targetX) {
            return !isFacingLeft; // Target is to the right -> attacker must face right
        }
        if (attackerX > targetX) {
            return isFacingLeft;  // Target is to the left -> attacker must face left
        }
        return true;
    }

    function isTargetInReach(attackerX, targetX, isFacingLeft, reach) {
        if (!isFacingTarget(attackerX, targetX, isFacingLeft)) {
            return false;
        }
        return Math.abs(attackerX - targetX) <= reach;
    }

    function isPlayerPunchImpactFrame(frameNumber) {
        // Frames 3..5 in PlayerCombat correspond to extended fist (Shape 17 & 18)
        return Number.isInteger(frameNumber) && frameNumber >= 3 && frameNumber <= 5;
    }

    function isPlayerKickImpactFrame(frameNumber) {
        // Frames 3..6 in PlayerCombat correspond to extended foot (Shape 23)
        return Number.isInteger(frameNumber) && frameNumber >= 3 && frameNumber <= 6;
    }

    function isCopPunchImpactTick(tick) {
        // Ticks 9..10 in CopCombat correspond to punch impact window
        return Number.isInteger(tick) && tick >= 9 && tick <= 10;
    }

    function resolvePlayerHitOnCop(copCurrentHits) {
        const hits = Math.max(0, copCurrentHits || 0) + 1;
        const isDeath = hits >= MAX_COP_HITS;
        return {
            newHitCount: hits,
            isDeath,
        };
    }

    function resolveCopHitOnPlayer(playerCurrentHealth) {
        const current = (playerCurrentHealth !== undefined) ? playerCurrentHealth : MAX_PLAYER_HEALTH;
        const newHealth = Math.max(0, current - ATTACK_DAMAGE_PLAYER);
        const isDeath = newHealth <= 0;
        return {
            newHealth,
            damage: ATTACK_DAMAGE_PLAYER,
            isDeath,
        };
    }

    function getHitboxBounds(centerX, bottomY, width, height) {
        return {
            x: centerX - width * 0.5,
            y: bottomY - height,
            width,
            height,
        };
    }

    function checkAABBOverlap(rectA, rectB) {
        return (
            rectA.x < rectB.x + rectB.width &&
            rectA.x + rectA.width > rectB.x &&
            rectA.y < rectB.y + rectB.height &&
            rectA.y + rectA.height > rectB.y
        );
    }

    const CombatCollision = Object.freeze({
        NATIVE_STAGE_SCALE,
        MAX_PLAYER_HEALTH,
        ATTACK_DAMAGE_PLAYER,
        MAX_COP_HITS,
        NATIVE_PUNCH_REACH,
        NATIVE_KICK_REACH,
        NATIVE_COP_PUNCH_REACH,
        NATIVE_COP_SENSOR_REACH,
        PLAYER_BODY,
        COP_BODY,
        isFacingTarget,
        isTargetInReach,
        isPlayerPunchImpactFrame,
        isPlayerKickImpactFrame,
        isCopPunchImpactTick,
        resolvePlayerHitOnCop,
        resolveCopHitOnPlayer,
        getHitboxBounds,
        checkAABBOverlap,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CombatCollision;
    } else {
        globalScope.CombatCollision = CombatCollision;
    }
})(typeof window !== 'undefined' ? window : global);
