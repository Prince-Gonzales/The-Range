/*
main.js
This script sets up the entire 3D shooting game: it initializes Three.js, loads models, audio, 
and textures with a loading manager, configures level difficulty options, handles shooting and 
collisions, manages countdowns and timers, updates UI through the UIManager, and runs the continuous 
game loop with target spawning, movement, and player controls.

Purpose
Its purpose is to serve as the core game controller—managing the 3D scene, player interactions, game 
rules, target behavior, audio, levels, timing, and UI updates, essentially running the full logic and 
flow of the shooting game.
*/


import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { Target } from './components/Target.js';
import { UIManager } from './manager.js';
import { AuthManager } from './auth.js';

// Import difficulty levels
import { beginner } from './levels/beginner.js';
import { intermediate } from './levels/intermediate.js';
import { professional } from './levels/professional.js';

// Initialize UI Manager FIRST with empty levels
const uiManager = new UIManager();
// Hide level selector until authenticated
uiManager.hideLevelSelector();

// Initialize auth and show level selector on login
const auth = new AuthManager();
document.addEventListener('auth:login', async (e) => {
    const user = e.detail?.user;
    if (user) {
        window.currentUsername = user.username;
    }
    uiManager.showLevelSelector();
    const scores = await fetchHighScores();
    uiManager.updateHighScores(scores);
});

// Listen for leaderboard button click
document.addEventListener('leaderboard:open', () => {
    uiManager.showLeaderboard(null, window.currentUsername || null);
});

// Listen for leaderboard close event
document.addEventListener('leaderboard:close', () => {
    uiManager.hideLeaderboard();
});

// THEN set up the levels and update UI
const levels = { beginner, intermediate, professional };
uiManager.updateLevelInfo(levels); // This updates the UI with real level data

// Game State
const gameState = {
    currentLevel: beginner,
    score: 0,
    timeLeft: 0,
    isPlaying: false,
    isCountdown: false,
    countdown: 3,
    levels: levels,
    shotsFired: 0,
    hits: 0,
    currentLevelKey: 'beginner'
};
let lastSubmitted = { beginner: 0, intermediate: 0, professional: 0 };

const loadingManager = uiManager.getLoadingManager();

// ... rest of your main.js code
// Three.js Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.xr.enabled = true;
document.body.appendChild(VRButton.createButton(renderer));
const XR_ONLY = new URLSearchParams(location.search).get('xr') === '1';

// Loaders with Loading Manager - FIXED: loadingManager now exists
const textureLoader = new THREE.TextureLoader(loadingManager);
const audioLoader = new THREE.AudioLoader(loadingManager);
const gltfLoader = new GLTFLoader(loadingManager);

// Background
textureLoader.load('/textures/envMaps/Aimlabs Background.png',
    (texture) => {
        scene.background = texture;
    },
    undefined,
    (err) => {
        console.error('Background error:', err);
        scene.background = new THREE.Color(0x87ceeb);
    }
);

// Lights
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(10, 10, 10);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 0.5));

// Controls
const controls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.style.cursor = 'pointer';

// Game Variables
let gun;
let targets = [];

// Audio variables
let shootSounds = [];
let currentSoundIndex = 0;
const MAX_SOUNDS = 5;

// Create AudioListener
const listener = new THREE.AudioListener();
camera.add(listener);

// Function to initialize audio
function initAudio() {
    if (shootSounds.length > 0) return;
    
    audioLoader.load('/sounds/glocksound.mp3',
        (buffer) => {
            for (let i = 0; i < MAX_SOUNDS; i++) {
                const sound = new THREE.Audio(listener);
                sound.setBuffer(buffer);
                sound.setVolume(0.5);
                shootSounds.push(sound);
            }
        },
        undefined,
        (err) => {
            console.error('Sound load error:', err);
            createFallbackSound();
        }
    );
}

// Fallback using Web Audio API
function createFallbackSound() {
    const context = new (window.AudioContext || window.webkitAudioContext)();
    
    shootSounds = {
        play: function() {
            try {
                const oscillator = context.createOscillator();
                const gainNode = context.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(context.destination);
                
                oscillator.frequency.value = 200;
                oscillator.type = 'square';
                gainNode.gain.value = 0.1;
                
                const now = context.currentTime;
                oscillator.start(now);
                oscillator.stop(now + 0.1);
            } catch (err) {
                console.error('Fallback sound error:', err);
            }
        }
    };
}

// Function to play shoot sound with no cooldown
function playShootSound() {
    if (!shootSounds || shootSounds.length === 0) return;
    
    try {
        if (Array.isArray(shootSounds)) {
            const sound = shootSounds[currentSoundIndex];
            
            if (sound.isPlaying) {
                sound.stop();
            }
            
            sound.play();
            currentSoundIndex = (currentSoundIndex + 1) % shootSounds.length;
        } else if (shootSounds.play) {
            shootSounds.play();
        }
    } catch (err) {
        console.error('Error playing shoot sound:', err);
    }
}

// Load Gun
gltfLoader.load('/models/gun.glb', (gltf) => {
    gun = gltf.scene;
    const box = new THREE.Box3().setFromObject(gun);
    const center = box.getCenter(new THREE.Vector3());
    gun.position.sub(center);
    
    const maxDim = Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, box.getSize(new THREE.Vector3()).z);
    if (maxDim > 0) {
        gun.scale.multiplyScalar(1.0 / maxDim);
    }

    camera.add(gun);
    gun.position.set(0.5, -0.8, -1.0);
    gun.rotation.set(0, Math.PI, 0);
}, undefined, (err) => {
        console.error('Gun load error:', err);
        const geometry = new THREE.BoxGeometry(0.3, 0.1, 0.5);
        const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
        gun = new THREE.Mesh(geometry, material);
        camera.add(gun);
        gun.position.set(0.3, -0.5, -0.5);
    }
);

// Game Functions
function createTargets(levelConfig) {
    targets.forEach(target => scene.remove(target.mesh));
    targets = [];

    for (let i = 0; i < levelConfig.targetCount; i++) {
        const target = new Target(scene, levelConfig);
        targets.push(target);
    }
}
// Start timer countdown before game
function startCountdown(level) {
    gameState.currentLevel = level;
    gameState.currentLevelKey = Object.entries(gameState.levels).find(([k, v]) => v === level)?.[0] || 'beginner';
    gameState.score = 0;
    gameState.timeLeft = level.gameTime;
    gameState.isCountdown = true;
    gameState.countdown = 5;
    gameState.shotsFired = 0;
    gameState.hits = 0;

    // Use uiManager instead of direct DOM manipulation
    uiManager.updateScore(0);
    uiManager.updateTimer(formatTime(gameState.timeLeft));
    uiManager.updateAccuracy(0);
    
    uiManager.hideLevelSelector();
    uiManager.showCountdown();
    uiManager.updateCountdown(gameState.countdown);

    createTargets(level);

    const countdownInterval = setInterval(() => {
        gameState.countdown--;
        uiManager.updateCountdown(gameState.countdown);

        if (gameState.countdown <= 0) {
            clearInterval(countdownInterval);
            uiManager.hideCountdown();

            // START THE GAME ONLY AFTER COUNTDOWN
            gameState.isPlaying = true;
            uiManager.showCrosshair();
            auth.hideHeader();
            document.body.classList.add('playing');
            uiManager.showGameHeader();
        }
    }, 1000);
}

function startGame() {
    gameState.isPlaying = true;
    gameState.isCountdown = false;
    uiManager.showCrosshair();
    auth.hideHeader();
    document.body.classList.add('playing');
    
    /*
    setTimeout(() => {
        try {
            controls.lock();
        } catch (err) {
            console.log('Pointer lock after countdown failed: ', err);
        }
    }, 100);*/
}

async function endGame() {
    gameState.isPlaying = false;
    controls.unlock();
    uiManager.hideCrosshair();
    auth.showHeader();
    document.body.classList.remove('playing');
    uiManager.hideGameHeader();
    const key = gameState.currentLevelKey;
    lastSubmitted[key] = 0;
    await submitBestScore(key, gameState.score);
    const latest = await fetchHighScores();
    uiManager.updateHighScores(latest);
    const totalShots = gameState.shotsFired;
    const acc = totalShots ? (gameState.hits / totalShots) * 100 : 0;
    const misses = Math.max(0, totalShots - gameState.hits);
    const timePlayed = Math.max(0, (gameState.currentLevel.gameTime - gameState.timeLeft));
    const achievements = [];
    if (acc >= 90 && totalShots >= 10) achievements.push('Sharpshooter');
    if (misses === 0 && totalShots > 0) achievements.push('Flawless');
    if (gameState.score >= 20) achievements.push('High Scorer');
    uiManager.showPostGameSummary({
        reason: 'timer',
        score: gameState.score,
        accuracy: acc,
        hits: gameState.hits,
        misses,
        totalShots,
        timePlayed,
        difficulty: key,
        difficultyName: gameState.currentLevel.name,
        achievements,
    }, key, window.currentUsername || null);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function updateTimer() {
    if (!gameState.isPlaying) return;

    gameState.timeLeft -= 1;
    uiManager.updateTimer(formatTime(gameState.timeLeft));

    if (gameState.timeLeft <= 0) {
        endGame();
    }
}



// Event Listeners - FIXED: Use uiManager to get elements
document.getElementById('beginner-btn').addEventListener('click', (e) => {
    e.preventDefault();
    startCountdown(beginner);
    //controls.lock(); // Direct user gesture, allowed

     if (!controls.isLocked) controls.lock();
});

document.getElementById('intermediate-btn').addEventListener('click', (e) => {
    e.preventDefault();
    startCountdown(intermediate);
    // controls.lock();
     if (!controls.isLocked) controls.lock();
});

document.getElementById('professional-btn').addEventListener('click', (e) => {
    e.preventDefault();
    startCountdown(professional);
    // controls.lock();
     if (!controls.isLocked) controls.lock();
});

// Pointer lock debug listeners
// Pointer lock debug & behavior (don't start game here)
controls.addEventListener('lock', () => {
    console.log('Pointer locked — mouse controls enabled, waiting for countdown to finish.');
    // Do NOT set gameState.isPlaying here — countdown will handle starting the game.
    auth.hideHeader();
});

controls.addEventListener('unlock', async () => {
    console.log('Pointer unlocked.');
    // If unlocked during play, pause/stop the game:
    if (gameState.isPlaying) {
        gameState.isPlaying = false;
        uiManager.hideCrosshair();
        uiManager.showLevelSelector();
        auth.showHeader();
        document.body.classList.remove('playing');
        uiManager.hideGameHeader();
        const key = gameState.currentLevelKey;
        lastSubmitted[key] = 0;
        await submitBestScore(key, gameState.score);
        const latest = await fetchHighScores();
        uiManager.updateHighScores(latest);
        // Show post-game summary and leaderboard
        const totalShots = gameState.shotsFired;
        const acc = totalShots ? (gameState.hits / totalShots) * 100 : 0;
        const misses = Math.max(0, totalShots - gameState.hits);
        const timePlayed = Math.max(0, (gameState.currentLevel.gameTime - gameState.timeLeft));
        const achievements = [];
        if (acc >= 90 && totalShots >= 10) achievements.push('Sharpshooter');
        if (misses === 0 && totalShots > 0) achievements.push('Flawless');
        if (gameState.score >= 20) achievements.push('High Scorer');
        uiManager.showPostGameSummary({
            reason: 'unlock',
            score: gameState.score,
            accuracy: acc,
            hits: gameState.hits,
            misses,
            totalShots,
            timePlayed,
            difficulty: key,
            difficultyName: gameState.currentLevel.name,
            achievements,
        }, key, window.currentUsername || null);
    }
});

document.addEventListener('pointerlockerror', (e) => {
    console.error('Pointer Lock Error!', e);
});

/*
controls.addEventListener('lock', () => {
    console.log('Pointer locked, mouse controls enabled.');
});

controls.addEventListener('unlock', () => {
    console.log('Pointer unlocked.');
});

document.addEventListener('pointerlockerror', (e) => {
    console.error('Pointer Lock Error!', e);
});
*/




// Level info hover
document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('mouseenter', (e) => {
        const level = e.target.classList[1];
        const levelConfig = gameState.levels[level];
        const levelInfo = document.getElementById('level-info');
        levelInfo.innerHTML = `
            <h3>${levelConfig.name}</h3>
            <p>${levelConfig.description}</p>
            <p>Targets: ${levelConfig.targetCount} | Time: ${levelConfig.gameTime}s | Size: ${levelConfig.targetSize}</p>
            <p>Speed: ${(levelConfig.targetSpeed * 100).toFixed(1)}</p>
        `;
    });
});

function shoot() {
    if (!gameState.isPlaying) return;
    if (!renderer.xr.isPresenting && !controls.isLocked && !XR_ONLY) return;
    playShootSound();
    gameState.shotsFired += 1;
    uiManager.updateAccuracy(gameState.shotsFired ? (gameState.hits / gameState.shotsFired) * 100 : 0);
    raycaster.setFromCamera({ x: 0, y: 0 }, camera);
    const intersects = raycaster.intersectObjects(targets.map(t => t.mesh));
    if (intersects.length > 0) {
        const hitTarget = intersects[0].object;
        const target = targets.find(t => t.mesh === hitTarget);
        if (target) target.flashHit();
        gameState.score += 1;
        gameState.hits += 1;
        uiManager.updateScore(gameState.score);
        uiManager.updateAccuracy(gameState.shotsFired ? (gameState.hits / gameState.shotsFired) * 100 : 0);
        const key = gameState.currentLevelKey;
        if (gameState.score > (lastSubmitted[key] || 0)) {
            lastSubmitted[key] = gameState.score;
            submitBestScore(key, gameState.score).catch(() => {});
        }
        setTimeout(() => {
            if (target) target.respawn(gameState.currentLevel);
        }, 200);
    }
}

window.addEventListener('click', () => shoot());

const xrController0 = renderer.xr.getController(0);
const xrController1 = renderer.xr.getController(1);
xrController0.addEventListener('selectstart', () => shoot());
xrController1.addEventListener('selectstart', () => shoot());
scene.add(xrController0);
scene.add(xrController1);

renderer.xr.addEventListener('sessionstart', () => {
    uiManager.showCrosshair();
    uiManager.showGameHeader();
});
renderer.xr.addEventListener('sessionend', () => {
    uiManager.hideCrosshair();
    uiManager.hideGameHeader();
});

// Initialize audio on first user interaction
document.addEventListener('click', function initOnClick() {
    initAudio();
    document.removeEventListener('click', initOnClick);
}, { once: true });

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Raycaster
const raycaster = new THREE.Raycaster();

// Game Loop
const timerInterval = setInterval(updateTimer, 1000);

function animate() {

    if (gameState.isPlaying) {
        targets.forEach(target => {
            target.update(camera.position, gameState.currentLevel, targets);

               // Check for collision
            if (target.checkCollision(camera.position)) {
                handleCollision(target);
                return; // Stop processing further targets once collision is detected
            }
        });
    }

    renderer.render(scene, camera);
}

async function handleCollision(target) {
    console.log("🎯 COLLISION DETECTED! Game Over!");
    
    // Immediately end the game
    gameState.isPlaying = false;
    controls.unlock();
    uiManager.hideCrosshair();
    auth.showHeader();
    document.body.classList.remove('playing');
    uiManager.hideGameHeader();
    const key = gameState.currentLevelKey;
    lastSubmitted[key] = 0;
    await submitBestScore(key, gameState.score);
    const latest = await fetchHighScores();
    uiManager.updateHighScores(latest);
    const totalShots = gameState.shotsFired;
    const acc = totalShots ? (gameState.hits / totalShots) * 100 : 0;
    const misses = Math.max(0, totalShots - gameState.hits);
    const timePlayed = Math.max(0, (gameState.currentLevel.gameTime - gameState.timeLeft));
    const achievements = [];
    if (acc >= 90 && totalShots >= 10) achievements.push('Sharpshooter');
    if (misses === 0 && totalShots > 0) achievements.push('Flawless');
    if (gameState.score >= 20) achievements.push('High Scorer');
    uiManager.showPostGameSummary({
        reason: 'collision',
        score: gameState.score,
        accuracy: acc,
        hits: gameState.hits,
        misses,
        totalShots,
        timePlayed,
        difficulty: gameState.currentLevelKey,
        difficultyName: gameState.currentLevel.name,
        achievements,
    }, key, window.currentUsername || null);
    
    // Visual feedback - make the hitting target red
    target.mesh.material.color.set(0xff0000);
}

renderer.setAnimationLoop(animate);

// Control events
/*controls.addEventListener('lock', () => {
    gameState.isPlaying = true;
});
*/
async function fetchHighScores() {
    try {
        const res = await fetch('/api/scores/me', { credentials: 'include' });
        if (!res.ok) return { beginner: 0, intermediate: 0, professional: 0 };
        const data = await res.json();
        return data.scores || { beginner: 0, intermediate: 0, professional: 0 };
    } catch {
        return { beginner: 0, intermediate: 0, professional: 0 };
    }
}

async function submitBestScore(mode, score) {
    try {
        const res = await fetch('/api/scores/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode, score }),
            credentials: 'include',
        });
        
        if (res.ok) {
            const data = await res.json();
            // Update leaderboard for this mode
            await uiManager.updateLeaderboard(mode);
            
            // Show notification if this is the highest score
            if (data.isHighestScore) {
                uiManager.showToast(`🏆 New Highest Score! You're #1 in ${mode.charAt(0).toUpperCase() + mode.slice(1)}!`, 'success');
            }
        }
    } catch {}
}

// Post-game actions
document.addEventListener('postgame:action', (e) => {
    const action = e.detail?.action;
    if (action === 'replay') {
        startCountdown(gameState.currentLevel);
        if (!controls.isLocked) controls.lock();
    } else if (action === 'back') {
        uiManager.hidePostGameSummary();
        uiManager.showLevelSelector();
    } else if (action === 'next') {
        const order = ['beginner','intermediate','professional'];
        const idx = order.indexOf(gameState.currentLevelKey);
        const nextKey = order[Math.min(order.length - 1, idx + 1)];
        const nextLevel = gameState.levels[nextKey] || gameState.currentLevel;
        startCountdown(nextLevel);
        if (!controls.isLocked) controls.lock();
    }
});
