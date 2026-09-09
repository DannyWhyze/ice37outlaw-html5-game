(function attachMenuNavigation(globalScope) {
    function isSceneAvailable(sceneKey, registeredSceneKeys) {
        return registeredSceneKeys.includes(sceneKey);
    }

    function getMenuNavigationState(item, registeredSceneKeys) {
        return {
            isAvailable: isSceneAvailable(item.scene, registeredSceneKeys),
            sceneKey: item.scene,
        };
    }

    const api = {
        isSceneAvailable,
        getMenuNavigationState,
    };
    globalScope.MenuNavigation = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
