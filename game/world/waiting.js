var C = require('../world.js');
var addRect = require('../addRect.js');
var timer;

const MIN_USER = 3;
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
                C.nextWorld = C.WORLD.SHRINKING;
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