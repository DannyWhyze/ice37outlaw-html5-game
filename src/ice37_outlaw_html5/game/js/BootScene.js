class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        let progressBar = this.add.graphics();
        let progressBox = this.add.graphics();
        progressBox.fillStyle(0x222222, 0.8);
        progressBox.fillRect(170, 130, 206, 30);

        let width = this.cameras.main.width;
        let height = this.cameras.main.height;
        let loadingText = this.make.text({
            x: width / 2,
            y: height / 2 - 30,
            text: 'Loading Decompiled Vector Artwork...',
            style: { font: '16px monospace', fill: '#99CC00' }
        });
        loadingText.setOrigin(0.5, 0.5);

        this.load.on('progress', (value) => {
            progressBar.clear();
            progressBar.fillStyle(0x99CC00, 1);
            progressBar.fillRect(173, 133, 200 * value, 24);
        });

        this.load.on('complete', () => {
            progressBar.destroy();
            progressBox.destroy();
            loadingText.destroy();
        });

        // Load authentic Start Screen native 1080p PNG & button assets (assets/images/start/)
        this.load.image('start_background', 'assets/images/start/start_background.png?v=1080p');
        this.load.image('start_bg', 'assets/images/start/start_background.png?v=1080p');
        this.load.image('btn_enter', 'assets/images/start/btn_enter.png?v=1080p');

        // Load authentic Main Menu native 1080p PNG & text assets (assets/images/mainmenu/)
        this.load.image('mainmenu_bg', 'assets/images/mainmenu/mainmenu_bg.png?v=1080p_hd');
        // Load authentic 352% HD Main Menu buttons & 25-frame dripping animations (assets/images/mainmenu/buttons/)
        ['home', 'hall', 'street', 'train'].forEach((btnKey) => {
            for (let f = 1; f <= 25; f++) {
                this.load.image(`menu_btn_${btnKey}_${f}`, `assets/images/mainmenu/buttons/${btnKey}/${f}.png?v=1080p_hd`);
            }
        });
        this.load.image('btn_home', 'assets/images/mainmenu/btn_home.png?v=1080p_hd');
        this.load.image('btn_home_hover', 'assets/images/mainmenu/btn_home_hover.png?v=1080p_hd');
        this.load.image('btn_hall', 'assets/images/mainmenu/btn_hall.png?v=1080p_hd');
        this.load.image('btn_hall_hover', 'assets/images/mainmenu/btn_hall_hover.png?v=1080p_hd');
        this.load.image('btn_streetbombing', 'assets/images/mainmenu/btn_streetbombing.png?v=1080p_hd');
        this.load.image('btn_streetbombing_hover', 'assets/images/mainmenu/btn_streetbombing_hover.png?v=1080p_hd');
        this.load.image('btn_train', 'assets/images/mainmenu/btn_train.png?v=1080p_hd');
        this.load.image('btn_train_hover', 'assets/images/mainmenu/btn_train_hover.png?v=1080p_hd');
        this.load.image('mainmenu_cat_10', 'assets/images/mainmenu/cat/10.png?v=1080p_hd');
        this.load.image('mainmenu_cat_12', 'assets/images/mainmenu/cat/12.png?v=1080p_hd');
        this.load.image('mainmenu_cat_13', 'assets/images/mainmenu/cat/13.png?v=1080p_hd');
        this.load.image('mainmenu_cat_15', 'assets/images/mainmenu/cat/15.png?v=1080p_hd');
        this.load.image('mainmenu_cat_mask_8', 'assets/images/mainmenu/cat/8.png?v=1080p_hd');
        this.load.audio('cat_meow', 'assets/audio/mainmenu/cat_meow_11.mp3');
        this.load.audio('cat_screech', 'assets/audio/mainmenu/cat_screech_16.mp3');

        // Load authentic sound effects (assets/audio/sfx/)
        this.load.audio('sfx_can_select', 'assets/audio/sfx/can_select.mp3');
        this.load.audio('sfx_tool_spraycan', 'assets/audio/sfx/tool_spraycan.mp3');
        this.load.audio('sfx_tool_cap', 'assets/audio/sfx/tool_cap.mp3');
        this.load.audio('sfx_tool_roller', 'assets/audio/sfx/tool_roller.mp3');
        this.load.audio('sfx_combat_kick', 'assets/audio/sfx/combat_kick.mp3');
        this.load.audio('sfx_combat_punch', 'assets/audio/sfx/combat_punch.mp3');
        this.load.audio('sfx_player_hit', 'assets/audio/sfx/player_hit.mp3');
        this.load.audio('sfx_player_die', 'assets/audio/sfx/player_die.mp3');
        this.load.audio('sfx_cop_hit', 'assets/audio/sfx/cop_hit.mp3');
        this.load.audio('sfx_cop_die', 'assets/audio/sfx/cop_die.mp3');
        this.load.audio('sfx_punch_1', 'assets/audio/sfx/punch_1.mp3');
        this.load.audio('sfx_punch_2', 'assets/audio/sfx/punch_2.mp3');
        this.load.audio('sfx_punch_3', 'assets/audio/sfx/punch_3.mp3');
        this.load.audio('sfx_punch_4', 'assets/audio/sfx/punch_4.mp3');
        this.load.audio('sfx_train_pass', 'assets/audio/sfx/train_pass.mp3');

        // Load authentic Home / Hideout room vector & button assets (assets/images/home/)
        this.load.image('home_bg', 'assets/images/home/home_bg.png?v=1080p_hd');
        this.load.image('btn_mainmenu_hover', 'assets/images/home/btn_mainmenu_hover.png?v=1080p_hd');
        this.load.image('home_train', 'assets/images/home/train/10.png?v=1080p_hd');
        this.load.image('home_train_window_mask', 'assets/images/home/train/8.png?v=1080p_hd');
        this.load.image('home_train_window_foreground', 'assets/images/home/train/9.png?v=1080p_hd');
        this.load.image('home_lamp', 'assets/images/home/lamp.png?v=1080p_hd');
        this.load.audio('home_trainspotting', 'assets/audio/home/trainspotting_80-519.mp3');
        this.load.json('home_train_timeline', 'assets/data/home_train_timeline.json');
        this.load.json('home_lamp_timeline', 'assets/data/home_lamp_timeline.json');
        this.load.image('halloffame_background', 'assets/images/halloffame/background.png');
        this.load.image('halloffame_paintmask', 'assets/images/halloffame/halloffame_paintmask.png');
        this.load.image('street_background', 'assets/images/street/street_background.jpg');
        this.load.image('street_paintmask', 'assets/images/street/street_paintmask.png');
        this.load.image('street_paintmask_surface_chunk_0', 'assets/images/street/street_paintmask_surface_chunk_0.png');
        this.load.image('street_paintmask_surface_chunk_1', 'assets/images/street/street_paintmask_surface_chunk_1.png');
        this.load.image('trainyard_background', 'assets/images/trainyard/trainyard_background.jpg');
        this.load.image('trainyard_paintmask', 'assets/images/trainyard/trainyard_paintmask.png');
        this.load.image('trainyard_paintmask_surface_chunk_0', 'assets/images/trainyard/trainyard_paintmask_surface_chunk_0.png');
        this.load.image('trainyard_paintmask_surface_chunk_1', 'assets/images/trainyard/trainyard_paintmask_surface_chunk_1.png');
        this.load.image('halloffame_sprayer', 'assets/images/prefabs/player/player_idle.png');
        const loadedWalkNativeKeys = new Set();
        ['walk_frame_01.png', 'walk_frame_03.png', 'walk_frame_06.png', 'walk_frame_08.png', 'walk_frame_10.png', 'walk_frame_14.png'].forEach((fileName) => {
            if (!loadedWalkNativeKeys.has(fileName)) {
                loadedWalkNativeKeys.add(fileName);
                const key = `halloffame_walk_native_${fileName.replace('.png', '')}`;
                this.load.image(key, `assets/images/prefabs/player/walk_native/${fileName}`);
            }
        });
        this.load.image('halloffame_player_shadow', 'assets/images/prefabs/player/player_shadow_shape8.png');
        this.load.image('halloffame_exit_door', 'assets/images/prefabs/exits/emergency_exit_door.png?v=1080p_hd');
        this.load.image('halloffame_exit_shadow', 'assets/images/prefabs/exits/emergency_exit_shadow.png?v=1080p_hd');
        this.load.image('halloffame_stage_edges', 'assets/images/prefabs/exits/hall_stage_edges.png?v=1080p_hd');
        this.load.image('halloffame_cursor_spraycan', 'assets/images/prefabs/cursor/cursor_spraycan.png');
        this.load.image('halloffame_cursor_paintroller', 'assets/images/prefabs/cursor/cursor_paintroller.png');
        this.load.image('halloffame_cursor_hand', 'assets/images/prefabs/cursor/cursor_hand.png');
        this.load.image('halloffame_backpack_body_1', 'assets/images/prefabs/backpack/backpack_closed.png');
        this.load.image('halloffame_backpack_body_2', 'assets/images/prefabs/backpack/backpack_hover.png');
        this.load.image('halloffame_backpack_body_3', 'assets/images/prefabs/backpack/backpack_open.png');
        this.load.image('halloffame_backpack_tool_1', 'assets/images/prefabs/backpack/tool_spraycan.png');
        this.load.image('halloffame_backpack_tool_2', 'assets/images/prefabs/backpack/tool_fatcap.png');
        this.load.image('halloffame_backpack_tool_3', 'assets/images/prefabs/backpack/tool_softcap.png');
        this.load.image('halloffame_backpack_tool_4', 'assets/images/prefabs/backpack/tool_paintroller.png');
        this.load.image('halloffame_backpack_can_closed', 'assets/images/prefabs/backpack/can_body_closed.png');
        this.load.image('halloffame_backpack_can_open', 'assets/images/prefabs/backpack/can_body_open.png');
        this.load.image('halloffame_backpack_can_color', 'assets/images/prefabs/backpack/can_cap_color.png');
        this.load.image('backpack_smartphone', 'assets/images/prefabs/backpack/smartphone.png?v=1080p_hd');

        // Load HUD (Player health bar & skull) prefabs assets (assets/images/prefabs/hud/)
        this.load.image('hud_health_bar', 'assets/images/prefabs/hud/health_bar.png?v=1080p_hd');
        this.load.image('hud_skull', 'assets/images/prefabs/hud/hud_skull.png?v=1080p_hd');

        // Load Camera HUD prefab assets (assets/images/prefabs/camera/)
        this.load.image('hud_camera_frame', 'assets/images/prefabs/camera/hud_camera_frame.png?v=1080p_v2');
        this.load.image('hud_camera_shutter', 'assets/images/prefabs/camera/hud_camera_shutter.png?v=1080p_hd');
        this.load.image('hud_camera_focus', 'assets/images/prefabs/camera/hud_camera_focus.png?v=1080p_hd');
        this.load.image('hud_camera_close', 'assets/images/prefabs/camera/hud_camera_close.png?v=1080p_hd');
        this.load.image('hud_camera_gallery', 'assets/images/prefabs/camera/hud_camera_gallery.png?v=1080p_hd');
        this.load.image('hud_camera_player_toggle', 'assets/images/prefabs/camera/hud_camera_player_toggle.png?v=1080p_hd');

        // Load Gallery prefab assets (assets/images/prefabs/gallery/)
        this.load.image('gallery_backdrop_ice37', 'assets/images/prefabs/gallery/gallery_backdrop_ice37.png?v=1080p_hd');
        this.load.image('gallery_polaroid_frame', 'assets/images/prefabs/gallery/gallery_polaroid_frame.png?v=1080p_hd');

        // Load Screen Fader transition prefab asset (assets/images/prefabs/transitions/)
        this.load.image('blende', 'assets/images/prefabs/transitions/blende.png?v=1080p_hd');
        const boxingNativeMapping = {
            1: 'boxen_frame_01.png', 2: 'boxen_frame_01.png',
            3: 'boxen_frame_03.png', 4: 'boxen_frame_03.png',
            5: 'boxen_frame_05.png', 6: 'boxen_frame_05.png',
            7: 'boxen_frame_07.png', 8: 'boxen_frame_07.png', 9: 'boxen_frame_07.png',
            10: 'boxen_frame_10.png', 11: 'boxen_frame_10.png', 12: 'boxen_frame_10.png', 13: 'boxen_frame_10.png',
        };
        const Combat = (typeof PlayerCombat !== 'undefined')
            ? PlayerCombat
            : require('./logic/playerCombat.js');
        for (let frameNumber = 1; frameNumber <= 13; frameNumber++) {
            const fileName = boxingNativeMapping[frameNumber];
            this.load.image(
                Combat.getFrameKey(frameNumber),
                `assets/images/prefabs/player/boxing_native/${fileName}`,
            );
        }
        const kickNativeMapping = {
            1: 'kick_frame_01.png', 2: 'kick_frame_01.png',
            3: 'kick_frame_03.png', 4: 'kick_frame_03.png', 5: 'kick_frame_03.png',
            6: 'kick_frame_06.png', 7: 'kick_frame_06.png', 8: 'kick_frame_06.png',
            9: 'kick_frame_09.png', 10: 'kick_frame_09.png', 11: 'kick_frame_09.png', 12: 'kick_frame_09.png',
        };
        for (let frameNumber = 1; frameNumber <= 12; frameNumber++) {
            const fileName = kickNativeMapping[frameNumber];
            this.load.image(
                Combat.getKickFrameKey(frameNumber),
                `assets/images/prefabs/player/kick_native/${fileName}`,
            );
        }

        // Load authentic Player death animation assets (assets/images/prefabs/player/die_native/)
        this.load.image('player_die_frame_01', 'assets/images/prefabs/player/die_native/die_frame_01.png');
        this.load.image('player_die_frame_02', 'assets/images/prefabs/player/die_native/die_frame_02.png');
        this.load.image('player_die_frame_03', 'assets/images/prefabs/player/die_native/die_frame_03.png');
        this.load.image('player_die_frame_04', 'assets/images/prefabs/player/die_native/die_frame_04.png');
        this.load.image('player_die_blood_pool', 'assets/images/prefabs/player/die_native/die_blood_pool.png');
        this.load.image('player_die_eyes_white', 'assets/images/prefabs/player/die_native/die_eyes_white.png');

        // Load authentic Player hurt animation assets (assets/images/prefabs/player/hurt_native/)
        this.load.image('player_hurt_character', 'assets/images/prefabs/player/hurt_native/hurt_character_shape_110.png');
        this.load.image('player_hurt_blood_drop', 'assets/images/prefabs/player/hurt_native/hurt_blood_drop_shape_30.png');

        // Load authentic Combat Hit Stars (Cop Shape 23 & Player Shape 138)
        this.load.image('cop_hit_star', 'assets/images/prefabs/cop/cop_hit_star_shape23.png?v=1080p_hd');
        this.load.image('player_hit_star', 'assets/images/prefabs/player/player_hit_star_shape138.png?v=1080p_hd');

        // Load authentic Cop walk animation assets (assets/images/prefabs/cop/walk_native/)
        for (let i = 1; i <= 5; i++) {
            const num = String(i).padStart(2, '0');
            this.load.image(`cop_walk_${num}`, `assets/images/prefabs/cop/walk_native/cop_walk_${num}.png`);
        }

        // Load authentic Cop boxing animation assets (assets/images/prefabs/cop/boxing_native/)
        ['01', '03', '05', '07', '09', '13'].forEach((num) => {
            this.load.image(`cop_boxing_${num}`, `assets/images/prefabs/cop/boxing_native/cop_boxing_${num}.png`);
        });

        // Load authentic Cop hurt animation assets (assets/images/prefabs/cop/hurt_native/)
        this.load.image('cop_hurt_character', 'assets/images/prefabs/cop/hurt_native/cop_hurt_character.png');
        this.load.image('cop_hurt_blood_drop', 'assets/images/prefabs/cop/hurt_native/cop_hurt_blood_drop.png');

        // Load authentic Cop death animation assets (assets/images/prefabs/cop/death_native/)
        this.load.image('cop_death_character', 'assets/images/prefabs/cop/death_native/cop_death_character.png');
        this.load.image('cop_death_cap', 'assets/images/prefabs/cop/death_native/cop_death_cap.png');
        this.load.image('cop_death_star', 'assets/images/prefabs/cop/death_native/cop_death_star.png');

        // Load 33 shelf spray cans and 6 inventory floor spray cans
        for (let i = 1; i <= 33; i++) {
            this.load.image(`farbdose_${i}`, `assets/images/home/cans/farbdose_${i}.png?v=1080p`);
        }
        for (let i = 1; i <= 6; i++) {
            this.load.image(`rs_can_${i}`, `assets/images/home/cans/rs_can_${i}.png?v=1080p`);
        }
        this.load.image('rs_deckelfarbe', 'assets/images/home/cans/rs_deckelfarbe.png?v=1080p');
    }

    create() {
        const params = (typeof window !== 'undefined' && window.location)
            ? new URLSearchParams(window.location.search)
            : null;
        const targetScene = params ? params.get('scene') : null;
        if (targetScene) {
            const knownScenes = ['StartScene', 'MenuScene', 'HomeScene', 'HallOfFameScene', 'StreetScene', 'TrainyardScene'];
            const matched = knownScenes.find((s) => s.toLowerCase() === targetScene.toLowerCase()) || targetScene;
            if (this.scene.manager.getScene(matched)) {
                this.scene.start(matched);
                return;
            }
        }
        this.scene.start('StartScene');
    }
}
