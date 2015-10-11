var socket;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.spritesheet('pong', 'static/assets/games/starstruck/pong.png', 32, 48); //others
    game.load.spritesheet('ping', 'static/assets/games/starstruck/ping.png', 32, 48); //me
    game.load.spritesheet('king', 'static/assets/games/starstruck/king.png', 32, 48);
    game.load.image('background', 'static/assets/games/starstruck/background4.png');
    game.load.image('stage', 'static/assets/games/starstruck/stageBlock.png');
}


var player;
var facing = 'left';
var cursors;
var jumpButton;
var bg;
var platforms;

var id;
var userList = {};

function create() {
    socket = io();
    game.physics.startSystem(Phaser.Physics.ARCADE);
    bg = game.add.tileSprite(0, 0, 800, 600, 'background');

    //  The platforms group contains the ground and the 2 ledges we can jump on
    platforms = game.add.group();

    //  We will enable physics for any object that is created in this group
    platforms.enableBody = true;

	var stage = platforms.create(125, game.world.height-150, 'stage');
	stage.scale.setTo(0.25,1);    
	stage.body.immovable = true;

	var stage2 = platforms.create(350, game.world.height-150, 'stage');
	stage2.scale.setTo(0.25,1);    
	stage2.body.immovable = true;

	var stage3 = platforms.create(575, game.world.height-150, 'stage');
	stage3.scale.setTo(0.25,1);    
	stage3.body.immovable = true;
	game.physics.arcade.enable(stage3);

    socket.on('login', function (data) {
        id = data.id;
        
        var i;
        for (i = 0; i < data.userList.length; i++)
            userList[data.userList[i].id] = drawGuy(data.userList[i]);
        
        player = game.add.sprite(data.x, data.y, 'ping');
        
        player.animations.add('left', [0, 1, 2, 3], 10, true);
        player.animations.add('turn', [4], 20, true);
        player.animations.add('right', [5, 6, 7, 8], 10, true);

		game.physics.arcade.enable(player);
		player.body.collideWorldBounds = true;

        
        cursors = game.input.keyboard.createCursorKeys();
        jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

        userList[data.id] = player;
    });
    
    socket.on('new user', function (data) {
        userList[data.id] = drawGuy(data);
    });
    
    socket.on('move', function (data) {
        moveGuy(userList[data.id], data);
    });
    
    socket.on('logout', function (id) {
        userList[id].destroy(true);
        delete userList[id];
    })

}

function moveGuy(sprite, data) {
    if (sprite) {
        sprite.x = data.x;
        sprite.y = data.y;
    }
}

function drawGuy(data) {
    other = game.add.sprite(data.x - 5, data.y - 16, 'pong');
    
    other.animations.add('left', [0, 1, 2, 3], 10, true);
    other.animations.add('turn', [4], 20, true);
    other.animations.add('right', [5, 6, 7, 8], 10, true);
    game.physics.arcade.enable(other);
    
    return other;
}

function update() {
	game.physics.arcade.collide(player, platforms);

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
                }
                else {
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