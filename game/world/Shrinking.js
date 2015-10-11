var C = require('../world.js');
var addRect = require('../addRect.js');
var b2d = require('box2d');

var platform;
var start;

const TIME = 20000;

module.exports = {
    initWorld: function (world) {
        // Add shrinking platform
        platform = addRect(world,
            0, C.STAGE_HEIGHT - 120, C.STAGE_WIDTH,
            C.STAGE_HEIGHT - 100, 'platform'
        );
        hazard = addRect(world, 0, C.STAGE_HEIGHT - 5, C.STAGE_WIDTH, C.STAGE_HEIGHT, 'bullet');
        start = Date.now();
    },
    updateWorld: function (world, io) {
        if (platform) {
            world.DestroyBody(platform);
            platform = null;
        }
        if (Date.now() - start <= TIME) {
            var ratio = 1 - (Date.now() - start) / TIME; // 1 to 0
            platform = addRect(world,
                C.STAGE_WIDTH * (0.5 - ratio * 0.5), C.STAGE_HEIGHT - 120,
                C.STAGE_WIDTH * (0.5 + ratio * 0.5), C.STAGE_HEIGHT - 100,
                'platform'
            );
            io.emit('shrinking', ratio);
        } else {
            io.emit('shrinking', 0);
        }
    },
    destroyWorld: function (world) {
        if (platform) {
            world.DestroyBody(platform);
            platform = null;
        }
        if (hazard) {
            world.DestroyBody(hazard);
            hazard = null;
        }
    },
    onDie: C.WORLD.survival,
    spawn: function () {
        return new b2d.b2Vec2(
            C.STAGE_WIDTH * Math.random() / C.SCALING,
            400 * Math.random() / C.SCALING
        );
    }
};