(function attachStreetNativeLayout(globalScope) {
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
            x: -597.8021978021978,
            y: 12.5274725274725,
            width: 5007.472527472527,
            height: 1054.945054945055,
        }),
        paintmask: Object.freeze({
            x: -1415.5604395604396,
            y: -356.0,
            width: 5230,
            height: 1393,
        }),
        scroll: Object.freeze({
            worldScrollSpeed: 527.4725274725275,
            initialScroll: 527.4725274725275,
        }),
        player: Object.freeze({
            rootX: 960.0,
            rootY: 548.5653846153846,
            walkWidth: 278.15384615384616,
            walkHeight: 468.9230769230769,
            idleWidth: 321.3681318681319,
            idleHeight: 479.9120879120879,
            boxingWidth: 392.36923076923074,
            boxingHeight: 469.29230769230765,
            kickWidth: 362.7076923076923,
            kickHeight: 466.0311538461538,
        }),
        backpack: Object.freeze({
            rootX: 3.1648351648351647,
            rootY: 830.9126373626374,
            scale: 2.4615384615384617,
            closedWidth: 240.12307692307692,
            closedHeight: 240.36923076923078,
            hoverWidth: 252.30769230769232,
            hoverHeight: 252.55384615384617,
            openWidth: 250.83076923076925,
            openHeight: 240.6153846153846,
            canWidth: 60.061538461538466,
            canHeight: 136.9846153846154,
        }),
        exits: Object.freeze({
            leftDoor: Object.freeze({
                x: -526.4175824175824,
                y: 476.7032967032967,
            }),
            rightDoor: Object.freeze({
                x: 4334.417582417582,
                y: 476.7032967032967,
            }),
        }),
    });

    const api = { LAYOUT };
    globalScope.StreetNativeLayout = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
