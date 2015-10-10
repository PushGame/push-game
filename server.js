var express = require('express');
var app = express();
var http = require('http').Server(app);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/game/game.html');
});

// static serve everything under game directory
app.use('/static', express.static(__dirname + '/static'));

var io = require('socket.io')(http);

http.listen(3000, function () {
    console.log('listening on *:3000');
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
