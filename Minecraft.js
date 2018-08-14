"use strict"

var program;
var sunProgram;
var pickProgram;
var wireFrameProgram;


var canvas;
var gl;

// vertex attributes
var points = [];
var texCoords = [];
var pickPoints = []; // points for the offscreen framebuffer used for picking - does not include rotating cubes
var blockCenters = [];
var pickBlockCenters = []; // block centers for the offscreen framebuffer used for picking - does not include rotating cubes
var rotBools = [];
var normals = [];
var pickNormals = []; // normals for the offscreen framebuffer used for picking - does not include rotating cubes
var sunPoints = [];
var blockIndices = []; // used for offscreen buffer

var cells = [];
var world_size =50;

var near = 0.1;
var far = 3*world_size*Math.sqrt(2);

var  fovy = 70.0;  // Field-of-view in Y direction angle (in degrees)
var  aspect;       // Viewport aspect ratio

var mvMatrix, pMatrix;
var modelView, projection;
var modelViewSun, projectionSun;
var modelViewWireFrame, projectionWireFrame;

var modelViewFramebuffer;
var projectionFramebuffer;

var lightPosition;
var ambientProduct;
var diffuseProduct;
var specularProduct;


var ambientProductLoc;
var diffuseProductLoc;
var specularProductLoc;
var ambientProductTorchLoc;
var diffuseProductTorchLoc;
var specularProductTorchLoc;
var textureBlockLoc;
var shiny;
var eyeLoc;
var torchOnLoc;

var mapView = false;
var sunPosition = 80;
var sunRotation = mat4(); // rotation matrix

var eye = vec3(world_size/3, 28, world_size/3);
var at  = vec3(world_size/3-1, 28, world_size/3-1);
var up  = vec3(0.0, 1.0, 0.0);

//sun light variables
var sun = vec4(0,1,0,0);
var sunAmbientBase =  vec4(0.4, 0.4, 0.4, 1.0);
var sunDiffuseBase =  vec4(1, 1, 1, 1.0);
var sunSpecularBase = vec4(1, 1, 1, 1.0);
var sunAmbient =  vec4(0.2, 0.2, 0.2, 1.0);
var sunDiffuse =  vec4(0.75, 0.75, 0.85, 1.0);
var sunSpecular = vec4(0.75, 0.75, 0.85, 1.0);

//torch light variables
var torchAmbient =  vec4(0.0, 0.0, 0.0, 1.0);
var torchDiffuse =  vec4(0.8, 0.5, 0.3, 1.0);
var torchSpecular = vec4(0.3, 0.3, 0.3, 1.0);

//material light variables
var materialAmbient =  vec4(0.2, 0.2, 0.2, 1.0);
//var materialDiffuse =  vec4(0.4, 0.8, 0.4, 1.0); // nice grass
//var materialSpecular = vec4(0.05, 0.4, 0.4, 1.0); // nice grass
var materialDiffuse =  vec4(0.8, 0.8, 0.8, 1.0);
var materialSpecular = vec4(0.4, 0.4, 0.4, 1.0);
var materialShininess = 50;

var cubeRotation = 0;
var cubeRotationMatrix;

// Buffers
var bcBuffer;
var vBuffer;
var rotBuffer;
var nBuffer;
var vBufferSun;
var vwfBuffer;
var texBuffer;

// Offscreen buffers
var biPBuffer;
var nPBuffer;
var vPBuffer;

// controls
var spd = 0.1;
var collisionRadius = 0.2;
var strafeLeft = false;
var strafeRight = false;
var moveForward = false;
var moveBack = false;
var jumping = false;
var vspd = 0;
var jumpspd = 0.3;
var grav = 0.02;
var playerHeight = 1.5;
var torchOn = true;
var mouseSensitivityX = 0.3;
var mouseSensitivityY = 0.3;

var placeLocation = vec3();
var pickVector = new Uint8Array(4);
var currentMaterial = 1; //current selected material

var framebuffer;
var texture; // texture for offscreen buffer
var textureBlock; // texture for blocks
var renderbuffer;
var world;

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
	//canvas.width = document.body.clientWidth;
	//canvas.height = document.body.clientHeight;
	var sunSlider = document.getElementById( "sun-slider" );
	var materialPicker = document.getElementById( "material-menu" );
	
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //init world
    for (var i= 0; i < world_size; ++i) {
        cells[i] = [];
        for (var j=0; j < world_size; ++j) {
            cells[i][j] = [];
        }
    }

	aspect = canvas.width/canvas.height;

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 0.9, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    //
    //  Load shaders and initialize attribute buffers
    //
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    sunProgram = initShaders( gl, "vertex-sun", "fragment-sun");
    pickProgram = initShaders( gl, "vertex-pick", "fragment-pick");
    wireFrameProgram = initShaders( gl, "vertex-wf", "fragment-wf");

	// Bufffer for rotation boolean (integer since no boolean can be transfered)
    rotBuffer = gl.createBuffer();

    // Buffer for block center of each cube
	bcBuffer = gl.createBuffer();

	// Buffer for vertex positions
    vBuffer = gl.createBuffer();

	// Buffer for normals
	nBuffer = gl.createBuffer();

	// Offscreen Buffer for normals
	nPBuffer = gl.createBuffer();

	// Offscreen buffer for normals
	biPBuffer = gl.createBuffer();

	// Offscreen buffer for vertices
	vPBuffer = gl.createBuffer();

    // position buffer for wireFrame
    vwfBuffer = gl.createBuffer();
	
	// texture buffer for blocks
	texBuffer = gl.createBuffer();

	// Setup texture for offscreen buffering
    var frameBufferWidth = canvas.width;
    var frameBufferHeight = canvas.height;
	texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frameBufferWidth, frameBufferHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    //gl.generateMipmap(gl.TEXTURE_2D);

	// Setup for the off screen framebuffer for picking
	framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer( gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    //create render buffer for depth information
    renderbuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer)
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, frameBufferWidth, frameBufferHeight);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);

	// Return to normal buffering
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

	useDefaultProgram();

    modelViewSun = gl.getUniformLocation( sunProgram, "modelView" );
    projectionSun = gl.getUniformLocation( sunProgram, "projection" );

	
	materialPicker.onchange = function(event){
		currentMaterial = parseFloat(event.target.value);
	}
	
	sunSlider.oninput = function(event) {
		var angle = (event.target.value);

		document.getElementById("sun-angle-div").innerHTML = "Current position of the sun: " + angle + " degrees";

		sunRotation = calcSunPosition(angle);
		calcLightProducts(angle);
		
	}

	window.onmousemove = function (event){
		if(document.pointerLockElement === canvas ||
           document.mozPointerLockElement === canvas ||
           document.webkitPointerLockElement === canvas)
        {
			lookLeftRight(-mouseSensitivityX*event.movementX);
			lookUpDown(-mouseSensitivityY*event.movementY);
		}
	}

	canvas.onmousedown = function (event) {
        // pointer is locked
        if (document.pointerLockElement === canvas ||
            document.mozPointerLockElement === canvas ||
            document.webkitPointerLockElement === canvas)
        {

            var x,y,z;
            //place block
            if (event.which == 1) {
                x = placeLocation[0];
                y = placeLocation[1];
                z = placeLocation[2];
                var currentBlock = cells[x][y][z];
				if (currentBlock === undefined) {
                    cells[x][y][z] = new cell(currentMaterial);
                    colorCube(x, y, z);
                    resendCellBufferData();
                }
                else if (currentBlock.deleted) {
                    cells[x][y][z].deleted = false;
                    cells[x][y][z].mat = currentMaterial;
                    world.updateCells();
                    resendCellBufferData();
                    /*
                    var offset = currentBlock.bufferOffset;
                    for (var i = 36 * offset; i < 36 * (offset + 1); ++i) {
                        rotBools[i] = 0.0;
                        pickPoints.push(points[i]);
                        pickNormals.push(normals[i]);
                        pickBlockCenters.push(vec4(x, y, z, 1));
                    */
                }
            }

            //remove block
            else if (event.which == 3 ) {
                x = pickVector[0];
                y = pickVector[1];
                z = pickVector[2];

                cells[x][y][z].deleted = true;
                world.updateCells();
                resendCellBufferData();
            }
        } else {
            // We need to lock the pointer
            canvas.requestPointerLock =
                canvas.requestPointerLock ||
                canvas.mozRequestPointerLock ||
                canvas.webkitRequestPointerLock;
		    canvas.requestPointerLock();
        }
	}

	window.onkeydown = function(event) {
		var	key	=	String.fromCharCode(event.keyCode );
		switch(key) {
            case 'M':
                mapView = !mapView;
                break;
			case 'T':
                torchOn = !torchOn;
				break;
			case 'A':
				strafeLeft = true;
				break;
			case 'D':
				strafeRight = true;
				break;
			case 'W':
				moveForward = true;
				break;
			case 'S':
				moveBack = true;
				break;
            case ' ': //space key
				if (event.keyCode == 32 && event.target == document.body) {
					event.preventDefault();
				}
                jumping = true;
                break;
		}

    }

	window.onkeyup = function(event) {
		var	key	=	String.fromCharCode(event.keyCode );
		switch(key) {
			case 'A':
				strafeLeft = false;
				break;
			case 'D':
				strafeRight = false;
				break;
			case 'W':
				moveForward = false;
				break;
			case 'S':
				moveBack = false;
				break;
            case ' ': //space key
                jumping = false;
                break;
		}

    }


	calcLightProducts(sunPosition);
	calcSunPosition(sunPosition);
	
	var image = document.getElementById("texImage");
 
    configureTexture( image );

	
	world = new World();
    world.arbitraryWorld(world.sineWorldThingy, 0.02)
    world.updateCells();

    resendCellBufferData();
    createSun();
    render();
}

function configureTexture( image ) {
    var texture = gl.createTexture();
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D( gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image );
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
    
    gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function cell(material){
    return {
		mat: material,
        deleted: false,
        bufferOffset: undefined,
    }
}

function calcSunPosition(angle){


	var result = translate(-world_size/2, 0, -world_size/2);
	//result = mult(rotate(20, vec3(0,1,0)),result);
	result = mult(rotate(20, vec3(0,0,1)), result);
	result = mult(rotate(angle-90, vec3(1,0,0)), result);
	//result = mult(rotate(angle, vec3(0,0,1)), result);
	result = mult(translate(world_size/2, 0, world_size/2), result);

	sun = normalize(mult(result, vec4(0,1,0,0)));

	return result;

}


// calc and transfer light product uniforms
function calcLightProducts(angle){

	useDefaultProgram();

	// Calc sun coefficients based on time of day (0 = dawn, 90 = mid day, 180 = sunset)
	var rMod = 1; // red light at dawn and sunset
	var gMod = 1 - Math.cos(radians(angle-Math.PI)*2)/4+0.75; // do this later if we want/have time
	var bMod = 1 - Math.cos(radians(angle-Math.PI)*2)/4+0.75; // do this later if we want/have time

	sunAmbient[0]  = sunAmbientBase[0]*rMod;
	sunDiffuse[0]  = sunAmbientBase[0]*rMod;
	sunSpecular[0] = sunAmbientBase[0]*rMod;

	sunAmbient[1]  = sunAmbientBase[1]*gMod;
	sunDiffuse[1]  = sunAmbientBase[1]*gMod;
	sunSpecular[1] = sunAmbientBase[1]*gMod;

	sunAmbient[2]  = sunAmbientBase[2]*bMod;
	sunDiffuse[2]  = sunAmbientBase[2]*bMod;
	sunSpecular[2] = sunAmbientBase[2]*bMod;


	//this product should probably be calculated in the vertex shader... maybe. If we had more materials we should, but we don't.
	ambientProduct = mult(sunAmbient, materialAmbient);
	diffuseProduct = mult(sunDiffuse, materialDiffuse);
	specularProduct = mult(sunSpecular, materialSpecular);

	var ambientProductTorch = mult(torchAmbient, materialAmbient);
	var diffuseProductTorch = mult(torchDiffuse, materialDiffuse);
	var specularProductTorch = mult(torchSpecular, materialSpecular);

	// transfer sun uniform lighting products
	gl.uniform4fv( ambientProductLoc, flatten(ambientProduct));
	gl.uniform4fv( diffuseProductLoc, flatten(diffuseProduct));
	gl.uniform4fv( specularProductLoc, flatten(specularProduct));

	// transfer torch uniform lighting products
	gl.uniform4fv( ambientProductTorchLoc, flatten(ambientProductTorch));
	gl.uniform4fv( diffuseProductTorchLoc, flatten(diffuseProductTorch));
	gl.uniform4fv( specularProductTorchLoc, flatten(specularProductTorch));

}


function World() {
    return {
	    // Fixed world generation functions
	    createWorldFullBlockWorld: function() {
		    for (var i=0; i<world_size; ++i) {
			    for (var j=0; j<world_size; ++j) {
				    for (var k=0; k<world_size; ++k) {
					    cells[i][j][k] = 1;
				    }
			    }
		    }
	    },

	    createFlatWorld: function(){
		    for (var i=0; i<world_size; ++i) {
			    for (var j=0; j<world_size; ++j) {
				    cells[i][0][j] = 1;
				    cells[i][1][j] = 1;

			    }
		    }
	    },

	    createPyramid: function(size,offset){
		    for (var i=0; i<size; i++) {
			    for (var j=i; j < size; j++) {
				    for (var k = i; k < size; k++){
					    cells[j+offset][i][k+offset] = 1;
				    }
			    }
		    }
	    },

	    // Arbitrary world functions

	    arbitraryWorld: function(fun, coarseness){

		    var diff;
		    for (var i=0; i<world_size; ++i) {
			    for (var j=0; j<world_size; ++j) {
				    for (var k=0; k<world_size; ++k) {
					    diff = Math.abs(fun(Math.floor(i), Math.floor(k)) - j/world_size);
					    if (diff < coarseness ){
						    cells[i][j][k] = new cell(2);
					    }
				    }
			    }
		    }

	    },

	    // Use as parameter for arbitraryWorld(fun, pos) to generate weird world
	    sineWorldThingy: function(x,y){
		    x = (x/world_size)*Math.PI*2;
		    y = (y/world_size)*Math.PI*2;

		    var theta = radians(170);
		    x = x*Math.cos(theta) - y*Math.sin(theta);
		    y = x*Math.sin(theta) + y*Math.cos(theta);

		    var varA = 1;
		    var varB = 1;

		    var result = 0;
		    result += (Math.pow(Math.cos(x+y-Math.PI),2)+Math.pow(Math.cos(y-x-Math.PI),2) + 2)/30;
		    result += (Math.cos(x)+Math.cos(y) + 2)/6;
		    result += Math.exp(-(Math.pow(x-Math.PI,2)/varA+Math.pow(y-Math.PI,2)/varB))/5;
		    return result;
	    },

	    parabolicValley: function(x,y){


		    x = (x > 0) ? 1.2*x : 0.8*x; // add some slight asymmetry
		    y = (y > 0) ? 1.1*y : 0.9*y;

		    var d = (y-Math.pow(x,2))/2.0+0.2;
		    var term2 = (y < 0) ? Math.pow((y-(x-0.3)/7)/2,2) : 0;

		    return Math.pow(d,2) + term2;
	    },

	    mountainThing: function(x,y){

		    x = (x/world_size)*2-1;
		    y = (y/world_size)*2-1;

		    var d = y-Math.pow(x,2)+0.3;

		    return Math.pow(d,3)/4;
	    },

	    RosenbrockValley: function(x,y){
		    x = (x/world_size)+0.5;
		    y = (y/world_size)+0.5;
		    var a = 1;
		    var b = 1.5;
		    var result = Math.pow(a-x,2)+b*Math.pow(y-Math.pow(x,2),2)/7;
		    return result;
	    },

	    inverseGaussian: function(x,y){
		    x = x/world_size-0.5;
		    y = y/world_size-0.5;
		    var varA = 0.5;
		    var varB = 1;
		    return 1 - Math.exp(-(Math.pow(x,2)/varA+Math.pow(y,2)/varB));
	    },

	    gaussian: function(x,y){
		    x = x/world_size-0.5;
		    y = y/world_size-0.5;
		    var varA = 0.1;
		    var varB = 0.2;
		    return Math.exp(-(Math.pow(x,2)/varA+Math.pow(y,2)/varB))/2;
	    },

	    // Create world based on arbritrary function - pass another function to easily create another world
	    //arbitraryWorld(gaussian,0.1);
	    //arbitraryWorld(inverseGaussian,0.1);
	    //arbitraryWorld(RosenbrockValley,0.1);
	    //arbitraryWorld(mountainThing,0.1);
	    //arbitraryWorld(parabolicValley,0.1);
	    //arbitraryWorld(sineWorldThingy,0.1);
	    //createPyramid(20,world_size-20); // create a pyramid in the corner if you want

	    // createFlatWorld();

        updateCells: function() {
            texCoords = [];
	        pickPoints = [];
	        pickBlockCenters = [];
	        pickNormals = [];
	        points = [];
	        blockCenters = [];
	        rotBools = [];
	        normals = [];

            var offset = 0;
            for (var i=0; i<world_size; ++i) {
                for (var j=0; j<world_size; ++j) {
                    for (var k=0; k<world_size; ++k) {
                        if (cells[i][j][k] !== undefined) {
                            colorCube(i,j,k);
                            cells[i][j][k].bufferOffset = offset++;
                        }
                    }
                }
            }
        },
    }
};


function resendCellBufferData() {

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, bcBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(blockCenters), gl.STATIC_DRAW );

	gl.bindBuffer( gl.ARRAY_BUFFER, rotBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(rotBools), gl.STATIC_DRAW );

	gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
	gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, vPBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pickPoints), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, nPBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pickNormals), gl.STATIC_DRAW );

    gl.bindBuffer( gl.ARRAY_BUFFER, biPBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(pickBlockCenters), gl.STATIC_DRAW );
	
    gl.bindBuffer( gl.ARRAY_BUFFER, texBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW );
	
}

function createSun() {
    gl.useProgram(sunProgram);
    var sunVertices = [
                vec4(-1 * world_size/10 + world_size/2, world_size*2,-1 * world_size/10 + world_size/2),
                vec4(1 * world_size/10 + world_size/2, world_size*2,-1 * world_size/10 + world_size/2),
                vec4(1 * world_size/10 + world_size/2, world_size*2,1 * world_size/10 + world_size/2),
                vec4(-1 * world_size/10 + world_size/2, world_size*2,1 * world_size/10 + world_size/2)];
    for (var i=0; i<4; i++) sunPoints.push(sunVertices[i]);

    vBufferSun = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferSun );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(sunPoints), gl.STATIC_DRAW );

    var vPositionSun = gl.getAttribLocation( sunProgram, "vPosition" );
    gl.vertexAttribPointer( vPositionSun, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPositionSun );

    gl.useProgram(program); //return to default program
}

function getNormal(p1, p2, p3) {
    var v1 = subtract(p1, p2);
    var v2 = subtract(p1, p3);
    var ret = cross(v1,v2);
    ret.push(0);
    return normalize(ret, true);
}


function lookLeftRight(theta){
	var r = vec3(0,1,0);
	var rotMat = rotateAxis(theta, r);
	at = subtract(at,eye);
	at = mult(rotMat, vec4(at[0], at[1], at[2], 1));
	at.pop();
	at = add(at,eye);

	up = mult(rotMat, vec4(up[0],up[1],up[2],0));
	up.pop();
}

function lookUpDown(theta){
	var r = normalize(cross(subtract(at,eye),up));
	var rotMat = rotateAxis(theta, r);
	var tempAt = at;
	var tempUp = up;
	tempAt = subtract(tempAt,eye);
	tempAt = mult(rotMat, vec4(tempAt[0], tempAt[1], tempAt[2], 1));
	tempAt.pop();
	tempAt = add(tempAt,eye);

	tempUp = mult(rotMat, vec4(tempUp[0],tempUp[1],tempUp[2],0));
	tempUp.pop();

	if(tempUp[1] > 0.00000001){ // slightly more than 0 to avoid rounding errors at the boundary
		up = tempUp;
		at = tempAt;
	}

}

function movePlayer(){
	var dir = vec3();
    var tempEye = vec3();
    //js somehow copies pointer so the below code is necessary.
    tempEye[0] = eye[0];
    tempEye[1] = eye[1];
    tempEye[2] = eye[2];
	if (strafeLeft){
		dir = add(dir,normalize(cross(subtract(eye,at), up)));
	}

	if (strafeRight){
		dir = add(dir,normalize(cross(subtract(at,eye), up)));
	}

	if (moveForward){
		dir = add(dir,subtract(at,eye));
		dir[1] = 0;
		dir = normalize(dir);
	}

	if (moveBack){
		dir = add(dir,subtract(eye,at));
		dir[1] = 0;
		dir = normalize(dir);
	}
    if (jumping) {
        if (!isBlockFree(vec3(eye[0],eye[1] - playerHeight, eye[2]))) {
            vspd = jumpspd;
        }
    }

	dir = (dot(dir,dir) == 0) ? vec3() : normalize(dir);

	// Collision detection in the x-direction
	tempEye[0] += (dir[0] > 0) ? collisionRadius : -collisionRadius;
	if (   isBlockFree(tempEye)
		&& isBlockFree(vec3(tempEye[0],tempEye[1] - playerHeight + 0.1, tempEye[2]))) {
        eye[0] += dir[0]*spd;
        at[0] += dir[0]*spd;
    }

	// Collision detection in the z-direction
	tempEye[0] -= (dir[0] > 0) ? collisionRadius : -collisionRadius; // reset the x-direction to make the tests independent
	tempEye[2] += (dir[2] > 0) ? collisionRadius : -collisionRadius;
    if (   isBlockFree(tempEye)
		&& isBlockFree(vec3(tempEye[0],tempEye[1] - playerHeight + 0.1, tempEye[2]))) {
        eye[2] += dir[2]*spd;
        at[2] += dir[2]*spd;
    }

    // collision detection in the y-direction and apply gravity
    if (   isBlockFree(vec3(eye[0]+collisionRadius-0.1,eye[1] - playerHeight + vspd, eye[2])) &&
		   isBlockFree(vec3(eye[0]-collisionRadius+0.1,eye[1] - playerHeight + vspd, eye[2])) &&
		   isBlockFree(vec3(eye[0],eye[1] - playerHeight + vspd, eye[2]+collisionRadius-0.1)) &&
		   isBlockFree(vec3(eye[0],eye[1] - playerHeight + vspd, eye[2]-collisionRadius+0.1)))
    {
        vspd -= grav;
    } else {
        vspd = 0;
    }
    eye[1] += vspd;
    at[1] += vspd;
}

function isBlockFree(pos) {
    pos = add(pos, vec3(0.5,0.5,0.5));
    for (var i=0; i<3; i++) {
        if (pos[i] < 0 || pos[i] > world_size) return false;
    }
	
	var currentCell = cells[Math.floor(pos[0])][Math.floor(pos[1])][Math.floor(pos[2])];
	
    if (currentCell === undefined ) return true;
	if (currentCell.deleted == true) return true;
	
	return false;
	
}


function rotateAxis(theta, u){

	u = normalize(u, u.length == 4);

	var d = Math.sqrt(Math.pow(u[1],2) + Math.pow(u[2],2));
	var Rx = mat4(
		1,0,0,0,
		0,u[2]/d,-u[1]/d,0,
		0,u[1]/d,u[2]/d,0,
		0,0,0,1
	);

	var Ry = mat4(
		d,0,-u[0],0,
		0,1,0,0,
		u[0],0,d,0,
		0,0,0,1
	);

	var Rx_inv = inverse4(Rx);
	var Ry_inv = inverse4(Ry);

	theta = radians(theta);
	var Rz = mat4(
		Math.cos(theta), -Math.sin(theta), 0, 0,
		Math.sin(theta), Math.cos(theta), 0, 0,
		0,0,1,0,
		0,0,0,1
	);

	return mult(Rx_inv, mult(Ry_inv, mult(Rz, mult(Ry, Rx ))));

}



function colorCube(x, y, z)
{
    quad( 1, 0, 3, 2, x, y, z );
    quad( 2, 3, 7, 6, x, y, z );
    quad( 3, 0, 4, 7, x, y, z );
    quad( 6, 5, 1, 2, x, y, z );
    quad( 4, 5, 6, 7, x, y, z );
    quad( 5, 4, 0, 1, x, y, z );
}

function quad(a, b, c, d, x, y, z)
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];
    //apply offset
    for(var i=0; i<vertices.length; ++i) {
        vertices[i][0] += x;
        vertices[i][1] += y;
        vertices[i][2] += z;
    }


    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices

    //vertex color assigned by the index of the vertex

    var indices    = [ a, b, c, a, c, d ];
	var texIndices = [ 1, 0, 2, 1, 2, 3 ];
	
	var texCorners = [
		vec2(0,0),
		vec2(0,1/16),
		vec2(1/16,0),
		vec2(1/16,1/16)
	];
	
	
	var normal = getNormal(vertices[a], vertices[b], vertices[c]);
	var xoffset, yoffset;
	
	switch( Math.floor(cells[x][y][z].mat+0.5) ){
		case 1: // grass
			xoffset = 1/16;
			yoffset = 6/16;
			break;
		case 2: // stone
			xoffset = 0;
			yoffset = 14/16;
			break;
		case 3: // dirt
			xoffset = 2/16;
			yoffset = 15/16;
			break;
		case 4: // wood
			xoffset = 4/16;
			yoffset = 15/16;
			break;
		case 5: // sand
			xoffset = 2/16;
			yoffset = 14/16;
			break;
		case 6: // diamond
			xoffset = 8/16;
			yoffset = 14/16;
			break;
		case 7: // pumpkin
			if(Math.abs(normal[1]) == 1){
				xoffset = 6/16;
				yoffset = 9/16;
			} else if(normal[0] == 1){
				xoffset = 7/16;
				yoffset = 8/16;
			} else {
				xoffset = 6/16;
				yoffset = 8/16;
			}
			break;
		default:
			xoffset = 15/16;
			yoffset = 0;
			break;
	}
	
	for(var i = 0; i < texCorners.length; i++){
		texCorners[i][0] += xoffset;
		texCorners[i][1] += yoffset;
	}

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );

		blockCenters.push(vec4(x,y,z,1));
		normals.push(normal);
		texCoords.push(texCorners[texIndices[i]]);

		if ( cells[x][y][z].deleted ){
			rotBools.push(1.0); 
		}
		else {
			pickPoints.push( vertices[indices[i]] );
			pickNormals.push(normal);
			pickBlockCenters.push(vec4(x,y,z,1));
			rotBools.push(0.0);
		}

    }
}

function rotatingCube()
{
    var m = scalem(0.3, 0.3, 0.3);
    m = mult(rotate(45, vec3(1,0,0)), m);
    m = mult(rotate(35, vec3(0,0,1)), m)
    m = mult(rotate(cubeRotation, vec3(0,1,0)), m)

    return m;
}

function createWireFrame(x, y, z, w) {

    switch (w) {
        case 1:
            x-=1;
        break;

        case 2:
            x+=1;
        break;

        case 3:
            y-=1;
        break;

        case 4:
            y+=1;
        break;

        case 5:
            z-=1;
        break;

        case 6:
            z+=1;
        break;
    }
    placeLocation = vec3(x,y,z);

    var lbf = vec4( -0.5, -0.5,  0.5, 1.0 ); // left, bottom, front
    var ltf = vec4( -0.5,  0.5,  0.5, 1.0 ); // left, top, front
    var rtf = vec4(  0.5,  0.5,  0.5, 1.0 ); // etc...
    var rbf = vec4(  0.5, -0.5,  0.5, 1.0 );
    var lbb = vec4( -0.5, -0.5, -0.5, 1.0 );
    var ltb = vec4( -0.5,  0.5, -0.5, 1.0 );
    var rtb = vec4(  0.5,  0.5, -0.5, 1.0 );
    var rbb = vec4(  0.5, -0.5, -0.5, 1.0 );

    var vertices = [lbf, ltf, rtf, rbf, lbb, ltb, rtb, rbb];

    var wireFrame = [
        lbf, ltf,
        ltf, rtf,
        rtf, rbf,
        rbf, lbf,
        lbb, ltb,
        ltb, rtb,
        rtb, rbb,
        rbb, lbb,
        lbf, lbb,
        ltf, ltb,
        rtf, rtb,
        rbf, rbb
    ];
    //apply offset
    for (var i=0; i<vertices.length; ++i) {
        vertices[i][0] += x;
        vertices[i][1] += y;
        vertices[i][2] += z;
    };
    gl.bindBuffer( gl.ARRAY_BUFFER, vwfBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(wireFrame), gl.STATIC_DRAW );

    return wireFrame;
}

function useWireFrameProgram() {

    gl.useProgram(wireFrameProgram);

	// Buffer for position of the wireframe
    gl.bindBuffer( gl.ARRAY_BUFFER, vwfBuffer );
    var vPosition = gl.getAttribLocation( pickProgram, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    modelViewWireFrame = gl.getUniformLocation( wireFrameProgram, "modelView" );
    projectionWireFrame = gl.getUniformLocation( wireFrameProgram, "projection" );

}

function pickLocation(x, y) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    useFramebufferProgram();

    gl.uniformMatrix4fv( modelViewFramebuffer, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projectionFramebuffer, false, flatten(pMatrix) );
    gl.drawArrays( gl.TRIANGLES, 0, pickPoints.length );

    var pickColor = new Uint8Array(4);
    if (x < 0 || x > canvas.width || y < 0 || y > canvas.height)
        pickColor = vec4(0, 0, 0, 0);
    else {
        gl.readPixels(x, y, 1,1, gl.RGBA, gl.UNSIGNED_BYTE, pickColor);
    }
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    return pickColor;
}

function useFramebufferProgram(){

	gl.useProgram(pickProgram);

	// Buffer for position
    gl.bindBuffer( gl.ARRAY_BUFFER, vPBuffer );
    var vPosition = gl.getAttribLocation( pickProgram, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

	// Buffer for normal
    gl.bindBuffer( gl.ARRAY_BUFFER, nPBuffer );
    var vNormal = gl.getAttribLocation( pickProgram, "vNormal" );
    gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

	// Buffer for block index
    gl.bindBuffer( gl.ARRAY_BUFFER, biPBuffer );
    var vBlockIndex = gl.getAttribLocation( pickProgram, "vBlockIndex" );
    gl.vertexAttribPointer( vBlockIndex, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vBlockIndex );

	modelViewFramebuffer = gl.getUniformLocation( pickProgram, "modelView" );
    projectionFramebuffer = gl.getUniformLocation( pickProgram, "projection" );

}

function useDefaultProgram() {
    gl.useProgram(program);

	gl.bindBuffer( gl.ARRAY_BUFFER, rotBuffer );
	var vRotBool = gl.getAttribLocation( program, "vRotBool" );
    gl.vertexAttribPointer( vRotBool, 1, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vRotBool );

    // Buffer for block center of each cube
    gl.bindBuffer( gl.ARRAY_BUFFER, bcBuffer );
    var vBlockCenter = gl.getAttribLocation( program, "vBlockCenter" );
    gl.vertexAttribPointer( vBlockCenter, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vBlockCenter );

	// Buffer for vertex positions
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

	// Buffer for normals
	gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
	var vNormal = gl.getAttribLocation( program, "vNormal" );
	gl.vertexAttribPointer( vNormal, 4, gl.FLOAT, false, 0, 0 );
	gl.enableVertexAttribArray( vNormal );

    // Buffer for textures
    gl.bindBuffer( gl.ARRAY_BUFFER, texBuffer );
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vTexCoord );

    modelView = gl.getUniformLocation( program, "modelView" );
    projection = gl.getUniformLocation( program, "projection" );
    cubeRotationMatrix = gl.getUniformLocation(program, "cubeRotation");
    lightPosition = gl.getUniformLocation(program, "lightPosition");
	ambientProductLoc = gl.getUniformLocation(program, "ambientProduct");
	diffuseProductLoc = gl.getUniformLocation(program, "diffuseProduct");
	specularProductLoc = gl.getUniformLocation(program, "specularProduct");
	ambientProductTorchLoc = gl.getUniformLocation(program, "ambientProductTorch");
	diffuseProductTorchLoc = gl.getUniformLocation(program, "diffuseProductTorch");
	specularProductTorchLoc = gl.getUniformLocation(program, "specularProductTorch");
	textureBlockLoc = gl.getUniformLocation(program, "texture");
	shiny = gl.getUniformLocation(program, "shininess");
    eyeLoc = gl.getUniformLocation(program, "eye");
	torchOnLoc = gl.getUniformLocation(program, "torchOn");
    gl.uniform1f( torchOnLoc, torchOn ? 1.0 : 0.0);
	gl.uniform1f( shiny, materialShininess);
}

function useSunProgram() {
    gl.useProgram(sunProgram);
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferSun );
    var vPositionSun = gl.getAttribLocation( sunProgram, "vPosition" );
    gl.vertexAttribPointer( vPositionSun, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPositionSun );

    modelViewSun = gl.getUniformLocation( sunProgram, "modelView" );
    projectionSun = gl.getUniformLocation( sunProgram, "projection" );
}

function render()
{
    useDefaultProgram();
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (mapView) {

		// center the world on origo
		mvMatrix = translate(-world_size/2+0.5,-world_size/2+0.5,-world_size/2+0.5);

		// rotate the up-side of the world such that it points up
		mvMatrix = mult(rotate(90, vec3(1,0,0)),mvMatrix);

		// scale the world according to the aspect ratio
		mvMatrix = (aspect > 1) ? mult(scalem(1/aspect, 1, 1),mvMatrix) : mult(scalem(1, aspect, 1),mvMatrix);

		// set the view space to match the world space (which is now centered on origo)
		pMatrix = ortho(-world_size/2-0.5, world_size/2+0.5, -world_size/2-0.5, world_size/2+0.5, -world_size/2, world_size/2);

		// set the eye (camera position) to be way above the world - this causes the lighting to look better in map view
        var tempEye = (aspect > 1) ? flatten(vec3((world_size/2-1)/aspect, world_size, (world_size/2-1)/aspect)) : flatten(vec3((world_size/2-1)*aspect, world_size, (world_size/2-1)*aspect));
		gl.uniform3fv( eyeLoc, tempEye);

	} else {

        mvMatrix = lookAt(eye, at , up);
        pMatrix = perspective(fovy, aspect, near, far);
		gl.uniform3fv( eyeLoc, flatten(eye));

    }

    gl.uniformMatrix4fv( modelView, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projection, false, flatten(pMatrix) );
    gl.uniformMatrix4fv( cubeRotationMatrix, false, flatten(rotatingCube()));
	gl.uniform4fv( lightPosition, flatten(sun));
	gl.drawArrays( gl.TRIANGLES, 0, points.length );
    //gl.drawArrays( gl.LINES, 0, points.length );

	
    //get block we are looking at
    pickVector = pickLocation(canvas.width/2, canvas.height/2);
    useWireFrameProgram();
    gl.uniformMatrix4fv( modelViewWireFrame, false, flatten(mvMatrix) );
    gl.uniformMatrix4fv( projectionWireFrame, false, flatten(pMatrix) );
    var wireFrame = createWireFrame(pickVector[0], pickVector[1], pickVector[2], pickVector[3]);
    gl.lineWidth(1.0)
    gl.drawArrays(gl.LINES, 0, wireFrame.length);

	//sunPosition += 0.1;
	//sunPosition = sunPosition % 180;
	//calcSunPosition(sunPosition);
    cubeRotation = cubeRotation + 1 % 360;
	movePlayer();
	
    //render sun
    useSunProgram();

	gl.uniformMatrix4fv( modelViewSun, false, flatten(mult(mvMatrix, sunRotation)) );
    gl.uniformMatrix4fv( projectionSun, false, flatten(pMatrix) );
    gl.drawArrays(gl.TRIANGLE_FAN, 0, sunPoints.length);

    requestAnimFrame(render);

}
