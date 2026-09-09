const assert = require('node:assert/strict');
const test = require('node:test');

const {
    closePalette,
    getBackpackVisualState,
    openPalette,
    selectColor,
    selectTool,
    setPaletteHover,
    togglePalette,
} = require('../js/logic/backpackPalette.js');

const initialSprayState = {
    color: 0x0000cc,
    cap: 5,
    opacity: 90,
    cursorStyle: 'can',
    tool: 'softcap',
};

test('transitions the palette between closed, hover, and open', () => {
    assert.equal(setPaletteHover('closed', true), 'hover');
    assert.equal(setPaletteHover('hover', false), 'closed');
    assert.equal(openPalette(), 'open');
    assert.equal(closePalette(), 'closed');
    assert.equal(togglePalette('closed'), 'open');
    assert.equal(togglePalette('hover'), 'open');
    assert.equal(togglePalette('open'), 'closed');
    assert.equal(getBackpackVisualState('closed'), 1);
    assert.equal(getBackpackVisualState('hover'), 2);
    assert.equal(getBackpackVisualState('open'), 3);
});

[
    ['spraycan', 2, 98, 'can'],
    ['fatcap', 10, 80, 'can'],
    ['softcap', 5, 90, 'can'],
    ['paintroller', 28, 90, 'streiche'],
].forEach(([tool, cap, opacity, cursorStyle]) => {
    test(`selects ${tool} and closes the palette`, () => {
        assert.deepEqual(selectTool(initialSprayState, tool, cap, opacity, cursorStyle), {
            paletteState: 'closed',
            sprayState: { ...initialSprayState, tool, cap, opacity, cursorStyle },
        });
    });
});

[0x0000cc, 0xffffff, 0xffff33, 0x66ff33, 0xff0000, 0x000000].forEach((color) => {
    test(`selects color ${color.toString(16)} and closes the palette`, () => {
        assert.deepEqual(selectColor(initialSprayState, color), {
            paletteState: 'closed',
            sprayState: { ...initialSprayState, color },
        });
    });
});
