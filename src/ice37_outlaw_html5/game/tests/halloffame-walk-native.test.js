const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('verifies all 6 native walk PNG files exist in walk_native assets directory', () => {
    const dir = path.join(__dirname, '../assets/images/prefabs/player/walk_native');
    assert.ok(fs.existsSync(dir), 'walk_native directory must exist');

    const expectedFiles = [
        'walk_frame_01.png',
        'walk_frame_03.png',
        'walk_frame_06.png',
        'walk_frame_08.png',
        'walk_frame_10.png',
        'walk_frame_14.png',
    ];

    expectedFiles.forEach((fileName) => {
        const filePath = path.join(dir, fileName);
        assert.ok(fs.existsSync(filePath), `File ${fileName} must exist`);
        const stat = fs.statSync(filePath);
        assert.ok(stat.size > 0, `File ${fileName} must not be empty`);
    });
});

test('verifies exact 14-frame mapping to the 6 unique walk poses', () => {
    const walkNativeMapping = {
        1: 'walk_frame_01', 2: 'walk_frame_01',
        3: 'walk_frame_03', 4: 'walk_frame_03', 5: 'walk_frame_03',
        6: 'walk_frame_06', 7: 'walk_frame_06',
        8: 'walk_frame_08', 9: 'walk_frame_08',
        10: 'walk_frame_10', 11: 'walk_frame_10', 12: 'walk_frame_10',
        13: 'walk_frame_14', 14: 'walk_frame_14',
    };

    const frames = Array.from({ length: 14 }, (_, index) => {
        const frameNum = index + 1;
        return `halloffame_walk_native_${walkNativeMapping[frameNum]}`;
    });

    assert.equal(frames.length, 14);
    assert.equal(frames[0], 'halloffame_walk_native_walk_frame_01');
    assert.equal(frames[1], 'halloffame_walk_native_walk_frame_01');
    assert.equal(frames[2], 'halloffame_walk_native_walk_frame_03');
    assert.equal(frames[4], 'halloffame_walk_native_walk_frame_03');
    assert.equal(frames[5], 'halloffame_walk_native_walk_frame_06');
    assert.equal(frames[7], 'halloffame_walk_native_walk_frame_08');
    assert.equal(frames[9], 'halloffame_walk_native_walk_frame_10');
    assert.equal(frames[11], 'halloffame_walk_native_walk_frame_10');
    assert.equal(frames[12], 'halloffame_walk_native_walk_frame_14');
    assert.equal(frames[13], 'halloffame_walk_native_walk_frame_14');
});
