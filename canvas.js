"use strict";
$(function() {
    window.ImageUtils = {
        hexToRgb: function(hex) {
            var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },
        componentToHex: function(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        },
        rgbToHex: function(r, g, b) {
            return "#" + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
        }
    },

    window.Image = {
        // The canvas object for the image
        canvas:null,
        // 2D context for the canvas object for the image
        context:null,
        // A 1x1 pixel image data area
        smallImageData:null,
        // The imageData for the smallImageData object.
        px:null,
        // Full image data for entire canvas.
        imageData:null,
        // Last time a row or column was completed
        lastrowtime: 0,

        // Everything required for the heatmap drawing itself
        heatmap:null,
        heatmapContext:null,
        heatmapWorker:null,
        heatMapImageData: null,
        heatMapSmallImageData: null,
        heatMapPx:null,

        // Everything required for the example of the heatmap.
        testHeatmapWorker:null,
        testHeatmapCanvas:null,
        testHeatmapContext:null,

        // Whether a worker is currently running ( stopping the 'begin' button
        // being clicked multiple times)
        running:false,

        // The currently plotted chart data
        chartData:[],

        // Default value for the background of the canvas
        defaultValue: {
            'r':0,
            'g':0,
            'b':0,
            'a':1 // 0: fully transparent -> 1: not transparent
        },

        // The currently running worker
        worker:null,

        lasttime:null,

        currentRow:0,

        // Populated during drawing, but used at the end to show a histogram
        // of time taken per pixel.
        frequency: {
            keys:{},
            increment: function(x) {
                if (x in this.keys) {
                    this.keys[x]++;
                } else {
                    this.keys[x] = 0;
                }
            },

            toArray: function() {
                var response = [];
                $.each(this.keys, function(key, value) {
                    response.push([key, value]);
                });

                return response;
            }
        },

        setMethod: function(method) {
            switch(method) {
                case "original":
                case "ORIGINAL":
                    this.worker = new Worker('original-generator.js');
                    this.worker.addEventListener(
                        'message', $.proxy(this.draw, this), false
                    );
                    break;
                case "iterate":
                case "ITERATE":
                    this.worker = new Worker('iterative-generator.js');
                    this.worker.addEventListener(
                        'message', $.proxy(this.draw, this), false
                    );
                    break;
                case "path":
                case "PATH":
                    this.worker = new Worker('path-generator.js');
                    this.worker.addEventListener(
                        'message', $.proxy(this.draw, this), false
                    );
                    break;
                case "spiral":
                case "SPIRAL":
                    this.worker = new Worker('spiral-generator.js');
                    this.worker.addEventListener(
                        'message', $.proxy(this.draw, this), false
                    );
                    break;
                case "spiralout":
                case "SPIRALOUT":
                    this.worker = new Worker('spiral-out-generator.js');
                    this.worker.addEventListener(
                        'message', $.proxy(this.draw, this), false
                    );
                    break;
            }

            if (this.testHeatmapWorker !== null) {
                this.testHeatmapWorker.terminate();
            }
            if (this.canDrawHeatmap) {
                this.heatmapWorker = new Worker('heatmap.js');
                this.heatmapWorker.addEventListener(
                    'message', $.proxy(this.drawHeatmap, this), false
                );
            }
        },

        draw: function(e) {
            if (e.data.running == true) {
                var colour = e.data.colour;
                var coords = e.data.coordinates;
                var now = Date.now();

                if (e.data.rowComplete == true) {
                    this.plot(this.currentRow, (now - this.lastrowtime));
                    this.lastrowtime = now;
                    this.currentRow++;
                }

                this.px[0] = colour.r;
                this.px[1] = colour.g;
                this.px[2] = colour.b
                this.px[3] = 255;
                this.context.putImageData(this.smallImageData, coords.x, coords.y);

                if (this.canDrawHeatmap) {
                    this.heatmapWorker.postMessage({
                        'time':(now - this.lasttime),
                        'coords':{
                            'x':coords.x,
                            'y':coords.y
                        }
                    });
                }
                this.frequency.increment(now - this.lasttime);

                this.lasttime = now;
            } else {
                $.plot(
                    $('#timefrequency'),
                    [{
                        'data':this.frequency.toArray(),
                        'bars':{'show':true}
                    }]
                );
                console.log("Finished at: " + Date.now());
                this.running = false;
                console.log("Took: " + (Date.now() - this.started));
            }
        },

        drawHeatmap: function(e) {
            var colour = e.data.colour;
            var coords = e.data.coordinates;
            this.heatMapPx[0] = colour.r;
            this.heatMapPx[1] = colour.g;
            this.heatMapPx[2] = colour.b
            this.heatMapPx[3] = 255;
            this.heatmapContext.putImageData(this.heatMapSmallImageData, coords.x, coords.y);
        },

        plot: function(x, value) {
            this.chartData.push([x, value]);
            $.plot($("#flotchart"), [this.chartData]);
        },

        random: function() {
            var imData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            var data = imData.data;
            for (var i = 0; i < data.length; i++) {
                data[i] = parseInt(Math.random() * 255);
            }
            this.context.putImageData(imData, 0, 0);
        },

        init: function() {
            // Where the colours go
            this.canvas = $(document).find("#area")[0];
            this.context = this.canvas.getContext('2d');
            this.imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            this.smallImageData = this.context.createImageData(1, 1);
            this.px = this.smallImageData.data;

            this.heatmap = $(document).find("#heatmap")[0];

            // Area for example of colours used in the heatmap
            this.heatmapexample = $(document).find("#heatmapexample")[0];
            this.heatmapexampleContext = this.heatmapexample.getContext('2d');
        },

        started: null,
        canDrawHeatmap:false,
        begin: function() {
            if (this.running === true) {
                return;
            }

            $.plot($("#flotchart"), [this.chartData]);

            this.canDrawHeatmap = $(document).find("#createheatmap option:selected").val() === 'yes';
            // Main heatmap area
            if (this.canDrawHeatmap) {
                this.heatmapContext = this.heatmap.getContext('2d');
                this.heatMapImageData = this.heatmapContext.getImageData(0, 0, this.heatmap.width, this.heatmap.height);
                this.heatMapSmallImageData = this.heatmapContext.createImageData(1, 1);
                this.heatMapPx = this.heatMapSmallImageData.data;
            }

            var method = $(document).find("#method option:selected").val();
            this.setMethod(method);

            this.lastrowtime = Date.now();
            this.lasttime = Date.now();
            console.log("Started at: " + this.lastrowtime);

            this.worker.postMessage({
                'canvas':{
                    width:this.canvas.width,
                    height:this.canvas.height
                },
                'default':this.defaultValue
            });
            this.running = true;
            this.started = Date.now();
        },

        testHeatmap: function() {
            this.testHeatmapWorker = new Worker('heatmap.js');
            this.testHeatmapWorker.addEventListener(
                'message', $.proxy(this.drawTestHeatmap, this), false
            );
            this.testHeatmapCanvas = $("#heatmapexample")[0];
            this.testHeatmapContext = this.testHeatmapCanvas.getContext('2d');
            this.testHeatmapWorker.postMessage({'test':true});
        },

        drawTestHeatmap: function(e) {
            var width = Math.floor($(this.testHeatmapCanvas).width() / e.data.colours) - 1;
            var height = this.testHeatmapCanvas.height;
            var colour = e.data.colour;
            this.testHeatmapContext.fillStyle = window.ImageUtils.rgbToHex(
                colour.r, colour.g, colour.b
            );
            this.testHeatmapContext.fillRect(e.data.x * width/2, 0, width, height);
        },

        downloadCanvas: function(link) {
            var parts = this.canvas.toDataURL().match(/data:([^;]*)(;base64)?,([0-9A-Za-z+/]+)/);
            var binStr = atob(parts[3]);

            var buf = new ArrayBuffer(binStr.length);
            var view = new Uint8Array(buf);
            for (var i = 0; i < view.length; i++) {
                view[i] = binStr.charCodeAt(i);
            }
            var blob = new Blob([view], {'type':parts[1]});
            var URL = webkitURL.createObjectURL(blob);
            link.href = URL;
            link.download = this.canvas.width + "x" + this.canvas.height + "@" + Date.now() + ".png";
        }
    }

    $(document).find("#start").on('click', function() {
        window.Image.begin();
    });

    $(document).find("#heatmaptest").on('click', function() {
        window.Image.testHeatmap();
    });

    $("#downloadimage")[0].addEventListener('click', function(){
        window.Image.downloadCanvas(this);
    }, false);

    $(document).find("#size").on('change', function() {
        var val = $(this).val();
        $(window.Image.canvas).attr({'width':val, 'height':val});
        $(window.Image.heatmap).attr({'width':val, 'height':val});
    });

    window.Image.init();
});
