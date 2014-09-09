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
var SpiralOutGenerator = {
    memoryCanvas: [],
    usedColours:[],
    width:0,
    height:0,
    defaultValue:{'r':0,'g':0,'b':0},
    lastPosition:null,
    lastDirection:'',

    init: function(canvas, defaultValue) {
        if (typeof(defaultValue) != 'undefined') {
            this.defaultValue = defaultValue;
        }
        this.width = canvas.width;
        this.height = canvas.height;

        for (var i = 0; i < this.width; i++) {
            var row = [];
            for (var j = 0; j < this.height; j++) {
                row.push(null);
            }
            this.memoryCanvas.push(row);
        }

        var x = Math.floor(this.width / 2);
        var y = Math.floor(this.height / 2);
        this.lastPosition = {'x':x, 'y':y};
        this.lastDirection = 'n';
    },

    pixelsRemaining: function() {
        return ((this.width * this.height) - this.usedColours.length) > 0;
    },

    average: function(values) {
        var sum = values.reduceRight(function(x, total) {
            return total + x;
        }, 0);

        return Math.ceil(sum / values.length);
    },

    _getSurroundingColours: function(i, j) {
        var grid = [];

        var previousI = i - 1 < 0 ? 0 : i - 1;
        var previousJ = j - 1 < 0 ? 0 : j - 1;
        var maxI = i + 1 >= this.width ? this.width -1 : i + 1;
        var maxJ = j + 1 >= this.height ? this.height -1 : j + 1;
        for (var x = previousI; x <= maxI; x++) {
            for (var y = previousJ; y <= maxJ; y++) {
                if (this.memoryCanvas[x][y] !== null) {
                    grid.push(this.memoryCanvas[x][y]);
                }
            }
        }

        return grid;
    },

    colourValue: function(colours) {
        var x = 0;
        if (colours.length > 0) {
            x = this.average(colours);
        } else {
            x = Math.random() * 256;
        }

        return Math.floor(x);
    },

    generate: function(i, j) {

        // surroundingSquares is an n x n grid (min n = 2, max n = 3)
        var surroundingSquares = this._getSurroundingColours(i, j);
        var reds = [];
        var greens = [];
        var blues = [];
        for (var i = 0; i < surroundingSquares.length; i++) {
            var colour = surroundingSquares[i];
            reds.push(colour.r);
            greens.push(colour.g);
            blues.push(colour.b);
        }

        var redAvg = this.colourValue(reds);
        var greenAvg = this.colourValue(greens);
        var blueAvg = this.colourValue(blues);

        var potential = new Point(redAvg, greenAvg, blueAvg, 1);

        var possible = potential.hash();

        if (this.usedColours.indexOf(possible) >= 0) {
            // Already used this colour
            var found = false;
            var radiusStep = 1;
            var minDist = 1;

            while (!found) {
                // Red, Green and Blue all at maximum radius distance.
                var maxDist = Math.sqrt(3 * (radiusStep * radiusStep));
                var minRed = redAvg - radiusStep;
                if (minRed < 0) {
                    minRed = 0;
                }
                var minGreen = greenAvg - radiusStep;
                if (minGreen < 0) {
                    minGreen = 0;
                }
                var minBlue = blueAvg - radiusStep;
                if (minBlue < 0) {
                    minBlue = 0;
                }
                var maxRed = redAvg + radiusStep;
                if (maxRed > 255) {
                    maxRed = 255;
                }
                var maxGreen = greenAvg + radiusStep;
                if (maxGreen > 255) {
                    maxGreen = 255;
                }
                var maxBlue = blueAvg + radiusStep;
                if (maxBlue > 255) {
                    maxBlue = 255;
                }

                for (var i = minRed; i <= maxRed; i++) {
                    for (var j = minGreen; j <= maxGreen; j++) {
                        for (var k = minBlue; k <= maxBlue; k++) {
                            var distance = this.distance(i, j, k, redAvg, greenAvg, blueAvg);
                            if (distance <= maxDist && distance > minDist) {
                                potential.r = i;
                                potential.g = j;
                                potential.b = k;
                                possible = potential.hash();
                                if (this.usedColours.indexOf(possible) < 0) {
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found) {
                            break;
                        }
                    }
                    if (found) {
                        break;
                    }
                }
                if (found === false) {
                    minDist = maxDist;
                    radiusStep++;
                }
            }
        }

        return potential;
    },

    distance: function(r, g, b, ravg, gavg, bavg) {
        var rdist = ravg - r;
        var gdist = gavg - g;
        var bdist = bavg - b;

        return Math.sqrt((rdist * rdist) + (gdist * gdist) + (bdist * bdist));
    },

    record: function(i, j, colour) {
        this.usedColours.push(colour.hash());
        this.memoryCanvas[i][j] = colour;
    },

    move: function() {
        var position = {};
        if (this.pixelsRemaining() === true) {
            var x = this.lastPosition.x;
            var y = this.lastPosition.y;

            // Do we have a direction?
            if (this.lastDirection !== '') {
                // Do we have to maintain the direction, or can we turn a corner?
                switch(this.lastDirection) {
                    case 'n':
                        // We'd like to go east if at all possible
                        // Else, continue north.
                        if ((x + 1 < this.width) && this._check(x + 1, y)) {
                            position = {'x':x + 1, 'y':y};
                            this.lastDirection = 'e';
                        } else if ((y - 1 >= 0) && this._check(x, y - 1)) {
                            position = {'x':x, 'y':y - 1};
                            this.lastDirection = 'n';
                        }
                        break;
                    case 'e':
                        // We'd like to go south if at all possible
                        // Else, continue east
                        if ((y + 1 < this.height) && this._check(x, y + 1)) {
                            position = {'x': x, 'y': y + 1};
                            this.lastDirection = 's';
                        } else if ((x + 1 < this.width) && this._check(x + 1, y)) {
                            position = {'x':x + 1, 'y': y};
                            this.lastDirection = 'e';
                        }
                        break;
                    case 's':
                        // We'd like to go west if at all possible
                        // Else continue south
                        if ((x - 1 >= 0) && this._check(x - 1, y)) {
                            this.lastDirection = 'w';
                            position = {'x':x - 1, 'y':y};
                        } else if ((y + 1 < this.height) && this._check(x, y + 1)) {
                            this.lastDirection = 's';
                            position = {'x':x, 'y':y + 1};
                        }
                        break;
                    case 'w':
                        // We'd like to go north if at all possible
                        // Else continue west
                        if ((y - 1 >= 0) && this._check(x, y - 1)) {
                            position = {'x':x, 'y':y - 1};
                            this.lastDirection = 'n';
                        } else if ((x - 1 >= 0) && this._check(x - 1, y)) {
                            position = {'x':x - 1, 'y':y};
                            this.lastDirection = 'w';
                        }
                        break;
                }
            }

            // It's possible that we won't be able to spiral the way we'd like.
            // This is easiest to visualise with a rectangle of sides n, m where
            // n << m
            // In these situations we'll skip over the area that's in use
            // until we find a point we can fill in.
            while (position.hasOwnProperty('x') === false) {
                var found = false;
                switch (this.lastDirection) {
                    case 'n':
                        // We'd like to go east if possible
                        for (var i = this.lastPosition.x; i < this.width; i++) {
                            if (this._check(i, this.lastPosition.y)) {
                                position = {'x':i, 'y':this.lastPosition.y};
                                found = true;
                                break;
                            }
                        }
                        // There weren't any missing points going east, so
                        // instead say we went east as far as possible and look
                        // again.
                        if (found === false) {
                            this.lastPosition = {
                                'x':this.width - 1,
                                'y':this.lastPosition.y
                            };
                            this.lastDirection = 'e';
                        }
                        break;
                    case 'e':
                        // We'd like to go south if possible.
                        for (var i = this.lastPosition.y; i < this.height; i++) {
                            if (this._check(this.lastPosition.x, i)) {
                                position = {'x':this.lastPosition.x, 'y':i};
                                found = true;
                                break;
                            }
                        }
                        if (found === false) {
                            this.lastPosition = {
                                'x':this.width - 1,
                                'y':this.height - 1
                            };
                            this.lastDirection = 's';
                        }
                        break;
                    case 's':
                        // We'd like to go west if possible.
                        for (var i = this.lastPosition.x; i >= 0; i--) {
                            if (this._check(i, this.lastPosition.y)) {
                                position = {'x':i, 'y':this.lastPosition.y};
                                found = true;
                                break;
                            }
                        }
                        if (found === false) {
                            this.lastPosition = {
                                'x':0,
                                'y':this.height - 1
                            };
                            this.lastDirection = 'w';
                        }
                        break;
                    case 'w':
                        // We'd like to go north if possible.
                        for (var i = this.lastPosition.y; i >= 0; i--) {
                            if (this._check(this.lastPosition.x, i)) {
                                position = {'x':this.lastPosition.x, 'y':i};
                                found = true;
                                break;
                            }
                        }
                        if (found === false) {
                            this.lastPosition = {
                                'x':0,
                                'y':0
                            };
                            this.lastDirection = 'n';
                        }
                        break;
                }
            }
            this.lastPosition = position;
        }

        return position;
    },

    _check: function(x, y) {
        return (this.memoryCanvas[x][y] === null);
    }
}

self.addEventListener('message', function(e) {
    var data = e.data;
    var canvas = data.canvas;
    var width = canvas.width;
    var height = canvas.height;
    var defaultValue = data.default;
    SpiralOutGenerator.init(canvas, defaultValue);

    var i = 0;
    var coordinates = SpiralOutGenerator.lastPosition;
    while (SpiralOutGenerator.pixelsRemaining() === true) {
        var colour = SpiralOutGenerator.generate(coordinates.x, coordinates.y);

        self.postMessage({
            'running': true,
            'colour':colour.toSimpleObject(),
            'coordinates':coordinates,
            'rowComplete':(i % height === 0)
        });
        SpiralOutGenerator.record(coordinates.x, coordinates.y, colour);
        coordinates = SpiralOutGenerator.move();
        i++;
    }

    // Tidy up the worker thread
    self.postMessage({'running':false});
    self.close();
}, false);
