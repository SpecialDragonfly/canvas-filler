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
    available: function(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false
        }

        return this.canvas[x][y] === null
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
    nextAvailableVertical: function(x, y, direction) {
        switch (direction) {
            case 'north':
                for (var i = y; i >= 0; i--) {
                    if (this.canvas[x][i] === null) {
                        return {x:x, y: i}
                    }
                }
                break;
            case 'south':
                for (var i = y; i < this.height; i++) {
                    if (this.canvas[x][i] === null) {
                        return {x:x, y: i}
                    }
                }
                break;
        }
        return false;
    },
    nextAvailableHorizontal: function(x, y, direction) {
        switch (direction) {
            case 'east':
                for (var i = x; i < this.width; i++) {
                    if (this.canvas[i][y] === null) {
                        return {x:i, y:y}
                    }
                }
                break;
            case 'west':
                for (var i = x; i >= 0; i--) {
                    if (this.canvas[i][y] === null) {
                        return {x:i, y:y}
                    }
                }
                break
        }
        return false;
    }
}

// Singleton generator
var SpiralOutGenerator = {
    memoryCanvas: [],
    colourArray:[],
	width:0,
	height:0,
	defaultValue:{'r':0,'g':0,'b':0},
	_isRunning:false,
	nextDirection: 's',
    previousDirection: '',
	lastPosition: {},

    init: function(canvas) {
		this._isRunning = true
		this.memoryCanvas = MemoryCanvas.init(
			ColourArray.init(), canvas.width, canvas.height
		)
		this.width = canvas.width
		this.height = canvas.height
        var x = Math.floor(this.width / 2);
        var y = Math.floor(this.height / 2);
        this.lastPosition = {'x':x, 'y':y};
    },

    createImage: function() {
        this._isRunning = true;

        var i = 0;
        var coordinates = SpiralOutGenerator.lastPosition;
        while (SpiralOutGenerator.pixelsRemaining() === true) {
            var colour = SpiralOutGenerator.generate(coordinates.x, coordinates.y);
            SpiralOutGenerator.record(coordinates.x, coordinates.y, colour);
            coordinates = SpiralOutGenerator.move();
            i++;
        }

        this._isRunning = false;
    },

    generate: function(i, j) {
		return this.memoryCanvas.getColour(i, j)
    },

    // Check whether the pixel has already been filled in.
	_check: function(x, y) {
		return this.memoryCanvas.available(x, y)
	},

    checkNorth: function(x, y) {
        return this._check(x, y - 1)
    },

    checkEast: function(x, y) {
        return this._check(x + 1, y)
    },

    checkSouth: function(x, y) {
        return this._check(x, y + 1)
    },

    checkWest: function(x, y) {
        return this._check(x - 1, y)
    },

	move: function(x, y) {
		var position = {};

		// Can we proceed in the given direction?
		switch(this.nextDirection) {
			case 'n':
                if (this.checkNorth(x, y)) {
                    position = {'x':x, 'y':y - 1};
                    this.previousDirection = 'n'
                    this.nextDirection = 'w';
                }
				break;
			case 'e':
				if (this.checkEast(x, y)) {
					position = {'x':x + 1, 'y': y};
                    this.previousDirection = 'e'
                    this.nextDirection = 'n';
				} else {
                    this.nextDirection = this.previousDirection
                    position = this.move(x, y)
                    if (position.success === false) {
                        position = this.memoryCanvas.nextAvailableHorizontal(x, y, 'east')
                        this.nextDirection = 'n'
                        if (position === false) {
                            if (x > 0) {
                                position = {x: x - 1, y: 0}
                                this.nextDirection = 's'
                            } else {
                                position = {}
                            }
                        }
                    }
                }
				break;
			case 's':
				if (this.checkSouth(x, y)) {
					position = {'x':x, 'y':y + 1};
                    this.previousDirection = 's'
                    this.nextDirection = 'e';
				}
				break;
			case 'w':
                // if (can't move west, can't move south) - edge of canvas
                // else
				if (this.checkWest(x, y)) {
					position = {'x':x - 1, 'y':y};
                    this.previousDirection = 'w'
                    this.nextDirection = 's';
				} else {
                    // can't go west, continue previous direction.
                    this.nextDirection = this.previousDirection
                    position = this.move(x, y)
                    if (position.success === false) {
                        // couldn't go west, couldn't go in previous direction, try jumping
                        position = this.memoryCanvas.nextAvailableHorizontal(x, y, 'west')
                        this.nextDirection = 's'
                        if (position === false) {
                            position = {}
                        }
                    }
                }
				break;
		}
		return {position:position, success:position.hasOwnProperty('x')}
	},

    // If we're here, the nextDirection was false, so this is the fail over.
	getDirection: function() {
		switch(this.nextDirection) {
			case 'e':
				if (this._check(this.lastPosition.x, this.lastPosition.y + 1)) {
					return 's';
				}
			case 's':
				if (this._check(this.lastPosition.x - 1, this.lastPosition.y)) {
					return 'w';
				}
			case 'w':
				if (this._check(this.lastPosition.x, this.lastPosition.y - 1)) {
					return 'n';
				}
			case 'n':
				if (this._check(this.lastPosition.x + 1, this.lastPosition.y)) {
					return 'e';
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

		let result = {
			position:{
				x:this.lastPosition.x,
				y:this.lastPosition.y
			},
			success: true
		}
		let count = 0
		let total = this.width * this.height
		while (result.success) {
			count++
			var colour = this.generate(result.position.x, result.position.y)
			colourIn(result.position.x, result.position.y, this.width, colour)
			this.lastPosition = {x:result.position.x, y:result.position.y}

            // Attempt to move (south -> east -> north -> west)
			result = this.move(result.position.x, result.position.y)
			if (!result.success) {
                // Couldn't move, get a new direction (was north, try west)
				this.nextDirection = this.getDirection()
				if (this.nextDirection !== false) {
                    // Couldn't move, try south
					result = this.move(this.lastPosition.x, this.lastPosition.y)
				} else {
                    // Couldn't move in any direction, must be finished.
                    result = {success: false}
                }
			}
		}
	}
}

self.addEventListener('message', function(e) {
    var data = e.data;
    switch(data.cmd) {
        case 'start':
            var canvas = data.canvas;
            var defaultValue = data.default;
            var imageData = data.imageData
            SpiralOutGenerator.init(canvas, defaultValue);
            SpiralOutGenerator.createImage(imageData.data);
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
