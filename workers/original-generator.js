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
    _inArray: function(needle, haystack) {
        var length = haystack.length;
        for(var i = 0; i < length; i++) {
            if(haystack[i] == needle) return true;
        }
        return false;
    },
    _addSolution: function(r, g, b) {
        if (r < 0) {
            r = 0;
        }
        if (g < 0) {
            g = 0;
        }
        if (b < 0) {
            b = 0;
        }
        if (r > 255) {
            r = 255;
        }
        if (g > 255) {
            g = 255
        }
        if (b > 255) {
            b = 255
        }
        if (!this.isAvailable(r, g, b)) {
            return
        }

        let hash = r + "," + g + "," + b
        if (!this._inArray(hash, this.solutionHash)) {
            this.solutionHash.push(hash)
            this.solutions.push({r: r, g: g, b: b, a: 1})
        }
    },
    solutionHash: [],
    solutions: [],
    getColour: function(startR, startG, startB) {
        let potential = {
            r:startR,
            g:startG,
            b:startB,
            a:1
        }
        this.solutionHash = []
        this.solutions = []        
        let shell = 0
        if (!this.isAvailable(startR, startG, startB)) {
            while (this.solutionHash.length === 0) {
                shell++;
                for (var A = 0; A <= shell; ++A) {
                    for (var B = 0; B <= shell - A; ++B) {
                        // +r +g +b
                        this._addSolution(startR + A, startG + B, startB + (shell - A - B))
                        // +r +g -b
                        this._addSolution(startR + A, startG + B, startB - (shell - A - B))
                        // +r -g +b
                        this._addSolution(startR + A, startG - B, startB + (shell - A - B))
                        // -r +g +b
                        this._addSolution(startR - A, startG + B, startB + (shell - A - B))
                        // -r +g -b
                        this._addSolution(startR - A, startG + B, startB - (shell - A - B))
                        // +r -g -b
                        this._addSolution(startR + A, startG - B, startB - (shell - A - B))
                        // -r -g +b
                        this._addSolution(startR - A, startG - B, startB + (shell - A - B))
                        /// -r -g -b
                        this._addSolution(startR - A, startG - B, startB - (shell - A - B))
                    }
                }
                if (shell > (255 + 255 + 255)) { // 0,0,0 -> 255,255,255 => distance of 255+255+255
                    console.log("Maximum sized shell reached");
                    console.log("Starting at " + startR + ", " + startG + ", " + startB);
                    for (var rcheck = 0; rcheck < 255; rcheck++) {
                        for (var gcheck = 0; gcheck < 255; gcheck++) {
                            for (var bcheck = 0; bcheck < 255; bcheck++) {
                                if (this.isAvailable(rcheck, gcheck, bcheck)) {
                                    console.log("But " + rcheck + ", " + gcheck + ", " + bcheck + " was available")
                                    return
                                }
                            }
                        }
                    }
                    break;
                }
            }

            // if we're here then we have possible solutions.
            potential = this.solutions[0];
            if (shell > 25) {
                self.postMessage({
                    'type': 'shell-count',
                    'count': shell
                })                
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
        this.memoryCanvas = MemoryCanvas.init(
            ColourArray.init(), canvas.width, canvas.height
        )
        this.width = canvas.width
        this.height = canvas.height
    },

    generate: function(i, j) {
        return this.memoryCanvas.getColour(i, j)
    },

    createImage: function(buffer) {
        let within90Percent = false
        for (var x = 0; x < this.width; x++) {
            for (var y = 0; y < this.height; y++) {
                var idx = 4 * ((y * this.width) + x);
                var colour = this.generate(x, y);
                buffer[idx + 0] = colour.r
                buffer[idx + 1] = colour.g
                buffer[idx + 2] = colour.b
                buffer[idx + 3] = 255
                if (within90Percent) {
                    self.postMessage({
                        'type': 'count',
                        'running': this._isRunning,
                        'count': (x * this.height) + y
                    })
                }
            }
            self.postMessage({
                'type': 'count',
                'running': this._isRunning,
                'count': (x * this.height)
            })
            if (!within90Percent) {
                if (this.width * 0.9 < x) {
                    within90Percent = true
                }
            }
        }
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
            var context = data.context;
            var imageData = data.imageData;
            OriginalGenerator.init(canvas);
            OriginalGenerator.createImage(imageData.data);

            self.postMessage({
                'type':'final',
                'running':true,
                'data':imageData
            })
            self.postMessage({
                'type':'status',
                'running':false
            })
            break;
        case 'close':
            self.close();
            break;
    }
}, false);
