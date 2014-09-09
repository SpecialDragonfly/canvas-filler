"use strict";
function Point(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;

    this.hash = function() {
        return btoa('r' + this.r + 'g' + this.g + 'b' + this.b);
    };
    this.toSimpleObject = function() {
        return {
            'r':this.r,
            'g':this.g,
            'b':this.b,
            'a':this.a
        };
    };
}

// Singleton generator
var IterativeGenerator = {
    usedColours:[],
    defaultValue:null,
    previousValue:undefined,

    init: function(defaultValue) {
        if (typeof(defaultValue) != 'undefined') {
            this.defaultValue = defaultValue;
        }
    },

    generate: function() {
        var potential = new Point(
            this.defaultValue.r, this.defaultValue.g, this.defaultValue.b, this.defaultValue.a
        );
        if (typeof(this.previousValue) !== "undefined") {
            // This obviously isn't a potential option, but used to
            // have a baseline to increment from
            potential = this.previousValue;
        } else {
            // No previousValue has been defined - so we create one.
            // It's also not in the list of used colours, so it'll
            // go straight through.
            this.previousValue = potential;
        }

        var possible = potential.hash();

        while (this.usedColours.indexOf(possible) >= 0) {
            potential.r = potential.r + 1;
            if (potential.r > 255) {
                potential.r = 0;
                potential.g = potential.g + 1;
                if (potential.g > 255) {
                    potential.g = 0;
                    potential.b = potential.b + 1;
                }
            }
            possible = potential.hash();
        }

        this.previousValue = potential;

        return potential;
    },

    record: function(colour) {
        this.usedColours.push(colour.hash());
    }
}

self.addEventListener('message', function(e) {
    var data = e.data;
    var canvas = data.canvas;
    var width = canvas.width;
    var height = canvas.height;
    var defaultValue = data.default;
    IterativeGenerator.init(defaultValue);
    for (var i = 0; i < width; i++) {
        for (var j = 0; j < height; j++) {
            var colour = IterativeGenerator.generate();
            IterativeGenerator.record(colour);
            self.postMessage({
                'running': true,
                'colour':colour.toSimpleObject(),
                'coordinates':{'x':i, 'y':j},
                'rowComplete':(j + 1 == height)
            });
        }
    }
    // Tidy up the worker thread
    self.postMessage({'running':false});
    self.close();
}, false);
