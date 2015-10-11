'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var b2d = require('box2d');

var C = require('./game/world.js');
var addRect = require('./game/addRect.js');
var worlds = [{}, require('./game/world/shrinking.js')];

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
            x: user.body.GetPosition().x * C.SCAILING,
            y: user.body.GetPosition().y * C.SCAILING
        });
    }

    return arr;
}

var worldAABB = new b2d.b2AABB();
worldAABB.lowerBound.Set(-C.STAGE_WIDTH / C.SCAILING, -C.STAGE_HEIGHT / C.SCAILING);
worldAABB.upperBound.Set(C.STAGE_WIDTH*2 / C.SCAILING, C.STAGE_HEIGHT*2 / C.SCAILING);

var gravity = new b2d.b2Vec2(0, C.GRAVITY);
var doSleep = true;
var world;
var updateInterval;

var worldType;

function initWorld() {
    world = new b2d.b2World(worldAABB, gravity, doSleep);
    
    addRect(world, 0, C.STAGE_HEIGHT, C.STAGE_WIDTH, C.STAGE_HEIGHT + 100, 'platform');
    addRect(world, -100, 0, 0, C.STAGE_HEIGHT, 'platform');
    addRect(world, C.STAGE_WIDTH, 0, C.STAGE_WIDTH + 100, C.STAGE_HEIGHT, 'platform');
    
    // Foot Sensor manipulation
    var worldContact = new b2d.b2ContactListener();
    worldContact.Add = function (contact) {
        var s1 = contact.shape1.GetUserData();
        var s2 = contact.shape2.GetUserData();
        if (s1.type === 'sensor') {
            s1.user.footCount++;
        }
        if (s2.type === 'sensor') {
            s2.user.footCount++;
        }

        //Handle Contact
        if (s1.type === 'bullet' && s2.type === 'body') {
            destroyUser(sockets[s2.user.id]);
        }
        if (s1.type === 'body' && s2.type === 'bullet') {
            destroyUser(sockets[s1.user.id]);
        }
    };
    worldContact.Remove = function (contact) {
        var s1 = contact.shape1.GetUserData();
        var s2 = contact.shape2.GetUserData();
        if (s1.type === 'sensor') {
            s1.user.footCount--;
        }
        if (s2.type === 'sensor') {
            s2.user.footCount--;
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

    //World Customize with WorldType
    if (worlds[worldType].initWorld)
        worlds[worldType].initWorld(world);

    updateInterval = setInterval(updateWorld, 1000 / C.FRAMERATE);
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
            impulse = -C.SPEED;
        } else if (user.key === 2) {
            impulse = C.SPEED;
        }
            
        if (user.key == 0) {
            user.body.GetLinearVelocity().x *= 0.95;
        } else {
            prev = user.body.GetLinearVelocity().Copy();
            user.body.ApplyImpulse(new b2d.b2Vec2(impulse, 0), user.body.GetWorldCenter());
            if (user.body.GetLinearVelocity().x < -C.MAX_SPEED || C.MAX_SPEED < user.body.GetLinearVelocity().x)
                user.body.SetLinearVelocity(prev);
        }
            
        if (user.tryJump && user.footCount > 0 && user.body.GetLinearVelocity().y === 0) {
            user.body.ApplyImpulse(new b2d.b2Vec2(0, -C.JUMP_POWER), user.body.GetWorldCenter());
        }

        user.tryJump = false;
    }
    
    if (worlds[worldType].updateWorld)
        worlds[worldType].updateWorld(world);

    world.Step(1.0 / C.FRAMERATE, 10);
        
    io.emit('move', makeUserList());
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
    user.bodyDef.position.Set(
        C.STAGE_WIDTH * Math.random() / C.SCAILING,
        (C.STAGE_HEIGHT - C.CHAR_HEIGHT) * Math.random() / C.SCAILING
    );
    // TODO Change random distribution
    
    user.body = world.CreateBody(user.bodyDef);
    
    user.shapeDef = new b2d.b2PolygonDef();
    user.shapeDef.SetAsBox(C.CHAR_WIDTH * .5 / C.SCAILING, C.CHAR_HEIGHT * .5 / C.SCAILING);
    user.shapeDef.density = 1.0;
    user.shapeDef.friction = 0;
    user.shapeDef.userData = {
        type: 'body',
        user: user
    };
    user.body.CreateShape(user.shapeDef);
    user.body.SetMassFromShapes();
    
    user.footSensor = new b2d.b2PolygonDef();
    user.footSensor.userData = {
        type: 'sensor',
        user: user
    };
    user.footSensor.SetAsBox(C.CHAR_WIDTH * .4 / C.SCAILING, 1 / C.SCAILING);
    for (i = 0; i < 4; i++) {
        user.footSensor.vertices[i].y += C.CHAR_HEIGHT * .5 / C.SCAILING;
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
