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
let iIndexBuffer;

let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.
let stereoCam;

let isFilled = false;
let eyeSeparation = 70;
let convergence = 2000;
let scale = 3;
let fov = 1;
let step = 0.005;

let nearclippingdistance = 1;

let rotationMatrix = getRotationMatrix();

const R = 1;
const a = 1;
const n = 1;

// const x = (r, B) => r * Math.cos(B);
// const y = (r, B) => r * Math.sin(B);
// const z = (r) => a * Math.cos((n * Math.PI * r) / R);
function add(u, v) {
    var result = [];

    if (u.matrix && v.matrix) {
        if (u.length != v.length) {
            throw "add(): trying to add matrices of different dimensions";
        }

        for (var i = 0; i < u.length; ++i) {
            if (u[i].length != v[i].length) {
                throw "add(): trying to add matrices of different dimensions";
            }
            result.push([]);
            for (var j = 0; j < u[i].length; ++j) {
                result[i].push(u[i][j] + v[i][j]);
            }
        }

        result.matrix = true;

        return result;
    }
    else if (u.matrix && !v.matrix || !u.matrix && v.matrix) {
        throw "add(): trying to add matrix and non-matrix variables";
    }
    else {
        if (u.length != v.length) {
            throw "add(): vectors are not the same dimension";
        }

        for (var i = 0; i < u.length; ++i) {
            result.push(u[i] + v[i]);
        }

        return result;
    }
}

function subtract(u, v) {
    var result = [];

    if (u.matrix && v.matrix) {
        if (u.length != v.length) {
            throw "subtract(): trying to subtract matrices" +
            " of different dimensions";
        }

        for (var i = 0; i < u.length; ++i) {
            if (u[i].length != v[i].length) {
                throw "subtract(): trying to subtact matrices" +
                " of different dimensions";
            }
            result.push([]);
            for (var j = 0; j < u[i].length; ++j) {
                result[i].push(u[i][j] - v[i][j]);
            }
        }

        result.matrix = true;

        return result;
    }
    else if (u.matrix && !v.matrix || !u.matrix && v.matrix) {
        throw "subtact(): trying to subtact  matrix and non-matrix variables";
    }
    else {
        if (u.length != v.length) {
            throw "subtract(): vectors are not the same length";
        }

        for (var i = 0; i < u.length; ++i) {
            result.push(u[i] - v[i]);
        }

        return result;
    }
}

function cross(u, v) {
    if (!Array.isArray(u) || u.length < 3) {
        throw "cross(): first argument is not a vector of at least 3";
    }

    if (!Array.isArray(v) || v.length < 3) {
        throw "cross(): second argument is not a vector of at least 3";
    }

    var result = [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];

    return result;
}

function normalize(u, excludeLastComponent) {
    if (excludeLastComponent) {
        var last = u.pop();
    }

    var len = length(u);

    if (!isFinite(len)) {
        throw "normalize: vector " + u + " has zero length";
    }

    for (var i = 0; i < u.length; ++i) {
        u[i] /= len;
    }

    if (excludeLastComponent) {
        u.push(last);
    }

    return u;
}

function dot(u, v) {
    if (u.length != v.length) {
        throw "dot(): vectors are not the same dimension";
    }

    var sum = 0.0;
    for (var i = 0; i < u.length; ++i) {
        sum += u[i] * v[i];
    }

    return sum;
}

function length(u) {
    return Math.sqrt(dot(u, u));
}

/**function fi_func (u, C)
{
    return - u / Math.sqrt(C + 1) + Math.atan(Math.sqrt(C + 1) * Math.tan(u));
}

function alpha_func (u, v, C)
{
    return 2 / (C + 1 - C * (Math.sin(v) ** 2) * (Math.cos(u) ** 2))
}

function r_func (u, v, C) 
{
    return (alpha_func(u, v, C) / Math.sqrt(C)) * Math.sqrt((C + 1) * (1 + C * (Math.sin(u) ** 2))) * Math.sin(v);
}
**/

function funct(u, z, a) {
    return Math.sqrt((z * 3) ** 2 * Math.cos(2 * u) + Math.sqrt(a ** 4 - (z * 3) ** 4 * Math.sin(2 * u) ** 2));
}

function calculateStartShape(u, v, scale) {
    let _c = 8;
    let u_scaled = u * Math.PI * 2;
    let v_scaled = v * 8/3*2 - 8/3;

    const x = scale * funct(u_scaled, v_scaled, _c) * Math.cos(u_scaled);
    const y = scale * funct(u_scaled, v_scaled, _c) * Math.sin(u_scaled);
    const z = scale * 8 * v_scaled;

    return [x, y, z];
}


function drawPrimitive(primitiveType, color, vertices, texCoords, indices) {
    // console.log("v" + vertices.length);
    // console.log("i" + indices.length);
    // console.log("i" + indices);
    // console.log("i" + indices);
    // console.log("c" + iColor, color)
    // console.log(primitiveType);
    gl.uniform4fv(iColor, color);
    gl.uniform1f(iColorCoef, 0);

    gl.enableVertexAttribArray(iAttribVertex);
    gl.bindBuffer(gl.ARRAY_BUFFER, iVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);
    if (indices) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STREAM_DRAW);
    }
    gl.vertexAttribPointer(iAttribVertex, 3, gl.FLOAT, false, 0, 0);

    gl.disableVertexAttribArray(iAttribTexture);
    gl.vertexAttrib2f(iAttribTexture, 0.0, 0.0);
    gl.uniform1f(iColorCoef, 1.0);
    gl.drawArrays(primitiveType, 0, vertices.length / 3);
    if (!indices) {
        gl.drawArrays(primitiveType, 0, vertices.length / 3);
    } else {
        gl.drawElements(primitiveType, indices.length * 1.2, gl.UNSIGNED_SHORT, 0);
    }
}

const degtorad = Math.PI / 180; // Degree-to-Radian conversion

function getRotationMatrix(alpha, beta, gamma) {

    const _x = beta ? -beta * degtorad : 0; // beta value
    const _y = gamma ? -gamma * degtorad : 0; // gamma value
    const _z = alpha ? -alpha * degtorad : 0; // alpha value

    const cX = Math.cos(_x);
    const cY = Math.cos(_y);
    const cZ = Math.cos(_z);
    const sX = Math.sin(_x);
    const sY = Math.sin(_y);
    const sZ = Math.sin(_z);

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

function DrawSurface() {
    let vertices = [];
    let indices = [];
    let i = 0;
    let j = 0;
    let top = 0.999;
    let totalSteps = Math.ceil(top / step);
    // console.log("totstep: " + totalSteps);
    let primitive;
    let p1, p2;
    for (let u = 0; u <= top; u += step, i++) {
        for (let v = 0; v <= top; v += step, j++) {
            let tempP = calculateStartShape(u, v, scale);
            vertices.push(...tempP);
            p1 = i * (totalSteps + 1) + j;
            p2 = p1 + (totalSteps + 1);
            indices.push(p1);
            indices.push(p2);
            indices.push(p1 + 1);

            indices.push(p1 + 1);
            indices.push(p2);
            indices.push(p1 + 1);
        }
    }

    if (isFilled) {
        primitive = gl.TRIANGLES;
    } else {
        primitive = gl.LINES;
    }
    drawPrimitive(primitive, [0.6, 0.6, 0.6, 0.6], vertices, [], indices);
    drawPrimitive(gl.LINES, [1, 0, 0, 1], [-3, 0, 0, 3, 0, 0]); // X-axis (red)
    drawPrimitive(gl.LINES, [0, 1, 0, 1], [0, -3, 0, 0, 3, 0]); // Y-axis (green)
    drawPrimitive(gl.LINES, [0, 0, 1, 1], [0, 0, -3, 0, 0, 3]); // Z-axis (blue)
}

function draw() {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();
    let projection = m4.perspective(Math.PI / 20, 1, 6, 20);

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccum1 = m4.multiply(translateToPointZero, matAccum0);
    let modelViewProjection = m4.multiply(projection, matAccum1);
    //left frustum
    let modelViewProjectionLeft = m4.multiply(stereoCam.ApplyLeftFrustum(), matAccum1);
    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionLeft);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(1, 0, 0, 0);
    DrawSurface();
    gl.clear(gl.DEPTH_BUFFER_BIT);
    //right frustum
    let modelViewProjectionRight = m4.multiply(stereoCam.ApplyRightFrustum(), matAccum1);
    gl.uniformMatrix4fv(iModelViewProjectionMatrix, false, modelViewProjectionRight);
    gl.uniform1i(iTextureMappingUnit, 0);
    gl.colorMask(0, 1, 1, 0);
    DrawSurface();

    gl.colorMask(1, 1, 1, 1);
}

class StereoCamera {

    constructor(
        eyeSeparation,
        convergence,
        aspectRatio,
        FOV,
        nearClippingDistance,
        farClippingDistance,
    ) {
        this.eyeSeparation = eyeSeparation;
        this.mConvergence = convergence;
        this.mAspectRatio = aspectRatio;
        this.FOV = FOV;
        this.mNearClippingDistance = nearClippingDistance;
        this.mFarClippingDistance = farClippingDistance;
    }

    ApplyLeftFrustum() {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.FOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.FOV / 2) * this.mConvergence;
        let b = a - this.eyeSeparation / 2;
        let c = a + this.eyeSeparation / 2;

        left = -b * this.mNearClippingDistance / this.mConvergence;
        right = c * this.mNearClippingDistance / this.mConvergence;

        return m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
    }

    ApplyRightFrustum() {
        let top, bottom, left, right;
        top = this.mNearClippingDistance * Math.tan(this.FOV / 2);
        bottom = -top;

        let a = this.mAspectRatio * Math.tan(this.FOV / 2) * this.mConvergence;
        let b = a - this.eyeSeparation / 2;
        let c = a + this.eyeSeparation / 2;

        left = -c * this.mNearClippingDistance / this.mConvergence;
        right = b * this.mNearClippingDistance / this.mConvergence;

        return m4.frustum(left, right, bottom, top, this.mNearClippingDistance, this.mFarClippingDistance);
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
    iIndexBuffer = gl.createBuffer();
    // LoadTexture();

    gl.enable(gl.DEPTH_TEST);
}

function LoadTexture() {
    // Create a texture.
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
    // Asynchronously load an image
    var image = new Image();
    image.crossOrigin = 'anonymous';
    image.src = "https://webglfundamentals.org/webgl/resources/f-texture.png";
    image.addEventListener('load', () => {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

        draw();
    });
}


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
    stereoCam = new StereoCamera(
        70,         // eye separation
        2000.0,     // Convergence
        1.3333,     // Aspect Ratio
        .7,         // FOV along Y in degrees
        1.0,        // Near Clipping Distance
        20000.0,    // Far Clipping Distance
    );
    window.addEventListener('deviceorientation', function (event) {
        rotationMatrix = getRotationMatrix(event.alpha, event.beta, event.gamma);
        draw();
    });
    draw();
}

function handleWireFrameChange() {
    // console.log("asd")
    isFilled = !isFilled;
    draw();
}

function handleEyeSeparationChange() {
    // console.log("asdasdads")
    eyeSeparation = parseInt(document.getElementById("eyeseparation").value);
    console.log(eyeSeparation);
    stereoCam.eyeSeparation = eyeSeparation;
    draw();
}

//FOV
function handleFovChange() {
    // console.log("asdasdads")
    fov = (document.getElementById("fov").value);
    console.log(fov);
    stereoCam.FOV = fov;
    draw();
}

function handleNearClipDistChange() {
    // console.log("asdasdads")
    nearclippingdistance = (document.getElementById("nearclippingdistance").value);
    console.log(nearclippingdistance);
    stereoCam.nearClippingDistance = nearclippingdistance;
    draw();
}

function handleConvergenceChange() {
    // console.log("asdasdads")
    convergence = (document.getElementById("convergence").value);
    console.log(convergence);
    stereoCam.convergence = convergence;
    draw();
}

function handleScaleChange() {
    // console.log("asdasdads")
    scale = (document.getElementById("scale").value);
    console.log(scale);
    draw();
}