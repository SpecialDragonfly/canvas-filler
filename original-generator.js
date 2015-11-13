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
var OriginalGenerator = {
    memoryCanvas: [],
    width:0,
    height:0,
    defaultValue:{'r':0,'g':0,'b':0},
    colourArray:[],

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
        for (var r = 0; r < 256; r++) {
            var row = [];
            for (var g = 0; g < 256; g++) {
                var column = []
                for (var b = 0; b < 256; b++) {
                    column.push(true);
                }
                row.push(column);
            }
            this.colourArray.push(row);
        }
    },

    average: function(values) {
        // Unrolled loop turned out to be the fastest way to sum an array.
        // https://jsperf.com/array-summing-loop-vs-eval/10
        var sum = 0;
        var len = values.length;
        var n = Math.floor(len / 8);
        for (var i = 0; i < n; ++i) {
            var base = i * 8;
            sum += values[base];
            sum += values[base + 1];
            sum += values[base + 2];
            sum += values[base + 3];
            sum += values[base + 4];
            sum += values[base + 5];
            sum += values[base + 6];
            sum += values[base + 7];
        }
        for (var i = n*8; i < len; ++i) {
            sum += values[i];
        }

        return Math.ceil(sum / len);
    },

    _getSurroundingColours: function(i, j) {
        var grid = [];

        var previousI = i - 1 < 0 ? 0 : i - 1;
        var previousJ = j - 1 < 0 ? 0 : j - 1;
        var maxI = i + 1 >= this.width ? this.width - 1 : i + 1;
        var maxJ = j + 1 >= this.height ? this.height - 1 : j + 1;
        for (var x = previousI; x <= maxI; x++) {
            for (var y = previousJ; y <= maxJ; y++) {
                if (this.memoryCanvas[x][y] !== null) {
                    grid.push(this.memoryCanvas[x][y]);
                }
            }
        }

        return grid;
    },

    generate: function(i, j) {

        // surroundingSquares is an n x n grid (min n = 2x2, max n = 3x3)
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

        var redAvg = 0;
        if (reds.length > 0) {
            redAvg = this.average(reds);
        } else {
            redAvg = Math.random() * 256;
        }
        redAvg = Math.floor(redAvg);

        var greenAvg = 0;
        if (greens.length > 0) {
            greenAvg = this.average(greens);
        } else {
            greenAvg = Math.random() * 256;
        }
        greenAvg = Math.floor(greenAvg);

        var blueAvg = 0;
        if (blues.length > 0) {
            blueAvg = this.average(blues);
        } else {
            blueAvg = Math.random() * 256;
        }
        blueAvg = Math.floor(blueAvg);

        var potential = new Point(redAvg, greenAvg, blueAvg, 1);

        if (this.colourArray[redAvg][greenAvg][blueAvg] === false) {
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
                            if (distance <= maxDist && distance > minDist && this.colourArray[i][j][k] === true) {
                                potential.r = i;
                                potential.g = j;
                                potential.b = k;
                                found = true;
                                break;
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
        this.colourArray[colour.r][colour.g][colour.b] = false;
        this.memoryCanvas[i][j] = colour;
    }
}

self.addEventListener('message', function(e) {
    var data = e.data;
    var canvas = data.canvas;
    var width = canvas.width;
    var height = canvas.height;
    var defaultValue = data.default;
    OriginalGenerator.init(canvas, defaultValue);
    for (var i = 0; i < width; i++) {
        for (var j = 0; j < height; j++) {
            var colour = OriginalGenerator.generate(i, j);
            OriginalGenerator.record(i, j, colour);
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
