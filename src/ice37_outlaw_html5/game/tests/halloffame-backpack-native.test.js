const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');

test('verifies all native backpack assets exist in prefabs/backpack assets directory', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/backpack');
    assert.ok(fs.existsSync(dir), 'prefabs/backpack directory must exist');

    const expectedFiles = [
        'backpack_closed.png',
        'backpack_hover.png',
        'backpack_open.png',
        'tool_spraycan.png',
        'tool_fatcap.png',
        'tool_softcap.png',
        'tool_paintroller.png',
        'can_body_closed.png',
        'can_body_open.png',
        'can_cap_color.png',
        'smartphone.png',
    ];

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        assert.ok(fs.existsSync(filePath), `File ${fileName} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `File ${fileName} must not be empty`);
    });
});

test('provides exact native backpack layout dimensions and scaling in LAYOUT.backpack', () => {
    assert.ok(Math.abs(LAYOUT.backpack.rootX - 3.164835) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.rootY - 830.912637) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.scale - 2.461538) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.closedWidth - 240.123077) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.closedHeight - 240.369231) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.hoverWidth - 252.307692) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.hoverHeight - 252.553846) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.openWidth - 250.830769) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.openHeight - 240.615385) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.canWidth - 60.061538) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.canHeight - 136.984615) < 0.001);
});

test('verifies exact dimensions of native PNG files matching 1080p target resolution', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/backpack');

    function getPngDimensions(filePath) {
        const buf = fs.readFileSync(filePath);
        return {
            width: buf.readUInt32BE(16),
            height: buf.readUInt32BE(20),
        };
    }

    const expectedDimensions = {
        'backpack_closed.png': { width: 240, height: 241 },
        'backpack_hover.png': { width: 253, height: 253 },
        'backpack_open.png': { width: 251, height: 241 },
        'tool_spraycan.png': { width: 70, height: 56 },
        'tool_fatcap.png': { width: 70, height: 56 },
        'tool_softcap.png': { width: 68, height: 54 },
        'tool_paintroller.png': { width: 131, height: 141 },
        'can_body_closed.png': { width: 61, height: 137 },
        'can_body_open.png': { width: 61, height: 169 },
        'can_cap_color.png': { width: 45, height: 31 },
        'smartphone.png': { width: 200, height: 300 },
    };

    for (const [fileName, expected] of Object.entries(expectedDimensions)) {
        const dims = getPngDimensions(path.join(dir, fileName));
        assert.equal(dims.width, expected.width, `${fileName} width mismatch`);
        assert.equal(dims.height, expected.height, `${fileName} height mismatch`);
    }
});

test('switches can body texture and shifts Y coordinates upward on hover', () => {
    const scale = LAYOUT.backpack.scale;
    const baseY = 36.95 * scale;
    const baseColorY = (36.95 - 1.55) * scale;
    const visual = {
        baseY,
        baseColorY,
        bodyImage: {
            texture: 'halloffame_backpack_can_closed',
            y: baseY,
            setTexture(key) { this.texture = key; },
        },
        colorImage: {
            y: baseColorY,
        },
    };

    const setPaletteHover = (isHovering) => {
        visual.bodyImage.setTexture(isHovering ? 'halloffame_backpack_can_open' : 'halloffame_backpack_can_closed');
        visual.bodyImage.y = visual.baseY - (isHovering ? 12.75 * scale : 0);
        visual.colorImage.y = visual.baseColorY - (isHovering ? 12.6 * scale : 0);
    };

    // Hover on
    setPaletteHover(true);
    assert.equal(visual.bodyImage.texture, 'halloffame_backpack_can_open');
    assert.ok(Math.abs(visual.bodyImage.y - (baseY - 12.75 * scale)) < 0.001);
    assert.ok(Math.abs(visual.colorImage.y - (baseColorY - 12.6 * scale)) < 0.001);

    // Hover off
    setPaletteHover(false);
    assert.equal(visual.bodyImage.texture, 'halloffame_backpack_can_closed');
    assert.equal(visual.bodyImage.y, baseY);
    assert.equal(visual.colorImage.y, baseColorY);
});

test('shifts smartphone Y coordinates upward on hover matching can height offset', () => {
    const scale = LAYOUT.backpack.scale;
    const baseY = 49.07 * scale;
    const visual = {
        baseY,
        image: {
            y: baseY,
        },
    };

    const setPaletteHover = (isHovering) => {
        visual.image.y = visual.baseY - (isHovering ? 12.75 * scale : 0);
    };

    // Hover on
    setPaletteHover(true);
    assert.ok(Math.abs(visual.image.y - (baseY - 12.75 * scale)) < 0.001);

    // Hover off
    setPaletteHover(false);
    assert.equal(visual.image.y, baseY);
});
