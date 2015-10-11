'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var b2d = require('box2d');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/game/game.html');
});

// static serve everything under game directory
app.use('/static', express.static(__dirname + '/static'));

var io = require('socket.io')(http);
var port = process.env.port || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port);
});

var sockets = {};
var userList = {};

function makeUserList() {
    var id, arr = [], user;
    for (id in userList) {
        user = userList[id];
        arr.push({
            id: user.id,
            x: user.body.GetPosition().x * SCAILING,
            y: user.body.GetPosition().y * SCAILING
        });
    }

    return arr;
}

const FRAMERATE = 40;

const CHAR_WIDTH = 26;
const CHAR_HEIGHT = 48;
const SCAILING = 30;

const STAGE_WIDTH = 800;

const STAGE_HEIGHT = 600;

const JUMP_POWER = 20;
const GRAVITY = 20;
const SPEED = 1;
const MAX_SPEED = 10;

var worldAABB = new b2d.b2AABB();
worldAABB.lowerBound.Set(-STAGE_WIDTH / SCAILING, -STAGE_HEIGHT / SCAILING);
worldAABB.upperBound.Set(STAGE_WIDTH*2 / SCAILING, STAGE_HEIGHT*2 / SCAILING);

var gravity = new b2d.b2Vec2(0, GRAVITY);
var doSleep = true;
var world;
var updateInterval;

var worldType;

function initWorld() {
    world = new b2d.b2World(worldAABB, gravity, doSleep);
    
    addPlatform(0, STAGE_HEIGHT, STAGE_WIDTH, STAGE_HEIGHT + 100);
    addPlatform(-100, 0, 0, STAGE_HEIGHT);
    addPlatform(STAGE_WIDTH, 0, STAGE_WIDTH + 100, STAGE_HEIGHT);
    
    // Foot Sensor manipulation
    var worldContact = new b2d.b2ContactListener();
    worldContact.Add = function (contact) {
        if (contact.shape1.GetUserData()) {
            contact.shape1.GetUserData().footCount++;
        }
        if (contact.shape2.GetUserData()) {
            contact.shape2.GetUserData().footCount++;
        }

        //TODO handle contact
    };
    worldContact.Remove = function (contact) {
        if (contact.shape1.GetUserData()) {
            contact.shape1.GetUserData().footCount--;
        }
        if (contact.shape2.GetUserData()) {
            contact.shape2.GetUserData().footCount--;
        }

    };
    world.SetContactListener(worldContact);
    
    //Initialize users
    var id;
    for (id in sockets) {
        sockets[id].user = createUser(id);
    }
    io.emit('world', worldType);
    
    //Send user information
    var data = makeUserList();
    io.emit('move', data);

    //TODO World Customize with WorldType

    updateInterval = setInterval(updateWorld, 1000 / FRAMERATE);
}

function destoryWorld() {
    //Destory active users
    var id;
    for (id in sockets) {
        if (sockets[id].user) {
            destroyUser(sockets[id]);
        }
    }

    claerInterval(updateInterval);
    updateInterval = null;
}

function updateWorld() {
    var id, user, impulse, prev;
    for (id in userList) {
        user = userList[id];
        
        if (user.deadFlag) {
            destroyUser(sockets[id]);
            continue;
        }

        if (user.key === 1) {
            impulse = -SPEED;
        } else if (user.key === 2) {
            impulse = SPEED;
        }
            
        if (user.key == 0) {
            user.body.GetLinearVelocity().x *= 0.95;
        } else {
            prev = user.body.GetLinearVelocity().Copy();
            user.body.ApplyImpulse(new b2d.b2Vec2(impulse, 0), user.body.GetWorldCenter());
            if (user.body.GetLinearVelocity().x < -MAX_SPEED || MAX_SPEED < user.body.GetLinearVelocity().x)
                user.body.SetLinearVelocity(prev);
        }
            
        if (user.tryJump && user.footCount > 0 && user.body.GetLinearVelocity().y === 0) {
            user.body.ApplyImpulse(new b2d.b2Vec2(0, -JUMP_POWER), user.body.GetWorldCenter());
        }

        user.tryJump = false;
    }
    world.Step(1.0 / FRAMERATE, 10);
        
    io.emit('move', makeUserList());
}

function addPlatform(sx, sy, ex, ey) {
    sx /= SCAILING;
    sy /= SCAILING;
    ex /= SCAILING;
    ey /= SCAILING;

    var box = new b2d.b2BodyDef();
    box.position.Set((sx + ex) * .5, (sy + ey) * .5);

    var body = world.CreateBody(box);

    var shape = new b2d.b2PolygonDef();
    shape.SetAsBox((ex - sx)*.5, (ey - sy)*.5);

    body.CreateShape(shape);
}

function createUser(id) {
    var i;
    
    // Create user information
    var user = {
        id: id,
        key: 0,
        tryJump: false,
        footCount: 0,
        deadFlag: false
    };
    
    user.bodyDef = new b2d.b2BodyDef();
    user.bodyDef.fixedRotation = true;
    user.bodyDef.position.Set(STAGE_WIDTH * Math.random() / SCAILING, (STAGE_HEIGHT - CHAR_HEIGHT) * Math.random() / SCAILING);
    // TODO Change random distribution
    
    user.body = world.CreateBody(user.bodyDef);
    
    user.shapeDef = new b2d.b2PolygonDef();
    user.shapeDef.SetAsBox(CHAR_WIDTH * .5 / SCAILING, CHAR_HEIGHT * .5 / SCAILING);
    user.shapeDef.density = 1.0;
    user.shapeDef.friction = 0;
    user.body.CreateShape(user.shapeDef);
    user.body.SetMassFromShapes();
    
    user.footSensor = new b2d.b2PolygonDef();
    user.footSensor.userData = user;
    user.footSensor.SetAsBox(CHAR_WIDTH * .4 / SCAILING, 1 / SCAILING);
    for (i = 0; i < 4; i++) {
        user.footSensor.vertices[i].y += CHAR_HEIGHT * .5 / SCAILING;
    }
    user.footSensor.isSensor = true;
    user.body.CreateShape(user.footSensor);

    userList[user.id] = user;

    return user;
}

function destroyUser(socket) {
    io.emit('dead', socket.id);
    world.DestroyBody(socket.user.body);
    socket.user = null;
    delete userList[socket.id];
}

worldType = 0;
initWorld();

io.on('connection', function (socket) {
    socket.broadcast.emit('login', socket.id);

    sockets[socket.id] = socket;

    if (worldType == 0) {
        // Waitroom, join right away
        socket.user = createUser(socket.id);
    } else {
        // Added to waitlist, wait for next game
    }
    
    socket.on('disconnect', function () {
        if (socket.user) {
            destroyUser(socket);
        }
        
        socket.broadcast.emit('logout', socket.id);
        delete sockets[socket.id];
    });
    
    socket.on('key', function (key) {
        if (socket.user) {
            if (key === 'left') {
                socket.user.key = 1;
            } else if (key === 'right') {
                socket.user.key = 2;
            } else if (key === 'up') {
                socket.user.key = 0;
            }
        }
    });
    
    socket.on('jump', function () {
        if (socket.user) {
            socket.user.tryJump = true;
        }
    });
});
