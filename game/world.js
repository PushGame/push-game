module.exports = {
    nextWorld: null,
    enabled: true,

    FRAMERATE: 40,
    
    CHAR_WIDTH: 26,
    CHAR_HEIGHT: 48,
    SCALING: 30,
    
    STAGE_WIDTH: 800,
    STAGE_HEIGHT: 600,
    
    JUMP_POWER: 20,
    GRAVITY: 20,
    SPEED: 1,
    MAX_SPEED: 10,

    WORLD: {
        WAITING: 'waiting',
        SHRINKING: 'shrinking',
        STAR: 'star',
        survival: function (userList, userCount) {
            var C = module.exports;
            if (userCount == 1) {
                C.enabled = false;
                setTimeout(function () {
                    C.nextWorld = C.WORLD.WAITING;
                }, 3000);
            }
        }
    }
};