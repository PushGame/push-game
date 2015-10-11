'use strict';

var socket;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.spritesheet('pong', 'static/assets/pong.png', 32, 48);
    game.load.spritesheet('ping', 'static/assets/ping.png', 32, 48);
    game.load.spritesheet('king', 'static/assets/king.png', 32, 48);
    game.load.spritesheet('fire', 'static/assets/fire.png', 48, 48);
    game.load.image('b2', 'static/assets/background2.png');
    game.load.image('b4', 'static/assets/background4.png');
    game.load.image('bCheck', 'static/assets/checker-floor.png');
    game.load.image('star', 'static/assets/star.png');
    game.load.image('stage', 'static/assets/stageBlock.png');
}

const CHAR_WIDTH = 32;
const CHAR_HEIGHT = 48;

var player;
var facing = 'left';
var cursors;
var jumpButton;

var id;
var userList = {};
var objList = [];

var label;
var shrinking, stars;

function create() {
    socket = io();
    
    socket.on('world', function (worldType) {
        var i;
        for (i = 0; i < objList.length; i++) {
            try {
                objList[i].destroy();
            } catch (error) {
            }
        }
        objList = [];
        
        // Setup world
        label = game.add.text(game.world.width * .5, 100, '');
        label.anchor.x = 0.5;
        
        // Setup stage-specific
        var ground;
        if (worldType === 'waiting') {
            objList.push(game.add.tileSprite(0, 0, 800, 600, 'b4'));
        } else if (worldType === 'shrinking') {
            objList.push(game.add.tileSprite(0, 0, 800, 600, 'bCheck'));

            ground = game.add.tileSprite(0, 552, 800, 600, 'fire');
            objList.push(ground);
            
            ground.animations.add('spin', [0, 1, 2, 3]);
            ground.play('spin', 10, true);

            shrinking = game.add.image(game.world.width * .5, game.world.height - 120, 'stage');
            shrinking.anchor.x = 0.5;
            shrinking.scale.x = 2;
            objList.push(shrinking);
        } else if (worldType === 'star') {
            objList.push(game.add.tileSprite(0, 0, 800, 600, 'b2'));
            stars = [];
        }
    });
    
    socket.on('waiting countdown', function (second) {
        if (second === -1) {
            label.text = 'Waiting for other players';
        } else {
            label.text = '- ' + second + ' -';
        }
    });
    
    socket.on('shrinking', function (ratio) {
        shrinking.scale.x = 2 * ratio;
    });
    
    socket.on('star', function (arr) {
        var i;
        if (stars.length > arr.length) {
            for (i = arr.length; i < stars.length; i++) {
                stars[i].destroy();
            }
            for (i = stars.length - arr.length; i--;) {
                stars.pop();
            }
        } else if (stars.length < arr.length) {
            for (i = arr.length - stars.length; i--;) {
                stars.push(game.add.image(0, 0, 'star'));
            }
        }

        for (i = 0; i < arr.length; i++) {
            stars[i].x = arr[i].x;
            stars[i].y = arr[i].y;
        }
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
        if (userList[id]) {
            userList[id].destroy();
            delete userList[id];
        }
    });

    socket.on('login', function (id) {

    });

    socket.on('logout', function (id) {

    });
}

function moveActor(data) {
    if (userList[data.id]) {
        userList[data.id].x = data.x;
        userList[data.id].y = data.y;
    }
}

function createActor(data, sprite) {
    var actor = game.add.sprite(data.x, data.y, sprite);
    actor.anchor.x = 0.5;
    actor.anchor.y = 0.5;
    
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
