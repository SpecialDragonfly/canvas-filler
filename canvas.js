$(function() {
    window.Image = {
        memoryCanvas: [],
        usedColours: [],
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
        generateColour: function(surroundingSquares) {
            var pix = surroundingSquares.data;
            var reds = [];
            var greens = [];
            var blues = [];
            for(var i = 0, n = pix.length; i < n; i += 4) {
                var red = 255 - pix[i];
                var green = 255 - pix[i + 1];
                var blue = 255 - pix[i + 2];
                if (red !== 255 && green !== 255 && blue !== 255) {
                    reds.push(red);
                    greens.push(green);
                    blues.push(blue);
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

            var possible = this.rgbToHex(redAvg, greenAvg, blueAvg);
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

            return possible;
        },

        _getSurroundingColours: function(i, j) {
            var grid = [];

            var previousI = i - 1 < 0 ? 0 : i - 1;
            var previousJ = j - 1 < 0 ? 0 : j - 1;
            for (var x = previousI; x < i + 1; i++) {
                var row = [];
                for (var y = previouxJ; y < j + 1; j++) {
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
                    row.push(255);
                }
                this.memoryCanvas.push(row);
            }
        },

        begin: function() {
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
                    this.usedColours.push(colour);
                    console.log("generated colour: " + colour);
                }
            }

            for (var i = 0; i < width; i++) {
                for (j = 0; j < height; j++) {
                    context.fillStyle = this.memoryCanvas[i][j];
                    context.fillRect(i, j, 1, 1);
                }
            }
        }
    }

    $(document).find("#start").on('click', function() {
        window.Image.begin();
    });
});