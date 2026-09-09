(function attachBackpackPalette(globalScope) {
    function setPaletteHover(paletteState, isHovering) {
        return isHovering ? 'hover' : paletteState === 'hover' ? 'closed' : paletteState;
    }

    function openPalette() {
        return 'open';
    }

    function closePalette() {
        return 'closed';
    }

    function togglePalette(paletteState) {
        return paletteState === 'open' ? 'closed' : 'open';
    }

    function getBackpackVisualState(paletteState) {
        return { closed: 1, hover: 2, open: 3 }[paletteState];
    }

    function selectTool(sprayState, tool, cap, opacity, cursorStyle) {
        return {
            paletteState: closePalette(),
            sprayState: { ...sprayState, tool, cap, opacity, cursorStyle },
        };
    }

    function selectColor(sprayState, color) {
        return {
            paletteState: closePalette(),
            sprayState: { ...sprayState, color },
        };
    }

    const api = {
        closePalette,
        getBackpackVisualState,
        openPalette,
        selectColor,
        selectTool,
        setPaletteHover,
        togglePalette,
    };
    globalScope.BackpackPalette = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
