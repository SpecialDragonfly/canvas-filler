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
    },
		available: function(i, j) {
			return this.canvas[i][j] === null
		}
}

// Singleton generator
var SpiralGenerator = {
    memoryCanvas: [],
    colourArray:[],
    width:0,
    height:0,
    defaultValue:{'r':0,'g':0,'b':0},
		_isRunning:true,
		lastDirection: 's',
		lastPosition: {},

    init: function(canvas) {
				this.lastPosition = {}
				this.lastDirection = 's'
				this._isRunning = true
        this.width = canvas.width;
        this.height = canvas.height;
        this.memoryCanvas = MemoryCanvas.init(
					ColourArray.init(), canvas.width, canvas.height
				)
    },

		generate: function(i, j) {
			return this.memoryCanvas.getColour(i, j)
		},

		_check: function(x, y) {
			return this.memoryCanvas.available(x, y)
		},

    move: function(x, y) {
        var position = {};

        // Can we proceed in the given direction?
        switch(this.lastDirection) {
            case 'n':
                if ((y - 1 >= 0) && this._check(x, y - 1)) {
                    position = {'x':x, 'y':y - 1};
                }
                break;
            case 'e':
                if ((x + 1 < this.width) && this._check(x + 1, y)) {
                    position = {'x':x + 1, 'y': y};
                }
                break;
            case 's':
                if ((y + 1 < this.height) && this._check(x, y + 1)) {
                    position = {'x':x, 'y':y + 1};
                }
                break;
            case 'w':
                if ((x - 1 >= 0) && this._check(x - 1, y)) {
                    position = {'x':x - 1, 'y':y};
                }
                break;
        }
				return {position:position, success:position.hasOwnProperty('x')}
    },

		getDirection: function() {
			switch(this.lastDirection) {
				case 's':
					if (this._check(this.lastPosition.x + 1, this.lastPosition.y)) {
						return 'e';
					}
				case 'e':
					if (this._check(this.lastPosition.x, this.lastPosition.y - 1)) {
						return 'n';
					}
				case 'n':
					if (this._check(this.lastPosition.x - 1, this.lastPosition.y)) {
						return 'w';
					}
				case 'w':
					if (this._check(this.lastPosition.x, this.lastPosition.y + 1)) {
						return 's';
					}
				default:
					return false;
			}
		},

    isRunning: function() {
        return this._isRunning;
    },

		createImage: function(buffer) {
				this._isRunning = true;
				let colourIn = function(x, y, width, colour) {
					var idx = 4 * ((y * width) + x)
					buffer[idx + 0] = colour.r
					buffer[idx + 1] = colour.g
					buffer[idx + 2] = colour.b
					buffer[idx + 3] = 255
				}

				let result = {position:{x:0, y:0}, success:true}
				let count = 0
				let within90Percent = false
				let total = this.width * this.height
				while (result.success) {
						count++
						var colour = this.generate(result.position.x, result.position.y)
						colourIn(result.position.x, result.position.y, this.width, colour)
						this.lastPosition = {x:result.position.x, y:result.position.y}
						result = this.move(result.position.x, result.position.y);
						if (!result.success) {
							this.lastDirection = this.getDirection()
							if (this.lastDirection !== false) {
								result = this.move(this.lastPosition.x, this.lastPosition.y);
							}
						}
						if (!within90Percent) {
							if (total * 0.9 < count) {
								within90Percent = true
							}
						}
						if (within90Percent) {
							self.postMessage({
								'type': 'count',
								'running': this._isRunning,
								'count': count
							})
						} else if (count % 1000 == 0) {
							self.postMessage({
								'type': 'count',
								'running': this._isRunning,
								'count': count
							})
						}
				}

				this._isRunning = false;
		},

}

self.addEventListener('message', function(e) {
    var data = e.data;
    switch(data.cmd) {
        case 'start':
            var canvas = data.canvas;
            var defaultValue = data.default;
						var imageData = data.imageData
            SpiralGenerator.init(canvas);
            SpiralGenerator.createImage(imageData.data);
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
