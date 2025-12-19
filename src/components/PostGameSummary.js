export class PostGameSummary {
  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'postgame-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.style.display = 'none';

    this.overlay.innerHTML = `
      <div class="pg-container">
        <header class="pg-header">
          <h1 id="pg-title">Game Over!</h1>
          <p id="pg-subtitle" class="pg-sub">Difficulty: Beginner</p>
        </header>

        <main class="pg-grid pg-combined" aria-label="Post game summary">
          <section class="pg-card pg-summary" aria-labelledby="pg-summary-title">
            <h2 id="pg-summary-title" class="pg-card-title">Session Summary</h2>
            <div class="pg-score" id="pg-score">0</div>
            <div class="pg-score-label">Final Score</div>

            <div class="pg-stats">
              <div class="pg-stat">
                <div class="pg-stat-value pg-green" id="pg-accuracy">0%</div>
                <div class="pg-stat-label">Accuracy</div>
              </div>
              <div class="pg-stat">
                <div class="pg-stat-value pg-orange" id="pg-hits">0</div>
                <div class="pg-stat-label">Hits</div>
              </div>
              <div class="pg-stat">
                <div class="pg-stat-value pg-red" id="pg-misses">0</div>
                <div class="pg-stat-label">Misses</div>
              </div>
              <div class="pg-stat">
                <div class="pg-stat-value pg-purple" id="pg-total">0</div>
                <div class="pg-stat-label">Total Shots</div>
              </div>
            </div>

            <div class="pg-achievements" id="pg-achievements" aria-live="polite"></div>

            <div class="pg-actions">
              <button class="pg-btn pg-primary" id="pg-replay">Play Again</button>
              <button class="pg-btn pg-secondary" id="pg-back">Back to Hub</button>
            </div>
          </section>

          <section class="pg-card pg-leaderboard" aria-labelledby="pg-leaderboard-title">
            <h2 id="pg-leaderboard-title" class="pg-card-title">🏆 Leaderboard</h2>
            <div class="pg-lb-tabs">
              <button class="pg-lb-tab active" data-mode="beginner">🟢 Beginner</button>
              <button class="pg-lb-tab" data-mode="intermediate">🟠 Intermediate</button>
              <button class="pg-lb-tab" data-mode="professional">🔴 Professional</button>
            </div>
            <div class="pg-lb-content" id="pg-lb-content">
              <div class="pg-lb-loading">Loading leaderboard...</div>
            </div>
          </section>
        </main>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this._bind();
  }

  _bind() {
    this.overlay.querySelector('#pg-replay')?.addEventListener('click', () => {
      this.hide();
      document.dispatchEvent(new CustomEvent('postgame:action', { detail: { action: 'replay' } }));
    });
    this.overlay.querySelector('#pg-back')?.addEventListener('click', () => {
      this.hide();
      document.dispatchEvent(new CustomEvent('postgame:action', { detail: { action: 'back' } }));
    });
    
    // Leaderboard tab switching
    const tabs = this.overlay.querySelectorAll('.pg-lb-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        this.loadLeaderboard(mode);
      });
    });
  }

  async show(stats, mode = null, currentUsername = null) {
    const title = this.overlay.querySelector('#pg-title');
    const sub = this.overlay.querySelector('#pg-subtitle');
    const scoreEl = this.overlay.querySelector('#pg-score');
    const accEl = this.overlay.querySelector('#pg-accuracy');
    const hitsEl = this.overlay.querySelector('#pg-hits');
    const missEl = this.overlay.querySelector('#pg-misses');
    const totalEl = this.overlay.querySelector('#pg-total');
    const achEl = this.overlay.querySelector('#pg-achievements');

    title.textContent = 'Game Over!';
    sub.textContent = `Difficulty: ${stats.difficultyName || stats.difficulty}`;
    scoreEl.textContent = String(stats.score || 0);
    accEl.textContent = `${Math.round(stats.accuracy || 0)}%`;
    hitsEl.textContent = String(stats.hits || 0);
    missEl.textContent = String(stats.misses || 0);
    totalEl.textContent = String(stats.totalShots || 0);

    const ach = Array.isArray(stats.achievements) ? stats.achievements : [];
    achEl.innerHTML = ach.length
      ? `<ul class="pg-badges">${ach.map(a => `<li class="pg-badge">${a}</li>`).join('')}</ul>`
      : '';

    // Set active leaderboard tab
    const modeToShow = mode || stats.difficulty || 'beginner';
    const tabs = this.overlay.querySelectorAll('.pg-lb-tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.mode === modeToShow) {
        tab.classList.add('active');
      }
    });

    this.overlay.style.display = 'block';
    requestAnimationFrame(async () => {
      this.overlay.classList.add('pg-open');
      // Load leaderboard
      await this.loadLeaderboard(modeToShow, currentUsername);
      // Small delay to ensure overlay is visible
      setTimeout(() => {
        this.overlay.querySelector('#pg-replay')?.focus();
      }, 100);
    });
  }

  async loadLeaderboard(mode = 'beginner', currentUsername = null) {
    const content = this.overlay.querySelector('#pg-lb-content');
    if (!content) return;

    content.innerHTML = '<div class="pg-lb-loading">Loading leaderboard...</div>';

    try {
      const res = await fetch(`/api/leaderboard/${mode}?limit=10`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        content.innerHTML = '<div class="pg-lb-error">Failed to load leaderboard</div>';
        return;
      }

      const data = await res.json();
      this.renderLeaderboard(data.leaderboard || [], currentUsername);
    } catch (err) {
      console.error('Leaderboard error:', err);
      content.innerHTML = '<div class="pg-lb-error">Failed to load leaderboard</div>';
    }
  }

  renderLeaderboard(leaderboard, currentUsername = null) {
    const content = this.overlay.querySelector('#pg-lb-content');
    if (!content) return;

    if (leaderboard.length === 0) {
      content.innerHTML = '<div class="pg-lb-empty">No scores yet. Be the first!</div>';
      return;
    }

    const html = leaderboard.map((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const rankClass = index < 3 ? 'pg-lb-top-rank' : '';
      const isCurrentUser = currentUsername && entry.username === currentUsername;
      const userClass = isCurrentUser ? 'pg-lb-current-user' : '';
      return `
        <div class="pg-lb-entry ${rankClass} ${userClass}">
          <span class="pg-lb-rank">${medal} ${entry.rank}</span>
          <span class="pg-lb-username">${entry.username}${isCurrentUser ? ' (You)' : ''}</span>
          <span class="pg-lb-score">${entry.score}</span>
        </div>
      `;
    }).join('');

    content.innerHTML = html;
  }

  hide() {
    this.overlay.classList.remove('pg-open');
    this.overlay.style.display = 'none';
  }

  
}

