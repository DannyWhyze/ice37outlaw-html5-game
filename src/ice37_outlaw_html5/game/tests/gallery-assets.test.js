const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('verifies gallery prefab directory and assets exist', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/gallery');
    assert.ok(fs.existsSync(dir), 'prefabs/gallery directory must exist');

    const expectedFiles = [
        'gallery_backdrop_ice37.png',
        'gallery_polaroid_frame.png',
    ];

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        assert.ok(fs.existsSync(filePath), `File ${fileName} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `File ${fileName} must not be empty`);
    });
});

test('verifies exact dimensions of gallery backdrop and polaroid frame PNGs', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/gallery');

    function getPngDimensions(filePath) {
        const buf = fs.readFileSync(filePath);
        return {
            width: buf.readUInt32BE(16),
            height: buf.readUInt32BE(20),
        };
    }

    const expectedDimensions = {
        'gallery_backdrop_ice37.png': { width: 1672, height: 941 },
        'gallery_polaroid_frame.png': { width: 1227, height: 1282 },
    };

    for (const [fileName, expected] of Object.entries(expectedDimensions)) {
        const dims = getPngDimensions(path.join(dir, fileName));
        assert.equal(dims.width, expected.width, `${fileName} width mismatch`);
        assert.equal(dims.height, expected.height, `${fileName} height mismatch`);
    }
});

test('verifies BootScene registers gallery_backdrop_ice37 and gallery_polaroid_frame preloads', () => {
    const bootScenePath = path.join(__dirname, '../js/BootScene.js');
    const content = fs.readFileSync(bootScenePath, 'utf8');

    assert.ok(
        content.includes("this.load.image('gallery_backdrop_ice37'"),
        'BootScene must preload gallery_backdrop_ice37'
    );
    assert.ok(
        content.includes("this.load.image('gallery_polaroid_frame'"),
        'BootScene must preload gallery_polaroid_frame'
    );
});
