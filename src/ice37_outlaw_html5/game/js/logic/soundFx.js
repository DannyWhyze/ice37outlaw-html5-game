(function attachSoundFx(globalScope) {
    function isPlayable(scene) {
        return Boolean(
            scene &&
            scene.sound &&
            typeof scene.sound.play === 'function'
        );
    }

    function play(scene, key, config = {}) {
        if (!isPlayable(scene) || !key) {
            return false;
        }
        try {
            // Check if key exists in cache if check is available
            if (scene.cache && scene.cache.audio && typeof scene.cache.audio.has === 'function') {
                if (!scene.cache.audio.has(key)) {
                    return false;
                }
            }
            scene.sound.play(key, config);
            return true;
        } catch (_) {
            // Silently absorb autoplay blocks, audio context issues, or mock failures
            return false;
        }
    }

    function playRandom(scene, keys, config = {}) {
        if (!Array.isArray(keys) || keys.length === 0) {
            return false;
        }
        const index = Math.floor(Math.random() * keys.length);
        return play(scene, keys[index], config);
    }

    function stop(scene, key) {
        if (!scene || !scene.sound) {
            return false;
        }
        try {
            if (key && typeof scene.sound.stopByKey === 'function') {
                scene.sound.stopByKey(key);
                return true;
            }
            if (typeof scene.sound.stopAll === 'function') {
                scene.sound.stopAll();
                return true;
            }
        } catch (_) {
            return false;
        }
        return false;
    }

    const api = {
        isPlayable,
        play,
        playRandom,
        stop,
    };

    globalScope.SoundFx = api;
    if (typeof module !== 'undefined') {
        module.exports = api;
    }
}(typeof globalThis === 'undefined' ? this : globalThis));
