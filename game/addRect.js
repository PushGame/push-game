﻿var C = require('./world.js');
var b2d = require('box2d');

module.exports = function (world, sx, sy, ex, ey, type) {
    sx /= C.SCALING;
    sy /= C.SCALING;
    ex /= C.SCALING;
    ey /= C.SCALING;
    
    var box = new b2d.b2BodyDef();
    box.position.Set((sx + ex) * .5, (sy + ey) * .5);
    
    var body = world.CreateBody(box);
    
    var shape = new b2d.b2PolygonDef();
    shape.userData = {
        type: type
    };
    shape.SetAsBox((ex - sx) * .5, (ey - sy) * .5);
    
    body.CreateShape(shape);

    return body;
}
