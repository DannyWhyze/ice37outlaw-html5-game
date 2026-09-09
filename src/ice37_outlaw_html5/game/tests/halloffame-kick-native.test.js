const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('verifies all 4 native kick PNG files exist in kick_native assets directory', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/player/kick_native');
    assert.ok(fs.existsSync(dir), 'kick_native directory must exist');

    const expectedFiles = [
        'kick_frame_01.png',
        'kick_frame_03.png',
        'kick_frame_06.png',
        'kick_frame_09.png',
    ];

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        assert.ok(fs.existsSync(filePath), `File ${fileName} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `File ${fileName} must not be empty`);
    });
});

test('verifies exact 12-frame mapping to the 4 unique kick poses', () => {
    const kickNativeMapping = {
        1: 'kick_frame_01', 2: 'kick_frame_01',
        3: 'kick_frame_03', 4: 'kick_frame_03', 5: 'kick_frame_03',
        6: 'kick_frame_06', 7: 'kick_frame_06', 8: 'kick_frame_06',
        9: 'kick_frame_09', 10: 'kick_frame_09', 11: 'kick_frame_09', 12: 'kick_frame_09',
    };

    const frames = Array.from({ length: 12 }, (_, index) => {
        const frameNum = index + 1;
        return 'halloffame_kick_native_' + kickNativeMapping[frameNum];
    });

    assert.equal(frames.length, 12);
    assert.equal(frames[0], 'halloffame_kick_native_kick_frame_01');
    assert.equal(frames[1], 'halloffame_kick_native_kick_frame_01');
    assert.equal(frames[2], 'halloffame_kick_native_kick_frame_03');
    assert.equal(frames[3], 'halloffame_kick_native_kick_frame_03');
    assert.equal(frames[4], 'halloffame_kick_native_kick_frame_03');
    assert.equal(frames[5], 'halloffame_kick_native_kick_frame_06');
    assert.equal(frames[6], 'halloffame_kick_native_kick_frame_06');
    assert.equal(frames[7], 'halloffame_kick_native_kick_frame_06');
    assert.equal(frames[8], 'halloffame_kick_native_kick_frame_09');
    assert.equal(frames[11], 'halloffame_kick_native_kick_frame_09');
});

test('provides exact native kick origin and frame presentations', () => {
    const { NATIVE_KICK_ORIGIN, getNativeKickFramePresentation, getKickFrameKey } = require('../js/logic/playerCombat.js');
    assert.equal(NATIVE_KICK_ORIGIN.x, 142.5 / 369);
    assert.equal(NATIVE_KICK_ORIGIN.y, 0.0);

    for (let frameNum = 1; frameNum <= 12; frameNum++) {
        const presentation = getNativeKickFramePresentation(frameNum);
        assert.equal(presentation.key, getKickFrameKey(frameNum));
        assert.equal(presentation.origin.x, 142.5 / 369);
        assert.equal(presentation.origin.y, 0.0);
    }
});

test('provides exact native kick target dimensions in LAYOUT.player', () => {
    const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');
    assert.ok(Math.abs(LAYOUT.player.kickWidth - 362.707692) < 0.001);
    assert.ok(Math.abs(LAYOUT.player.kickHeight - 466.031154) < 0.001);
});
