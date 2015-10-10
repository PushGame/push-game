var express = require('express');
var app = express();
var http = require('http').Server(app);
var uuid = require('uuid');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/game/waiting.html');
});

app.get('/stage1', function (req, res) {
    res.sendFile(__dirname + '/game/game.html');
});

// static serve everything under game directory
app.use('/static', express.static(__dirname + '/static'));

var sockets = [];
var userList = [];

var io = require('socket.io')(http);
var port = process.env.port || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port);
});

const FRAMERATE = 40;

const PLATFORM_OFFSET = 1;

const CHAR_WIDTH = 32;
const CHAR_HEIGHT = 48;

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;

const JUMP_POWER = 20;
const GRAVITY = JUMP_POWER / (0.7 * FRAMERATE);
const SPEED = 6;

var platforms = [];

function addPlatform(sx, sy, ex, ey) {
    platforms.push({
        sx: sx,
        sy: sy,
        ex: ex,
        ey: ey
    });
}

function checkCollision(platform, character) {
    var x = character.x + CHAR_WIDTH / 2;
    var y = character.y + CHAR_HEIGHT + PLATFORM_OFFSET;
    
    return platform.sx <= x && x <= platform.ex && platform.sy <= y && y <= platform.ey;
}

function onPlatform(character) {
    var i;
    for (i = 0; i < platforms.length; i++) {
        if (checkCollision(platforms[i], character))
            return true;
    }
    return false;
}

function platformY(character) {
    var i;
    for (i = 0; i < platforms.length; i++) {
        if (checkCollision(platforms[i], character)) {
            return platforms[i].sy - CHAR_HEIGHT;
        }
    }
    return character.y;
}

addPlatform(0, STAGE_HEIGHT, STAGE_WIDTH, STAGE_HEIGHT + 100);
addPlatform(0, STAGE_HEIGHT - 100, STAGE_WIDTH / 2, STAGE_HEIGHT - 100 + 100);

io.on('connection', function (socket) {
    // Create user information
    var user = {
        id: uuid.v1(),
        x: STAGE_WIDTH * Math.random(),
        y: (STAGE_HEIGHT - CHAR_HEIGHT) * Math.random(),
        speedY: 0,
        key: 0,
        tryJump: false
    };
    
    // Send connection information
    socket.emit('login', {
        id: user.id,
        x: user.x,
        y: user.y,
        userList: userList
    });
    
    socket.broadcast.emit('new user', {
        id: user.id,
        x: user.x,
        y: user.y
    });
    
    socket.user = user;
    userList.push(user);
    
    socket.on('disconnect', function () {
        socket.broadcast.emit('logout', socket.user.id);
        
        var i;
        for (i = 0; i < userList.length; i++) {
            if (userList[i].id === socket.user.id) {
                userList[i] = userList[userList.length - 1];
                userList.pop();
            }
        }
    });
    
    socket.on('key', function (key) {
        if (key === 'left') {
            socket.user.key = 1;
        } else if (key === 'right') {
            socket.user.key = 2;
        } else if (key === 'up') {
            socket.user.key = 0;
        }
    });
    
    socket.on('jump', function () {
        socket.user.tryJump = true;
    });
});

setInterval(function () {
    var i, user;
    for (i = 0 ; i < userList.length; i++) {
        user = userList[i];
        if (user.key === 1) {
            user.x -= SPEED;
        } else if (user.key === 2) {
            user.x += SPEED;
        }
        
        if (user.x < 0) user.x = 0;
        if (user.x+CHAR_WIDTH > STAGE_WIDTH) user.x = STAGE_WIDTH-CHAR_WIDTH;
        
        user.y += user.speedY;
        user.speedY += GRAVITY;
        user.y = platformY(user);

        if (onPlatform(user)) {
            user.speedY = 0;
            if (user.tryJump) {
                user.speedY = -JUMP_POWER;
            }
        }
        
        user.tryJump = false;

        io.emit('move', {
            id: user.id,
            x: user.x,
            y: user.y
        });
    }
}, 1000 / FRAMERATE);

/* 
 * Used for socket.io chat tutorial
 * 
app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
});
io.on('connection', function (socket) {
    console.log('a user connected');
    socket.on('disconnect', function () {
        console.log('a user disconnected');
    });
    socket.on('chat message', function (msg) {
        io.emit('chat message', msg);
    });
});
*/
