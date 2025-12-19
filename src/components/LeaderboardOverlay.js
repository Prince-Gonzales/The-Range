export class LeaderboardOverlay {
  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'leaderboard-overlay';
    this.overlay.setAttribute('role', 'dialog');
    this.overlay.setAttribute('aria-modal', 'true');
    this.overlay.style.display = 'none';

    this.overlay.innerHTML = `
      <div class="lb-container">
        <header class="lb-header">
          <h1>🏆 Leaderboard</h1>
          <button class="lb-close" id="lb-close" aria-label="Close leaderboard">×</button>
        </header>

        <main class="lb-main" aria-label="Leaderboard">
          <div class="lb-tabs">
            <button class="lb-tab active" data-mode="beginner">🟢 Beginner</button>
            <button class="lb-tab" data-mode="intermediate">🟠 Intermediate</button>
            <button class="lb-tab" data-mode="professional">🔴 Professional</button>
          </div>
          
          <div class="lb-content" id="lb-content">
            <div class="lb-loading">Loading leaderboard...</div>
          </div>
        </main>
      </div>
    `;

    document.body.appendChild(this.overlay);
    this._bind();
    this.currentMode = 'beginner';
  }

  _bind() {
    // Close button
    this.overlay.querySelector('#lb-close')?.addEventListener('click', () => {
      this.hide();
    });

    // Click outside to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.hide();
      }
    });

    // Tab switching
    const tabs = this.overlay.querySelectorAll('.lb-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.mode;
        this.currentMode = mode;
        const currentUsername = window.currentUsername || null;
        this.loadLeaderboard(mode, currentUsername);
      });
    });

    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.overlay.style.display !== 'none') {
        this.hide();
      }
    });
  }

  async loadLeaderboard(mode = 'beginner', currentUsername = null) {
    const content = this.overlay.querySelector('#lb-content');
    if (!content) return;

    content.innerHTML = '<div class="lb-loading">Loading leaderboard...</div>';

    try {
      const res = await fetch(`/api/leaderboard/${mode}?limit=10`, {
        credentials: 'include'
      });
      
      if (!res.ok) {
        content.innerHTML = '<div class="lb-error">Failed to load leaderboard</div>';
        return;
      }

      const data = await res.json();
      this.renderLeaderboard(data.leaderboard || [], currentUsername);
    } catch (err) {
      console.error('Leaderboard error:', err);
      content.innerHTML = '<div class="lb-error">Failed to load leaderboard</div>';
    }
  }

  renderLeaderboard(leaderboard, currentUsername = null) {
    const content = this.overlay.querySelector('#lb-content');
    if (!content) return;

    if (leaderboard.length === 0) {
      content.innerHTML = '<div class="lb-empty">No scores yet. Be the first!</div>';
      return;
    }

    const html = leaderboard.map((entry, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
      const rankClass = index < 3 ? 'top-rank' : '';
      const isCurrentUser = currentUsername && entry.username === currentUsername;
      const userClass = isCurrentUser ? 'current-user' : '';
      return `
        <div class="lb-entry ${rankClass} ${userClass}">
          <span class="lb-rank">${medal} ${entry.rank}</span>
          <span class="lb-username">${entry.username}${isCurrentUser ? ' (You)' : ''}</span>
          <span class="lb-score">${entry.score}</span>
        </div>
      `;
    }).join('');

    content.innerHTML = html;
  }

  async show(mode = null, currentUsername = null) {
    const modeToShow = mode || this.currentMode;
    this.currentMode = modeToShow;
    const username = currentUsername || window.currentUsername || null;
    
    // Set active tab
    const tabs = this.overlay.querySelectorAll('.lb-tab');
    tabs.forEach(tab => {
      tab.classList.remove('active');
      if (tab.dataset.mode === modeToShow) {
        tab.classList.add('active');
      }
    });

    this.overlay.style.display = 'block';
    requestAnimationFrame(async () => {
      this.overlay.classList.add('lb-open');
      // Check if post-game summary is also open
      const postGameOverlay = document.getElementById('postgame-overlay');
      if (postGameOverlay && postGameOverlay.classList.contains('pg-open')) {
        document.body.classList.add('both-overlays-open');
      }
      // Load leaderboard data
      const data = await this.getLeaderboardData(modeToShow);
      this.renderLeaderboard(data, username);
    });
  }

  async getLeaderboardData(mode) {
    try {
      const res = await fetch(`/api/leaderboard/${mode}?limit=10`, {
        credentials: 'include'
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.leaderboard || [];
    } catch {
      return [];
    }
  }

  hide() {
    this.overlay.classList.remove('lb-open');
    // Remove class when hiding
    const postGameOverlay = document.getElementById('postgame-overlay');
    if (!postGameOverlay || !postGameOverlay.classList.contains('pg-open')) {
      document.body.classList.remove('both-overlays-open');
    }
    setTimeout(() => {
      this.overlay.style.display = 'none';
    }, 300);
  }
}

