const assert = require('node:assert/strict');
const test = require('node:test');

const {
    validatePngDataUrl,
    validateMetadata,
    sanitizePhotoId,
    GalleryStorageService,
    MemoryStorageAdapter,
    PNG_SIGNATURE,
    MAX_PAYLOAD_BYTES,
    MAX_PHOTOS_QUOTA,
} = require('../js/logic/galleryStorage.js');

// Valid 1x1 transparent PNG data URL (has correct 8-byte PNG magic header 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A)
const VALID_1X1_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

test('validates PNG magic bytes correctly and accepts authentic PNG data URLs', () => {
    const result = validatePngDataUrl(VALID_1X1_PNG);
    assert.equal(result.valid, true);
    assert.ok(result.byteLength > 0);
    assert.deepEqual(result.magicBytes, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
});

test('rejects non-PNG MIME types (SVG, JPEG, HTML, text)', () => {
    const svgData = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
    assert.equal(validatePngDataUrl(svgData).valid, false);
    assert.match(validatePngDataUrl(svgData).error, /Invalid MIME type/i);

    const htmlData = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
    assert.equal(validatePngDataUrl(htmlData).valid, false);

    const jpegData = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    assert.equal(validatePngDataUrl(jpegData).valid, false);
});

test('rejects fake PNG with forged MIME type but missing PNG magic bytes', () => {
    // Starts with data:image/png;base64, but payload is just zeroes
    const fakePng = 'data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const result = validatePngDataUrl(fakePng);
    assert.equal(result.valid, false);
    assert.match(result.error, /Invalid PNG signature/i);
});

test('rejects oversized payloads exceeding 5 MB limit', () => {
    // Create fake base64 string larger than MAX_PAYLOAD_BYTES (5MB = 5 * 1024 * 1024 bytes)
    const largeBase64 = 'A'.repeat(7 * 1024 * 1024);
    const oversizedPayload = `data:image/png;base64,${largeBase64}`;
    const result = validatePngDataUrl(oversizedPayload);
    assert.equal(result.valid, false);
    assert.match(result.error, /Payload exceeds 5MB limit/i);
});

test('sanitizes photo IDs and prevents path traversal attacks', () => {
    assert.equal(sanitizePhotoId('../../etc/passwd'), 'etcpasswd');
    assert.equal(sanitizePhotoId('..\\..\\windows\\system32'), 'windowssystem32');
    assert.equal(sanitizePhotoId('photo_12345-abc_DEF'), 'photo_12345-abc_DEF');
    assert.equal(sanitizePhotoId('foo/bar/baz'), 'foobarbaz');

    // Generated ID is safe regex ^[a-zA-Z0-9_-]+$
    const safeId = sanitizePhotoId('');
    assert.match(safeId, /^[a-zA-Z0-9_-]+$/);
});

test('validates metadata schema strictly', () => {
    const validMeta = {
        scene: 'HallOfFameScene',
        zoom: 1.5,
        timestamp: 1725883200000,
    };
    const res1 = validateMetadata(validMeta);
    assert.equal(res1.valid, true);

    // Invalid scene
    assert.equal(validateMetadata({ scene: 'HackerScene' }).valid, false);

    // Out of bounds zoom
    assert.equal(validateMetadata({ scene: 'HallOfFameScene', zoom: 99.0 }).valid, false);
    assert.equal(validateMetadata({ scene: 'HallOfFameScene', zoom: 0.2 }).valid, false);

    // Invalid timestamp
    assert.equal(validateMetadata({ scene: 'HallOfFameScene', timestamp: 'not-a-number' }).valid, false);
});

test('MemoryStorageAdapter stores, retrieves, lists and deletes valid photos within quota', async () => {
    const adapter = new MemoryStorageAdapter({ maxPhotos: 3 });

    const photo1 = await adapter.savePhoto(VALID_1X1_PNG, { scene: 'HallOfFameScene', zoom: 1.0 });
    assert.ok(photo1.id);
    assert.equal(photo1.metadata.scene, 'HallOfFameScene');

    const photo2 = await adapter.savePhoto(VALID_1X1_PNG, { scene: 'StreetScene', zoom: 1.5 });
    const photo3 = await adapter.savePhoto(VALID_1X1_PNG, { scene: 'TrainyardScene', zoom: 2.0 });

    const list = await adapter.listPhotos();
    assert.equal(list.length, 3);
    assert.equal(list[0].id, photo3.id, 'Newest photo must be first');

    // Adding 4th photo enforces maxPhotos quota of 3 (oldest photo1 is pruned)
    const photo4 = await adapter.savePhoto(VALID_1X1_PNG, { scene: 'HallOfFameScene', zoom: 2.5 });
    const listAfterPrune = await adapter.listPhotos();
    assert.equal(listAfterPrune.length, 3);
    assert.ok(!listAfterPrune.find(p => p.id === photo1.id), 'Oldest photo must be pruned on quota limit');
    assert.equal(listAfterPrune[0].id, photo4.id);

    // Delete photo
    const deleted = await adapter.deletePhoto(photo2.id);
    assert.equal(deleted, true);
    const listAfterDelete = await adapter.listPhotos();
    assert.equal(listAfterDelete.length, 2);
});

test('GalleryStorageService delegates to adapter and enforces input security validation before saving', async () => {
    const adapter = new MemoryStorageAdapter();
    const service = new GalleryStorageService({ adapter });

    // Saving valid photo
    const saved = await service.savePhoto(VALID_1X1_PNG, { scene: 'HallOfFameScene', zoom: 1.0 });
    assert.ok(saved.id);

    // Saving invalid SVG photo throws security error
    await assert.rejects(
        async () => {
            await service.savePhoto('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=', { scene: 'HallOfFameScene' });
        },
        /Invalid MIME type/i
    );

    // Saving fake PNG throws security error
    await assert.rejects(
        async () => {
            await service.savePhoto('data:image/png;base64,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', { scene: 'HallOfFameScene' });
        },
        /Invalid PNG signature/i
    );
});
