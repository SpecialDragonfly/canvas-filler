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

        started: null,
        canDrawHeatmap:false,
        offscreenHeatmap:null,
        offscreenHeatmapContext:null,
        offscreenHeatMapImageData:null,
        offscreenHeatMapSmallImageData:null,

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

        stopWorker:false,

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
                    break;
                case "iterate":
                case "ITERATE":
                    this.worker = new Worker('iterative-generator.js');
                    break;
                case "path":
                case "PATH":
                    this.worker = new Worker('path-generator.js');
                    break;
                case "spiral":
                case "SPIRAL":
                    this.worker = new Worker('spiral-generator.js');
                    break;
                case "spiralout":
                case "SPIRALOUT":
                    this.worker = new Worker('spiral-out-generator.js');
                    break;
            }
            this.worker.addEventListener(
                'message', $.proxy(this.responseFromWorker, this), false
            );

            this.worker.postMessage({
                'cmd':'abilities'
            });

            if (this.testHeatmapWorker !== null) {
                this.testHeatmapWorker.terminate();
            }
        },

        setAbilities: function(abilities) {
            if (typeof(abilities.heatmap) != 'undefined' && abilities.heatmap == true) {
                $(document).find("#createheatmap").show();
                $(document).find("#heatmaparea").show();
            } else {
                $(document).find("#createheatmap").hide();
                $(document).find("#heatmaparea").show();
            }
        },

        displayHeatmap: function(heatmapData) {
            this.heatmapWorker.postMessage({
                'complete':true,
                'timings':heatmapData,
                'width':this.canvas.width,
                'height':this.canvas.height
            });
        },

        responseFromWorker: function(e) {
            if (typeof(e.data.abilities) != 'undefined') {
                this.setAbilities(e.data.abilities);
                return;
            }
            if (typeof(e.data.heatmap) != 'undefined') {
                this.displayHeatmap(e.data.heatmap);
                return;
            }

            if (typeof(e.data.imageData) != 'undefined') {
                this.context.putImageData(e.data.imageData, 0, 0);
            }
            if (e.data.running === false) {
                this.stopWorker = true;
            }
            this.copyFromMemoryToPage();
        },

        copyFromMemoryToPage: function() {
            requestAnimationFrame(
                $.proxy(function() {
                    this.worker.postMessage({
                        'cmd':'getData'
                    });
                    if (this.stopWorker == true) {
                        if (this.canDrawHeatmap) {
                            this.worker.postMessage({
                                'cmd':'heatmap'
                            });
                        }
                        this.worker.postMessage({
                            'cmd':'close'
                        });
                        this.running = false;
                        var x = Date.now();
                        console.log("Finished at: " + (x) + " taking " + (x - this.started) + " seconds");
                    }
                }, this)
            );
        },

        drawHeatmap: function(e) {
            var colours = new ImageData(e.data.timings, this.canvas.width, this.canvas.height);
            this.heatmapContext.putImageData(colours, 0, 0);
        },

        init: function() {
            // The canvas the user can see
            this.canvas = $(document).find("#area")[0];
            this.context = this.canvas.getContext('2d');
            this.imageData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

            this.heatmap = $(document).find("#heatmap")[0];

            // Area for example of colours used in the heatmap
            this.heatmapexample = $(document).find("#heatmapexample")[0];
            this.heatmapexampleContext = this.heatmapexample.getContext('2d');

            this.setMethod($(document).find("#method option:selected").val());
        },

        begin: function() {
            if (this.running === true) {
                return;
            }
            this.running = true;
            this.stopWorker = false;

            this.canDrawHeatmap = $(document).find("#createheatmap option:selected").val() === 'yes';

            // Main heatmap area
            if (this.canDrawHeatmap) {
                this.heatmapContext = this.heatmap.getContext('2d');

                this.heatmapWorker = new Worker('heatmap.js');
                this.heatmapWorker.addEventListener(
                    'message', $.proxy(this.drawHeatmap, this), false
                );
            }

            this.lastrowtime = Date.now();
            this.lasttime = Date.now();
            console.log("Started at: " + this.lastrowtime);

            this.setMethod($(document).find("#method option:selected").val());

            this.worker.postMessage({
                'cmd':'start',
                'canvas':{
                    width:this.canvas.width,
                    height:this.canvas.height,
                    imageData:this.context.getImageData(0, 0, this.canvas.width, this.canvas.height)
                },
                'default':this.defaultValue
            });
            this.copyFromMemoryToPage();
            this.started = Date.now();
        },

        // -------------------- TESTING HEATMAP CODE --------------------------------
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

        // ----------------------- DOWNLOAD CANVAS TO PNG -------------------------------
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
        },

        // ------------------------ FOR TESTING THE CANVAS WRITING CALL THIS DIRECTLY --------------------
        random: function() {
            var imData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
            var data = imData.data;
            for (var i = 0; i < data.length; i+=4) {
                data[i] = parseInt(Math.random() * 255);
                data[i + 1] = parseInt(Math.random() * 255);
                data[i + 2] = parseInt(Math.random() * 255);
                data[i + 3] = 255;
            }
            this.context.putImageData(imData, 0, 0);
        },
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

    $(document).find("#method").on('change', function() {
        var method = $(document).find("#method option:selected").val();
        window.Image.setMethod(method);
    });
    
    window.Image.init();
});
