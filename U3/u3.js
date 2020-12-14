const torusRadiusSmall = 7;
const torusRadiusBig = 8;

$(function () {
    const scene = new THREE.Scene();
    const renderer = createRenderer();

    setupLights();
    generateTorus();

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = -10;
    camera.position.y = 20;
    camera.position.z = 35;
    camera.lookAt(scene.position);

    $("#WebGL-output").append(renderer.domElement);
    const controls = new THREE.TrackballControls(camera, renderer.domElement);
    render();

    function render() {
        renderer.render(scene, camera);
        requestAnimationFrame(render);
        controls.update();
    }

    function setupLights() {
        const spotLight = new THREE.SpotLight(0xFFFFFF);
        spotLight.position.set(-40, 60, -10);
        spotLight.castShadow = true;
        scene.add(spotLight);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);
    }

    function generateTorus() {
        const points = [];
        const numberOfPoints = 70000;

        const R = torusRadiusBig;
        const r = torusRadiusSmall;

        for (let i = 0; i < numberOfPoints; i++) {
            const x = getRandomNumber();
            const y = getRandomNumber();
            const z = getRandomNumber();

            if (Math.pow((x*x + y*y + z*z + R*R - r*r), 2) <= 4*R*R * (x*x + z*z)) {
                points.push(new THREE.Vector3(x, y, z));
            }
        }

        const hullGeometry = new THREE.ConvexGeometry(points);
        const upperLayerFaces2d = hullGeometry.faceVertexUvs[0];
        const facesCount = upperLayerFaces2d.length;
        const geometryFaces3d = hullGeometry.faces;
        const vertices = hullGeometry.vertices;

        for (let i = 0; i < facesCount; i++) {
            const geometryFace = geometryFaces3d[i];
            const vertex1 = vertices[geometryFace.a];
            const vertex2 = vertices[geometryFace.b];
            const vertex3 = vertices[geometryFace.c];

            const upperLayerFace = upperLayerFaces2d[i];

            upperLayerFace[0].x = calculateU(vertex1);
            upperLayerFace[0].y = calculateV(vertex1);

            upperLayerFace[1].x = calculateU(vertex2);
            upperLayerFace[1].y = calculateV(vertex2);

            upperLayerFace[2].x = calculateU(vertex3);
            upperLayerFace[2].y = calculateV(vertex3);

            fixSeam(upperLayerFace[0], upperLayerFace[1]);
            fixSeam(upperLayerFace[1], upperLayerFace[2]);
            fixSeam(upperLayerFace[2], upperLayerFace[0]);
        }

        const textureMaterial = new THREE.MeshPhongMaterial();
        textureMaterial.transparent = true;
        textureMaterial.map = getTexture();

        const wireFrameMaterial = new THREE.MeshBasicMaterial();
        // wireFrameMaterial.wireframe = true;

        const mesh = THREE.SceneUtils.createMultiMaterialObject(hullGeometry, [textureMaterial, wireFrameMaterial]);
        scene.add(mesh);
    }
});

function createRenderer() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xFFFFFF, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMapEnabled = true;
    return renderer;
}

function getTexture() {
    const image = new Image();
    image.src = getTextureBase64();

    const texture = new THREE.Texture();
    texture.needsUpdate = true;
    texture.image = image;
    image.onload = function () {
        texture.needsUpdate = true;
    };

    return texture;
}

function getRandomNumber() {
    const torusDiameter = torusRadiusBig * 2;
    return -torusDiameter + Math.random() * torusDiameter*2;
}

function calculateU(vertex) {
    const phi = Math.atan2(vertex.x, vertex.z);
    return phi / (2*Math.PI) + 0.5;
}

function calculateV(vertex) {
    const phi = Math.atan2(vertex.x, vertex.z);
    const sinePhi =  Math.sin(phi);

    let w;

    if (sinePhi !== 0) {
        w = (vertex.x / sinePhi) - torusRadiusBig;
    } else {
        w = (vertex.z / Math.cos(phi)) - torusRadiusBig;
    }

    const psi = Math.atan2(vertex.y, w);
    return psi / Math.PI + 0.5;
}

function fixSeam(face1, face2) {
    const diff = 0.9;

    if (Math.abs(face1.x - face2.x) > diff) {
        const faceToAdjust = face1.x > face2.x ? face1 : face2;
        faceToAdjust.x -= 1;
    }
}
