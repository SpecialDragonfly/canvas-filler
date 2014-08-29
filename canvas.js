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
        canvas:null,
        context:null,
        lasttime: 0,
        running:false,

        defaultValue: {
            'r':0,
            'g':0,
            'b':0,
            'a':1 // 0: fully transparent -> 1: not transparent
        },
        worker:null,

        setMethod: function(method) {
            switch(method){
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
            }
        },

        draw: function(e) {
            if (e.data.running == true) {
                if (e.data.rowComplete == true) {
                    var now = Date.now();
                    console.log("Row complete in: " + (now - this.lasttime));
                    this.lasttime = now;
                }
                var colour = e.data.colour;
                var coords = e.data.coordinates;
                this.context.fillStyle = window.ImageUtils.rgbToHex(
                        colour.r, colour.g, colour.b
                );
                this.context.fillRect(coords.x, coords.y, 1, 1);
            } else {
                console.log("Finished at: " + Date.now());
                this.running = false;
            }
        },

        init: function() {
            this.canvas = $(document).find("#area")[0];
            this.context = this.canvas.getContext('2d');
        },

        begin: function() {
            if (this.running === true) {
                return;
            }
            var method = $(document).find("#method option:selected").val();
            this.setMethod(method);

            this.lasttime = Date.now();
            console.log("Started at: " + this.lasttime);

            this.worker.postMessage({
                'canvas':{
                    width:this.canvas.width,
                    height:this.canvas.height
                },
                'default':this.defaultValue
            });
            this.running = true;
        }
    }

    $(document).find("#start").on('click', function() {
        window.Image.begin();
    });

    window.Image.init();
});
