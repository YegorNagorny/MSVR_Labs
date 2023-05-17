function TrackballRotator(canvas, callback, viewDistance, viewpointDirection, viewUp) {
    var unitx = new Array(3);
    var unity = new Array(3);
    var unitz = new Array(3);
    var viewZ;  // відстань камери; z-коорда в координатах ока;
    var center; // центр комери(зору); обертання навколо цієї точки; за замовчуванням [0,0,0]
    this.setView = function( viewDistance, viewpointDirection, viewUp ) {
        unitz = (viewpointDirection === undefined)? [0,0,25] : viewpointDirection;
        viewUp = (viewUp === undefined)? [0,1,0] : viewUp;
        viewZ = viewDistance;
        normalize(unitz, unitz);
        copy(unity,unitz);
        scale(unity, unity, dot(unitz,viewUp));
        subtract(unity,viewUp,unity);
        normalize(unity,unity);
        cross(unitx,unity,unitz);
    };
    this.getViewMatrix = function() {
        var mat = [ unitx[0], unity[0], unitz[0], 0,
                unitx[1], unity[1], unitz[1], 0, 
                unitx[2], unity[2], unitz[2], 0,
                0, 0, 0, 1 ];
        if (center !== undefined) {  // помножити ліворуч шляхом переводу за допомогою rotationCenter, праворуч шляхом переводу за допомогою -rotationCenter
            var t0 = center[0] - mat[0]*center[0] - mat[4]*center[1] - mat[8]*center[2];
            var t1 = center[1] - mat[1]*center[0] - mat[5]*center[1] - mat[9]*center[2];
            var t2 = center[2] - mat[2]*center[0] - mat[6]*center[1] - mat[10]*center[2];
            mat[12] = t0;
            mat[13] = t1;
            mat[14] = t2;
        }
        if (viewZ !== undefined) {
            mat[14] -= viewZ;
        }
        return mat;
    };
    this.getViewDistance = function() {
        return viewZ;
    };
    this.setViewDistance = function(viewDistance) {
        viewZ = viewDistance;
    };
    this.getRotationCenter = function() {
        return (center === undefined) ? [0,0,0] : center;
    };
    this.setRotationCenter = function(rotationCenter) {
        center = rotationCenter;
    };
    this.setView(viewDistance, viewpointDirection, viewUp);
    canvas.addEventListener("mousedown", doMouseDown, false);
    canvas.addEventListener("touchstart", doTouchStart, false);
    window.addEventListener("deviceorientation", function(evt) {
        var degtorad = Math.PI / 180; // Перетворення градусу в радіан

        var _x = evt.beta  ? evt.beta  * degtorad : 0; // beta 
        var _y = evt.gamma ? evt.gamma * degtorad : 0; // gamma 
        var _z = evt.alpha ? evt.alpha * degtorad : 0; // alpha 

        var cX = Math.cos( _x );
        var cY = Math.cos( _y );
        var cZ = Math.cos( _z );
        var sX = Math.sin( _x );
        var sY = Math.sin( _y );
        var sZ = Math.sin( _z );

        //
        // Побудова матриці обертання ZXY.
        //

        var m11 = cZ * cY - sZ * sX * sY;
        var m12 = - cX * sZ;
        var m13 = cY * sZ * sX + cZ * sY;

        var m21 = cY * sZ + cZ * sX * sY;
        var m22 = cZ * cX;
        var m23 = sZ * sY - cZ * cY * sX;

        var m31 = - cX * sY;
        var m32 = sX;
        var m33 = cX * cY;

        unitx = [m11,    m12,    m13];
        unity = [m21,    m22,    m23];
        unitz = [m31,    m32,    m33];
    }, true);
    function applyTransvection(e1, e2) {  // повернути вектор e1 на e2
        function reflectInAxis(axis, source, destination) {
            var s = 2 * (axis[0] * source[0] + axis[1] * source[1] + axis[2] * source[2]);
            destination[0] = s*axis[0] - source[0];
            destination[1] = s*axis[1] - source[1];
            destination[2] = s*axis[2] - source[2];
        }
        normalize(e1,e1);
        normalize(e2,e2);
        var e = [0,0,0];
        add(e,e1,e2);
        normalize(e,e);
        var temp = [0,0,0];
        reflectInAxis(e,unitz,temp);
        reflectInAxis(e1,temp,unitz);
        reflectInAxis(e,unitx,temp);
        reflectInAxis(e1,temp,unitx);
        reflectInAxis(e,unity,temp);
        reflectInAxis(e1,temp,unity);
    }
    var centerX, centerY, radius2;
    var prevx,prevy;
    var dragging = false;
    function doMouseDown(evt) {
        if (dragging)
           return;
        dragging = true;
        centerX = canvas.width/2;
        centerY = canvas.height/2;
        var radius = Math.min(centerX,centerY);
        radius2 = radius*radius;
        document.addEventListener("mousemove", doMouseDrag, false);
        document.addEventListener("mouseup", doMouseUp, false);
        var box = canvas.getBoundingClientRect();
        prevx = evt.clientX - box.left;
        prevy = evt.clientY - box.top;
    }
    function doMouseDrag(evt) {
        if (!dragging)
           return;
        var box = canvas.getBoundingClientRect();
        var x = evt.clientX - box.left;
        var y = evt.clientY - box.top;
        var ray1 = toRay(prevx,prevy);
        var ray2 = toRay(x,y);
        applyTransvection(ray1,ray2);
        prevx = x;
        prevy = y;
        if (callback) {
            callback();
        }
    }
    function doMouseUp(evt) {
        if (dragging) {
            document.removeEventListener("mousemove", doMouseDrag, false);
            document.removeEventListener("mouseup", doMouseUp, false);
            dragging = false;
        }
    }
    function doTouchStart(evt) {
        if (evt.touches.length != 1) {
           doTouchCancel();
           return;
        }
        evt.preventDefault();
        var r = canvas.getBoundingClientRect();
        prevx = evt.touches[0].clientX - r.left;
        prevy = evt.touches[0].clientY - r.top;
        canvas.addEventListener("touchmove", doTouchMove, false);
        canvas.addEventListener("touchend", doTouchEnd, false);
        canvas.addEventListener("touchcancel", doTouchCancel, false);
        touchStarted = true;
        centerX = canvas.width/2;
        centerY = canvas.height/2;
        var radius = Math.min(centerX,centerY);
        radius2 = radius*radius;
    }
    function doTouchMove(evt) {
        if (evt.touches.length != 1 || !touchStarted) {
           doTouchCancel();
           return;
        }
        evt.preventDefault();
        var r = canvas.getBoundingClientRect();
        var x = evt.touches[0].clientX - r.left;
        var y = evt.touches[0].clientY - r.top;
        var ray1 = toRay(prevx,prevy);
        var ray2 = toRay(x,y);
        applyTransvection(ray1,ray2);
        prevx = x;
        prevy = y;
        if (callback) {
            callback();
        }
    }
    function doTouchEnd(evt) {
        doTouchCancel();
    }
    function doTouchCancel() {
        if (touchStarted) {
           touchStarted = false;
           canvas.removeEventListener("touchmove", doTouchMove, false);
           canvas.removeEventListener("touchend", doTouchEnd, false);
           canvas.removeEventListener("touchcancel", doTouchCancel, false);
        }
    }
    function toRay(x,y) {  // перетворює точку (x,y) у піксельних координатах на тривимірний промінь шляхом відображення внутрішньої частини
                           // коло на площині до півкулі, коло є екватором.
       var dx = x - centerX;
       var dy = centerY - y;
       var vx = dx * unitx[0] + dy * unity[0];  // Точка курсору як вектор у площині зображення.
       var vy = dx * unitx[1] + dy * unity[1];
       var vz = dx * unitx[2] + dy * unity[2];
       var dist2 = vx*vx + vy*vy + vz*vz;
       if (dist2 > radius2) {  // Відображення точки поза колом
          return [vx,vy,vz];
       }
       else {
          var z = Math.sqrt(radius2 - dist2);
          return  [vx+z*unitz[0], vy+z*unitz[1], vz+z*unitz[2]];
        }
    }
    function dot(v,w) {
        return v[0]*w[0] + v[1]*w[1] + v[2]*w[2];
    }
    function length(v) {
        return Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    }
    function normalize(v,w) {
        var d = length(w);
        v[0] = w[0]/d;
        v[1] = w[1]/d;
        v[2] = w[2]/d;
    }
    function copy(v,w) {
        v[0] = w[0];
        v[1] = w[1];
        v[2] = w[2];
    }
    function add(sum,v,w) {
        sum[0] = v[0] + w[0];
        sum[1] = v[1] + w[1];
        sum[2] = v[2] + w[2];
    }
    function subtract(dif,v,w) {
        dif[0] = v[0] - w[0];
        dif[1] = v[1] - w[1];
        dif[2] = v[2] - w[2];
    }
    function scale(ans,v,num) {
        ans[0] = v[0] * num;
        ans[1] = v[1] * num;
        ans[2] = v[2] * num;
    }
    function cross(c,v,w) {
        var x = v[1]*w[2] - v[2]*w[1];
        var y = v[2]*w[0] - v[0]*w[2];
        var z = v[0]*w[1] - v[1]*w[0];
        c[0] = x;
        c[1] = y;
        c[2] = z;
    }
}


// Vertex shader
const vertexShaderSource = `
attribute vec3 vertex;
attribute vec2 texCoord;
uniform mat4 ModelViewProjectionMatrix;
varying vec2 v_texcoord;

void main() {
    gl_Position = ModelViewProjectionMatrix * vec4(vertex,1.0);
    v_texcoord = texCoord;
}`;


// Fragment shader
const fragmentShaderSource = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
   precision highp float;
#else
   precision mediump float;
#endif

uniform sampler2D u_texture;
uniform float fColorCoef;

varying vec2 v_texcoord;

uniform vec4 color;
void main() {
    gl_FragColor = color*fColorCoef + texture2D(u_texture, v_texcoord)*(1.0-fColorCoef);
}`;
'use strict';



let gl;                         // The webgl context.

let iAttribVertex;              // Location of the attribute variable in the shader program.
let iAttribTexture;             // Location of the attribute variable in the shader program.

let iColor;                     // Location of the uniform specifying a color for the primitive.
let iColorCoef;                 // Location of the uniform specifying a color for the primitive.

let iModelViewProjectionMatrix; // Location of the uniform matrix representing the combined transformation.
let iTextureMappingUnit;

let iVertexBuffer;              // Buffer to hold the values.
let iTexBuffer;                 // Buffer to hold the values.
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let isFilled = false;

let convergence = 2000;
let eyeSeparation = 1;
let fov = 250;
let nearclippingdistance = 1;

let rotationMatrix = getRotationMatrix();

const _c = 8;

const funct = (u, z, a) => Math.sqrt((z*3)**2*Math.cos(2*u) + Math.sqrt(a**4 - (z*3)**4*Math.sin(2*u)**2));

const x = (u, v) => funct(u, v, _c) * Math.cos(u);
const y = (u, v) => funct(u, v, _c)* Math.sin(u);
const z = (v) => 8 * v;

/* Draws a WebGL primitive.  The first parameter must be one of the constants
 * that specify primitives:  gl.POINTS, gl.LINES, gl.LINE_LOOP, gl.LINE_STRIP,
 * gl.TRIANGLES, gl.TRIANGLE_STRIP, gl.TRIANGLE_FAN.  The second parameter must
 * be an array of 4 numbers in the range 0.0 to 1.0, giving the RGBA color of
 * the color of the primitive.  The third parameter must be an array of numbers.
 * The length of the array must be a multiple of 3.  Each triple of numbers provides
 * xyz-coords for one vertex for the primitive.  This assumes that u_color is the
 * location of a color uniform in the shader program, a_coords_loc is the location of
 * the coords attribute, and a_coords_buffer is a VBO for the coords attribute.
 */
function drawPrimitive(primitiveType, color, vertices, texCoords) {
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0.0);

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    if (texCoords) {
        gl.enableVertexAttribArray(iAttribTexture);
        gl.bindBuffer(gl.ARRAY_BUFFER, iTexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STREAM_DRAW);
        gl.vertexAttribPointer(iAttribTexture, 2, gl.FLOAT, false, 0, 0);
    } else {
        gl.disableVertexAttribArray(iAttribTexture);
        gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
        gl.uniform1f(iColorCoef, 1.0);
    }

    gl.drawArrays(primitiveType, 0, vertices.length / 3);
}

const degtorad = Math.PI / 180; // Degree-to-Radian conversion

function getRotationMatrix( alpha, beta, gamma ) {

    const _x = beta  ? -beta  * degtorad : 0; // beta 
    const _y = gamma ? -gamma * degtorad : 0; // gamma 
    const _z = alpha ? -alpha * degtorad : 0; // alpha 

    const cX = Math.cos( _x );
    const cY = Math.cos( _y );
    const cZ = Math.cos( _z );
    const sX = Math.sin( _x );
    const sY = Math.sin( _y );
    const sZ = Math.sin( _z );

    //
    // ZXY rotation matrix construction.
    //

    const m11 = cZ * cY - sZ * sX * sY;
    const m12 = - cX * sZ;
    const m13 = cY * sZ * sX + cZ * sY;

    const m21 = cY * sZ + cZ * sX * sY;
    const m22 = cZ * cX;
    const m23 = sZ * sY - cZ * cY * sX;

    const m31 = - cX * sY;
    const m32 = sX;
    const m33 = cX * cY;

    return [
        m11, m12, m13, 0,
        m21, m22, m23, 0,
        m31, m32, m33, 0,
        0, 0, 0, 1
    ];

}

window.addEventListener('deviceorientation', function(event) {
    rotationMatrix = getRotationMatrix(event.alpha, event.beta, event.gamma);
    draw();
});

function DrawSurface() {
    let allCoordinates = [];
    let i = 0;

    // Apply equations and draw horizontal meridians
    for (let u = 0; u <= 2*Math.PI; u += Math.PI / 12) {
        let coordinates = [];

        for (let v = 0; v <= 8/3*2 - 8/3; v += Math.PI / 12) {
            const generatedCoords = [x(u, v), y(u, v), z(v)];

            coordinates = [...coordinates, ...generatedCoords];
        }

        drawPrimitive(gl.LINE_STRIP, [1, 1, 1, 1], coordinates);

        allCoordinates[i++] = [...coordinates];
        coordinates = [];
    }

    // Draw vertical meridians
    for (let j = 0; j < allCoordinates[0].length; j += 3) {
        let coordinates = [];

        for (let k = 0; k < allCoordinates.length; k++) {
            coordinates = [...coordinates, allCoordinates[k][j], allCoordinates[k][j + 1], allCoordinates[k][j + 2]];
        }

        drawPrimitive(gl.LINE_STRIP, [1, 1, 1, 1], coordinates);
        coordinates = [];
    }

    if (isFilled) {
        for (let i = 0; i < allCoordinates.length - 1; i++) {
            let coordinates = [];

            for (let j = 0; j < allCoordinates[i].length; j += 3) {
                coordinates = [...coordinates, allCoordinates[i][j], allCoordinates[i][j + 1], allCoordinates[i][j + 2]];
                coordinates = [...coordinates, allCoordinates[i + 1][j], allCoordinates[i + 1][j + 1], allCoordinates[i + 1][j + 2]];
                coordinates = [...coordinates, allCoordinates[i][j + 3], allCoordinates[i][j + 4], allCoordinates[i][j + 5]];
                coordinates = [...coordinates, allCoordinates[i + 1][j + 3], allCoordinates[i + 1][j + 4], allCoordinates[i + 1][j + 5]];
            }

            drawPrimitive(gl.TRIANGLE_STRIP, [0.5, 0, 1, 1], coordinates);
            coordinates = [];
        }
    }

    
    gl.lineWidth(4);
    gl.lineWidth(1);
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum = m4.multiply(rotateToPointZero, modelView);
    let matAccum0 = m4.multiply(matAccum, rotationMatrix);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);

    let cam = new StereoCamera(
        gl,
        convergence,
        eyeSeparation,
        aspect,
        fov,
        nearclippingdistance,
        20000
    );

    let modelViewProjectionL = m4.multiply(cam.getLeftFrustum(), matAccum1);
    let modelViewProjectionR = m4.multiply(cam.getRightFrustum(), matAccum1);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionL);
    gl.colorMask(true, false, false, false);

    DrawSurface();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionR);
    gl.colorMask(false, true, true, false);

    DrawSurface();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.colorMask(true, true, true, true);
}

class StereoCamera {
    constructor(
        gL,
        Convergence,
        EyeSeparation,
        AspectRatio,
        FOV,
        NearClippingDistance,
        FarClippingDistance
    ) {
        this.mConvergence = Convergence;
        this.mEyeSeparation = EyeSeparation;
        this.mAspectRatio = AspectRatio;
        this.mFOV = FOV * Math.PI / 180
        this.mNearClippingDistance = NearClippingDistance;
        this.mFarClippingDistance = FarClippingDistance;

        this.top = this.mNearClippingDistance * Math.tan(this.mFOV / 2);
        this.bottom = -this.top;

        this.a = this.mAspectRatio * Math.tan(this.mFOV / 2) * this.mConvergence;
        this.b = this.a - this.mEyeSeparation / 2;
        this.c = this.a + this.mEyeSeparation / 2;
    }

    getLeftFrustum() {
        const left = -this.b * this.mNearClippingDistance / this.mConvergence;
        const right = this.c * this.mNearClippingDistance / this.mConvergence;

        const translate = m4.translation(this.mEyeSeparation / 2 / 100, 0, 0);

        const projection = m4.frustum(left, right, this.bottom, this.top, this.mNearClippingDistance, this.mFarClippingDistance);

        return m4.multiply(projection, translate)
    }

    getRightFrustum() {
        const left = -this.c * this.mNearClippingDistance / this.mConvergence;
        const right = this.b * this.mNearClippingDistance / this.mConvergence;

        const translate = m4.translation(-this.mEyeSeparation / 2 / 100, 0, 0);

        const projection = m4.frustum(left, right, this.bottom, this.top, this.mNearClippingDistance, this.mFarClippingDistance);

        return m4.multiply(projection, translate)
    }
}

/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(prog);

    iAttribVertex = gl.getAttribLocation(prog, "vertex");
    iAttribTexture = gl.getAttribLocation(prog, "texCoord");

    iModelViewProjectionMatrix = gl.getUniformLocation(prog, "ModelViewProjectionMatrix");
    iColor = gl.getUniformLocation(prog, "color");
    iColorCoef = gl.getUniformLocation(prog, "fColorCoef");
    iTextureMappingUnit = gl.getUniformLocation(prog, "u_texture");

    iVertexBuffer = gl.createBuffer();
    iTexBuffer = gl.createBuffer();

    // LoadTexture();

    gl.enable(gl.DEPTH_TEST);
}

/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    } catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);
    window.addEventListener('deviceorientation', function(event) {
        rotationMatrix = getRotationMatrix(event.alpha, event.beta, event.gamma);
        draw();
    });

    draw();
}

function handleCheckboxChange() {
    isFilled = document.getElementById("isFilled").checked;
    draw();
}

function handleEyeSeparationChange() {
    eyeSeparation = parseInt(document.getElementById("eye_separation").value);
    draw();
}
function handleConvergenceChange() {
    convergence = parseInt(document.getElementById("convergence").value);
    draw();
}
function handleFovChange() {
    fov = parseInt(document.getElementById("fov").value);
    draw();
}
function handleNearChange() {
    nearclippingdistance = parseInt(document.getElementById("nearclippingdistance").value);
    draw();
}