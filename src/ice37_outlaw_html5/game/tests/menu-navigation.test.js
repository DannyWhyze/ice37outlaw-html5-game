const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

let navigation = {};
try {
    navigation = require('../js/menuNavigation.js');
} catch (error) {
    if (error.code !== 'MODULE_NOT_FOUND') {
        throw error;
    }
}

const registeredSceneKeys = [
    'BootScene',
    'StartScene',
    'MenuScene',
    'HomeScene',
    'HallOfFameScene',
];

test('marks registered menu destinations as available', () => {
    assert.equal(navigation.isSceneAvailable('HomeScene', registeredSceneKeys), true);
    assert.equal(navigation.isSceneAvailable('HallOfFameScene', registeredSceneKeys), true);
});

test('marks unregistered and unknown menu destinations as unavailable', () => {
    assert.equal(navigation.isSceneAvailable('StreetScene', registeredSceneKeys), false);
    assert.equal(navigation.isSceneAvailable('TrainyardScene', registeredSceneKeys), false);
    assert.equal(navigation.isSceneAvailable('UnknownScene', registeredSceneKeys), false);
});

test('returns a renderer-free navigation state for a menu item', () => {
    assert.deepEqual(
        navigation.getMenuNavigationState({ id: 'home', scene: 'HomeScene' }, registeredSceneKeys),
        { isAvailable: true, sceneKey: 'HomeScene' },
    );
    assert.deepEqual(
        navigation.getMenuNavigationState({ id: 'street', scene: 'StreetScene' }, registeredSceneKeys),
        { isAvailable: false, sceneKey: 'StreetScene' },
    );
});

function createMenuSceneHarness(availableSceneKeys) {
    class Scene {}
    const images = [];
    const startedScenes = [];
    const sandbox = {
        Phaser: {
            Scene,
            Cameras: {
                Scene2D: {
                    Events: { FADE_OUT_COMPLETE: 'fade-complete' },
                },
            },
        },
        MenuNavigation: navigation,
        module: { exports: {} },
    };
    const source = fs.readFileSync(path.join(__dirname, '../js/MenuScene.js'), 'utf8');
    vm.runInNewContext(`${source}\nmodule.exports = MenuScene;`, sandbox);
    const scene = new sandbox.module.exports();
    scene.registeredSceneKeys = availableSceneKeys;
    scene.add = {
        image: (_x, y) => {
            const image = {
                y,
                events: {},
                setDisplaySize() { return this; },
                setInteractive() { this.isInteractive = true; return this; },
                setScale() { return this; },
                setAlpha() { return this; },
                setTint() { return this; },
                clearTint() { return this; },
                on(eventName, callback) { this.events[eventName] = callback; return this; },
            };
            images.push(image);
            return image;
        },
        zone: () => ({
            setDepth() { return this; },
            setInteractive() { return this; },
            on() { return this; },
        }),
    };
    scene.cameras = {
        main: {
            fadeOut() {},
            once(_eventName, callback) { callback(); },
        },
    };
    scene.scene = {
        get(sceneKey) { return availableSceneKeys.includes(sceneKey) ? { key: sceneKey } : null; },
        start(sceneKey) { startedScenes.push(sceneKey); },
        restart() { throw new Error('MenuScene must not restart for an unavailable destination.'); },
    };
    scene.create();
    return { images: images.slice(-4), startedScenes };
}

test('only wires pointer navigation for registered menu destinations', () => {
    const { images } = createMenuSceneHarness(['HomeScene', 'HallOfFameScene']);
    const [home, hall, street, train] = images;

    assert.equal(home.isInteractive, true);
    assert.equal(hall.isInteractive, true);
    assert.equal(typeof home.events.pointerdown, 'function');
    assert.equal(typeof hall.events.pointerdown, 'function');
    assert.equal(street.isInteractive, undefined);
    assert.equal(train.isInteractive, undefined);
    assert.equal(street.events.pointerdown, undefined);
    assert.equal(train.events.pointerdown, undefined);
});

test('starts only an available destination after a menu press', () => {
    const { images, startedScenes } = createMenuSceneHarness(['HomeScene', 'HallOfFameScene']);

    images[0].events.pointerdown();

    assert.deepEqual(startedScenes, ['HomeScene']);
});
