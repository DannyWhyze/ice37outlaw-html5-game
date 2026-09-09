(function attachToolCursor(globalScope) {
    function getCursorPresentation(isBackpackCursor, cursorStyle) {
        if (isBackpackCursor) {
            return {
                key: 'halloffame_cursor_hand',
                origin: { x: 24 / 88, y: 2 / 98 },
            };
        }
        if (cursorStyle === 'streiche') {
            return {
                key: 'halloffame_cursor_paintroller',
                origin: { x: 108.8 / 212.6, y: 42.4 / 240.2 },
            };
        }
        return {
            key: 'halloffame_cursor_spraycan',
            origin: { x: 46 / 97.6, y: 9.6 / 213.6 },
        };
    }

    const api = { getCursorPresentation };
    globalScope.ToolCursor = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
