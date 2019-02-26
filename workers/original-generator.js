"use strict";
const ColourArray = {
    colours: [],
    init: function() {
        let colourArray = []
        for (var r = 0; r < 256; r++) {
            var row = [];
            for (var g = 0; g < 256; g++) {
                var column = []
                for (var b = 0; b < 256; b++) {
                    column.push(true);
                }
                row.push(column);
            }
            colourArray.push(row);
        }
        this.colours = colourArray
        return this
    },
    isAvailable: function(r, g, b) {
        return this.colours[r][g][b] === true;
    },
    decrementColour:function(colour) {
        return colour - 1 < 0 ? 0 : colour - 1
    },
    incrementColour:function(colour) {
        return colour + 1 > 255 ? 255 : colour + 1
    },
    getColour: function(startR, startG, startB) {
        let potential = {
            r:startR,
            g:startG,
            b:startB,
            a:1
        }
        if (!this.isAvailable(startR, startG, startB)) {
            var found = false
            let minDeadR = startR
            let maxDeadR = startR
            let minDeadG = startG
            let maxDeadG = startG
            let minDeadB = startB
            let maxDeadB = startB
            let minR = this.decrementColour(startR)
            let maxR = this.incrementColour(startR)
            let minG = this.decrementColour(startG)
            let maxG = this.incrementColour(startG)
            let minB = this.decrementColour(startB)
            let maxB = this.incrementColour(startB)

            while (!found) {
                for (var r = minR; r <= maxR; r++) {
                    let rDead = (r >= minDeadR && r <= maxDeadR)
                    for (var g = minG; g <= maxG; g++) {
                        let gDead = (g >= minDeadG && g <= maxDeadG)
                        for (var b = minB; b <= maxB; b++) {
                            let bDead = (b >= minDeadB && b <= maxDeadB)
                            if (rDead && gDead && bDead) {
                                continue
                            }
                            if (this.isAvailable(r, g, b)) {
                                    potential.r = r;
                                    potential.g = g;
                                    potential.b = b;
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
                minDeadR = minR
                maxDeadR = maxR
                minDeadG = minG
                maxDeadG = maxG
                minDeadB = minB
                maxDeadB = maxB

                minR = (minR - 1 <= 0 ? 0 : minR - 1)
                maxR = (maxR + 1 == 256 ? 255 : maxR + 1)
                minG = (minG - 1 <= 0 ? 0 : minG - 1)
                maxG = (maxG + 1 == 256 ? 255 : maxG + 1)
                minB = (minB - 1 <= 0 ? 0 : minB - 1)
                maxB = (maxB + 1 == 256 ? 255 : maxB + 1)
            }
        }
        this.colours[potential.r][potential.g][potential.b] = null

        return potential
    }
}

const MemoryCanvas = {
    canvas: [],
    colours: null,
    width:0,
    height:0,
    init: function(colourArray, width, height) {
        this.width = width
        this.height = height
        let memory = []
        for (var i = 0; i < width; i++) {
                var row = [];
                for (var j = 0; j < height; j++) {
                        row.push(null);
                }
                memory.push(row);
        }
        this.canvas = memory
        this.colours = colourArray

        return this
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

        for (var x = i - 1; x <= i + 1; x++) {
            if (x < 0) {
                continue;
            }
            if (x >= this.width) {
                continue;
            }
            for (var y = j - 1; y <= j + 1; y++) {
                if (y < 0) {
                    continue;
                }
                if (y >= this.height) {
                    continue;
                }
                if (this.canvas[x][y] !== null && this.canvas[x][y] !== undefined) {
                    grid.push(this.canvas[x][y]);
                }
            }
        }

        return grid;
    },
    averageOrRandom: function(values) {
        let x = 0;
        if (values.length > 0) {
            x = this.average(values)
        } else {
            x = Math.random() * 256
        }
        return Math.floor(x)
    },
    getColour: function(i, j) {
        let surroundingColours = this._getSurroundingColours(i, j)
        let reds = []
        let greens = []
        let blues = []
        for (var idx = 0; idx < surroundingColours.length; idx++) {
            var colour = surroundingColours[idx];
            reds.push(colour.r);
            greens.push(colour.g);
            blues.push(colour.b);
        }
        let redAvg = this.averageOrRandom(reds)
        let greenAvg = this.averageOrRandom(greens)
        let blueAvg = this.averageOrRandom(blues)

        let potential = this.colours.getColour(redAvg, greenAvg, blueAvg)
        this.canvas[i][j] = potential

        return potential
    }
}

// Singleton generator
var OriginalGenerator = {
    memoryCanvas: [],
    colourArray:[],
    defaultValue:{'r':0,'g':0,'b':0, 'a': 1},
    _isRunning:true,
    width:0,
    height:0,

    init: function(canvas) {
        this._isRunning = true;
        this.memoryCanvas = MemoryCanvas.init(ColourArray.init(), canvas.width, canvas.height)
        this.width = canvas.width
        this.height = canvas.height
    },

    generate: function(i, j) {
        return this.memoryCanvas.getColour(i, j)
    },

    createImage: function() {
				let buffer = [];
        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var colour = this.generate(i, j);
								buffer.push({
										'type': 'point',
                    'running':this._isRunning,
                    'test':{
                        'x':i,
                        'y':j,
                        'colour':{r: colour.r, g: colour.g, b: colour.b, a: 1}
                    }
                })
            }
						self.postMessage({
							'type': 'count',
							'running': this._isRunning,
							'count': buffer.length
						})
						while (buffer.length > 0) {
							self.postMessage(buffer.pop());
						}
        }
        this._isRunning = false;
        self.postMessage({'type':'status', 'running':this._isRunning});
    },

    isRunning: function() {
        return this._isRunning;
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
        case 'close':
            self.close();
            break;
    }
}, false);
