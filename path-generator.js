function Point(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;

    this.componentToHex = function(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
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
var PathGenerator = {
    memoryCanvas: [],
    usedColours:[],
    width:0,
    height:0,
    defaultValue:{'r':0,'g':0,'b':0},
    lastPosition:null,

    init: function(canvas, defaultValue) {
        if (typeof(defaultValue) != 'undefined') {
            this.defaultValue = defaultValue;
        }
        this.width = canvas.width;
        this.height = canvas.height;

        for (var i = 0; i < this.width; i++) {
            var row = [];
            for (var j = 0; j < this.height; j++) {
                row.push(
                    new Point(
                        this.defaultValue.r,
                        this.defaultValue.g,
                        this.defaultValue.b,
                        this.defaultValue.a
                    )
                );
            }
            this.memoryCanvas.push(row);
        }

        var x = Math.floor(Math.random() * this.width);
        var y = Math.floor(Math.random() * this.height);
        this.lastPosition = {'x':x, 'y':y};
    },

    pixelsRemaining: function() {
        return ((this.width * this.height) - this.usedColours.length) > 0;
    },

    average: function(values) {
        var sum = values.reduceRight(function(x, total) {
            return total + x;
        }, 0);

        return Math.ceil(sum/values.length);
    },

    _getSurroundingColours: function(i, j) {
        var grid = [];

        var previousI = i - 1 < 0 ? 0 : i - 1;
        var previousJ = j - 1 < 0 ? 0 : j - 1;
        var maxI = i + 1 >= this.width ? this.width -1 : i + 1;
        var maxJ = j + 1 >= this.height ? this.height -1 : j + 1;
        for (var x = previousI; x <= maxI; x++) {
            var row = [];
            for (var y = previousJ; y <= maxJ; y++) {
                row.push(this.memoryCanvas[x][y]);
            }
            grid.push(row);
        }

        return grid;
    },

    generate: function(i, j) {

        // surroundingSquares is an n x n grid (min n = 2, max n = 3)
        var surroundingSquares = this._getSurroundingColours(i, j);
        var reds = [];
        var greens = [];
        var blues = [];
        for (var i = 0; i < surroundingSquares.length; i++) {
            var row = surroundingSquares[i];
            for (var j = 0; j < row.length; j++) {
                var colour = row[j];
                if (!(colour.a === this.defaultValue.a &&
                    colour.r === this.defaultValue.r &&
                    colour.g === this.defaultValue.g &&
                    colour.b === this.defaultValue.b
                )) {
                    reds.push(colour.r);
                    greens.push(colour.g);
                    blues.push(colour.b);
                }
            }
        }

        var redAvg = Math.floor(Math.random() * 256);
        if (reds.length > 0) {
            redAvg = Math.floor(this.average(reds));
        }

        var greenAvg = Math.floor(Math.random() * 256);
        if (greens.length > 0) {
            greenAvg = Math.floor(this.average(greens));
        }

        var blueAvg = Math.floor(Math.random() * 256);
        if (blues.length > 0) {
            blueAvg = Math.floor(this.average(blues));
        }

        var potential = new Point(redAvg, greenAvg, blueAvg, 1);

        var possible = potential.hash();

        if (this.usedColours.indexOf(possible) >= 0) {
            // Already used this colour
            found = false;
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

                for (i = minRed; i <= maxRed; i++) {
                    for (j = minGreen; j <= maxGreen; j++) {
                        for (k = minBlue; k <= maxBlue; k++) {
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
        if (this.pixelsRemaining() === true) {
            var options = [];
            var x = this.lastPosition.x;
            var y = this.lastPosition.y;

            while (options.length === 0) {
                if ((x - 1 >= 0) && this._check(x - 1, y)) {
                    options.push({'x':x - 1, 'y':y});
                }
                if ((y - 1 >= 0) && this._check(x, y - 1)) {
                    options.push({'x':x, 'y':y - 1});
                }
                if ((x + 1 < this.width) && this._check(x + 1, y)) {
                    options.push({'x':x + 1, 'y': y});
                }
                if ((y + 1 < this.height) && this._check(x, y + 1)) {
                    options.push({'x':x, 'y':y + 1});
                }
                if (options.length === 0) {
                    x = Math.floor(Math.random() * this.width);
                    y = Math.floor(Math.random() * this.height);
                    if (this._check(x, y)) {
                        options.push({'x':x, 'y':y});
                    }
                }
            }
            var position = options[Math.floor(Math.random() * options.length)];

            this.lastPosition = position;
        }
        return position;
    },

    _check: function(x, y) {
        var point = this.memoryCanvas[x][y];
        return (point.r === this.defaultValue.r &&
            point.g === this.defaultValue.g &&
            point.b === this.defaultValue.b &&
            point.a === this.defaultValue.a
        );
    }
}

self.addEventListener('message', function(e) {
    var data = e.data;
    var canvas = data.canvas;
    var width = canvas.width;
    var height = canvas.height;
    var defaultValue = data.default;
    PathGenerator.init(canvas, defaultValue);

    var i = 0;
    var coordinates = PathGenerator.lastPosition;
    while (PathGenerator.pixelsRemaining() === true) {
        var colour = PathGenerator.generate(coordinates.x, coordinates.y);

        self.postMessage({
            'running': true,
            'colour':colour.toSimpleObject(),
            'coordinates':coordinates,
            'rowComplete':(i % height === 0)
        });
        PathGenerator.record(coordinates.x, coordinates.y, colour);
        coordinates = PathGenerator.move();
        i++;
    }

    // Tidy up the worker thread
    self.postMessage({'running':false});
    self.close();
}, false);
