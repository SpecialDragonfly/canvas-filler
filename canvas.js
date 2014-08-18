$(function() {
    window.Image = {
        memoryCanvas: [],
        usedColours: [],
        defaultValue: {
            'r':0,
            'g':0,
            'b':0,
            'a':1 // 0: fully transparent -> 1: not transparent
        },
        componentToHex: function(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        },
        rgbToHex: function(r, g, b) {
            return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
        },
        average: function(values) {
            var sum = values.reduceRight(function(x, total) {
                return total + x;
            }, 0);

            return sum/values.length;
        },
        hexToRgb: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        _originalMethod: function(surroundingSquares) {
            // surroundingSquares is an n x n grid (min n = 2, max n = 3)
            var reds = [];
            var greens = [];
            var blues = [];
            for (var i = 0; i < surroundingSquares.length; i++) {
                var row = surroundingSquares[i];
                for (var j = 0; j < row.length; j++) {
                    var colour = row[j];
                    if (colour !== this.defaultValue) {
                        var colours = this.hexToRgb(colour);
                        if (colours !== null) {
                            reds.push(colours.r);
                            greens.push(colours.g);
                            blues.push(colours.b);
                        }
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

            var potential = {
                'r':redAvg,
                'g':greenAvg,
                'b':blueAvg,
                'a':1
            };

            var possible = this.rgbToHex(potential.r, potential.g, potential.b);

            if (this.usedColours.indexOf(possible) >= 0) {
                // Already used this colour
                found = false;
                var box = 2;
                while (!found) {
                    var minRed = redAvg - box < 0 ? 0 : redAvg - box;
                    var minGreen = greenAvg - box < 0 ? 0 : greenAvg - box;
                    var minBlue = blueAvg - box < 0 ? 0 : blueAvg - box;
                    var maxRed = redAvg + box > 255 ? 255 : redAvg + box;
                    var maxGreen = greenAvg + box > 255 ? 255 : greenAvg + box;
                    var maxBlue = blueAvg + box > 255 ? 255 : blueAvg + box;
                    for (i = minRed; i <= maxRed; i++) {
                        for (j = minGreen; j <= maxGreen; j++) {
                            for (k = minBlue; k <= maxBlue; k++) {
                                potential.r = i;
                                potential.g = j;
                                potential.b = k;
                                possible = this.rgbToHex(i, j, k);
                                if (this.usedColours.indexOf(possible) < 0) {
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
                    box = box * 2;
                    if (box > 4) {
                        console.log("Box became larger than 30");
                        found = true;
                    }
                }
            }

            return potential;
        },

        _iterationMethod: function(surroundingSquares) {
            var potential = {
                'r':0,
                'g':0,
                'b':0,
                'a':0
            };
            if (typeof(this.previousValue) !== "undefined") {
                // This obviously isn't a potential option, but used to
                // have a baseline to increment from
                potential = this.hexToRgb(this.previousValue);
            } else {
                // No previousValue has been defined - so we create on.
                // It's also no in the list of used colours, so it'll
                // go straight through.
                this.previousValue = this.rgbToHex(
                    this.defaultValue.r,
                    this.defaultValue.g,
                    this.defaultValue.b
                );
            }

            var possibleColour = this.previousValue;

            while (this.usedColours.indexOf(possibleColour) >= 0) {
                potential.r = potential.r + 1;
                if (potential.r > 255) {
                    potential.r = 0;
                    potential.g = potential.g + 1;
                    if (potential.g > 255) {
                        potential.b = potential.b + 1;
                    }
                }
                potential.a = Math.random();
                possibleColour = this.rgbToHex(
                    potential.r, potential.g, potential.b
                );
            }

            return potential;
        },

        setMethod: function(method) {
            switch(method){
                case "original":
                case "ORIGINAL":
                    this.generateColour = this._originalMethod;
                    break;
                case "iterate":
                case "ITERATE":
                    this.generateColour = this._iterationMethod
                    break;
            }
        },

        _getSurroundingColours: function(i, j) {
            var grid = [];

            var previousI = i - 1 < 0 ? 0 : i - 1;
            var previousJ = j - 1 < 0 ? 0 : j - 1;
            for (var x = previousI; x < i + 1; x++) {
                var row = [];
                for (var y = previousJ; y < j + 1; y++) {
                    row.push(this.memoryCanvas[x][y]);
                }
                grid.push(row);
            }

            return grid;
        },

        init: function() {
            var canvas = $(document).find("#area")[0];
            var context = canvas.getContext('2d');

            var width = canvas.width;
            var height = canvas.height;

            for (var i = 0; i < width; i++) {
                var row = [];
                for (var j = 0; j < height; j++) {
                    row.push(this.defaultValue);
                }
                this.memoryCanvas.push(row);
            }
            this.usedColours = [];
        },

        begin: function() {
            var method = $(document).find("#method option:selected").val();
            this.setMethod(method);

            var canvas = $(document).find("#area")[0];
            var context = canvas.getContext('2d');

            var width = canvas.width;
            var height = canvas.height;

            // Iterate over the canvas
            for (var i = 0; i < width; i++) {
                var row = [];
                for (var j = 0; j < height; j++) {
                    var colour = this.generateColour(
                        this._getSurroundingColours(i, j)
                    );
                    var hexColour = this.rgbToHex(colour.r, colour.g, colour.b);
                    this.usedColours.push(hexColour);
                    this.memoryCanvas[i][j] = colour;
                    console.log(
                        "generated colour " + hexColour + " for (" + i + "," + j + ")"
                    );
                }
            }

            for (var i = 0; i < width; i++) {
                for (j = 0; j < height; j++) {
                    context.globalAlpha(this.memoryCanvas[i][j].a)
                    context.fillStyle = this.rgbToHex(
                        this.memoryCanvas[i][j].r,
                        this.memoryCanvas[i][j].g,
                        this.memoryCanvas[i][j].b
                    );
                    context.fillRect(i, j, 1, 1);
                }
            }

            this.init();
        }
    }

    $(document).find("#start").on('click', function() {
        window.Image.begin();
    });

    window.Image.init();
});