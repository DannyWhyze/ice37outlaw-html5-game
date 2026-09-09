(function attachCopSpawner(globalScope) {
    'use strict';

    // Flash ActionScript 2.0 constants
    const DEFAULT_TRAINYARD_COPDICHTE = 350; // _root.copdichte = 350;
    const DEFAULT_STREET_COPDICHTE = 150;    // _root.copdichte = 150;
    const MIN_COPDICHTE = 20;                // if (_root.copdichte < 20) _root.copdichte = 20;
    const CHECK_INTERVAL_MS = 80;            // 2 frames at 25 FPS (DefineSprite_64 / DefineSprite_86)

    // Native 1080p Screen Coordinates for Offscreen Spawn
    // Flash left: _X = -80 (out of 550px stage) -> -80 * (1920/546) ≈ -281px
    // Flash right: _X = 620 (550 + 70) -> 1920 + 70 * (1920/546) ≈ 2166px -> 2200px
    const OFFSCREEN_SPAWN_LEFT_SCREEN_X = -280;
    const OFFSCREEN_SPAWN_RIGHT_SCREEN_X = 2200;

    function rollSpawn(copdichte, randomFn = Math.random) {
        const roll = Math.round(randomFn() * copdichte);
        return roll === 1;
    }

    function chooseSpawnSide(randomFn = Math.random) {
        // Flash AS2: wo = random(2); if (wo == 1) left else right
        return randomFn() < 0.5 ? 'left' : 'right';
    }

    function computeSpawnWorldX(screenX, worldLayerX = 0) {
        return screenX - worldLayerX;
    }

    class CopSpawner {
        constructor(options = {}) {
            let initialDichte = DEFAULT_TRAINYARD_COPDICHTE;
            if (typeof options === 'number') {
                initialDichte = options;
            } else if (options && typeof options.copdichte === 'number') {
                initialDichte = options.copdichte;
            }

            this.initialCopdichte = Math.max(MIN_COPDICHTE, initialDichte);
            this.copdichte = this.initialCopdichte;
            this.copanz = (options && typeof options.copanz === 'number') ? options.copanz : 0;
            this.copkill = (options && typeof options.copkill === 'number') ? options.copkill : 0;
            this.accumulatorMs = 0;
            this.checkIntervalMs = (options && options.checkIntervalMs) || CHECK_INTERVAL_MS;
        }

        reset(newInitialDichte = null) {
            if (typeof newInitialDichte === 'number') {
                this.initialCopdichte = Math.max(MIN_COPDICHTE, newInitialDichte);
            }
            this.copdichte = this.initialCopdichte;
            this.copanz = 0;
            this.accumulatorMs = 0;
        }

        onCopKilled() {
            this.copanz = 0;
            this.copkill += 1;
            // Flash AS2: _root.copdichte -= _root.copdichte / 10;
            const reduction = Math.floor(this.copdichte / 10);
            this.copdichte = Math.max(MIN_COPDICHTE, this.copdichte - reduction);
            return {
                copkill: this.copkill,
                copdichte: this.copdichte,
            };
        }

        update(deltaMs, randomFn = Math.random) {
            if (this.copanz >= 1) {
                return null;
            }

            this.accumulatorMs += Math.max(0, deltaMs || 0);
            while (this.accumulatorMs >= this.checkIntervalMs) {
                this.accumulatorMs -= this.checkIntervalMs;

                if (this.copanz < 1 && rollSpawn(this.copdichte, randomFn)) {
                    const side = chooseSpawnSide(randomFn);
                    const screenX = side === 'left' ? OFFSCREEN_SPAWN_LEFT_SCREEN_X : OFFSCREEN_SPAWN_RIGHT_SCREEN_X;
                    this.copanz = 1;
                    return {
                        shouldSpawn: true,
                        side,
                        screenX,
                        copdichte: this.copdichte,
                    };
                }
            }

            return null;
        }

        forceSpawn(side = 'right') {
            this.copanz = 1;
            const validSide = (side === 'left' || side === 'right') ? side : 'right';
            const screenX = validSide === 'left' ? OFFSCREEN_SPAWN_LEFT_SCREEN_X : OFFSCREEN_SPAWN_RIGHT_SCREEN_X;
            return {
                shouldSpawn: true,
                side: validSide,
                screenX,
                copdichte: this.copdichte,
            };
        }
    }

    const CopSpawnerExport = Object.freeze({
        DEFAULT_TRAINYARD_COPDICHTE,
        DEFAULT_STREET_COPDICHTE,
        MIN_COPDICHTE,
        CHECK_INTERVAL_MS,
        OFFSCREEN_SPAWN_LEFT_SCREEN_X,
        OFFSCREEN_SPAWN_RIGHT_SCREEN_X,
        rollSpawn,
        chooseSpawnSide,
        computeSpawnWorldX,
        CopSpawner,
    });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CopSpawnerExport;
    } else {
        globalScope.CopSpawner = CopSpawnerExport;
    }
})(typeof window !== 'undefined' ? window : global);
