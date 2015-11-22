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
var OriginalGenerator = {
    memoryCanvas: [],
    width:0,
    height:0,
    defaultValue:{'r':0,'g':0,'b':0},
    colourArray:[],
    imageData: null,
    _isRunning:true,
    heatmap:[],

    init: function(canvas, defaultValue) {
        if (typeof(defaultValue) != 'undefined') {
            this.defaultValue = defaultValue;
        }
        this.width = canvas.width;
        this.height = canvas.height;
        this.imageData = canvas.imageData;

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

    average: function(vals) {
        // Unrolled loop turned out to be the fastest way to sum an array.
        // https://jsperf.com/array-summing-loop-vs-eval/10
        var sum = 0;
        var len = vals.length;
        var n = Math.floor(len / 8);
        for (var i = 0; i < n; ++i) {
            var base = i * 8;
            sum += vals[base];
            sum += vals[base + 1];
            sum += vals[base + 2];
            sum += vals[base + 3];
            sum += vals[base + 4];
            sum += vals[base + 5];
            sum += vals[base + 6];
            sum += vals[base + 7];
        }
        for (var i = n*8; i < len; ++i) {
            sum += vals[i];
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
        var pixelStart = Date.now();
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
            var found = false;
            var shell = 1;

            while (found === false) {
                var minRed = potential.r - shell;
                var maxRed = potential.r + shell;
                var minGreen = potential.g - shell;
                var maxGreen = potential.g + shell;
                var minBlue = potential.b - shell;
                var maxBlue = potential.b + shell;
                if (minRed < 0) {
                    minRed = 0;
                }
                if (maxRed > 255) {
                    maxRed = 255;
                }
                if (minGreen < 0) {
                    minGreen = 0;
                }
                if (maxGreen > 255) {
                    maxGreen = 0;
                }
                if (minBlue < 0) {
                    minBlue = 0;
                }
                if (maxBlue > 255) {
                    maxBlue = 255;
                }

                for (var r = minRed; r <= maxRed; r++) {
                    for (var g = minGreen; g <= maxGreen; g++) {
                        for (var b = minBlue; b <= maxBlue; b++) {
                            if ((r < potential.r - shell + 1 || r > potential.r + shell - 1) 
                                || (g < potential.g - shell + 1 || g > potential.g + shell - 1) 
                                || (b < potential.b - shell + 1 || b > potential.b + shell - 1)
                            ) {
                                if (this.colourArray[r][g][b] === true) {
                                    potential.r = r;
                                    potential.g = g;
                                    potential.b = b;
                                    found = true;
                                    break;
                                }
                            }
                        }
                        if (found === true) {
                            break;
                        }
                    }
                    if (found === true) {
                        break;
                    }
                }
                if (found === false) {
                    shell++;
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
        var basePixel = (j * this.height + i) * 4;
        this.colourArray[colour.r][colour.g][colour.b] = false;
        this.memoryCanvas[i][j] = colour;
        this.imageData.data[basePixel] = colour.r;
        this.imageData.data[basePixel + 1] = colour.g;
        this.imageData.data[basePixel + 2] = colour.b;
        this.imageData.data[basePixel + 3] = 255;
    },

    createImage: function() {
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var colour = this.generate(i, j);
                this.record(i, j, colour);
            }
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
            var defaultValue = data.default;
            OriginalGenerator.init(canvas, defaultValue);
            OriginalGenerator.createImage();
            break;
        case 'getData':
            self.postMessage({
                'running':OriginalGenerator.isRunning(),
                'imageData':OriginalGenerator.getData()
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
                'heatmap':OriginalGenerator.getHeatmapData()
            });
            break;
        case 'close':
            self.close();
            break;
    }
}, false);
