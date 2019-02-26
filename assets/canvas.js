"use strict";

const ImageUtils = {
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
}

$(function() {
    window.workers = {
				"_cached": {
				},
				get: function(name) {
					if (this._cached[name] !== undefined) {
						return this._cached[name]
					}
					let w = window.workers[name]()
					w.addEventListener(
              'message', $.proxy(window.Image.responseFromWorker, window.Image), false
          );
					this._cached[name] = w
					return w
				},
        "original": function() {
          return new Worker('workers/original-generator.js')
        },
        "iterate": function() {
					return new Worker('workers/iterative-generator.js')
				},
        "path": function() {
					return new Worker('workers/path-generator.js')
				},
        "spiral": function() {
					return new Worker('workers/spiral-generator.js')
				},
        "spiralout": function() {
					return new Worker('workers/spiral-out-generator.js')
				}
    },

    window.Image = {
        // The canvas object for the image
        canvas:null,
        // 2D context for the canvas object for the image
        context:null,

        // Whether a worker is currently running ( stopping the 'begin' button
        // being clicked multiple times)
        running:false,

        // Default value for the background of the canvas
        defaultValue: {
            'r':0,
            'g':0,
            'b':0,
            'a':1 // 0: fully transparent -> 1: not transparent
        },

        // The currently running worker
        worker:null,

        drawingQueue:[],

        spliceAmount: 512,

        setMethod: function(method) {
            switch(method) {
                case "original":
                case "ORIGINAL":
                    this.worker = window.workers.get('original');
                    break;
                case "iterate":
                case "ITERATE":
                    this.worker = window.workers.get('iterate');
                    break;
                case "path":
                case "PATH":
                    this.worker = window.workers.get('path');
                    break;
                case "spiral":
                case "SPIRAL":
                    this.worker = window.workers.get('spiral');
                    break;
                case "spiralout":
                case "SPIRALOUT":
                    this.worker = window.workers.get('spiralout');
                    break;
            }

        },

        _initAnimation: function() {
          console.log("Animation started. Splice amount: " + this.spliceAmount);
          this.animate()
        },

        animate: function() {
					this.spliceAmount = 1024; //this.canvas.height
          let values = this.drawingQueue.splice(0, this.spliceAmount)
					while (values.length > 0) {
						let data = values.pop()
						this.draw(data.x, data.y, data.colour)
					}

          requestAnimationFrame(this.animate.bind(this))
        },

				writePipelineLength: function(val) {
					this.pipelineStats.html("Length: " + val)
				},

        draw: function(x, y, point) {
          this.context.fillStyle = "rgba("+point.r+","+point.g+","+point.b+","+(point.a)+")";
          this.context.fillRect( x, y, 1, 1 );
        },

        responseFromWorker: function(e) {
					if (e.data.type === 'status') {
						this.running = e.data.running
					} else if (e.data.type === 'count') {
						this.writePipelineLength(e.data.count)
					} else if (e.data.type === 'point') {
						this.drawingQueue.push(e.data.test);
					}
        },

        init: function() {
            // The canvas the user can see
            this.canvas = $(document).find("#area")[0];
            this.context = this.canvas.getContext('2d');
						this.pipelineStats = $(document).find(".pipelineStats").find("#quantity")
        },

        begin: function() {
            if (this.running === true) {
                return;
            }
            this.drawingQueue = []
            this.running = true;

            console.log("Started at: " + (Date.now()));

            setTimeout($.proxy(function() { this._initAnimation() }, this),
							1000
						)

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.worker.postMessage({
                'cmd':'start',
                'canvas':{
                    width:this.canvas.width,
                    height:this.canvas.height
                },
                'default':this.defaultValue
            });
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

        randomColour: function() {
            return {
                'r':parseInt(Math.random() * 255),
                'g':parseInt(Math.random() * 255),
                'b':parseInt(Math.random() * 255),
                'a':1 // 0: fully transparent -> 1: not transparent
            };
        }
    }

    $(document).find("#start").on('click', function() {
        window.Image.setMethod($(document).find("#method option:selected").val());
        window.Image.begin();
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
