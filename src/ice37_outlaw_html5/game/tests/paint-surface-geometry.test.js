const assert = require('node:assert/strict');
const test = require('node:test');

const {
    DEFAULT_CHUNK_WIDTH,
    createSurfaceChunks,
    getStampTargets,
} = require('../js/logic/paintSurfaceGeometry.js');

test('exports DEFAULT_CHUNK_WIDTH = 4096', () => {
    assert.equal(DEFAULT_CHUNK_WIDTH, 4096);
});

test('createSurfaceChunks partitions Street bounds into 2 chunks with maxTextureSize 4096', () => {
    const streetBounds = {
        x: -1415.5604395604396,
        y: -313,
        width: 5230,
        height: 1393,
    };
    const chunks = createSurfaceChunks(streetBounds, 4096);
    assert.equal(chunks.length, 2);

    assert.deepEqual(chunks[0], {
        index: 0,
        uStart: 0,
        width: 4096,
        height: 1393,
        worldX: -1415.5604395604396,
        worldY: -313,
    });

    assert.deepEqual(chunks[1], {
        index: 1,
        uStart: 4096,
        width: 1134,
        height: 1393,
        worldX: 2680.4395604395604,
        worldY: -313,
    });
});

test('createSurfaceChunks partitions Trainyard bounds into 2 chunks with maxTextureSize 4096', () => {
    const trainyardBounds = {
        x: 506.3736263736264,
        y: 580,
        width: 7414,
        height: 500,
    };
    const chunks = createSurfaceChunks(trainyardBounds, 4096);
    assert.equal(chunks.length, 2);

    assert.deepEqual(chunks[0], {
        index: 0,
        uStart: 0,
        width: 4096,
        height: 500,
        worldX: 506.3736263736264,
        worldY: 580,
    });

    assert.deepEqual(chunks[1], {
        index: 1,
        uStart: 4096,
        width: 3318,
        height: 500,
        worldX: 4602.3736263736264,
        worldY: 580,
    });
});

test('createSurfaceChunks keeps Hall of Fame bounds as 1 chunk with maxTextureSize 4096', () => {
    const hofBounds = {
        x: 7.032967032967033,
        y: 209,
        width: 3598,
        height: 871,
    };
    const chunks = createSurfaceChunks(hofBounds, 4096);
    assert.equal(chunks.length, 1);

    assert.deepEqual(chunks[0], {
        index: 0,
        uStart: 0,
        width: 3598,
        height: 871,
        worldX: 7.032967032967033,
        worldY: 209,
    });
});

test('createSurfaceChunks validates inputs and throws for invalid bounds', () => {
    assert.throws(() => createSurfaceChunks(null, 4096), /Invalid surface bounds/);
    assert.throws(() => createSurfaceChunks({ x: 0, y: 0, width: 0, height: 100 }, 4096), /Invalid surface bounds/);
    assert.throws(() => createSurfaceChunks({ x: 0, y: 0, width: 100, height: -10 }, 4096), /Invalid surface bounds/);
    assert.throws(() => createSurfaceChunks({ x: NaN, y: 0, width: 100, height: 100 }, 4096), /Invalid surface bounds/);
    assert.throws(() => createSurfaceChunks({ x: 0, y: 0, width: 100, height: 100 }, 0), /Invalid maxTextureSize/);
    assert.throws(() => createSurfaceChunks({ x: 0, y: 0, width: 100, height: 5000 }, 4096), /exceeds maxTextureSize/);
});

test('getStampTargets returns empty array when stamp circle is entirely outside surface bounds', () => {
    const bounds = { x: 100, y: 100, width: 5000, height: 1000 };
    const chunks = createSurfaceChunks(bounds, 4096);

    // Completely to the left
    assert.deepEqual(getStampTargets(bounds, chunks, 50, 500, 20), []);
    // Completely to the right
    assert.deepEqual(getStampTargets(bounds, chunks, 5200, 500, 20), []);
    // Completely above
    assert.deepEqual(getStampTargets(bounds, chunks, 500, 50, 20), []);
    // Completely below
    assert.deepEqual(getStampTargets(bounds, chunks, 500, 1200, 20), []);
});

test('getStampTargets returns single target for stamp entirely within chunk 0', () => {
    const bounds = { x: 100, y: 100, width: 5000, height: 1000 };
    const chunks = createSurfaceChunks(bounds, 4096);

    const targets = getStampTargets(bounds, chunks, 200, 300, 10);
    assert.equal(targets.length, 1);
    assert.deepEqual(targets[0], {
        chunkIndex: 0,
        localX: 100,
        localY: 200,
    });
});

test('getStampTargets returns single target for stamp entirely within chunk 1', () => {
    const bounds = { x: 100, y: 100, width: 5000, height: 1000 };
    const chunks = createSurfaceChunks(bounds, 4096);

    // chunk 0 worldX: 100..4196. chunk 1 worldX: 4196..5100
    const targets = getStampTargets(bounds, chunks, 4500, 300, 10);
    assert.equal(targets.length, 1);
    assert.deepEqual(targets[0], {
        chunkIndex: 1,
        localX: 304, // 4500 - 4196
        localY: 200,
    });
});

test('getStampTargets returns both targets when stamp circle overlaps chunk seam at u = 4096', () => {
    const bounds = { x: 100, y: 100, width: 5000, height: 1000 };
    const chunks = createSurfaceChunks(bounds, 4096);

    // Seam is at worldX = 100 + 4096 = 4196
    // Stamp at worldX = 4196 with radius 15 spans [4181 .. 4211]
    const targets = getStampTargets(bounds, chunks, 4196, 250, 15);
    assert.equal(targets.length, 2);

    assert.deepEqual(targets[0], {
        chunkIndex: 0,
        localX: 4096,
        localY: 150,
    });

    assert.deepEqual(targets[1], {
        chunkIndex: 1,
        localX: 0,
        localY: 150,
    });
});

test('getStampTargets does not produce nonexistent chunks when overlapping outer edges', () => {
    const bounds = { x: 100, y: 100, width: 5000, height: 1000 };
    const chunks = createSurfaceChunks(bounds, 4096);

    // Overlapping left edge: worldX = 105, radius 20 spans [85..125]
    const leftTargets = getStampTargets(bounds, chunks, 105, 200, 20);
    assert.equal(leftTargets.length, 1);
    assert.equal(leftTargets[0].chunkIndex, 0);

    // Overlapping right edge: worldX = 5095, radius 20 spans [5075..5115]
    const rightTargets = getStampTargets(bounds, chunks, 5095, 200, 20);
    assert.equal(rightTargets.length, 1);
    assert.equal(rightTargets[0].chunkIndex, 1);
});
