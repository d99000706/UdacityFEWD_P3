
var DTOR = Math.PI / 180;
var RTOD = 180 / Math.PI;

function randomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[4 + Math.floor(Math.random() * 12)];
    }
    return color;
}

/*
 Returns a random integer between min (inclusive) and max (inclusive) 
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

Vec2 = function(x, y) {
    this.x = (x == undefined) ? 0: x;
    this.y = (y == undefined) ? 0: y;
}

Vec2.prototype.length = function() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
}

Vec2.prototype.add = function(a, b) {
    this.x = a.x + b.x;
    this.y = a.y + b.y;
}

Vec2.prototype.sub = function(a, b) {
    this.x = a.x - b.x;
    this.y = a.y - b.y;
}

Vec2.prototype.scale = function(f) {
    this.x *= f;
    this.y *= f;
}

Vec2.prototype.scaleToLength = function(newLength) {
    var length = this.length();
    if (length > 0.001) {
        this.scale(newLength / length);
    }
}

Vec2.prototype.normalize = function() {
    this.scaleToLength(1);
}

Vec2.prototype.dot = function(other) {
    return this.x * other.x + this.y * other.y;
}

// set this to projection of a onto b
Vec2.prototype.project = function(a, b) {
    var f = b.dot(a) / b.dot(b);
    this.x = b.x * f;
    this.y = b.y * f;
}

// set this to reflection of i about n
Vec2.prototype.reflect = function(i, n) {    
    this.project(i, n);
    this.scale(-2);
    this.add(this, i);
}


// return true if this rect is completely inside other rect
Vec2.prototype.isInside = function(other) {
    return this.x >= other.min.x &&
           this.x <= other.max.x &&
           this.y >= other.min.y &&
           this.y <= other.max.y;
}

Vec2.prototype.toString = function() {
    return( this.x + ", " + this.y );
}

// 2d rect for ROI and collision detection
Rect = function(x, y, wd, ht) {
    this.min = new Vec2(x, y);
    this.size = new Vec2(wd, ht);
}

// translate this box by <x, y>
Rect.prototype.translate = function(v) {
    this.min.add(this.min, v);
}

// get bottom right (max) pt
Rect.prototype.br = function() {
    return new Vec2(this.min.x + this.size.x,
                    this.min.y + this.size.y);
}
// get center pt of this rect
Rect.prototype.ctr = function() {
    return new Vec2(this.min.x + this.size.x / 2,
                    this.min.y + this.size.y / 2);
}

// returns true if pt is contained within this rect
Rect.prototype.contains = function(pt) {
    return (pt.x >= this.min.x && 
            pt.y >= this.min.y &&
            pt.x <= (this.min.x + this.size.x) &&
            pt.y <= (this.min.y + this.size.y) );
}

// check for collision, return T/F
Rect.prototype.collide = function(other) {
    var thisMax = this.br();
    var otherMax = other.br();
    return !(this.min.x > otherMax.x ||
             this.min.y > otherMax.y ||
             thisMax.x < other.min.x ||
             thisMax.y < other.min.y);       
}

// return True if this is inside other
Rect.prototype.isInside = function(other) {
    var thisMax = this.br();
    var otherMax = other.br();
    return (this.min.x >= other.min.x &&
            this.min.y >= other.min.y &&
            thisMax.x <= otherMax.x &&
            thisMax.y <= otherMax.y);
        
}
// get the vector to translate other to be contained within this
Rect.prototype.getTranslationToContain = function(other) {
    var thisMax = this.br();
    var otherMax = other.br();
    var result = new Vec2(0, 0);
    if (other.min.x < this.min.x) { result.x = this.min.x - other.min.x; }
    if (other.min.y < this.min.y) { result.y = this.min.y - other.min.y; }
    if (otherMax.x > thisMax.x) { result.x = this.max.x - other.max.x; }
    if (otherMax.y > thisMax.y) { result.y = this.max.y - other.max.y; }
    return result;
}



