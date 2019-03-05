"use strict";

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
        },
				"diagonal": function() {
					return new Worker('workers/diagonal-generator.js')
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
            'b':0
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
								case "diagonal":
								case "DIAGONAL":
										this.worker = window.workers.get('diagonal');
										break;
            }

        },

        _initAnimation: function() {
          this.animate()
        },

        animate: function() {
					this.writePipelineLength(this.pixelCount)

          requestAnimationFrame(this.animate.bind(this))
        },

        writePipelineLength: function(val) {
          this.pipelineStats.html("Length: " + val)
        },

				pixelCount: 0,
        responseFromWorker: function(e) {
          if (e.data.type === 'status') {
            this.running = e.data.running
						if (!this.running) {
							console.log("Ended at: " + (Date.now()));
							let pixels = this.canvas.width * this.canvas.height;
							let duration = (Date.now() - this.started) / 1000;
							console.log(pixels + " pixels took " + duration + " seconds (" + (pixels/duration) + " px/s)")
						}
					} else if (e.data.type === 'final') {
						this.context.putImageData(e.data.data, 0, 0);
          } else if (e.data.type === 'count') {
						this.pixelCount = e.data.count;
          } else if (e.data.type === 'debug') {
						console.log(e.data.msg)
					}
        },

        init: function() {
            // The canvas the user can see
            this.canvas = $(document).find("#area")[0];
            this.context = this.canvas.getContext('2d', { alpha: false });
            this.pipelineStats = $(document).find(".pipelineStats").find("#quantity")
        },

				started:0,
        begin: function() {
            if (this.running === true) {
                return;
            }

            var width = $(document).find("#width").val();
            var height = $(document).find("#height").val();
            $(window.Image.canvas).attr({'width':width, 'height':height})
            $(document).find("#total-pixels").html(
							"Total pixels: " + (width * height)
						)
            if (width * height > (4096 * 4096)) {
              return
            }

            this.drawingQueue = []
            this.running = true;

						this.started = Date.now();

            setTimeout(
              $.proxy(function() {
                this._initAnimation()
              }, this),
              1000
            )

            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.worker.postMessage({
                'cmd':'start',
                'canvas':{
                    width:this.canvas.width,
                    height:this.canvas.height
                },
								'imageData':this.context.getImageData(0, 0, this.canvas.width, this.canvas.height),
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

    window.Image.init();
});
