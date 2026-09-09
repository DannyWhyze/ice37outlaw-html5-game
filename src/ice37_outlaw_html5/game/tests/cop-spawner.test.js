const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const CopSpawnerModule = require(path.resolve(__dirname, '../js/logic/copSpawner.js'));
const {
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
} = CopSpawnerModule;

test('verifies Flash AS2 cop spawn constants', () => {
    assert.equal(DEFAULT_TRAINYARD_COPDICHTE, 350);
    assert.equal(DEFAULT_STREET_COPDICHTE, 150);
    assert.equal(MIN_COPDICHTE, 20);
    assert.equal(CHECK_INTERVAL_MS, 80);
    assert.equal(OFFSCREEN_SPAWN_LEFT_SCREEN_X, -280);
    assert.equal(OFFSCREEN_SPAWN_RIGHT_SCREEN_X, 2200);
});

test('rollSpawn evaluates Math.round(random * copdichte) == 1 matching Flash AS2', () => {
    const copdichte = 100;
    // Exactly 1 / 100 = 0.01 -> Math.round(0.01 * 100) = 1
    assert.equal(rollSpawn(copdichte, () => 0.01), true);
    // 0.004 -> Math.round(0.4) = 0 -> false
    assert.equal(rollSpawn(copdichte, () => 0.004), false);
    // 0.02 -> Math.round(2.0) = 2 -> false
    assert.equal(rollSpawn(copdichte, () => 0.02), false);
});

test('chooseSpawnSide returns left for random < 0.5 and right for random >= 0.5', () => {
    assert.equal(chooseSpawnSide(() => 0.1), 'left');
    assert.equal(chooseSpawnSide(() => 0.49), 'left');
    assert.equal(chooseSpawnSide(() => 0.5), 'right');
    assert.equal(chooseSpawnSide(() => 0.99), 'right');
});

test('computeSpawnWorldX translates screen spawn positions to world coordinates based on worldLayer.x', () => {
    // Camera at origin (worldLayer.x = 0)
    assert.equal(computeSpawnWorldX(2200, 0), 2200);
    assert.equal(computeSpawnWorldX(-280, 0), -280);

    // Camera scrolled to the right (worldLayer.x = -500)
    assert.equal(computeSpawnWorldX(2200, -500), 2700);
    assert.equal(computeSpawnWorldX(-280, -500), 220);

    // Camera scrolled (worldLayer.x = -1200)
    assert.equal(computeSpawnWorldX(2200, -1200), 3400);
    assert.equal(computeSpawnWorldX(-280, -1200), 920);
});

test('instantiates CopSpawner with defaults and options', () => {
    const defaultSpawner = new CopSpawner();
    assert.equal(defaultSpawner.copdichte, 350);
    assert.equal(defaultSpawner.copanz, 0);
    assert.equal(defaultSpawner.copkill, 0);

    const streetSpawner = new CopSpawner(DEFAULT_STREET_COPDICHTE);
    assert.equal(streetSpawner.copdichte, 150);

    const customSpawner = new CopSpawner({ copdichte: 10, copkill: 5 });
    // Clamped to MIN_COPDICHTE = 20
    assert.equal(customSpawner.copdichte, 20);
    assert.equal(customSpawner.copkill, 5);
});

test('CopSpawner.update accumulates time and triggers spawn at 80ms interval', () => {
    const spawner = new CopSpawner(100);

    // Mock random that never hits 1 (e.g. 0.5 -> 50)
    let result = spawner.update(40, () => 0.5);
    assert.equal(result, null);
    assert.equal(spawner.accumulatorMs, 40);

    // Next 40ms reaches 80ms, but roll is 50 -> no spawn
    result = spawner.update(40, () => 0.5);
    assert.equal(result, null);
    assert.equal(spawner.accumulatorMs, 0);

    // Provide roll that hits 1 (0.01 * 100 = 1) and random < 0.5 for left spawn
    // randomFn called twice: first for roll, second for side
    let callCount = 0;
    const mockRandom = () => {
        callCount++;
        return callCount === 1 ? 0.01 : 0.2; // 0.01 -> roll 1, 0.2 -> left
    };

    result = spawner.update(80, mockRandom);
    assert.ok(result);
    assert.equal(result.shouldSpawn, true);
    assert.equal(result.side, 'left');
    assert.equal(result.screenX, -280);
    assert.equal(spawner.copanz, 1);

    // Once copanz is 1, subsequent updates must return null
    result = spawner.update(80, () => 0.01);
    assert.equal(result, null);
    assert.equal(spawner.copanz, 1);
});

test('CopSpawner.onCopKilled increments copkill, reduces copdichte by 10% and resets copanz', () => {
    const spawner = new CopSpawner(350);
    spawner.copanz = 1;

    // First kill: 350 - Math.floor(350 / 10) = 350 - 35 = 315
    const kill1 = spawner.onCopKilled();
    assert.equal(spawner.copanz, 0);
    assert.equal(spawner.copkill, 1);
    assert.equal(spawner.copdichte, 315);
    assert.equal(kill1.copkill, 1);
    assert.equal(kill1.copdichte, 315);

    // Second kill: 315 - Math.floor(31.5) = 315 - 31 = 284
    spawner.onCopKilled();
    assert.equal(spawner.copkill, 2);
    assert.equal(spawner.copdichte, 284);

    // Multiple kills down to minimum clamp (MIN_COPDICHTE = 20)
    for (let i = 0; i < 30; i++) {
        spawner.onCopKilled();
    }
    assert.equal(spawner.copdichte, 20);
    assert.equal(spawner.copkill, 32);
});

test('CopSpawner.forceSpawn triggers immediate spawn for testing', () => {
    const spawner = new CopSpawner();
    const spawnRight = spawner.forceSpawn('right');
    assert.equal(spawnRight.shouldSpawn, true);
    assert.equal(spawnRight.side, 'right');
    assert.equal(spawnRight.screenX, 2200);
    assert.equal(spawner.copanz, 1);

    spawner.copanz = 0;
    const spawnLeft = spawner.forceSpawn('left');
    assert.equal(spawnLeft.shouldSpawn, true);
    assert.equal(spawnLeft.side, 'left');
    assert.equal(spawnLeft.screenX, -280);
    assert.equal(spawner.copanz, 1);
});

test('CopSpawner.reset restores initial state', () => {
    const spawner = new CopSpawner(350);
    spawner.forceSpawn('right');
    spawner.onCopKilled();
    assert.equal(spawner.copdichte, 315);
    assert.equal(spawner.copkill, 1);

    spawner.reset();
    assert.equal(spawner.copdichte, 350);
    assert.equal(spawner.copanz, 0);
    assert.equal(spawner.accumulatorMs, 0);
    // copkill is global and preserved
    assert.equal(spawner.copkill, 1);
});
