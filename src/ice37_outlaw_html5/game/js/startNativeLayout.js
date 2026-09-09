(function attachStartNativeLayout(globalScope) {
    'use strict';

    const LAYOUT = Object.freeze({
        canvas: Object.freeze({
            width: 1920,
            height: 1080,
            resolution: 1,
        }),
        stage: Object.freeze({
            width: 1920,
            height: 1054.945054945055,
            offsetY: 12.5274725274725,
        }),
        background: Object.freeze({
            x: 960.0,
            y: 540.0,
            width: 1920,
            height: 1054.945054945055,
        }),
        button: Object.freeze({
            x: 960.0,
            y: 1000.0,
            width: 376,
            height: 176,
            originX: 0.45345744680851063,
            originY: 0.6619318181818182,
            scaleNormal: 1.0,
            scaleHover: 1.0625,
            scalePress: 0.975,
        }),
        transition: Object.freeze({
            fadeDurationMs: 300,
        }),
    });

    const api = { LAYOUT };
    globalScope.StartNativeLayout = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
