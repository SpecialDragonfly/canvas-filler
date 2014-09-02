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
        // Last time a row or column was completed
        lastrowtime: 0,

        heatmap:null,
        heatmapContext:null,

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
            }

            if (this.testHeatmapWorker !== null) {
                this.testHeatmapWorker.terminate();
            }
            this.heatmapWorker = new Worker('heatmap.js');
            this.heatmapWorker.addEventListener(
                'message', $.proxy(this.drawHeatmap, this), false
            );
        },

        lasttime:null,

        currentRow:0,
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
                this.context.fillStyle = window.ImageUtils.rgbToHex(
                    colour.r, colour.g, colour.b
                );
                this.context.fillRect(coords.x, coords.y, 1, 1);
                this.heatmapWorker.postMessage({
                    'time':(now - this.lasttime),
                    'coords':{
                        'x':coords.x,
                        'y':coords.y
                    }
                });
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
            }
        },

        drawHeatmap: function(e) {
            var colour = e.data.colour;
            var coords = e.data.coordinates;
            this.heatmapContext.fillStyle = window.ImageUtils.rgbToHex(
                colour.r, colour.g, colour.b
            );
            this.heatmapContext.fillRect(coords.x, coords.y, 1, 1);
        },

        plot: function(x, value) {
            this.chartData.push([x, value]);
            $.plot($("#flotchart"), [this.chartData]);
        },

        init: function() {
            // Where the colours go
            this.canvas = $(document).find("#area")[0];
            this.context = this.canvas.getContext('2d');

            // Main heatmap area
            this.heatmap = $(document).find("#heatmap")[0];
            this.heatmapContext = this.heatmap.getContext('2d');

            // Area for example of colours used in the heatmap
            this.heatmapexample = $(document).find("#heatmapexample")[0];
            this.heatmapexampleContext = this.heatmapexample.getContext('2d');
        },

        heatmapWorker:null,

        begin: function() {
            if (this.running === true) {
                return;
            }

            $.plot($("#flotchart"), [this.chartData]);

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
        },

        testHeatmapWorker:null,
        testHeatmapCanvas:null,
        testHeatmapContext:null,
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
        }
    }

    $(document).find("#start").on('click', function() {
        window.Image.begin();
    });

    $(document).find("#heatmaptest").on('click', function() {
        window.Image.testHeatmap();
    });

    window.Image.init();
});
