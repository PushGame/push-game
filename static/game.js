var socket;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update });

function preload() {
    game.load.image('star', 'static/assets/star.png');
}

function create() {
    socket = io();
    
    socket.on('new user', function () {
        drawNewCircle();
    });
}

function update() {
}

function drawNewCircle() {
    game.add.sprite(game.world.width * Math.random(), game.world.height * Math.random(), 'star');
}
