"use strict";
function Point(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;

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
    memoryCanvas: {},
    usedColourCount:0,
    width:0,
    height:0,
    defaultValue:{'r':0,'g':0,'b':0},
    lastPosition:null,
    colourArray:[],
    imageData:null,
    _isRunning:true,
    heatmap:[],

    init: function(canvas, defaultValue) {
        this.imageData = canvas.imageData;
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

        if (typeof(defaultValue) != 'undefined') {
            this.defaultValue = defaultValue;
        }
        this.width = canvas.width;
        this.height = canvas.height;

        var x = Math.floor(Math.random() * this.width);
        var y = Math.floor(Math.random() * this.height);
        this.lastPosition = {'x':x, 'y':y};
    },

    pixelsRemaining: function() {
        return ((this.width * this.height) - this.usedColourCount) > 0;
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
        var maxI = i + 1 >= this.width ? this.width -1 : i + 1;
        var maxJ = j + 1 >= this.height ? this.height -1 : j + 1;
        for (var x = previousI; x <= maxI; x++) {
            for (var y = previousJ; y <= maxJ; y++) {
                if (this.memoryCanvas.hasOwnProperty(x) &&
                    this.memoryCanvas[x].hasOwnProperty(y)
                ) {
                    grid.push(this.memoryCanvas[x][y]);
                }
            }
        }

        return grid;
    },

    generate: function(i, j) {
        var pixelStart = Date.now();
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

            while (found === false) {
                // Red, Green and Blue all at maximum radius distance.
                // sqrt(x^2 + y^2 + z^2) where x = y = z
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
                            var distance = this.distance(
                                i, j, k, redAvg, greenAvg, blueAvg
                            );
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
        this.heatmap.push(Date.now() - pixelStart);

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
        this.usedColourCount++;
        if (this.memoryCanvas.hasOwnProperty(i)) {
            this.memoryCanvas[i][j] = colour;
        } else {
            this.memoryCanvas[i] = {};
            this.memoryCanvas[i][j] = colour;
        }
        var basePixel = (j * this.height + i) * 4;
        this.imageData.data[basePixel] = colour.r;
        this.imageData.data[basePixel + 1] = colour.g;
        this.imageData.data[basePixel + 2] = colour.b;
        this.imageData.data[basePixel + 3] = 255;
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
        return !(
            this.memoryCanvas.hasOwnProperty(x) &&
            this.memoryCanvas[x].hasOwnProperty(y)
        );
    },

    createImage: function() {
        var i = 0;
        var coordinates = PathGenerator.lastPosition;
        while (PathGenerator.pixelsRemaining() === true) {
            var colour = PathGenerator.generate(coordinates.x, coordinates.y);
            PathGenerator.record(coordinates.x, coordinates.y, colour);
            coordinates = PathGenerator.move();
            i++;
        }        
        this._isRunning = false;
    },
    isRunning: function() {
        return this._isRunning;
    },
    getData: function() {
        return this.imageData;
    },
    getHeatmapData: function() {
        return this.heatmap;
    }
}

self.addEventListener('message', function(e) {
    var data = e.data;
    switch(data.cmd) {
        case 'start':
            var canvas = data.canvas;
            var width = canvas.width;
            var height = canvas.height;
            var defaultValue = data.default;
            PathGenerator.init(canvas, defaultValue);
            PathGenerator.createImage();
            break;
        case 'getData':
            self.postMessage({
                'running':PathGenerator.isRunning(),
                'imageData':PathGenerator.getData()
            });
            break;
        case 'abilities':
            self.postMessage({
                'abilities':{
                    'heatmap':true
                }
            });
            break;
        case 'heatmap':
            self.postMessage({
                'heatmap':PathGenerator.getHeatmapData()
            });
            break;
        case 'close':
            self.close();
            break;
    }
}, false);
