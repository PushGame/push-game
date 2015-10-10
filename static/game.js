﻿var socket;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render});

function preload() {
    game.load.spritesheet('dude', 'static/assets/games/starstruck/dude.png', 32, 48);
    game.load.image('background', 'static/assets/games/starstruck/background2.png');}


var player;
var facing = 'left';
var jumpTimer = 0;
var cursors;
var jumpButton;
var bg;

var id;
var x;
var y;
var userList = {};

function create() {
    socket = io();

    game.physics.startSystem(Phaser.Physics.ARCADE);

     bg = game.add.tileSprite(0, 0, 800, 600, 'background');
    game.physics.arcade.gravity.y = 300;


    socket.on('login', function (data) {
        id = data.id;

        var i;
        for(i=0; i<data.userList.length; i++)
            userList[data.userList[i].id] = drawGuy(data.userList[i]);

        player = game.add.sprite(data.x, data.y, 'dude');


        game.physics.enable(player, Phaser.Physics.ARCADE);

        player.body.collideWorldBounds = true;
        player.body.gravity.y = 1000;
        player.body.maxVelocity.y = 500;
        player.body.setSize(20, 32, 5, 16);

        player.animations.add('left', [0, 1, 2, 3], 10, true);
        player.animations.add('turn', [4], 20, true);
        player.animations.add('right', [5, 6, 7, 8], 10, true);

        cursors = game.input.keyboard.createCursorKeys();
        jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

    });


    
    socket.on('new user', function (data) {
        userList[data.id] = drawGuy(data);
    });

    socket.on('move', function(data){
        moveGuy(userList[data.id], data);
    });

    socket.on('logout', function(id){
        userList[id].destroy(true);
        delete userList[id];
    })

}

function moveGuy(sprite, data){
    sprite.position.x = data.x-5;
    sprite.position.y = data.y-16;
}

function drawGuy(data){
    var other = game.add.sprite(data.x-5, data.y-16, 'dude');


    other.animations.add('left', [0, 1, 2, 3], 10, true);
    other.animations.add('turn', [4], 20, true);
    other.animations.add('right', [5, 6, 7, 8], 10, true);

    return other;
}

function update() {

    // game.physics.arcade.collide(player, layer);
    if(player){

        socket.emit('move', getCoords());

        player.body.velocity.x = 0;

        if (cursors.left.isDown)
        {
            player.body.velocity.x = -150;

            if (facing != 'left')
            {
                player.animations.play('left');
                facing = 'left';
            }
        }
        else if (cursors.right.isDown)
        {
            player.body.velocity.x = 150;


            if (facing != 'right')
            {
                player.animations.play('right');
                facing = 'right';
            }
        }
        else
        {
            if (facing != 'idle')
            {
                player.animations.stop();

                if (facing == 'left')
                {
                    player.frame = 0;
                }
                else
                {
                    player.frame = 5;
                }

                facing = 'idle';
            }
        }
        
        if (jumpButton.isDown && player.body.onFloor() && game.time.now > jumpTimer)
        {
            player.body.velocity.y = -500;
            jumpTimer = game.time.now + 750;
        }
    }

}

function getCoords() {
    var coords = {x: player.body.x, y:player.body.y};
    return coords;
}

function render () {

    // game.debug.text(game.time.physicsElapsed, 32, 32);
    // game.debug.body(player);
    if(player){
        game.debug.bodyInfo(player, 16, 24);
    }

}
