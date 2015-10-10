var express = require('express');
var app = express();
var http = require('http').Server(app);
var uuid = require('uuid');

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/game/game.html');
});

// static serve everything under game directory
app.use('/static', express.static(__dirname + '/static'));

var sockets = [];
var userList = [];

var io = require('socket.io')(http);

http.listen(3000, function () {
    console.log('listening on *:3000');
});

io.on('connection', function (socket) {
    // Create user information
    var user = {
        id: uuid.v1(),
        x: 800 * Math.random(),
        y: 600 * Math.random()
    };
    
    // Send connection information
    socket.emit('connect', {
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

    socket.on('move', function (data) {
        socket.user.x = data.x;
        socket.user.y = data.y;

        socket.broadcast.emit('move', socket.user);
    });
});

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
