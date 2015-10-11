var C = require('../world.js');
var addRect = require('../addRect.js');

var platform;

module.exports = {
    initWorld: function (world) {
        // Add shrinking platform
        platform = addRect(world, 0, 100, C.STAGE_WIDTH, 120, 'platform');
        hazard = addRect(world, 0, C.STAGE_HEIGHT - 5, C.STAGE_WIDTH, C.STAGE_HEIGHT, 'bullet');
    },
    updateWorld: function (world) {

    }
};