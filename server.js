'use strict';

var express = require('express');
var app = express();
var http = require('http').Server(app);
var b2d = require('box2d');

var C = require('./game/world.js');
var addRect = require('./game/addRect.js');

var worlds = {};
worlds[C.WORLD.WAITING] = require('./game/world/waiting.js');
worlds[C.WORLD.SHRINKING] = require('./game/world/shrinking.js');

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
var userCount = 0;

function makeUserList() {
    var id, arr = [], user;
    for (id in userList) {
        user = userList[id];
        arr.push({
            id: user.id,
            x: user.body.GetPosition().x * C.SCALING,
            y: user.body.GetPosition().y * C.SCALING
        });
    }

    return arr;
}

var worldAABB = new b2d.b2AABB();
worldAABB.lowerBound.Set(-C.STAGE_WIDTH / C.SCALING, -C.STAGE_HEIGHT / C.SCALING);
worldAABB.upperBound.Set(C.STAGE_WIDTH*2 / C.SCALING, C.STAGE_HEIGHT*2 / C.SCALING);

var gravity = new b2d.b2Vec2(0, C.GRAVITY);
var doSleep = true;
var world;
var updateInterval;

var worldType;

function initWorld() {
    world = new b2d.b2World(worldAABB, gravity, doSleep);
    
    addRect(world, 0, C.STAGE_HEIGHT, C.STAGE_WIDTH, C.STAGE_HEIGHT + 100, 'platform');
    addRect(world, -100, 0, 0, C.STAGE_HEIGHT, 'wall');
    addRect(world, C.STAGE_WIDTH, 0, C.STAGE_WIDTH + 100, C.STAGE_HEIGHT, 'wall');
    
    // Foot Sensor manipulation
    var worldContact = new b2d.b2ContactListener();
    worldContact.Add = function (contact) {
        var s1 = contact.shape1.GetUserData();
        var s2 = contact.shape2.GetUserData();
        if (s1.type === 'sensor' && s2.type !== 'wall') {
            s1.user.footCount++;
        }
        if (s2.type === 'sensor' && s1.type !== 'wall') {
            s2.user.footCount++;
        }

        //Handle Contact
        if (s1.type === 'bullet' && s2.type === 'body') {
            destroyUser(sockets[s2.user.id]);
        }
        if (s1.type === 'body' && s2.type === 'bullet') {
            destroyUser(sockets[s1.user.id]);
        }
        
        if (s1.type === 'bullet' && s2.type === 'platform') {
            destroyUser(sockets[s2.user.id]);
        }
        if (s1.type === 'platform' && s2.type === 'bullet') {
            destroyUser(sockets[s1.user.id]);
        }
    };
    worldContact.Remove = function (contact) {
        var s1 = contact.shape1.GetUserData();
        var s2 = contact.shape2.GetUserData();
        if (s1.type === 'sensor' && s2.type !== 'wall') {
            s1.user.footCount--;
        }
        if (s2.type === 'sensor' && s1.type !== 'wall') {
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

function destroyWorld() {
    //Destory active users
    var id;
    for (id in sockets) {
        destroyUser(sockets[id]);
    }

    clearInterval(updateInterval);
    updateInterval = null;
}

function updateWorld() {
    if (C.nextWorld != null) {
        destroyWorld();
        worldType = C.nextWorld;
        C.nextWorld = null;
        C.enabled = true;
        initWorld();
    } else if (C.enabled) {
        var id, user, impulse, prev;
        for (id in userList) {
            user = userList[id];
            
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
            worlds[worldType].updateWorld(world, io);
        
        world.Step(1.0 / C.FRAMERATE, 10);
        
        io.emit('move', makeUserList());
    }
}

function createUser(id) {
    var i;
    
    // Create user information
    var user = {
        id: id,
        key: 0,
        tryJump: false,
        footCount: 0
    };
    
    user.bodyDef = new b2d.b2BodyDef();
    user.bodyDef.fixedRotation = true;
    if (worlds[worldType].spawn)
        user.bodyDef.position = worlds[worldType].spawn();
    else
       user.bodyDef.position.Set(
            C.STAGE_WIDTH * Math.random() / C.SCALING,
            (C.STAGE_HEIGHT - C.CHAR_HEIGHT) * Math.random() / C.SCALING
        );
    
    user.body = world.CreateBody(user.bodyDef);
    
    user.shapeDef = new b2d.b2PolygonDef();
    user.shapeDef.SetAsBox(C.CHAR_WIDTH * .5 / C.SCALING, C.CHAR_HEIGHT * .5 / C.SCALING);
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
    user.footSensor.SetAsBox(C.CHAR_WIDTH * .5 / C.SCALING, 1 / C.SCALING);
    for (i = 0; i < 4; i++) {
        user.footSensor.vertices[i].y += C.CHAR_HEIGHT * .5 / C.SCALING;
    }
    user.footSensor.isSensor = true;
    user.body.CreateShape(user.footSensor);

    userList[user.id] = user;
    
    userCount++;
    if (worlds[worldType].onBorn)
        worlds[worldType].onBorn(userList, userCount);

    return user;
}

function destroyUser(socket) {
    if (socket.user) {
        io.emit('dead', socket.id);
        world.DestroyBody(socket.user.body);
        socket.user = null;
        delete userList[socket.id];
        
        userCount--;
        if (worlds[worldType].onDie)
            worlds[worldType].onDie(userList, userCount);
    }
}

worldType = C.WORLD.WAITING;
initWorld();

io.on('connection', function (socket) {
    socket.emit('world', worldType);
    socket.broadcast.emit('login', socket.id);

    sockets[socket.id] = socket;

    if (worldType === C.WORLD.WAITING) {
        // Waitroom, join right away
        socket.user = createUser(socket.id);
    }
    // Ohterwise added to waitlist, wait for next game
    
    socket.on('disconnect', function () {
        destroyUser(socket);
        
        socket.broadcast.emit('logout', socket.id);
        delete sockets[socket.id];
        
        if (worlds[worldType].onDisconnect)
            worlds[worldType].onDisconnect(sockets);
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
