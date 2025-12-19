/* manager.js
The UIManager class builds and updates all the game’s user-interface elements—level selection, timer, 
score, countdown, crosshair, and a loading screen—and connects them to Three.js’s LoadingManager to 
show real-time loading progress.

Purpose:
Its purpose is to centralize and manage every visual UI component of the game so the gameplay code 
stays clean while the UI updates automatically and consistently.
*/


import * as THREE from 'three';
import { PostGameSummary } from './components/PostGameSummary.js';
import { LeaderboardOverlay } from './components/LeaderboardOverlay.js';

export class UIManager {
    constructor() {
        this.scoreDiv = document.getElementById('score');
        this.crosshair = document.getElementById('crosshair');
        this.elements = {};
        this.levels = {}; // Initialize empty levels
        this.createUI();
        this.createPostGameSummary();
        this.createLeaderboardOverlay();
        this.setupLoadingManager();
    }

    createUI() {
        // Use default values - DON'T use beginner directly
        const defaultLevel = {
            name: 'Select Level',
            description: 'Choose a difficulty level to start',
            targetCount: 0,
            gameTime: 0,
            targetSize: 0,
            targetSpeed: 0
        };

        this.elements.levelSelector = document.createElement('div');
        this.elements.levelSelector.id = 'level-selector';
        this.elements.levelSelector.innerHTML = `
            <div class="level-selector-content">
                <div class="level-buttons">
                    <button id="beginner-btn" class="level-btn beginner">🟢 BEGINNER</button>
                    <button id="intermediate-btn" class="level-btn intermediate">🟠 INTERMEDIATE</button>
                    <button id="professional-btn" class="level-btn professional">🔴 PROFESSIONAL</button>
                </div>
                <div class="level-info" id="level-info">
                    <h3>${defaultLevel.name}</h3>
                    <p>${defaultLevel.description}</p>
                    <p>Targets: ${defaultLevel.targetCount} | Time: ${defaultLevel.gameTime}s | Size: ${defaultLevel.targetSize}</p>
                    <p>Speed: ${defaultLevel.targetSpeed}</p>
                </div>
                <div class="high-scores" id="high-scores">
                    <div class="hs beginner"><span>Beginner</span><strong id="hs-beginner">0</strong></div>
                    <div class="hs intermediate"><span>Intermediate</span><strong id="hs-intermediate">0</strong></div>
                    <div class="hs professional"><span>Professional</span><strong id="hs-professional">0</strong></div>
                </div>
            </div>
        `;
        document.body.appendChild(this.elements.levelSelector);

        this.elements.gameHeader = document.createElement('div');
        this.elements.gameHeader.id = 'game-hud';
        this.elements.gameHeader.innerHTML = `
            <div class="hud-left">
                <span class="hud-label">PTS</span>
                <span id="hud-score">0</span>
            </div>
            <div class="hud-center">
                <span class="chev">\u2039</span>
                <span id="hud-time">0:00</span>
                <span class="chev">\u203A</span>
            </div>
            <div class="hud-right">
                <span id="hud-accuracy">0%</span>
            </div>
        `;
        this.elements.gameHeader.style.display = 'none';
        document.body.appendChild(this.elements.gameHeader);

        

        this.elements.timerDiv = document.createElement('div');
        this.elements.timerDiv.id = 'timer';
        this.elements.timerDiv.textContent = 'Time: 0:00';
        this.elements.timerDiv.style.display = 'none';
        document.body.appendChild(this.elements.timerDiv);

        // Countdown
        this.elements.countdownDiv = document.createElement('div');
        this.elements.countdownDiv.id = 'countdown';
        this.elements.countdownDiv.style.display = 'none';
        document.body.appendChild(this.elements.countdownDiv);

        // Loading Screen
        this.createLoadingScreen();

        this.createToast();

        
    }

    createPostGameSummary() {
        this.postSummary = new PostGameSummary();
    }

    createLeaderboardOverlay() {
        this.leaderboardOverlay = new LeaderboardOverlay();
    }

    // Add this method to update level info after levels are loaded
    updateLevelInfo(levels) {
        this.levels = levels;
        const levelInfo = document.getElementById('level-info');
        if (levelInfo && levels.beginner) {
            levelInfo.innerHTML = `
                <h3>${levels.beginner.name}</h3>
                <p>${levels.beginner.description}</p>
                <p>Targets: ${levels.beginner.targetCount} | Time: ${levels.beginner.gameTime}s | Size: ${levels.beginner.targetSize}</p>
                <p>Speed: ${levels.beginner.targetSpeed}</p>
            `;
        }
    }

    createLoadingScreen() {
        this.elements.loadingScreen = document.createElement('div');
        this.elements.loadingScreen.id = 'loading-screen';
        this.elements.loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading Game Assets...</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">0%</div>
                </div>
            </div>
        `;
        document.body.appendChild(this.elements.loadingScreen);
        
    }

    

    createToast() {
        this.elements.toast = document.createElement('div');
        this.elements.toast.id = 'toast';
        this.elements.toast.style.display = 'none';
        this.elements.toast.textContent = '';
        document.body.appendChild(this.elements.toast);

        
    }

    showToast(message, type = 'success') {
        const t = this.elements.toast;
        t.className = type;
        t.textContent = message;
        t.style.display = 'block';
        clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            t.style.display = 'none';
        }, 3000);
    }

    setupLoadingManager() {
        this.loadingManager = new THREE.LoadingManager();

        this.loadingManager.onStart = (url, itemsLoaded, itemsTotal) => {
            console.log(`Started loading: ${url}`);
            console.log(`Progress: ${itemsLoaded}/${itemsTotal}`);
        };

        this.loadingManager.onLoad = () => {
            console.log('All assets loaded successfully!');
            this.hideLoadingScreen();
        };

        this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
            const progress = (itemsLoaded / itemsTotal) * 100;
            this.updateProgressBar(progress);
            console.log(`Loading: ${url}`);
            console.log(`Progress: ${itemsLoaded}/${itemsTotal} (${Math.round(progress)}%)`);
        };

        this.loadingManager.onError = (url) => {
            console.error(`Error loading: ${url}`);
            this.showError(`Error loading: ${url.split('/').pop()}`);
        };
    }

    updateProgressBar(progress) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        if (progressFill && progressText) {
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
        }
    }

    hideLoadingScreen() {
        this.elements.loadingScreen.style.opacity = '0';
        this.elements.loadingScreen.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
            this.elements.loadingScreen.style.display = 'none';
        }, 500);
    }

    showError(message) {
        const progressText = document.getElementById('progress-text');
        if (progressText) {
            progressText.textContent = message;
            progressText.style.color = '#ff4444';
        }
    }

    // Public methods to control UI elements
    showLevelSelector() {
        this.elements.levelSelector.style.display = 'block';
    }

    hideLevelSelector() {
        this.elements.levelSelector.style.display = 'none';
    }

    showCountdown() {
        this.elements.countdownDiv.style.display = 'block';
    }

    hideCountdown() {
        this.elements.countdownDiv.style.display = 'none';
    }

    updateCountdown(number) {
        this.elements.countdownDiv.textContent = number;
        this.elements.countdownDiv.className = 'countdown';
    }

    updateTimer(time) {
        this.elements.timerDiv.textContent = `Time: ${time}`;
        const t = document.getElementById('hud-time');
        if (t) t.textContent = time;
    }

    updateScore(score) {
        if (this.scoreDiv) {
            this.scoreDiv.textContent = `Score: ${score}`;
        }
        const s = document.getElementById('hud-score');
        if (s) s.textContent = String(score);
    }

    updateAccuracy(acc) {
        const a = document.getElementById('hud-accuracy');
        if (a) a.textContent = `${Math.round(acc)}%`;
    }

    showCrosshair() {
        if (this.crosshair) {
            this.crosshair.style.display = 'block';
        }
    }

    hideCrosshair() {
        if (this.crosshair) {
            this.crosshair.style.display = 'none';
        }
    }

    getLoadingManager() {
        return this.loadingManager;
    }

    getElement(id) {
        return this.elements[id] || document.getElementById(id);
    }

    showGameHeader() {
        if (this.elements.gameHeader) this.elements.gameHeader.style.display = 'flex';
    }

    hideGameHeader() {
        if (this.elements.gameHeader) this.elements.gameHeader.style.display = 'none';
    }

    updateHighScores(scores) {
        const b = document.getElementById('hs-beginner');
        const i = document.getElementById('hs-intermediate');
        const p = document.getElementById('hs-professional');
        if (b) b.textContent = String(scores.beginner || 0);
        if (i) i.textContent = String(scores.intermediate || 0);
        if (p) p.textContent = String(scores.professional || 0);
    }

    showPostGameSummary(stats, mode = null, currentUsername = null) {
        if (this.postSummary) this.postSummary.show(stats, mode, currentUsername);
    }

    hidePostGameSummary() {
        if (this.postSummary) this.postSummary.hide();
    }

    showLeaderboard(mode = null, currentUsername = null) {
        if (this.leaderboardOverlay) {
            this.leaderboardOverlay.show(mode, currentUsername);
        }
    }

    hideLeaderboard() {
        if (this.leaderboardOverlay) {
            this.leaderboardOverlay.hide();
        }
    }

}
