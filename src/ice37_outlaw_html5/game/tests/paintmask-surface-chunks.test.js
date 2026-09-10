const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function readPngDimensions(filePath) {
    const fd = fs.openSync(filePath, 'r');
    try {
        const buffer = Buffer.alloc(24);
        fs.readSync(fd, buffer, 0, 24, 0);

        // Check PNG signature: 89 50 4E 47 0D 0A 1A 0A
        const signature = buffer.subarray(0, 8);
        const expectedSig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
        assert.deepEqual(signature, expectedSig, `File ${filePath} is not a valid PNG`);

        // IHDR chunk: offset 16 is width (4 bytes big-endian), offset 20 is height (4 bytes big-endian)
        const width = buffer.readUInt32BE(16);
        const height = buffer.readUInt32BE(20);
        return { width, height };
    } finally {
        fs.closeSync(fd);
    }
}

test('verifies street surface paintmask chunks exist and have exact 4096-aligned dimensions', () => {
    const imagesDir = path.resolve(__dirname, '../assets/images/street');
    const chunk0Path = path.join(imagesDir, 'street_paintmask_surface_chunk_0.png');
    const chunk1Path = path.join(imagesDir, 'street_paintmask_surface_chunk_1.png');

    assert.ok(fs.existsSync(chunk0Path), 'street_paintmask_surface_chunk_0.png must exist');
    assert.ok(fs.existsSync(chunk1Path), 'street_paintmask_surface_chunk_1.png must exist');

    assert.deepEqual(readPngDimensions(chunk0Path), { width: 4096, height: 1393 });
    assert.deepEqual(readPngDimensions(chunk1Path), { width: 1134, height: 1393 });
});

test('verifies trainyard surface paintmask chunks exist and have exact 4096-aligned dimensions', () => {
    const imagesDir = path.resolve(__dirname, '../assets/images/trainyard');
    const chunk0Path = path.join(imagesDir, 'trainyard_paintmask_surface_chunk_0.png');
    const chunk1Path = path.join(imagesDir, 'trainyard_paintmask_surface_chunk_1.png');

    assert.ok(fs.existsSync(chunk0Path), 'trainyard_paintmask_surface_chunk_0.png must exist');
    assert.ok(fs.existsSync(chunk1Path), 'trainyard_paintmask_surface_chunk_1.png must exist');

    assert.deepEqual(readPngDimensions(chunk0Path), { width: 4096, height: 500 });
    assert.deepEqual(readPngDimensions(chunk1Path), { width: 3318, height: 500 });
});

test('verifies hall of fame paintmask is unsliced and matches 3598x871 dimensions', () => {
    const imagesDir = path.resolve(__dirname, '../assets/images/halloffame');
    const hofPath = path.join(imagesDir, 'halloffame_paintmask.png');

    assert.ok(fs.existsSync(hofPath), 'halloffame_paintmask.png must exist');
    assert.deepEqual(readPngDimensions(hofPath), { width: 3598, height: 871 });
});
