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
var BlankGenerator = {
    _isRunning:false,
    width:null,
    height:null,
    imageData:null,
    defaultValue:null,
    heatmapData:[],
    init: function(canvas, defaultValue) {
        this.width = canvas.width;
        this.height = canvas.height;
        this.imageData = canvas.imageData;
        this.defaultValue = defaultValue;

    },
    createImage: function() {
        this._isRunning = true;

        // ----- YOUR LOOPING CODE HERE -----
        for (var i = 0; i < 10; i++) {
            this.generate(i, i);
        }
        // ----- END LOOPING CODE -----

        this._isRunning = false;
    },
    generate: function() {
        var pixelStart = Date.now();
        // ----- YOUR PIXEL GENERATION CODE HERE -----
        // ----- END PIXEL GENERATION CODE -----
        this.heatmapData.push(Date.now() - pixelStart);
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
            BlankGenerator.init(canvas, defaultValue);
            BlankGenerator.createImage();
            break;
        case 'getData':
            self.postMessage({
                'running':BlankGenerator.isRunning(),
                'imageData':BlankGenerator.getData()
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
                'heatmap':BlankGenerator.getHeatmapData()
            });
            break;
        case 'close':
            self.close();
            break;
    }
}, false);