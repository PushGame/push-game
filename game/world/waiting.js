var C = require('../world.js');
var addRect = require('../addRect.js');
var timer;

const MIN_USER = 2;
const TIMEOUT = 5000;

module.exports = {
    initWorld: function (world) {
    },
    updateWorld: function (world, io) {
        if (timer) {
            var second = Math.ceil((TIMEOUT - (Date.now() - timer)) / 1000);
            io.emit('waiting countdown', second);
            if (second == 0) {
                timer = null;
                var nextWorld = [C.WORLD.SHRINKING, C.WORLD.STAR];
                C.nextWorld = nextWorld[Math.floor(Math.random() * nextWorld.length)];
            }
        } else {
            io.emit('waiting countdown', -1);
        }
    },
    onBorn: function (userList, userCount) {
        if (userCount == MIN_USER) {
            timer = Date.now();
        }
    },
    onDie: function (userList, userCount) {
        if (userCount < MIN_USER) {
            timer = null;
        }
    }
};