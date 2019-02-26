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
var IterativeGenerator = {
    defaultValue:null,
    previousValue:undefined,
    colourArray:[],
    _isRunning:false,
    width:null,
    height:null,
    imageData:null,
    heatmapData:[],

    init: function(canvas, defaultValue) {
        if (typeof(defaultValue) != 'undefined') {
            this.defaultValue = defaultValue;
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
        this.imageData = canvas.imageData;
        this.width = canvas.width;
        this.height = canvas.height;
    },
    createImage: function() {
        this._isRunning = true;

        for (var i = 0; i < this.width; i++) {
            for (var j = 0; j < this.height; j++) {
                var colour = IterativeGenerator.generate();
                IterativeGenerator.record(i, j, colour);
            }
        }

        this._isRunning = false;
    },

    generate: function() {
        var pixelStart = Date.now();
        var potential = new Point(
            this.defaultValue.r, this.defaultValue.g, this.defaultValue.b, this.defaultValue.a
        );
        if (typeof(this.previousValue) !== "undefined") {
            // This obviously isn't a potential option, but used to
            // have a baseline to increment from
            potential = this.previousValue;
        } else {
            // No previousValue has been defined - so we create one.
            // It's also not in the list of used colours, so it'll
            // go straight through.
            this.previousValue = potential;
        }

        while (this.colourArray[potential.r][potential.g][potential.b] === false) {
            potential.r = potential.r + 1;
            if (potential.r > 255) {
                potential.r = 0;
                potential.g = potential.g + 1;
                if (potential.g > 255) {
                    potential.g = 0;
                    potential.b = potential.b + 1;
                }
            }
        }

        this.previousValue = potential;

        this.heatmapData.push(Date.now() - pixelStart);
        return potential;
    },

    record: function(i, j, colour) {
        this.colourArray[colour.r][colour.g][colour.b] = false;

        var basePixel = (j * this.height + i) * 4;
        this.imageData.data[basePixel] = colour.r;
        this.imageData.data[basePixel + 1] = colour.g;
        this.imageData.data[basePixel + 2] = colour.b;
        this.imageData.data[basePixel + 3] = 255;
    },
    isRunning: function() {
        return this._isRunning;
    },
    getData: function() {
        return this.imageData;
    },
    getHeatmapData: function() {
        return this.heatmapData;
    }    
}

self.addEventListener('message', function(e) {
    var data = e.data;
    switch(data.cmd) {
        case 'start':
            var canvas = data.canvas;
            var defaultValue = data.default;
            IterativeGenerator.init(canvas, defaultValue);
            IterativeGenerator.createImage();
            break;
        case 'getData':
            self.postMessage({
                'running':IterativeGenerator.isRunning(),
                'imageData':IterativeGenerator.getData()
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
                'heatmap':IterativeGenerator.getHeatmapData()
            });
            break;
        case 'close':
            self.close();
            break;
    }
}, false);