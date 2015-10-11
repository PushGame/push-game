var express = require('express');
var app = express();
var http = require('http').Server(app);
var uuid = require('uuid');
var b2d = require('box2d');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/game/game.html');
});

// static serve everything under game directory
app.use('/static', express.static(__dirname + '/static'));

var sockets = [];
var userList = [];

function makeUserList() {
    var i, arr = [], user;
    for (i = 0; i < userList.length; i++) {
        user = userList[i];
        arr.push({
            id: user.id,
            x: user.body.GetPosition().x,
            y: user.body.GetPosition().y
        });
    }

    return arr;
}

var io = require('socket.io')(http);
var port = process.env.port || 3000;

http.listen(port, function () {
    console.log('listening on *:' + port);
});

const FRAMERATE = 40;

const PLATFORM_OFFSET = 1;

const CHAR_WIDTH = 32;
const CHAR_HEIGHT = 48;
const SCAILING = 30;

const STAGE_WIDTH = 800;
const STAGE_HEIGHT = 600;

const JUMP_POWER = 20;
const GRAVITY = 15;
const SPEED = 1;
const MAX_SPEED = 10;

var worldAABB = new b2d.b2AABB();
worldAABB.lowerBound.Set(-STAGE_WIDTH / SCAILING, -STAGE_HEIGHT / SCAILING);
worldAABB.upperBound.Set(STAGE_WIDTH*2 / SCAILING, STAGE_HEIGHT*2 / SCAILING);

var gravity = new b2d.b2Vec2(0, GRAVITY);
var doSleep = true;
var world = new b2d.b2World(worldAABB, gravity, doSleep);

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

addPlatform(0, STAGE_HEIGHT, STAGE_WIDTH, STAGE_HEIGHT + 100);
addPlatform(-100, 0, 0, STAGE_HEIGHT);
addPlatform(STAGE_WIDTH, 0, STAGE_WIDTH + 100, STAGE_HEIGHT);

var worldContact = new b2d.b2ContactListener();
worldContact.Add = function (contact) {
    if (contact.shape1.GetUserData()) {
        contact.shape1.GetUserData().footCount++;
    }
    if (contact.shape2.GetUserData()) {
        contact.shape2.GetUserData().footCount++;
    }
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

io.on('connection', function (socket) {
    var i;

    // Create user information
    var user = {
        id: uuid.v1(),
        key: 0,
        tryJump: false,
        footCount: 0
    };
    
    user.bodyDef = new b2d.b2BodyDef();
    user.bodyDef.fixedRotation = true;
    user.bodyDef.position.Set(STAGE_WIDTH * Math.random() / SCAILING, (STAGE_HEIGHT - CHAR_HEIGHT) * Math.random() / SCAILING);
    
    user.body = world.CreateBody(user.bodyDef);
    
    user.shapeDef = new b2d.b2PolygonDef();
    user.shapeDef.SetAsBox(CHAR_WIDTH*.5 / SCAILING, CHAR_HEIGHT*.5 / SCAILING);
    user.shapeDef.density = 1.0;
    user.shapeDef.friction = 0;
    user.body.CreateShape(user.shapeDef);
    user.body.SetMassFromShapes();
    
    user.footSensor = new b2d.b2PolygonDef();
    user.footSensor.userData = user;
    user.footSensor.SetAsBox(CHAR_WIDTH * .3 / SCAILING, 1 / SCAILING);
    for (i = 0; i < 4; i++) {
        user.footSensor.vertices[i].y += CHAR_HEIGHT * .5 / SCAILING;
    }
    user.footSensor.isSensor = true;
    user.body.CreateShape(user.footSensor);
    
    // Send connection information
    socket.emit('login', {
        id: user.id,
        x: user.body.GetPosition().x * SCAILING,
        y: user.body.GetPosition().y * SCAILING,
        userList: makeUserList()
    });
    
    socket.broadcast.emit('new user', {
        id: user.id,
        x: user.body.GetPosition().x * SCAILING,
        y: user.body.GetPosition().y * SCAILING
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
    var i, user, impulse, prev;
    for (i = 0; i < userList.length; i++) {
        user = userList[i];
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

    for (i = 0; i < userList.length; i++) {
        io.emit('move', {
            id: userList[i].id,
            x: userList[i].body.GetPosition().x * SCAILING,
            y: userList[i].body.GetPosition().y * SCAILING
        });
    }
}, 1000 / FRAMERATE);
