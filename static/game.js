'use strict';

var socket;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.spritesheet('pong', 'static/assets/games/starstruck/pong.png', 32, 48);
    game.load.spritesheet('ping', 'static/assets/games/starstruck/ping.png', 32, 48);
    game.load.image('background', 'static/assets/games/starstruck/background4.png');
}

const CHAR_WIDTH = 32;
const CHAR_HEIGHT = 48;

var player;
var facing = 'left';
var cursors;
var jumpButton;
var bg;

var id;
var userList = {};

function create() {
    socket = io();
    
    bg = game.add.tileSprite(0, 0, 800, 600, 'background');
    
    socket.on('world', function (worldType) {

    });
    
    socket.on('move', function (arr) {
        var i;
        for (i = 0; i < arr.length; i++) {
            if (!userList[arr[i].id]) {
                if (arr[i].id === socket.id) {
                    userList[arr[i].id] = player = createActor(arr[i], 'ping');

                    cursors = game.input.keyboard.createCursorKeys();
                    jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
                } else {
                    userList[arr[i].id] = createActor(arr[i], 'pong');
                }
            } else {
                moveActor(arr[i]);
            }
        }
    });
    
    socket.on('dead', function (id) {
        userList[id].destroy(true);
        delete userList[id];
    });

    socket.on('login', function (id) {

    });

    socket.on('logout', function (id) {

    });
}

function moveActor(data) {
    if (userList[data.id]) {
        userList[data.id].x = data.x - CHAR_WIDTH * .5;
        userList[data.id].y = data.y - CHAR_HEIGHT * .5;
    }
}

function createActor(data, sprite) {
    var actor = game.add.sprite(data.x - CHAR_WIDTH * .5, data.y - CHAR_HEIGHT * .5, sprite);
    
    actor.animations.add('left', [0, 1, 2, 3], 10, true);
    actor.animations.add('turn', [4], 20, true);
    actor.animations.add('right', [5, 6, 7, 8], 10, true);
    
    return actor;
}

function update() {
    if (player) {
        if (cursors.left.isDown) {
            socket.emit('key', 'left');
            
            if (facing != 'left') {
                player.animations.play('left');
                facing = 'left';
            }
        }
        else if (cursors.right.isDown) {
            socket.emit('key', 'right');
            
            if (facing != 'right') {
                player.animations.play('right');
                facing = 'right';
            }
        }
        else {
            socket.emit('key', 'up');

            if (facing != 'idle') {
                player.animations.stop();
                
                if (facing == 'left') {
                    player.frame = 0;
                } else {
                    player.frame = 5;
                }
                
                facing = 'idle';
            }
        }

        if (jumpButton.isDown) {
            socket.emit('jump');
        }
    }
}

function render() {
}
