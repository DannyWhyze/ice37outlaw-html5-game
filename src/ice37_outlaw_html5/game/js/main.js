const config = {
    type: Phaser.AUTO,
    width: 1920,
    height: 1080,
    parent: 'game-container',
    backgroundColor: '#000000',
    resolution: 1,
    render: {
        antialias: true,
        roundPixels: false,
        preserveDrawingBuffer: true,
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.NO_CENTER,
    },
    scene: [BootScene, StartScene, MenuScene, HomeScene, HallOfFameScene, StreetScene, TrainyardScene],
};

const game = new Phaser.Game(config);
