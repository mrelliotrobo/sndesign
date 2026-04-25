import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let scene, camera, renderer, model, composer;
let flashObjects = [], flashLight, stars;
let mouseX = 0, mouseY = 0;
let realMouse = { x: 0, y: 0 };
let windowHalfX = window.innerWidth / 2, windowHalfY = window.innerHeight / 2;
const isMobile = window.innerWidth < 768;

// LINK DE DOWNLOAD DIRETO DO TEU GOOGLE DRIVE
const MODEL_URL = 'https://docs.google.com/uc?export=download&id=1F5tdgCsDQHieLvyhR7odaIdzt5nsyZQj';

// --- ÁUDIO ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const shotSound = new Audio('assets/sounds/shot.mp3');
const bgMusic = new Audio('assets/sounds/background.mp3');
bgMusic.loop = true;

const shotSource = audioCtx.createMediaElementSource(shotSound);
const shotGain = audioCtx.createGain(); shotGain.gain.value = 10.0;
shotSource.connect(shotGain).connect(audioCtx.destination);

const bgSource = audioCtx.createMediaElementSource(bgMusic);
const bgGain = audioCtx.createGain(); bgGain.gain.value = 0.1;
bgSource.connect(bgGain).connect(audioCtx.destination);

// --- LOADING ---
const loadingManager = new THREE.LoadingManager();
loadingManager.onLoad = () => {
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if(loadingScreen) loadingScreen.style.opacity = '0';
        if (audioCtx.state === 'suspended') audioCtx.resume();
        bgMusic.play().catch(() => {});
        setTimeout(() => { if(loadingScreen) loadingScreen.style.display = 'none'; }, 800);
    }, 500);
};

// Barra de progresso para o download do Drive
loadingManager.onProgress = (url, loaded, total) => {
    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = (loaded / total * 100) + '%';
};

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020406);
    scene.fog = new THREE.FogExp2(0x020406, 0.1);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, isMobile ? 3.0 : 2.2); 

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ReinhardToneMapping;
    document.getElementById('three-container').appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Estrelas
    const starsGeo = new THREE.BufferGeometry();
    const starsPos = [];
    for (let i = 0; i < 6000; i++) starsPos.push((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
    starsGeo.setAttribute('position', new THREE.Float32BufferAttribute(starsPos, 3));
    stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x39ff14, size: 0.009, transparent: true, opacity: 0.5 }));
    scene.add(stars);

    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    flashLight = new THREE.PointLight(0x39ff14, 0, 20);
    scene.add(flashLight);

    // CARREGAMENTO DO MODELO VIA GOOGLE DRIVE
    const loader = new GLTFLoader(loadingManager);
    loader.load(MODEL_URL, (gltf) => {
        model = gltf.scene;
        model.traverse(c => {
            if(c.isMesh) {
                c.material.metalness = 0.7;
                c.material.roughness = 0.3;
            }
            // Lógica original do Flash
            if(c.name.toLowerCase().includes('flash')) {
                c.visible = false;
                flashObjects.push(c);
            }
        });
        
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        model.scale.set(5.2 / size.length(), 5.2 / size.length(), 5.2 / size.length());
        model.position.set(isMobile ? 0 : 0.6, isMobile ? -2.0 : -2.9, 0); 
        scene.add(model);
    }, undefined, (error) => {
        console.error("Erro ao carregar do Drive:", error);
    });

    document.addEventListener('mousemove', (e) => {
        mouseX = (e.clientX - windowHalfX);
        mouseY = (e.clientY - windowHalfY);
        realMouse.x = e.clientX; realMouse.y = e.clientY;
    });

    document.addEventListener('mousedown', () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        shoot();
    });
}

function shoot() {
    shotSound.currentTime = 0; 
    shotSound.play().catch(()=>{});
    
    if (flashObjects.length > 0) {
        flashLight.intensity = 40;
        flashLight.position.set(model.position.x, model.position.y + 2.5, 1.5);
        
        flashObjects.forEach(obj => obj.visible = true);
        
        model.position.z -= 0.12;

        setTimeout(() => {
            flashLight.intensity = 0;
            flashObjects.forEach(obj => obj.visible = false);
            model.position.z += 0.12;
        }, 70);
    }
}

function animate() {
    requestAnimationFrame(animate);
    if (model) {
        let targetY = (mouseX * 0.0006) + (isMobile ? 0 : 0.15);
        let targetX = (mouseY * 0.0003);
        model.rotation.y += (targetY - model.rotation.y) * 0.05;
        model.rotation.x += (targetX - model.rotation.x) * 0.05;
    }
    if (stars) stars.rotation.y += 0.0002;
    composer.render();
}

init();
animate();