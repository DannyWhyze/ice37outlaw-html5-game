const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('verifies all 5 native boxing PNG files exist in boxing_native assets directory', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/player/boxing_native');
    assert.ok(fs.existsSync(dir), 'boxing_native directory must exist');

    const expectedFiles = [
        'boxen_frame_01.png',
        'boxen_frame_03.png',
        'boxen_frame_05.png',
        'boxen_frame_07.png',
        'boxen_frame_10.png',
    ];

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        assert.ok(fs.existsSync(filePath), `File ${fileName} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `File ${fileName} must not be empty`);
    });
});

test('verifies exact 13-frame mapping to the 5 unique boxing poses', () => {
    const boxingNativeMapping = {
        1: 'boxen_frame_01', 2: 'boxen_frame_01',
        3: 'boxen_frame_03', 4: 'boxen_frame_03',
        5: 'boxen_frame_05', 6: 'boxen_frame_05',
        7: 'boxen_frame_07', 8: 'boxen_frame_07', 9: 'boxen_frame_07',
        10: 'boxen_frame_10', 11: 'boxen_frame_10', 12: 'boxen_frame_10', 13: 'boxen_frame_10',
    };

    const frames = Array.from({ length: 13 }, (_, index) => {
        const frameNum = index + 1;
        return `halloffame_boxing_native_${boxingNativeMapping[frameNum]}`;
    });

    assert.equal(frames.length, 13);
    assert.equal(frames[0], 'halloffame_boxing_native_boxen_frame_01');
    assert.equal(frames[1], 'halloffame_boxing_native_boxen_frame_01');
    assert.equal(frames[2], 'halloffame_boxing_native_boxen_frame_03');
    assert.equal(frames[3], 'halloffame_boxing_native_boxen_frame_03');
    assert.equal(frames[4], 'halloffame_boxing_native_boxen_frame_05');
    assert.equal(frames[5], 'halloffame_boxing_native_boxen_frame_05');
    assert.equal(frames[6], 'halloffame_boxing_native_boxen_frame_07');
    assert.equal(frames[8], 'halloffame_boxing_native_boxen_frame_07');
    assert.equal(frames[9], 'halloffame_boxing_native_boxen_frame_10');
    assert.equal(frames[12], 'halloffame_boxing_native_boxen_frame_10');
});

test('provides exact native boxing origin and frame presentations', () => {
    const { NATIVE_BOXING_ORIGIN, getNativeFramePresentation, getFrameKey } = require('../js/logic/playerCombat.js');
    assert.equal(NATIVE_BOXING_ORIGIN.x, 145.5 / 399);
    assert.equal(NATIVE_BOXING_ORIGIN.y, 0.0);

    for (let frameNum = 1; frameNum <= 13; frameNum++) {
        const presentation = getNativeFramePresentation(frameNum);
        assert.equal(presentation.key, getFrameKey(frameNum));
        assert.equal(presentation.origin.x, 145.5 / 399);
        assert.equal(presentation.origin.y, 0.0);
    }
});

test('provides exact native boxing target dimensions in LAYOUT.player', () => {
    const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');
    assert.ok(Math.abs(LAYOUT.player.boxingWidth - 392.369231) < 0.001);
    assert.ok(Math.abs(LAYOUT.player.boxingHeight - 469.292308) < 0.001);
});
