function createRenderer() {
    const renderer = new THREE.WebGLRenderer();
    renderer.setClearColor(0xFFFFFF, 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMapEnabled = true;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;
    return renderer;
}

function render(renderer, scene, camera, controls) {
    renderer.render(scene, camera);
    requestAnimationFrame(() => render(renderer, scene, camera, controls));
    controls.update();
}

function degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
}

function createPlane() {
    const groundPlaneGeometry = new THREE.PlaneGeometry(100, 100);
    const groundPlaneMaterial = new THREE.MeshLambertMaterial({ color: 0xFFFFFF });
    const groundPlane = new THREE.Mesh(groundPlaneGeometry, groundPlaneMaterial);
    groundPlane.receiveShadow  = true;
    groundPlane.rotation.x = -0.5 * Math.PI;
    groundPlane.position.x = 15;
    groundPlane.position.y = 0;
    groundPlane.position.z = 0;
    return groundPlane;
}

function createTopPlane() {
    const size = 12.5;

    const groundPlaneGeometry = new THREE.PlaneGeometry(size, size);
    const groundPlaneMaterial = new THREE.MeshLambertMaterial({ color: 0xD3D3D3 });
    const groundPlane = new THREE.Mesh(groundPlaneGeometry, groundPlaneMaterial);
    groundPlane.position.x = size/2 - 0.55;

    const planeGeometry = new THREE.PlaneGeometry(size*2, size*2);
    const plane = new THREE.Mesh(planeGeometry, groundPlaneMaterial);
    plane.visible = false;

    const box = new THREE.Object3D();
    box.rotation.x = -0.5 * Math.PI;
    box.name = 'Plane';
    box.add(groundPlane);
    box.add(plane);

    return box;
}

function clearScene(scene) {
    let toRemove = [];

    scene.traverse(function(child) {
        if (child.name === 'StepLevel' || child.name === 'Rails' || child.name === 'Plane') {
            toRemove.push(child);
        }
    });

    for (let i = 0; i < toRemove.length; i++) {
        scene.remove(toRemove[i]);
    }
}

$(function() {

    // Vartotojo sąsaja

    const settings = new function () {
        this.stepCount = 9;
        this.stairsRotationAngle = 90;
        this.showTopGroundPlane = true;
        this.shift = 0;

        this.redraw = function () {
            clearScene(scene);
            drawStairs();
        };
    };

    const gui = new dat.GUI();
    gui.add(settings, 'stepCount', 3, 15).step(1).name('Laiptų skaičius').onChange(settings.redraw);
    gui.add(settings, 'stairsRotationAngle', 0, 180).step(1).name('Sukimo kampas').onChange(settings.redraw);
    gui.add(settings, 'shift', -0.65, 0.65).step(0.1).name('Sukimo poslinkis').onChange(settings.redraw);
    gui.add(settings, 'showTopGroundPlane').name('Viršutinės grindys').onFinishChange(settings.redraw);

    // Scena

    const scene = new THREE.Scene();

    const groundPlane = createPlane();
    scene.add(groundPlane);

    // X => raudona. Y => žalia. Z => mėlyna.
    // const axesHelper = new THREE.AxesHelper(20);
    // scene.add(axesHelper);

    drawStairs();

    // Kamera

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.x = 0;
    camera.position.y = 10;
    camera.position.z = 35;
    camera.lookAt(scene.position);

    // Apšvietimas

    const spotLight = new THREE.SpotLight(0xFFFFFF);
    spotLight.position.set(-40, 60, -10);
    spotLight.castShadow = true;
    scene.add(spotLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // Render

    const renderer = createRenderer();
    $("#WebGL-Output").append(renderer.domElement);
    const trackballControls = new THREE.TrackballControls(camera, renderer.domElement);
    render(renderer, scene, camera, trackballControls);

    // Laiptai

    function drawStairs() {
        const stepCount = settings.stepCount;
        const stepSupportMaterial = new THREE.MeshPhongMaterial({ color: 0x7D7D71 });
        stepSupportMaterial.side = THREE.DoubleSide;

        const stepDepth = 3;
        const stepWidth = 8;
        const stepHeight = 1;

        const spaceBetweenFootsteps = 2;
        const stairRotationInDegrees = settings.stairsRotationAngle;

        const railsSupportRadius = 0.25;
        const railsRadius = 0.35;
        const railsDistance = 1.5;
        const railsHeight = 5;
        const railsExtension = 0.5;
        const railsPoints = [];

        const supportDepth = 0.5;
        const supportWidth = 2;
        const verticalSupportRadius = 0.6;

        let currentXCoordinate = 0;
        let currentYCoordinate = 0;
        let currentZCoordinate = 0;

        for (let i = 0; i < stepCount; i++) {

            // Laiptas

            const stepBox = createStep(stepDepth, stepWidth, stepHeight);
            if (i % 2 !== 0) {
                stepBox.scale.multiply(new THREE.Vector3(-1, 1, 1));
            }

            // Horizontali palaikanti konstrukcija

            const horizontalSupportLength = stepDepth / 2 + verticalSupportRadius;
            const horizontalStepSupportGeometry = new THREE.BoxGeometry(horizontalSupportLength, supportDepth, supportWidth);
            const horizontalStepSupport = new THREE.Mesh(horizontalStepSupportGeometry, stepSupportMaterial);
            horizontalStepSupport.castShadow = true;
            horizontalStepSupport.position.x = horizontalSupportLength/2;
            horizontalStepSupport.position.y = -(stepHeight/2 + supportDepth/2);

            // Vertikali palaikanti konstrukcija

            const verticalStepSupportGeometry = new THREE.CylinderGeometry(verticalSupportRadius, verticalSupportRadius, supportDepth + stepHeight + spaceBetweenFootsteps);
            const verticalStepSupport = new THREE.Mesh(verticalStepSupportGeometry, stepSupportMaterial);
            verticalStepSupport.castShadow = true;
            verticalStepSupport.position.x = stepDepth/2 + verticalSupportRadius;
            verticalStepSupport.position.y =  spaceBetweenFootsteps/2 - supportDepth/2;

            // Turėklus palaikanti konstrukcija

            let railsSupport = null;
            if (i % 2 === 0) {
                const railsSupportPoints = [];
                railsSupportPoints.push(new THREE.Vector3(railsSupportRadius, -stepHeight / 2 - supportDepth / 2, 0));
                railsSupportPoints.push(new THREE.Vector3(railsSupportRadius, -stepHeight / 2 - supportDepth / 2, stepWidth / 2));
                railsSupportPoints.push(new THREE.Vector3(railsSupportRadius, -stepHeight / 2 - supportDepth / 2, stepWidth / 2 + railsDistance / 2));
                railsSupportPoints.push(new THREE.Vector3(railsSupportRadius, -stepHeight / 2, stepWidth / 2 + railsDistance / 4 * 3));
                railsSupportPoints.push(new THREE.Vector3(railsSupportRadius, 0, stepWidth / 2 + railsDistance));
                railsSupportPoints.push(new THREE.Vector3(railsSupportRadius, railsHeight, stepWidth / 2 + railsDistance));
                const railsSupportGeometry = new THREE.TubeGeometry(new THREE.SplineCurve3(railsSupportPoints), 30, railsSupportRadius, 30, false);
                railsSupport = new THREE.Mesh(railsSupportGeometry, stepSupportMaterial);
                railsSupport.castShadow = true;
            }

            // Turėklų taškas

            const railsTopGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.25);
            const railsTop = new THREE.Mesh(railsTopGeometry, stepSupportMaterial);
            railsTop.position.x = railsSupportRadius;
            railsTop.position.y = railsHeight;
            railsTop.position.z = stepWidth / 2 + railsDistance;
            railsTop.visible = false;

            // Turėklų pradžios taškas

            let railsTopStart = null;
            if (i === 0) {
                railsTopStart = new THREE.Mesh(railsTopGeometry, stepSupportMaterial);
                railsTopStart.position.x = railsTop.position.x - railsExtension;
                railsTopStart.position.y = railsTop.position.y;
                railsTopStart.position.z = railsTop.position.z;
                railsTopStart.visible = false;
            }

            // Turėklų pabaigos taškas

            let railsTopEnd = null;
            if ((i+1) === stepCount) {
                railsTopEnd = new THREE.Mesh(railsTopGeometry, stepSupportMaterial);
                railsTopEnd.position.x = railsTop.position.x + railsExtension;
                railsTopEnd.position.y = railsTop.position.y;
                railsTopEnd.position.z = railsTop.position.z;
                railsTopEnd.visible = false;
            }

            // Laiptų lygis

            const stepRotationInRadians = degreesToRadians((stairRotationInDegrees / (stepCount - 1)) * i);

            const stepLevel = new THREE.Object3D();
            stepLevel.add(stepBox);
            stepLevel.add(horizontalStepSupport);
            if (i !== stepCount - 1) {
                stepLevel.add(verticalStepSupport);
            }
            if (railsSupport !== null) {
                stepLevel.add(railsSupport);
            }
            stepLevel.add(railsTop);
            if (railsTopStart !== null) {
                stepLevel.add(railsTopStart);
            }
            if (railsTopEnd !== null) {
                stepLevel.add(railsTopEnd);
            }

            stepLevel.position.x = currentXCoordinate;
            stepLevel.position.z = currentZCoordinate;
            stepLevel.position.y = supportDepth + (stepHeight/2) + i * (stepHeight + spaceBetweenFootsteps);
            stepLevel.rotation.y = stepRotationInRadians;
            stepLevel.name = 'StepLevel';
            scene.add(stepLevel);

            // Turėklų taško koordinatės

            scene.updateMatrixWorld();
            const railsTopPoint = new THREE.Vector3();
            railsTop.getWorldPosition(railsTopPoint);
            railsPoints.push(railsTopPoint);

            // Turėklų pradžios taško koordinatės

            if (railsTopStart !== null) {
                scene.updateMatrixWorld();
                const railsTopStartPoint = new THREE.Vector3();
                railsTopStart.getWorldPosition(railsTopStartPoint);
                railsPoints.unshift(railsTopStartPoint);
            }

            // Turėklų pabaigos taško koordinatės

            if (railsTopEnd !== null) {
                scene.updateMatrixWorld();
                const railsTopEndPoint = new THREE.Vector3();
                railsTopEnd.getWorldPosition(railsTopEndPoint);
                railsPoints.push(railsTopEndPoint);
            }

            // Koordinatės sekančios

            const shift = stepDepth/2 + verticalSupportRadius + settings.shift;
            currentXCoordinate = currentXCoordinate + shift * Math.cos(stepRotationInRadians);
            currentYCoordinate = stepLevel.position.y;
            currentZCoordinate = currentZCoordinate - shift * Math.sin(stepRotationInRadians);
        }

        // Turėklai

        const railsGeometry = new THREE.TubeGeometry(new THREE.SplineCurve3(railsPoints), 30, railsRadius, 30, false);
        const rails = new THREE.Mesh(railsGeometry, stepSupportMaterial);
        rails.castShadow = true;
        rails.name = 'Rails';
        scene.add(rails);

        // Turėklų pradžios dangtelis

        const railsStarCapGeometry = new THREE.CircleGeometry(railsRadius, 32);
        const railsStartCap = new THREE.Mesh(railsStarCapGeometry, stepSupportMaterial);
        railsStartCap.position.x = railsPoints[0].x;
        railsStartCap.position.y = railsPoints[0].y;
        railsStartCap.position.z = railsPoints[0].z;
        railsStartCap.rotation.y = -0.5*Math.PI;
        railsStartCap.name = 'Rails';
        scene.add(railsStartCap);

        // Turėklų pabaigos dangtelis

        const railsEndCapGeometry = new THREE.CircleGeometry(railsRadius, 32);
        const railsEndCap = new THREE.Mesh(railsEndCapGeometry, stepSupportMaterial);
        railsEndCap.position.x = railsPoints[railsPoints.length - 1].x;
        railsEndCap.position.y = railsPoints[railsPoints.length - 1].y;
        railsEndCap.position.z = railsPoints[railsPoints.length - 1].z;
        railsEndCap.rotation.y = -0.5*Math.PI + degreesToRadians(settings.stairsRotationAngle);
        railsEndCap.name = 'Rails';
        scene.add(railsEndCap);

        // Viršutinės grindys

        if (settings.showTopGroundPlane) {
            const topGroundPlane = createTopPlane();
            topGroundPlane.position.x = currentXCoordinate;
            topGroundPlane.position.y = currentYCoordinate;
            topGroundPlane.position.z = currentZCoordinate;
            topGroundPlane.rotation.z = degreesToRadians(settings.stairsRotationAngle);
            scene.add(topGroundPlane);
        }
    }

    function createStep(depth, width, height){
        const extrudeSettings = {
            amount: (height - 0.25) / 2,
            bevelThickness: 0.25,
            bevelSize: 0.25,
            bevelSegments: 25,
            bevelEnabled: true,
            curveSegments: 20,
            steps: 4,
        };

        const step = new THREE.ExtrudeGeometry(drawStep(width, depth - extrudeSettings.bevelSize*2), extrudeSettings);
        const material = new THREE.MeshLambertMaterial({ color: 0xDD9F66 });

        const mesh = new THREE.Mesh(step, material);
        mesh.rotation.x = Math.PI/2;
        mesh.rotation.z = Math.PI/2;
        mesh.castShadow = true;
        return mesh;
    }

    function drawStep(width, height) {
        const shape = new THREE.Shape();
        shape.moveTo(-width/2, -height/2);
        shape.lineTo(width/2, -height/2);
        shape.lineTo(width/2, 0);
        shape.quadraticCurveTo(0, height/2, -width/2, height/2);
        return shape;
    }
});
