const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { Cop } = require('../js/prefabs/Cop.js');
const { Player } = require('../js/prefabs/Player.js');
const { LAYOUT } = require('../js/halloffame/halloffameNativeLayout.js');

function createMockScene() {
    const makeDisplayObject = () => ({
        depth: 0,
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        visible: true,
        alpha: 1,
        children: [],
        anims: {
            isPlaying: false,
            currentAnim: null,
            play(key) {
                this.isPlaying = true;
                this.currentAnim = { key };
                return this;
            },
            stop() {
                this.isPlaying = false;
                this.currentAnim = null;
                return this;
            },
        },
        add(items) {
            if (Array.isArray(items)) this.children.push(...items);
            else this.children.push(items);
            return this;
        },
        removeAll() { this.children = []; return this; },
        setDepth(d) { this.depth = d; return this; },
        setDisplaySize(w, h) { this.width = w; this.height = h; return this; },
        setOrigin(ox, oy) { this.originX = ox; this.originY = oy; return this; },
        setPosition(x, y) { this.x = x; this.y = y; return this; },
        setRotation(r) { this.rotation = r; return this; },
        setScale(sx, sy) { this.scaleX = sx; this.scaleY = sy !== undefined ? sy : sx; return this; },
        setTexture(k) { this.texture = k; return this; },
        setVisible(v) { this.visible = v; return this; },
        setAlpha(a) { this.alpha = a; return this; },
        destroy() { this.destroyed = true; },
    });

    const registeredAnims = new Map();

    return {
        add: {
            container: (x, y) => {
                const c = makeDisplayObject();
                c.x = x;
                c.y = y;
                return c;
            },
            image: () => makeDisplayObject(),
            sprite: () => makeDisplayObject(),
        },
        anims: {
            exists: (key) => registeredAnims.has(key),
            create: (config) => { registeredAnims.set(config.key, config); },
            get: (key) => registeredAnims.get(key),
        },
        textures: {
            exists: () => true,
        },
    };
}

test('verifies cop_hit_star_shape23.png asset exists on disk with exact 147x153 dimensions', () => {
    const filePath = path.resolve(__dirname, '../assets/images/prefabs/cop/cop_hit_star_shape23.png');
    assert.ok(fs.existsSync(filePath), 'cop_hit_star_shape23.png must exist');
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 0, 'cop_hit_star_shape23.png must not be empty');

    const buf = fs.readFileSync(filePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.equal(width, 147, 'cop hit star width must be 147px (352% zoom)');
    assert.equal(height, 153, 'cop hit star height must be 153px (352% zoom)');
});

test('verifies player_hit_star_shape138.png asset exists on disk with exact 128x133 dimensions', () => {
    const filePath = path.resolve(__dirname, '../assets/images/prefabs/player/player_hit_star_shape138.png');
    assert.ok(fs.existsSync(filePath), 'player_hit_star_shape138.png must exist');
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 0, 'player_hit_star_shape138.png must not be empty');

    const buf = fs.readFileSync(filePath);
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    assert.equal(width, 128, 'player hit star width must be 128px (308% zoom)');
    assert.equal(height, 133, 'player hit star height must be 133px (308% zoom)');
});

test('verifies BootScene preloads both hit star assets with 1080p_hd cache buster', () => {
    const bootSceneFile = path.resolve(__dirname, '../js/BootScene.js');
    const content = fs.readFileSync(bootSceneFile, 'utf8');

    assert.ok(
        content.includes("this.load.image('cop_hit_star', 'assets/images/prefabs/cop/cop_hit_star_shape23.png?v=1080p_hd');"),
        'BootScene must preload cop_hit_star',
    );
    assert.ok(
        content.includes("this.load.image('player_hit_star', 'assets/images/prefabs/player/player_hit_star_shape138.png?v=1080p_hd');"),
        'BootScene must preload player_hit_star',
    );
});

test('verifies Cop punchHitStar initialization, positioning, and timer lifecycle', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600, 0, 1920 / 546);

    assert.ok(cop.punchHitStar, 'cop must have punchHitStar');
    assert.equal(cop.punchHitStar.depth, 39, 'punchHitStar depth must be 39');
    assert.equal(cop.punchHitStar.originX, 0.5, 'punchHitStar originX must be 0.5');
    assert.equal(cop.punchHitStar.originY, 0.5, 'punchHitStar originY must be 0.5');
    assert.equal(cop.punchHitStar.visible, false, 'punchHitStar must be initially hidden');
    assert.ok(cop.children.includes(cop.punchHitStar), 'punchHitStar must be in container children');

    cop.triggerPunchHitStar(160);
    assert.equal(cop.punchHitStar.visible, true);
    assert.equal(cop.punchHitStar.x, 195);
    assert.equal(cop.punchHitStar.y, cop.walkHeight - 300);
    assert.equal(cop.punchHitStarTimer, 160);

    // Advance 80ms -> still visible
    cop.updatePunchHitStar(80);
    assert.equal(cop.punchHitStar.visible, true);
    assert.equal(cop.punchHitStarTimer, 80);

    // Advance remaining 80ms -> hidden
    cop.updatePunchHitStar(80);
    assert.equal(cop.punchHitStar.visible, false);
    assert.equal(cop.punchHitStarTimer, 0);
});

test('verifies Cop punchHitStar resets on hurt, death, despawn, and respawn', () => {
    const scene = createMockScene();
    const cop = new Cop(scene, 500, 600, 0, 1920 / 546);

    // Hurt reset
    cop.triggerPunchHitStar();
    assert.equal(cop.punchHitStar.visible, true);
    cop.triggerHurt();
    assert.equal(cop.punchHitStar.visible, false);
    assert.equal(cop.punchHitStarTimer, 0);

    // Death reset
    cop.triggerPunchHitStar();
    assert.equal(cop.punchHitStar.visible, true);
    cop.triggerDeath();
    assert.equal(cop.punchHitStar.visible, false);
    assert.equal(cop.punchHitStarTimer, 0);

    // Despawn reset
    cop.triggerPunchHitStar();
    assert.equal(cop.punchHitStar.visible, true);
    cop.despawn();
    assert.equal(cop.punchHitStar.visible, false);
    assert.equal(cop.punchHitStarTimer, 0);

    // Respawn reset
    cop.triggerPunchHitStar();
    assert.equal(cop.punchHitStar.visible, true);
    cop.respawn(400, 600, false);
    assert.equal(cop.punchHitStar.visible, false);
    assert.equal(cop.punchHitStarTimer, 0);
});

test('verifies Player attackHitStar initialization, positioning for boxing and kicking, and timer lifecycle', () => {
    const scene = createMockScene();
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    assert.ok(player.attackHitStar, 'player must have attackHitStar');
    assert.equal(player.attackHitStar.depth, 39, 'attackHitStar depth must be 39');
    assert.equal(player.attackHitStar.originX, 0.5, 'attackHitStar originX must be 0.5');
    assert.equal(player.attackHitStar.originY, 0.5, 'attackHitStar originY must be 0.5');
    assert.equal(player.attackHitStar.visible, false, 'attackHitStar must be initially hidden');
    assert.ok(player.children.includes(player.attackHitStar), 'attackHitStar must be in container children');

    // Boxing impact
    player.triggerAttackHitStar('boxing', 160);
    assert.equal(player.attackHitStar.visible, true);
    assert.equal(player.attackHitStar.x, 208);
    assert.equal(player.attackHitStar.y, player.layout.walkHeight - 314);
    assert.equal(player.attackHitStarTimer, 160);

    // Advance 80ms -> still visible
    player.updateAttackHitStar(80);
    assert.equal(player.attackHitStar.visible, true);
    assert.equal(player.attackHitStarTimer, 80);

    // Advance remaining 80ms -> hidden
    player.updateAttackHitStar(80);
    assert.equal(player.attackHitStar.visible, false);
    assert.equal(player.attackHitStarTimer, 0);

    // Kicking impact
    player.triggerAttackHitStar('kicking', 160);
    assert.equal(player.attackHitStar.visible, true);
    assert.equal(player.attackHitStar.x, 149);
    assert.equal(player.attackHitStar.y, player.layout.walkHeight - 270);
    assert.equal(player.attackHitStarTimer, 160);

    // Advance 160ms -> hidden
    player.updateAttackHitStar(160);
    assert.equal(player.attackHitStar.visible, false);
    assert.equal(player.attackHitStarTimer, 0);
});

test('verifies Player attackHitStar resets on hurt, death, and revive', () => {
    const scene = createMockScene();
    const player = new Player(scene, 960, 548.57, LAYOUT.player, 1920 / 546);

    // Hurt reset
    player.triggerAttackHitStar('boxing');
    assert.equal(player.attackHitStar.visible, true);
    player.triggerHurt();
    assert.equal(player.attackHitStar.visible, false);
    assert.equal(player.attackHitStarTimer, 0);

    // Death reset
    player.triggerAttackHitStar('kicking');
    assert.equal(player.attackHitStar.visible, true);
    player.triggerDeath();
    assert.equal(player.attackHitStar.visible, false);
    assert.equal(player.attackHitStarTimer, 0);

    // Revive reset
    player.triggerAttackHitStar('boxing');
    assert.equal(player.attackHitStar.visible, true);
    player.revive();
    assert.equal(player.attackHitStar.visible, false);
    assert.equal(player.attackHitStarTimer, 0);
});

test('verifies StreetScene and TrainyardScene combat sections trigger hit stars on impacts', () => {
    const streetFile = path.resolve(__dirname, '../js/street/StreetScene.js');
    const streetContent = fs.readFileSync(streetFile, 'utf8');

    assert.ok(
        streetContent.includes('this.cop.triggerPunchHitStar();'),
        'StreetScene must trigger cop punch hit star',
    );
    assert.ok(
        streetContent.includes('this.player.triggerAttackHitStar(attackType);'),
        'StreetScene must trigger player attack hit star',
    );

    const trainyardFile = path.resolve(__dirname, '../js/trainyard/TrainyardScene.js');
    const trainyardContent = fs.readFileSync(trainyardFile, 'utf8');

    assert.ok(
        trainyardContent.includes('this.cop.triggerPunchHitStar();'),
        'TrainyardScene must trigger cop punch hit star',
    );
    assert.ok(
        trainyardContent.includes('this.player.triggerAttackHitStar(attackType);'),
        'TrainyardScene must trigger player attack hit star',
    );
});
