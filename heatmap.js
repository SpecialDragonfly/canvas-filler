function Point(r, g, b, a) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;

    this.componentToHex = function(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    };
    this.hash = function() {
        return "#" + this.componentToHex(this.r) +
                this.componentToHex(this.g) +
                this.componentToHex(this.b) +
                this.componentToHex(this.a);
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

var Map = {
    colours:[],
    coloursLength:0,

    init: function() {
        console.log("Heatmap: Initilized");
        r = 0;
        g = 0;
        b = 0;

        // First colour is white
        this.colours.push(new Point(r, g, b));

        var delta = 16;

        // Then we go from very red to very green
        for (var r = 255, g = 0; r >= 0; r -= delta, g += delta) {
            var point = new Point(r, g, b);
            this.colours.push(new Point(r, g, b));
        }

        r = 0;

        // Then very green to very blue
        for (var g = 255, b = 0; g >= 0; g -= delta, b += delta) {
            var point = new Point(r, g, b);
            this.colours.push(new Point(r, g, b));
        }

        g = 0;

        // Then very blue back to very red
        for (var b = 255, r = 0; b >= 0; b -= delta, r += delta) {
            var point = new Point(r, g, b);
            this.colours.push(new Point(r, g, b));
        }

        console.log("Heatmap: Using " + this.colours.length + " colours");
        this.coloursLength = this.colours.length;
    },

    getColourForValue: function(x) {
        var mod = x % (this.coloursLength);
        return this.colours[mod];
    }
}
Map.init();

self.addEventListener('message', function(e) {
    var time = e.data.time;
    var coords = e.data.coords;

    if (e.data.test === true) {
        for (var i = 0, length = Map.coloursLength * 2; i < length; i++) {
            var colour = Map.getColourForValue(i);
            self.postMessage({
                'colour':Map.getColourForValue(i).toSimpleObject(),
                'colours':Map.coloursLength * 2,
                'x':i
            });
        }
    } else {
        self.postMessage({
            'colour':Map.getColourForValue(time).toSimpleObject(),
            'coordinates':{
                'x':coords.x,
                'y':coords.y
            }
        });
    }
});
