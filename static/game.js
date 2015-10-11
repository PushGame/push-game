var socket;
var game = new Phaser.Game(800, 600, Phaser.AUTO, '', { preload: preload, create: create, update: update, render: render });

function preload() {
    game.load.spritesheet('pong', 'static/assets/games/starstruck/pong.png', 32, 48);
    game.load.spritesheet('ping', 'static/assets/games/starstruck/ping.png', 32, 48);
    game.load.image('background', 'static/assets/games/starstruck/background4.png');
    game.load.image('missile', 'static/assets/star.png', 24, 22);
    game.load.image('fireWalls', 'static/assets/firewall.png', 24, 600);
}


var player;
var facing = 'left';
var cursors;
var jumpButton;
var bg;

var missiles;
var missileTimer;

var fireWalls;
var hasInitializedWalls;

var id;
var userList = {};

var currentDropChance;

function create() {
    game.physics.startSystem(Phaser.Physics.ARCADE);
    
    hasInitializedWalls = false;
    socket = io();
    currentDropChance = 98;
    bg = game.add.tileSprite(0, 0, 800, 600, 'background');
    
    socket.on('login', function (data) {
        id = data.id;
        
        var i;
        for (i = 0; i < data.userList.length; i++)
            userList[data.userList[i].id] = drawGuy(data.userList[i]);
        
        player = game.add.sprite(data.x, data.y, 'ping');
        
        player.animations.add('left', [0, 1, 2, 3], 10, true);
        player.animations.add('turn', [4], 20, true);
        player.animations.add('right', [5, 6, 7, 8], 10, true);


        
        cursors = game.input.keyboard.createCursorKeys();
        jumpButton = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);

        userList[data.id] = player;
        game.physics.arcade.enable(player);
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
    });
    


    missiles = game.add.physicsGroup();
    missiles.physicsBodyType = Phaser.Physics.ARCADE;
    
    fireWalls = game.add.physicsGroup();
    fireWalls.physicscBodyType = Phaser.Physics.ARCADE;
    
    game.physics.arcade.collide(player, missiles, collisionHandler, processHandler, this);
    game.physics.arcade.collide(player, fireWalls, collisionHandler, processHandler, this);
}

function moveGuy(sprite, data) {
    if (sprite) {
        sprite.x = data.x;
        sprite.y = data.y;
    }
}

function drawGuy(data) {
    other = game.add.sprite(data.x, data.y, 'pong');
    
    other.animations.add('left', [0, 1, 2, 3], 10, true);
    other.animations.add('turn', [4], 20, true);
    other.animations.add('right', [5, 6, 7, 8], 10, true);
    
    return other;
}

function update() {

    //handleMissiles();
    handleFireWalls();
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

function collisionHandler () {
    player.kill();
}

function processHandler (player, fireWalls) {

    return true;

}
function processHandler (player, missiles) {

    return true;

}

function handleMissiles()
{
    dropChance = game.rnd.between(0,100);
    
    if(dropChance >= currentDropChance)
    {
        if(currentDropChance > 75)
        {
            currentDropChance = currentDropChance - 0.25;
        }
        else if(currentDropChance > 50 && currentDropChance <= 75)
        {
            currentDropChance = currentDropChance - 0.1;
        }
        console.log(currentDropChance);
        createMissile(game.rnd.between(0,800),game.rnd.between(80,300));
    }
}

function createMissile(x, ySpeed)
{
    var newMissile;
    newMissile = missiles.create(x,0,'missile');
    newMissile.body.setSize(40,52,0,0);
    newMissile.body.velocity.y = ySpeed;   
}

function handleFireWalls()
{
    if(!hasInitializedWalls){
        var leftWall, rightWall;
        leftWall = fireWalls.create(0,0,'fireWalls');
        rightWall = fireWalls.create(800, 0, 'fireWalls');
        leftWall.body.setSize(24,300,0,0);
        rightWall.body.setSize(24,270,0,0);
        leftWall.body.velocity.x = 50;
        rightWall.body.velocity.x = -50;
        hasInitializedWalls = true;
    }
}

function render() {
}
