const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const SoundFx = require('../js/logic/soundFx.js');
const { Player } = require('../js/prefabs/Player.js');
const { Cop } = require('../js/prefabs/Cop.js');
const { Backpack } = require('../js/prefabs/Backpack.js');
const { TrainyardScene } = require('../js/trainyard/TrainyardScene.js');
const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');

const SFX_DIR = path.join(__dirname, '../assets/audio/sfx');

const EXPECTED_SFX_FILES = {
    'can_select.mp3': 728,
    'tool_spraycan.mp3': 1040,
    'tool_cap.mp3': 1768,
    'tool_roller.mp3': 936,
    'combat_kick.mp3': 9511,
    'combat_punch.mp3': 1040,
    'player_hit.mp3': 12019,
    'player_die.mp3': 22886,
    'cop_hit.mp3': 11183,
    'cop_die.mp3': 22050,
    'punch_1.mp3': 2184,
    'punch_2.mp3': 2184,
    'punch_3.mp3': 2184,
    'punch_4.mp3': 2184,
    'train_pass.mp3': 1040,
};

function createMockSoundScene() {
    const playedSounds = [];
    const stoppedSounds = [];

    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        visible: true,
        children: [],
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        listeners: {},
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setInteractive() { return this; },
        disableInteractive() { return this; },
        setActive(a) { this.active = a; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        setOrigin() { return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setSize() { return this; },
        setTexture(k) { this.texture = k; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setTint(t) { this.tint = t; return this; },
        setTintFill(t) { this.tintFill = t; return this; },
        clearTint() { delete this.tint; delete this.tintFill; return this; },
        setVisible(v) { this.visible = v; return this; },
        play() { return this; },
        stop() { return this; },
        on(evt, cb) { this.listeners[evt] = cb; return this; },
        emit(evt, ...args) {
            if (this.listeners && this.listeners[evt]) return this.listeners[evt](...args);
        },
    });

    return {
        playedSounds,
        stoppedSounds,
        sound: {
            play(key, config) {
                playedSounds.push({ key, config });
                return true;
            },
            stopByKey(key) {
                stoppedSounds.push(key);
                return true;
            },
            stopAll() {
                stoppedSounds.push('*');
                return true;
            },
        },
        cache: {
            audio: {
                has(key) {
                    return true;
                },
            },
        },
        add: {
            container: (x, y) => {
                const c = makeDisplayObject();
                c.x = x;
                c.y = y;
                return c;
            },
            image: () => makeDisplayObject(),
            sprite: () => makeDisplayObject(),
            zone: (x, y) => {
                const z = makeDisplayObject();
                z.x = x;
                z.y = y;
                return z;
            },
        },
        anims: {
            exists: () => false,
            create: () => {},
        },
        textures: {
            exists: () => true,
        },
        time: {
            addEvent: () => ({ remove: () => {} }),
            delayedCall: (delay, cb) => cb(),
        },
    };
}

test('verifies all authentic Flash SFX assets exist and have valid file sizes', () => {
    assert.equal(fs.existsSync(SFX_DIR), true, 'assets/audio/sfx directory must exist');

    for (const [filename, expectedSize] of Object.entries(EXPECTED_SFX_FILES)) {
        const filePath = path.join(SFX_DIR, filename);
        assert.equal(fs.existsSync(filePath), true, `File ${filename} must exist`);
        const stats = fs.statSync(filePath);
        assert.equal(stats.size, expectedSize, `File ${filename} must be exactly ${expectedSize} bytes, got ${stats.size}`);
    }
});

test('verifies zero music tracks (> 500 KB) are included in sfx directory', () => {
    const files = fs.readdirSync(SFX_DIR);
    assert.equal(files.length, Object.keys(EXPECTED_SFX_FILES).length, `SFX directory must contain exactly ${Object.keys(EXPECTED_SFX_FILES).length} files, found ${files.length}`);
    for (const file of files) {
        const stats = fs.statSync(path.join(SFX_DIR, file));
        assert.ok(stats.size < 500000, `Audio file ${file} (${stats.size} bytes) exceeds 500 KB limit and is not a SFX`);
    }
});

test('verifies SoundFx helper isPlayable, play, playRandom, and stop safely handle valid and null inputs without throwing', () => {
    assert.equal(SoundFx.isPlayable(null), false);
    assert.equal(SoundFx.isPlayable(undefined), false);
    assert.equal(SoundFx.isPlayable({}), false);
    assert.equal(SoundFx.isPlayable({ sound: {} }), false);
    assert.equal(SoundFx.isPlayable({ sound: { play: () => {} } }), true);

    // Null scene should return false without throwing
    assert.equal(SoundFx.play(null, 'sfx_can_select'), false);
    assert.equal(SoundFx.play({}, 'sfx_can_select'), false);
    assert.equal(SoundFx.playRandom(null, ['sfx_punch_1']), false);
    assert.equal(SoundFx.playRandom({}, []), false);
    assert.equal(SoundFx.stop(null, 'sfx_can_select'), false);

    // Mock scene with sound
    const mockScene = createMockSoundScene();
    assert.equal(SoundFx.play(mockScene, 'sfx_tool_spraycan', { volume: 0.8 }), true);
    assert.equal(mockScene.playedSounds.length, 1);
    assert.equal(mockScene.playedSounds[0].key, 'sfx_tool_spraycan');
    assert.equal(mockScene.playedSounds[0].config.volume, 0.8);

    assert.equal(SoundFx.playRandom(mockScene, ['sfx_punch_1', 'sfx_punch_2']), true);
    assert.equal(mockScene.playedSounds.length, 2);
    assert.ok(['sfx_punch_1', 'sfx_punch_2'].includes(mockScene.playedSounds[1].key));

    assert.equal(SoundFx.stop(mockScene, 'sfx_tool_spraycan'), true);
    assert.equal(mockScene.stoppedSounds[0], 'sfx_tool_spraycan');

    assert.equal(SoundFx.stop(mockScene), true);
    assert.equal(mockScene.stoppedSounds[1], '*');
});

test('verifies BootScene registers all authentic SFX audio keys in preload', () => {
    const bootSceneContent = fs.readFileSync(path.join(__dirname, '../js/BootScene.js'), 'utf-8');
    for (const filename of Object.keys(EXPECTED_SFX_FILES)) {
        const key = `sfx_${filename.replace('.mp3', '')}`;
        assert.ok(
            bootSceneContent.includes(key),
            `BootScene.js must preload audio key '${key}'`,
        );
        assert.ok(
            bootSceneContent.includes(filename),
            `BootScene.js must reference audio file '${filename}'`,
        );
    }
});

test('verifies Backpack triggers can and tool SFX upon selection', () => {
    const mockScene = createMockSoundScene();
    const backpack = new Backpack(mockScene, 100, 100, LAYOUT.backpack);

    backpack.open();

    // Trigger tool selections
    const spraycanZone = backpack.paletteHitZones.find(z => z.x === (100 + 123.175 * LAYOUT.backpack.scale));
    assert.ok(spraycanZone, 'spraycan hit zone must exist');
    spraycanZone.emit('pointerdown');

    // Trigger can selection
    const can1Zone = backpack.paletteHitZones.find(z => z.x === (100 + 157.25 * LAYOUT.backpack.scale));
    assert.ok(can1Zone, 'can1 hit zone must exist');
    can1Zone.emit('pointerdown');

    const canClicks = mockScene.playedSounds.filter(s => s.key === 'sfx_can_select');
    assert.equal(canClicks.length, 2, 'sfx_can_select should be played for both tool and can selection');
});

test('verifies Player triggers punch, kick, hit, and die SFX upon combat actions', () => {
    const mockScene = createMockSoundScene();
    const player = new Player(mockScene, 960, 800, LAYOUT.player);

    // Punch / Boxing
    player.playBoxingAnimation(0);
    const punchSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_combat_punch');
    assert.equal(punchSounds.length, 1, 'sfx_combat_punch should be played on start boxing');

    player.playBoxingAnimation(520, true);
    const heldPunchSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_combat_punch');
    assert.equal(heldPunchSounds.length, 2, 'held boxing must retrigger punch SFX for each repeated punch cycle');

    // Kick
    player.playKickAnimation(0);
    const kickSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_combat_kick');
    assert.equal(kickSounds.length, 1, 'sfx_combat_kick should be played on start kick');

    player.playKickAnimation(480, true);
    const heldKickSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_combat_kick');
    assert.equal(heldKickSounds.length, 2, 'held kick must retrigger kick SFX for each repeated kick cycle');

    // Hurt / Damage
    player.triggerHurt();
    const hitSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_player_hit');
    assert.equal(hitSounds.length, 1, 'sfx_player_hit should be played on triggerHurt');

    // Death
    player.triggerDeath();
    const dieSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_player_die');
    assert.equal(dieSounds.length, 1, 'sfx_player_die should be played on triggerDeath');
});

test('verifies Cop triggers hit and die SFX upon combat actions', () => {
    const mockScene = createMockSoundScene();
    const cop = new Cop(mockScene, 1200, 800);

    // Hurt / Take hit
    cop.triggerHurt();
    const copHitSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_cop_hit');
    assert.equal(copHitSounds.length, 1, 'sfx_cop_hit should be played on cop triggerHurt');

    // Death
    cop.triggerDeath();
    const copDieSounds = mockScene.playedSounds.filter(s => s.key === 'sfx_cop_die');
    assert.equal(copDieSounds.length, 1, 'sfx_cop_die should be played on cop triggerDeath');
});

test('verifies TrainyardScene provides playTrainPassSound and safe fallback', () => {
    const mockScene = createMockSoundScene();
    const trainyard = new TrainyardScene();
    trainyard.soundFx = SoundFx;
    trainyard.sound = mockScene.sound;
    trainyard.cache = mockScene.cache;

    const played = trainyard.playTrainPassSound();
    assert.equal(played, true, 'playTrainPassSound should return true when sound is playable');
    assert.equal(mockScene.playedSounds[0].key, 'sfx_train_pass');
});
