/* Engine.js
 * This file provides the game loop functionality (update entities and render),
 * draws the initial game board on the screen, and then calls the update and
 * render methods on your player and enemy objects (defined in your app.js).
 *
 * A game engine works by drawing the entire game screen over and over, kind of
 * like a flipbook you may have created as a kid. When your player moves across
 * the screen, it may look like just that image/character is moving or being
 * drawn but that is not the case. What's really happening is the entire "scene"
 * is being drawn over and over, presenting the illusion of animation.
 *
 * This engine is available globally via the Engine variable and it also makes
 * the canvas' context (ctx) object globally available to make writing app.js
 * a little simpler to work with.
 */

 
 /*
    use a JSon object for global game parameters
 */
 var gameParams = {
    // size of world in rows & cols
    "numRows" : 7,
    "numCols" : 7,
    // game sprites have a lot of "dead" space around them
    // use roi for sprites to make bound boxes tighter & improve collision detection
    // x, y, wd, ht
    "playerRoi" : "16, 62, 72, 76",
    "carRoi"    : "0, 76, 100, 66",
    "tileRoi"   : "0, 50, 100, 80",
    "heartRoi"  : "0, 0, 46, 46",
    "gemRoi"    : "0, 0, 50, 52",
    "minCarSpeed" : 100,
    "maxCarSpeed" : 300,
    "maxNumLives" : 3,
    // draw bounding boxes for diagnostics
    "drawBBoxes" : false,
    // game state
    "gameState" : {
        "intro"    : 0,
        "playing"  : 1,
        "dying"    : 2,
        "spawning" : 3
    },
    // set initial state to intro
    "currentGameState" : 0
    
};
 
 /* 
    base entity class with
        pos - top left location on screen
        vel - velocity
        imageName - string to index into resources listStyleType
        rect - roi into the sprite to remove surrounding dead space
 */
var BaseEntity = function(pos, vel, imageName, roiString) {
    this.pos = pos;
    this.vel = vel;
    this.imageName = imageName;
    // parse/tokenize the sprite roi string
    var tokenList = roiString.split(",");
    this.rect = new Rect(Number(tokenList[0].trim()),
                         Number(tokenList[1].trim()),
                         Number(tokenList[2].trim()),
                         Number(tokenList[3].trim()) );
}

BaseEntity.prototype.render = function() {
    // draw the entity
     if (gameParams["currentGameState"] == gameParams.gameState.intro) {
     }
     else {
        ctx.drawImage(Resources.get(this.imageName), 
                      this.rect.min.x, 
                      this.rect.min.y,
                      this.rect.size.x,
                      this.rect.size.y,
                      this.pos.x, 
                      this.pos.y,
                      this.rect.size.x,
                      this.rect.size.y);
                      
        if (gameParams.drawBBoxes) {
            ctx.strokeRect(this.pos.x, 
                           this.pos.y,
                           this.rect.size.x,
                           this.rect.size.y);
        }                  
    }
}
 
// compute and return bounding box (pos, rect.size)
BaseEntity.prototype.getBBox = function() {
    return new Rect(this.pos.x, this.pos.y, 
                    this.rect.size.x, this.rect.size.y);
}
 
// derived player class
var Player = function(pos, vel, imageName, roiString) {
    BaseEntity.call(this, pos, vel, imageName, roiString);

    this.score = 0;
    this.numLives = 3;
    
    // store the background tile roi for spawning in setRandom() below
    var tokenList = gameParams["tileRoi"].split(",");
    this.bgTileRect = new Rect(Number(tokenList[0].trim()),
                               Number(tokenList[1].trim()),
                               Number(tokenList[2].trim()),
                               Number(tokenList[3].trim()) );

    
    // LUT of user input movement amounts
    // player roi not same size as background tile roi so use bg size for movement
    this. deltaList = {
        "left"  : new Vec2(-this.bgTileRect.size.x/2, 0),
        "right" : new Vec2(this.bgTileRect.size.x/2, 0),
        "up"    : new Vec2(0, -this.bgTileRect.size.y/2),
        "down"  : new Vec2(0,  this.bgTileRect.size.y/2)
    };
}
Player.prototype = Object.create(BaseEntity.prototype);
Player.prototype.constructor = Player;

// update when game state is player dying
// for intro and playing states, player update handled in handleInput &
// collision in car update
Player.prototype.update = function(dt, player) {
    if (gameParams["currentGameState"] == gameParams.gameState.dying) {
        var delta = new Vec2(this.vel.x * dt, this.vel.y * dt); 
        this.pos.add(this.pos, delta);

        // check to see if player has moved off the screen        
        if ( !this.getBBox().collide(gameParams["worldBBox"]) ) {             
            // offscreen now so check for end game or respawn
            if (this.numLives == 0) {
                // end of game
                gameParams["currentGameState"] = gameParams.gameState.intro;
            }
            else {
                // respawn
                this.vel = new Vec2(0, 0);
                this.setRandom();
                gameParams["currentGameState"] = gameParams.gameState.playing;
            }
        }        
    }
} 

 
Player.prototype.setRandom = function() {
    // spawn player in random background tile on bottom rows
    var row = gameParams["numRows"] - 1;
    var col = randomInt(0, gameParams["numCols"] - 1);
    this.pos.x = (col + 0.5) * gameParams["bgTileRoiRect"].size.x - this.rect.size.x * 0.5;
    this.pos.y = (row + 0.5) * gameParams["bgTileRoiRect"].size.y - this.rect.size.y * 0.5;;
}
 
Player.prototype.handleInput = function(input) {
    if (gameParams["currentGameState"] == gameParams.gameState.intro  && input == "space") {
        // reset score, lives and some game params
        this.score = 0;
        this.numLives = gameParams["maxNumLives"];
        gameParams["minCarSpeed"] = 100;
        gameParams["maxCarSpeed"] = 300;
        gameParams["currentGameState"] = gameParams.gameState.playing;
        
        // respawn player
        this.setRandom();
    }
    else if (gameParams["currentGameState"] == gameParams.gameState.playing && input != "space") {
        var delta = Object.create(this.deltaList[input]);
        if (typeof delta !== 'undefined') {
            // create new bbox to see if player stays in bounds
            var newBBox = this.getBBox();
            newBBox.translate(delta);
            // don't let player go offscreen
            if (newBBox.isInside(gameParams["worldBBox"])) {
                this.pos.add(this.pos, delta);
            }
            
            // check if player has reach the other side of the road
            if (this.pos.y + this.rect.size.y < 2 * gameParams["bgTileRoiRect"].size.y) {
                // award a point
                this.score += 1;
                
                // increase difficulty
                gameParams["minCarSpeed"] += 10;
                gameParams["maxCarSpeed"] += 10;
                
                // respawn player
                this.setRandom();
            }
        }
    }
}
 
// derived car class
var Car = function(pos, vel, imageName, flippedImageName,roiString) {
    BaseEntity.call(this, pos, vel, imageName, roiString);
    this.flippedImageName = flippedImageName;
}
Car.prototype = Object.create(BaseEntity.prototype);
Car.prototype.constructor = Car;

Car.prototype.update = function(dt, player) {

    var delta = new Vec2(this.vel.x * dt, this.vel.y * dt); 
    this.pos.add(this.pos, delta);

    // check to see if car has moved off the screen
    if ( (this.vel.x > 0 && this.pos.x > gameParams["worldBBox"].size.x) ||
         (this.vel.x < 0 && this.pos.x + this.rect.size.x < 0 ) ) {
        this.setRandom();
    }
    
    // check for car vs. player collisions if in playing state
    if (gameParams["currentGameState"] == gameParams.gameState.playing) {
        var playerBBox = player.getBBox();
        var carBBox = this.getBBox();
        if (carBBox.collide(playerBBox)) {
        
            // launch player offscreen and set state to dying
            player.vel.sub(playerBBox.ctr(), carBBox.ctr());
            player.vel.scaleToLength(this.vel.length() * 2);
            player.numLives = Math.max(player.numLives-1, 0);
            gameParams["currentGameState"] = gameParams.gameState.dying;            
        }    
    }
}

Car.prototype.render = function() {
    // draw the entity
    var imageName = this.imageName;
    if (Math.sign(this.vel.x) <= 0) {
        imageName = this.flippedImageName;
    }
    
    ctx.drawImage(Resources.get(imageName), 
                  this.rect.min.x, 
                  this.rect.min.y,
                  this.rect.size.x,
                  this.rect.size.y,
                  this.pos.x, 
                  this.pos.y,
                  this.rect.size.x,
                  this.rect.size.y);
                  
    if (gameParams.drawBBoxes) {
        ctx.strokeRect(this.pos.x, 
                       this.pos.y,
                       this.rect.size.x,
                       this.rect.size.y);
    }
}
 
// set car to somewhat random position offscreen w/ rand vel
Car.prototype.setRandom = function() {
    // left or right side??
    var startPos;
    var sign;
    if (Math.random() < 0.5) {
        // left side of screen
        startPos = 0
        sign = -1;
    }
    else {
        // right side of screen
        startPos = gameParams["worldBBox"].size.x;
        sign = +1;
    }
    
    this.pos.x = startPos + sign * (this.rect.size.x + Math.random() * this.rect.size.x);
    this.vel.x = -sign * (gameParams["minCarSpeed"] + Math.random() * (gameParams["maxCarSpeed"] - gameParams["minCarSpeed"]));
    
}

// derived goody class
// could either add to points or num lives
// has lifetime that counts down causing it to spawn or disappear
var Goody = function(pos, pointValue, numLives, lifetime, imageName, roiString) {
    BaseEntity.call(this, pos, Vec2(0, 0), imageName, roiString);
    this.pointValue = pointValue;
    this.numLives = numLives;
    this.lifetime = lifetime;
}
Goody.prototype = Object.create(BaseEntity.prototype);
Goody.prototype.constructor = Goody;

Goody.prototype.update = function(dt, player) {

    this.lifetime -= dt;
    
    if (this.lifetime < 0) {
        this.setRandom();
    }
    else {

        // player and car rects are roi's rather than bounding boxes
        // easy to convert - just add position to anchor point
        var playerBBox = player.getBBox();
        var goodyBBox = this.getBBox();
        if (goodyBBox.collide(playerBBox)) {
            // increase score or lives
            player.score += this.pointValue;
            player.numLives = Math.min(player.numLives + this.numLives, gameParams["maxNumLives"]);
            
            // increase difficulty
            gameParams["minCarSpeed"] += 10;
            gameParams["maxCarSpeed"] += 10;

            
            this.setRandom();
        }    
    }
}

// set Goody to somewhat random position on or offscreen and reset its lifetime
Goody.prototype.setRandom = function() {
    // is onscreen??
    if (gameParams["worldBBox"].contains(this.pos)) {
        // move way offscreen and reset time
        this.pos.x = -10000;
        this.lifetime = 5 + Math.random() * 5;
    }
    else {
        // spawn goody in random background tile on one of the middle 3 rows
        var row = randomInt(2, 4);
        var col = randomInt(0, gameParams["numCols"] - 1);
        this.pos.x = (col + 0.5) * gameParams["bgTileRoiRect"].size.x - this.rect.size.x * 0.5;
        this.pos.y = (row + 0.5) * gameParams["bgTileRoiRect"].size.y - this.rect.size.y * 0.5;;
        this.lifetime = 5 + Math.random() * 5;
    }    
}

// derived GUIElement class
// could either be text (like for score) or series of images (for lives)
// refObject is reference to other entity to look up value
var GUIElement = function(pos, text, imgScale, imageName, roiString) {
    BaseEntity.call(this, pos, Vec2(0, 0), imageName, roiString);
    this.text = text;
    this.imgScale = imgScale;
}
GUIElement.prototype = Object.create(BaseEntity.prototype);
GUIElement.prototype.constructor = GUIElement;

GUIElement.prototype.update = function(dt, player) {
    // logic for type of qui element read from text
    if (this.text.includes("score") ) {
        this.text = "score: " + player.score;
    }
    else if (this.text.includes("lives") ) {
        this.numLives = player.numLives;
    }
}

GUIElement.prototype.render = function() {
    // logic for type of qui element read from text
    if (gameParams["currentGameState"] == gameParams.gameState.intro) {

        if (this.text.includes("Press") || this.text.includes("arrow") ) {

            ctx.fillStyle = "blue";
            ctx.font = "bold 24px Arial";
            ctx.fillText(this.text, this.pos.x, this.pos.y);
        }
        
    }

    if (this.text.includes("score") ) {
        ctx.fillStyle = "blue";
        ctx.font = "bold 16px Arial";
        ctx.fillText(this.text, this.pos.x, this.pos.y);
    }
    
    if (this.text.includes("lives") ) {
        
        for (var i = 0; i < this.numLives; i++) {
            ctx.drawImage(Resources.get(this.imageName), 
                          this.rect.min.x, 
                          this.rect.min.y,
                          this.rect.size.x,
                          this.rect.size.y,
                          this.pos.x + i * this.rect.size.x * this.imgScale, 
                          this.pos.y,
                          this.rect.size.x * this.imgScale,
                          this.rect.size.y * this.imgScale);
        }        
    }
}

 
// entity list class
// could contain car/bug, goody or UIElement for rendering & updating
var EntityList = function() {
    // init to empty list
    this.list = [];
    
}
 
EntityList.prototype.addCar = function(pos, vel, imageName, flippedImageName, roiString) {
    this.list.push(new Car(pos, vel, imageName, flippedImageName, roiString));
    
    // reset to random pos & vel
    this.list[this.list.length-1].setRandom();
    
}

EntityList.prototype.addGoody = function(pointValue, numLives, imageName, roiString) {
    // put the new goody initially offscreen with random lifetime
    this.list.push(new Goody(new Vec2(-10000, 0), 
                             pointValue, numLives,  
                             5 + Math.random() * 5,
                             imageName, roiString));
}

EntityList.prototype.addGUIElement = function(pos, text, imgScale, imageName, roiString) {
    // put the new goody initially offscreen with random lifetime
    this.list.push(new GUIElement(pos, text, imgScale, imageName, roiString));
}
 
// update cars and check for collision with player
EntityList.prototype.update = function(dt, player) {

    for(i=0; i < this.list.length; i++) {
        this.list[i].update(dt, player);
        
        // if this item is a goody, check to see if it hits a car and remove if so
        if (this.list[i] instanceof Goody) {
            for(j=0; j < this.list.length; j++) {
                if (this.list[j] instanceof Car) {
                    var carBBox = this.list[j].getBBox();
                    var goodyBBox = this.list[i].getBBox();
                    if (goodyBBox.collide(carBBox)) {
                        
                        this.list[i].setRandom();
                    }    
                    
                }
            }
        
        }
        

    }
}
 
EntityList.prototype.render = function() {
    for(i=0; i < this.list.length; i++) {
        this.list[i].render();
    }
}
 
 //UIEntity = function(pos, 
  
 
var Engine = (function(global) {
    /* Predefine the variables we'll be using within this scope,
     * create the canvas element, grab the 2D context for that canvas
     * set the canvas elements height/width and add it to the DOM.
     */
    var doc = global.document,
        win = global.window,
        canvas = doc.createElement('canvas'),
        ctx = canvas.getContext('2d'),
        lastTime;

    // each image is 101 x 171 
    // but it has about 48 transparent pixels at the top??
    // and has a "shadow" region that starts at around y = 130
    // use an roi to remove this "dead" space
    var numRows = gameParams["numRows"] ;
    var numCols = gameParams["numCols"] ;

    // parse/tokenize the background tile sprite roi string
    var tokenList = gameParams["tileRoi"].split(",");
    var bgTileRoiRect = new Rect(Number(tokenList[0].trim()),
                                 Number(tokenList[1].trim()),
                                 Number(tokenList[2].trim()), 
                                 Number(tokenList[3].trim()) );
    // add this bg roi rect to global JSon object for use in spawning
    gameParams["bgTileRoiRect"] = bgTileRoiRect;
    // set up lanes for cars
    var lane0 = 2 * bgTileRoiRect.size.y;
    var lane1 = 3 * bgTileRoiRect.size.y;
    var lane2 = 4 * bgTileRoiRect.size.y;
        
    
    canvas.width  = numCols * bgTileRoiRect.size.x;
    canvas.height = numRows * bgTileRoiRect.size.y;
    doc.body.appendChild(canvas);
    
    // add canvas bbox to game params for intersection testing
    gameParams["worldBBox"] = new Rect(0, 0, canvas.width, canvas.height);
    
    // create the player 
    var player = new Player(new Vec2(0, 0), new Vec2(0.1, 0), 
                            "images/char-boy.png", gameParams["playerRoi"]);
    player.setRandom();
    // export player so to hook up input event handling
    global.player = player;

    // create the entity list to hold cars/bugs, goodies, UIElements
    var entityList = new EntityList();
    
    // add cars
    entityList.addCar(new Vec2(0, lane0), new Vec2(0.5, 0), 
                      "images/enemy-bug.png", "images/enemy-bug-flip.png", 
                      gameParams["carRoi"]);
    entityList.addCar(new Vec2(0, lane1), new Vec2(0.5, 0), 
                      "images/enemy-bug.png", "images/enemy-bug-flip.png", 
                      gameParams["carRoi"]);
    entityList.addCar(new Vec2(0, lane2), new Vec2(0.5, 0), 
                      "images/enemy-bug.png", "images/enemy-bug-flip.png", 
                      gameParams["carRoi"]);

    // add goodys
    entityList.addGoody(3, 0, 
                      "images/GemBlue.png", 
                      gameParams["gemRoi"]);
    
    entityList.addGoody(0, 1, 
                      "images/Heart.png", 
                      gameParams["heartRoi"]);
                      
    // add gui elements for intro text, score and lives
    // intro text & instructions
    entityList.addGUIElement(new Vec2(canvas.width/2 - 160, canvas.height/2),     
                            "Use arrow keys to cross the road", 1, null, "0, 0, 0, 0");

    entityList.addGUIElement(new Vec2(canvas.width/2 - 160, canvas.height/2 + 30),     
                            "Press spacebar to begin", 1, null, "0, 0, 0, 0");

                            
    // score
    entityList.addGUIElement(new Vec2(10, 30), "score", 1, null, "0, 0, 0, 0");
    
    // lives - uses scaled player sprite as icon
    var imgScale = 0.25;
    var tokens = gameParams["playerRoi"].split(",");
    var playerRoiWd = Number(tokens[2].trim());
    var livesXPos = canvas.width - 2 * playerRoiWd * imgScale * gameParams["maxNumLives"]; 
    entityList.addGUIElement(new Vec2(livesXPos, 20), "lives", imgScale, "images/char-boy.png", gameParams["playerRoi"]);

    /* This function serves as the kickoff point for the game loop itself
     * and handles properly calling the update and render methods.
     */
    function main() {   
    
    
        /* Get our time delta information which is required if your game
         * requires smooth animation. Because everyone's computer processes
         * instructions at different speeds we need a constant value that
         * would be the same for everyone (regardless of how fast their
         * computer is) - hurray time!
         */
        var now = Date.now(),
        dt = (now - lastTime) / 1000.0;

        /* Call our update/render functions, pass along the time delta to
         * our update function since it may be used for smooth animation.
         */
        update(dt);
        render();

        /* Set our lastTime variable which is used to determine the time delta
         * for the next time this function is called.
         */
        lastTime = now;

        /* Use the browser's requestAnimationFrame function to call this
         * function again as soon as the browser is able to draw another frame.
         */
        win.requestAnimationFrame(main);
    };

    /* This function does some initial setup that should only occur once,
     * particularly setting the lastTime variable that is required for the
     * game loop.
     */
    function init() {
        reset();
        lastTime = Date.now();
        main();
    }

    /* This function is called by main (our game loop) and itself calls all
     * of the functions which may need to update entity's data. Based on how
     * you implement your collision detection (when two entities occupy the
     * same space, for instance when your character should die), you may find
     * the need to add an additional function call here. For now, we've left
     * it commented out - you may or may not want to implement this
     * functionality this way (you could just implement collision detection
     * on the entities themselves within your app.js file).
     */
    function update(dt) {
        updateEntities(dt);
        // checkCollisions();
    }

    /* This is called by the update function  and loops through all of the
     * objects within your allEnemies array as defined in app.js and calls
     * their update() methods. It will then call the update function for your
     * player object. These update methods should focus purely on updating
     * the data/properties related to  the object. Do your drawing in your
     * render methods.
     */
    function updateEntities(dt) {
        /*
        allEnemies.forEach(function(enemy) {
            enemy.update(dt);
        });*/
        
        player.update(dt);
        
        entityList.update(dt, player);
    }

    /* This function initially draws the "game level", it will then call
     * the renderEntities function. Remember, this function is called every
     * game tick (or loop of the game engine) because that's how games work -
     * they are flipbooks creating the illusion of animation but in reality
     * they are just drawing the entire screen over and over.
     */
    function render() {
        /* This array holds the relative URL to the image used
         * for that particular row of the game level.
         */
        var rowImages = [
                'images/grass-block.png',   // Row 0 of 2 of grass
                'images/grass-block.png',   // Row 1 of 2 of grass
                'images/stone-block.png',   // Row 2 of 3 of stone
                'images/stone-block.png',   // Row 3 of 3 of stone
                'images/stone-block.png',   // Row 4 of 3 of stone
                'images/grass-block.png',   // Row 5 of 2 of grass
                'images/grass-block.png'    // Row 6 of 2 of grass
            ],
            row, col;

        /* Loop through the number of rows and columns we've defined above
         * and, using the rowImages array, draw the correct image for that
         * portion of the "grid"
         */
        for (row = 0; row < numRows; row++) {
            for (col = 0; col < numCols; col++) {
                /* The drawImage function of the canvas' context element
                 * requires 3 parameters: the image to draw, the x coordinate
                 * to start drawing and the y coordinate to start drawing.
                 * We're using our Resources helpers to refer to our images
                 * so that we get the benefits of caching these images, since
                 * we're using them over and over.
                 */
                ctx.drawImage(Resources.get(rowImages[row]), 
                              bgTileRoiRect.min.x, 
                              bgTileRoiRect.min.y,
                              bgTileRoiRect.size.x, 
                              bgTileRoiRect.size.y,
                              col * bgTileRoiRect.size.x, 
                              row * bgTileRoiRect.size.y,
                              bgTileRoiRect.size.x, 
                              bgTileRoiRect.size.y);
            }
        }


        renderEntities();
    }

    /* This function is called by the render function and is called on each game
     * tick. It's purpose is to then call the render functions you have defined
     * on your enemy and player entities within app.js
     */
    function renderEntities() {
        /* Loop through all of the objects within the allEnemies array and call
         * the render function you have defined.
         */
        /*
        allEnemies.forEach(function(enemy) {
            enemy.render();
        });
        */
        entityList.render();
        player.render();
    }

    /* This function does nothing but it could have been a good place to
     * handle game reset states - maybe a new game menu or a game over screen
     * those sorts of things. It's only called once by the init() method.
     */
    function reset() {
        // noop
    }

    /* Go ahead and load all of the images we know we're going to need to
     * draw our game level. Then set init as the callback method, so that when
     * all of these images are properly loaded our game will start.
     */
    Resources.load([
        'images/stone-block.png',
        'images/water-block.png',
        'images/grass-block.png',
        'images/enemy-bug.png',
        'images/enemy-bug-flip.png',
        'images/char-boy.png',
        'images/GemBlue.png',
        'images/Heart.png'
    ]);
    Resources.onReady(init);

    /* Assign the canvas' context object to the global variable (the window
     * object when run in a browser) so that developer's can use it more easily
     * from within their app.js files.
     */
    global.ctx = ctx;
    
})(this);
