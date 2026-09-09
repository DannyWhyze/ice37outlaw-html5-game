const assert = require('node:assert/strict');
const test = require('node:test');

const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');

test('provides exact native 1920x1080 canvas and stage dimensions', () => {
    assert.equal(LAYOUT.canvas.width, 1920);
    assert.equal(LAYOUT.canvas.height, 1080);
    assert.equal(LAYOUT.canvas.resolution, 1);
    assert.equal(LAYOUT.stage.width, 1920);
    assert.ok(Math.abs(LAYOUT.stage.height - 1054.945055) < 0.001);
    assert.ok(Math.abs(LAYOUT.stage.offsetY - 12.527473) < 0.001);
});

test('provides exact native background panorama placement', () => {
    assert.ok(Math.abs(LAYOUT.background.x - (-597.802198)) < 0.001);
    assert.ok(Math.abs(LAYOUT.background.y - 12.527473) < 0.001);
    assert.ok(Math.abs(LAYOUT.background.width - 4796.483516) < 0.001);
    assert.ok(Math.abs(LAYOUT.background.height - 1054.945055) < 0.001);
});

test('provides exact native player root and walk target size', () => {
    assert.equal(LAYOUT.player.rootX, 960.0);
    assert.ok(Math.abs(LAYOUT.player.rootY - 548.565385) < 0.001);
    assert.ok(Math.abs(LAYOUT.player.walkWidth - 278.153846) < 0.001);
    assert.ok(Math.abs(LAYOUT.player.walkHeight - 468.923077) < 0.001);
});

test('provides exact native scroll speed and backpack root', () => {
    assert.ok(Math.abs(LAYOUT.scroll.worldScrollSpeed - 527.472527) < 0.001);
    assert.ok(Math.abs(LAYOUT.scroll.initialScroll - 527.472527) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.rootX - 3.164835) < 0.001);
    assert.ok(Math.abs(LAYOUT.backpack.rootY - 830.912637) < 0.001);
});

test('provides exact native exit door positions', () => {
    assert.ok(Math.abs(LAYOUT.exits.leftDoor.x - (-526.417582)) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.leftDoor.y - 476.703297) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.rightDoor.x - 4125.889011) < 0.001);
    assert.ok(Math.abs(LAYOUT.exits.rightDoor.y - 476.703297) < 0.001);
});

const fs = require('node:fs');
const path = require('node:path');

test('verifies halloffame_paintmask.png asset exists and matches 3598x871 dimensions', () => {
    const maskPath = path.join(__dirname, '../assets/images/halloffame/halloffame_paintmask.png');
    assert.ok(fs.existsSync(maskPath), 'halloffame_paintmask.png must exist in assets/images/halloffame/');
    const stats = fs.statSync(maskPath);
    assert.equal(stats.size, 15723, 'halloffame_paintmask.png must be exactly 15,723 bytes');

    const buf = fs.readFileSync(maskPath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.equal(width, 3598);
    assert.equal(height, 871);
});

test('provides exact native Shape 114 paintmask placement', () => {
    assert.ok(Math.abs(LAYOUT.paintmask.x - 7.032967) < 0.001);
    assert.ok(Math.abs(LAYOUT.paintmask.y - 125.054945) < 0.001);
    assert.equal(LAYOUT.paintmask.width, 3598);
    assert.equal(LAYOUT.paintmask.height, 871);
});


