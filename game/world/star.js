var C = require('../world.js');
var addRect = require('../addRect.js');
var b2d = require('box2d');

var start;

const MAX_DIFFICULTY = 30000;

var starList = [];

function createStar(world) {
    var starBodyDef = new b2d.b2BodyDef();
    starBodyDef.fixedRotation = true;
    starBodyDef.position.Set(
        C.STAGE_WIDTH * Math.random() / C.SCALING,
        -30 / C.SCALING
    );

    var starBody = world.CreateBody(starBodyDef);
    var shapeDef = new b2d.b2CircleDef();
    shapeDef.radius = 10 / C.SCALING;
    shapeDef.density = 1.0;
    shapeDef.isSensor = true;
    shapeDef.userData = {
        type: 'star',
        body: starBody
    };
    
    starBody.CreateShape(shapeDef);
    starBody.GetLinearVelocity().y = 1 + 3 * Math.random();
    starBody.SetMassFromShapes();

    starList.push(starBody);
}

module.exports = {
    initWorld: function (world) {
        start = Date.now();
    },
    updateWorld: function (world, io) {
        var timeDelta = Date.now() - start;
        var ratio = timeDelta / MAX_DIFFICULTY > 1 ? 1 : timeDelta / MAX_DIFFICULTY;
        
        if (Math.random() < 0.05 + 0.3 * ratio) {
            createStar(world);
        }

        var i, stars = [];
        for (i = 0; i < starList.length; i++) {
            if (starList[i].GetPosition().y > (C.STAGE_HEIGHT + 30) / C.SCALING) {
                world.DestroyBody(starList[i]);
                starList[i] = starList[starList.length - 1];
                starList.length--;
                i--;
            } else {
                stars.push({
                    x: starList[i].GetPosition().x * C.SCALING,
                    y: starList[i].GetPosition().y * C.SCALING
                });
            }
        }

        io.emit('star', stars);
    },
    destroyWorld: function (world) {
        var i;
        for (i = 0; i < starList.length; i++) {
            world.DestroyBody(starList[i]);
        }
        starList = [];
    },
    onDie: C.WORLD.survival,
    spawn: function () {
        return new b2d.b2Vec2(
            C.STAGE_WIDTH * Math.random() / C.SCALING,
            (300 + 200 * Math.random()) / C.SCALING
        );
    }
};