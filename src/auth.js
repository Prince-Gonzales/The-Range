import logoUrl from './assets/logo.png';
const usernameRegex = /^[a-zA-Z0-9]{4,20}$/;
const nameValid = s => typeof s === 'string' && s.trim().length >= 2 && s.trim().length <= 50;
const passwordComplex = s => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(s);

export class AuthManager {
  constructor() {
    this.user = null;
    this.elements = {};
    this.createHeader();
    this.createAuthUI();
    this.bindEvents();
    this.checkSession();
  }

  createHeader() {
    const header = document.createElement('header');
    header.id = 'app-header';
    header.innerHTML = `
      <div class="header-content">
        <div class="brand" aria-label="The Range">
          <img src="${logoUrl}" class="brand-logo" alt="The Range" />
          <span class="brand-text">The Range</span>
        </div>
        <div class="user-area" id="user-area">
          <button id="leaderboard-btn" class="link-btn leaderboard-btn" aria-label="View Leaderboard" style="display:none">🏆 Leaderboard</button>
          <div id="user-avatar" class="avatar" aria-hidden="true"></div>
          <span id="user-name" class="user-name"></span>
          <button id="logout-btn" class="link-btn" aria-label="Logout" style="display:none">Logout</button>
        </div>
      </div>
    `;
    document.body.appendChild(header);
    this.elements.header = header;
    this.elements.userName = header.querySelector('#user-name');
    this.elements.logoutBtn = header.querySelector('#logout-btn');
    this.elements.userAvatar = header.querySelector('#user-avatar');
    this.elements.leaderboardBtn = header.querySelector('#leaderboard-btn');
  }

  showHeader() {
    if (this.elements.header) this.elements.header.style.display = 'flex';
  }

  hideHeader() {
    if (this.elements.header) this.elements.header.style.display = 'none';
  }

  createAuthUI() {
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    overlay.innerHTML = `
      <div class="auth-brand" id="auth-brand">
        <img src="${logoUrl}" alt="The Range" />
        <span>The Range</span>
      </div>
      <div class="auth-container">
        <div class="panel-header"><h2 id="panel-title">PLEASE LOGIN</h2></div>
        <div class="tabs" role="tablist">
          <button id="login-tab" role="tab" aria-controls="login-panel" aria-selected="true">Login</button>
          <button id="signup-tab" role="tab" aria-controls="signup-panel" aria-selected="false">Sign Up</button>
        </div>
        <div id="login-panel" role="tabpanel">
          <form id="login-form" novalidate>
            <label for="login-username">Username</label>
            <input id="login-username" name="username" type="text" required autocomplete="username" />
            <span class="error" id="login-username-error" aria-live="polite"></span>

            <label for="login-password">Password</label>
            <input id="login-password" name="password" type="password" required autocomplete="current-password" />
            <span class="error" id="login-password-error" aria-live="polite"></span>

            <button type="submit" id="login-submit">Login</button>
            <div class="form-status" id="login-status" aria-live="polite"></div>
          </form>
        </div>
        <div id="signup-panel" role="tabpanel" hidden>
          <form id="signup-form" novalidate>
            <div class="form-group">
              <label for="first-name">First name</label>
              <input id="first-name" name="firstName" type="text" required minlength="2" maxlength="50" />
              <span class="error" id="first-name-error" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label for="last-name">Last name</label>
              <input id="last-name" name="lastName" type="text" required minlength="2" maxlength="50" />
              <span class="error" id="last-name-error" aria-live="polite"></span>
            </div>

            <div class="form-group">
              <label for="signup-username">Username</label>
              <input id="signup-username" name="username" type="text" required pattern="^[a-zA-Z0-9]{4,20}$" aria-describedby="username-help" />
              <span class="hint" id="username-help">4–20 letters or numbers; no spaces or symbols</span>
              <span class="status" id="signup-username-status" aria-live="polite"></span>
              <span class="error" id="signup-username-error" aria-live="polite"></span>
              <div class="suggestions" id="signup-username-suggestions" aria-live="polite"></div>
            </div>

            <div class="form-group password-group">
              <label for="signup-password">Password</label>
              <input id="signup-password" name="password" type="password" required aria-describedby="password-help" />
              <span class="hint" id="password-help">Use upper, lower, number, and symbol for a strong password</span>
              <div class="password-feedback" id="password-feedback" aria-live="polite">
                <ul class="requirements" aria-label="Password requirements">
                  <li id="pw-req-length" data-desc="Minimum 6 characters">Min 6 characters</li>
                  <li id="pw-req-upper-lower" data-desc="Must include uppercase and lowercase">Upper & lower letters</li>
                  <li id="pw-req-number" data-desc="At least one digit">At least one number</li>
                  <li id="pw-req-symbol" data-desc="At least one special character">At least one symbol</li>
                </ul>
                <div class="strength" id="password-strength" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Password strength">
                  <div class="strength-bar"><div class="strength-fill" id="strength-fill"></div></div>
                  <span class="strength-label" id="strength-label">Weak</span>
                </div>
              </div>
              <span class="error" id="signup-password-error" aria-live="polite"></span>
            </div>

            <button type="submit" id="signup-submit" disabled>Create Account</button>
            <div class="form-status" id="signup-status" aria-live="polite"></div>
          </form>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.elements.overlay = overlay;
    this.elements.loginTab = overlay.querySelector('#login-tab');
    this.elements.signupTab = overlay.querySelector('#signup-tab');
    this.elements.loginPanel = overlay.querySelector('#login-panel');
    this.elements.signupPanel = overlay.querySelector('#signup-panel');
    this.elements.loginForm = overlay.querySelector('#login-form');
    this.elements.signupForm = overlay.querySelector('#signup-form');
    this.elements.loginStatus = overlay.querySelector('#login-status');
    this.elements.signupStatus = overlay.querySelector('#signup-status');
    this.elements.signupUsernameStatus = overlay.querySelector('#signup-username-status');
    this.elements.signupUsernameSuggestions = overlay.querySelector('#signup-username-suggestions');
    this.elements.passwordFeedback = overlay.querySelector('#password-feedback');
    this.elements.pwReqLength = overlay.querySelector('#pw-req-length');
    this.elements.pwReqUpperLower = overlay.querySelector('#pw-req-upper-lower');
    this.elements.pwReqNumber = overlay.querySelector('#pw-req-number');
    this.elements.pwReqSymbol = overlay.querySelector('#pw-req-symbol');
    this.elements.strengthFill = overlay.querySelector('#strength-fill');
    this.elements.strengthLabel = overlay.querySelector('#strength-label');
    this.elements.strength = overlay.querySelector('#password-strength');
  }

  bindEvents() {
    this.elements.loginTab.addEventListener('click', () => this.switchTab('login'));
    this.elements.signupTab.addEventListener('click', () => this.switchTab('signup'));
    this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.elements.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
    this.elements.logoutBtn.addEventListener('click', () => this.logout());
    if (this.elements.leaderboardBtn) {
      this.elements.leaderboardBtn.addEventListener('click', () => {
        document.dispatchEvent(new CustomEvent('leaderboard:open'));
      });
    }

    const sf = this.elements.signupForm;
    sf.username.addEventListener('input', () => {
      this.updateUsernameStatus();
      this.updateSignupSubmitState();
    });
    sf.password.addEventListener('input', () => {
      this.updatePasswordFeedback();
      this.updateSignupSubmitState();
    });
    sf.firstName.addEventListener('input', () => this.updateSignupSubmitState());
    sf.lastName.addEventListener('input', () => this.updateSignupSubmitState());
  }

  switchTab(tab) {
    const isLogin = tab === 'login';
    this.elements.loginPanel.hidden = !isLogin;
    this.elements.signupPanel.hidden = isLogin;
    this.elements.loginTab.setAttribute('aria-selected', String(isLogin));
    this.elements.signupTab.setAttribute('aria-selected', String(!isLogin));
    const title = document.getElementById('panel-title');
    if (title) title.textContent = isLogin ? 'PLEASE LOGIN' : 'REGISTER';
  }

  setLoading(form, loading) {
    const btn = form.querySelector('button[type="submit"]');
    const status = form.id === 'login-form' ? this.elements.loginStatus : this.elements.signupStatus;
    btn.disabled = loading;
    status.textContent = loading ? 'Loading…' : '';
  }

  validateSignupForm() {
    const firstName = this.elements.signupForm.firstName.value.trim();
    const lastName = this.elements.signupForm.lastName.value.trim();
    const username = this.elements.signupForm.username.value.trim();
    const password = this.elements.signupForm.password.value;
    const errors = {};
    if (!nameValid(firstName)) errors.firstName = 'First name must be 2-50 characters';
    if (!nameValid(lastName)) errors.lastName = 'Last name must be 2-50 characters';
    if (!usernameRegex.test(username)) errors.username = 'Username must be 4-20 alphanumeric characters';
    if (!passwordComplex(password)) errors.password = 'Password must be 8+ chars with complexity';
    this.showErrors('signup', errors);
    return errors;
  }

  showErrors(context, errors) {
    const prefix = context === 'signup' ? 'signup' : 'login';
    const mapping = {
      firstName: 'first-name-error',
      lastName: 'last-name-error',
      username: `${prefix}-username-error`,
      password: `${prefix}-password-error`,
    };
    Object.entries(mapping).forEach(([key, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = errors[key] || '';
    });
    // highlight invalid fields
    const form = context === 'signup' ? this.elements.signupForm : this.elements.loginForm;
    ['firstName','lastName','username','password'].forEach(name => {
      const input = form[name];
      if (!input) return;
      if (errors[name]) {
        input.classList.add('invalid');
        input.setAttribute('aria-invalid','true');
      } else {
        input.classList.remove('invalid');
        input.removeAttribute('aria-invalid');
      }
    });
  }

  async handleSignup(e) {
    e.preventDefault();
    const errs = this.validateSignupForm();
    if (Object.keys(errs).length) return;
    this.setLoading(this.elements.signupForm, true);
    try {
      const body = {
        firstName: this.elements.signupForm.firstName.value.trim(),
        lastName: this.elements.signupForm.lastName.value.trim(),
        username: this.elements.signupForm.username.value.trim(),
        password: this.elements.signupForm.password.value,
      };
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) {
        this.showErrors('signup', data.errors || {});
        this.elements.signupStatus.textContent = 'Sign-up failed';
        return;
      }
      this.elements.signupForm.reset();
      try {
        const loginRes = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: body.username, password: body.password }),
          credentials: 'include',
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          this.setUser(loginData.user);
          this.hideOverlay();
          document.dispatchEvent(new CustomEvent('auth:login', { detail: { user: loginData.user } }));
          const uiToast = document.getElementById('toast');
          if (uiToast) {
            uiToast.className = 'success';
            uiToast.textContent = 'Account created. Welcome ' + loginData.user.username + '!';
            uiToast.style.display = 'block';
            setTimeout(() => { uiToast.style.display = 'none'; }, 3000);
          }
        } else {
          this.switchTab('login');
          this.elements.signupStatus.textContent = 'Account created. Please log in.';
        }
      } catch {
        this.switchTab('login');
        this.elements.signupStatus.textContent = 'Account created. Please log in.';
      }
    } catch (err) {
      this.elements.signupStatus.textContent = 'Network error';
    } finally {
      this.setLoading(this.elements.signupForm, false);
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    const username = this.elements.loginForm.username.value.trim();
    const password = this.elements.loginForm.password.value;
    const errors = {};
    if (!username) errors.username = 'Username is required';
    if (!password) errors.password = 'Password is required';
    this.showErrors('login', errors);
    if (Object.keys(errors).length) return;
    this.setLoading(this.elements.loginForm, true);
    const t0 = performance.now();
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });
      const t1 = performance.now();
      this.lastAuthDurationMs = t1 - t0;
      const data = await res.json();
      if (!res.ok) {
        this.elements.loginStatus.textContent = data.error || 'Login failed';
        return;
      }
      this.setUser(data.user);
      this.elements.loginForm.reset();
      this.elements.loginStatus.textContent = 'Login successful';
      this.hideOverlay();
    } catch (err) {
      this.elements.loginStatus.textContent = 'Network error';
    } finally {
      this.setLoading(this.elements.loginForm, false);
    }
  }

  hideOverlay() {
    this.elements.overlay.style.display = 'none';
  }

  showOverlay() {
    this.elements.overlay.style.display = 'flex';
  }

  async checkSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        this.setUser(data.user);
        this.hideOverlay();
      } else {
        this.showOverlay();
      }
    } catch {
      this.showOverlay();
    }
  }

  setUser(user) {
    this.user = user;
    this.elements.userName.textContent = user.username;
    this.elements.logoutBtn.style.display = 'inline-block';
    if (this.elements.leaderboardBtn) this.elements.leaderboardBtn.style.display = 'inline-block';
    document.body.dataset.auth = 'authenticated';
    document.dispatchEvent(new CustomEvent('auth:login', { detail: { user } }));
    const initial = (user.username || '?').slice(0,1).toUpperCase();
    if (this.elements.userAvatar) this.elements.userAvatar.textContent = initial;
  }

  updateUsernameStatus() {
    const username = this.elements.signupForm.username.value.trim();
    const valid = usernameRegex.test(username);
    if (!username) {
      this.elements.signupUsernameStatus.textContent = '';
      this.elements.signupUsernameStatus.className = 'status';
      return;
    }
    if (valid) {
      this.elements.signupUsernameStatus.textContent = 'Format looks good';
      this.elements.signupUsernameStatus.className = 'status valid';
    } else {
      this.elements.signupUsernameStatus.textContent = 'Invalid format';
      this.elements.signupUsernameStatus.className = 'status invalid';
    }
  }

  updatePasswordFeedback() {
    const pw = this.elements.signupForm.password.value || '';
    const hasLower = /[a-z]/.test(pw);
    const hasUpper = /[A-Z]/.test(pw);
    const hasNumber = /\d/.test(pw);
    const hasSymbol = /[^\w\s]/.test(pw);
    const length6 = pw.length >= 6;
    const length8 = pw.length >= 8;

    this.setReqState(this.elements.pwReqLength, length6);
    this.setReqState(this.elements.pwReqUpperLower, hasLower && hasUpper);
    this.setReqState(this.elements.pwReqNumber, hasNumber);
    this.setReqState(this.elements.pwReqSymbol, hasSymbol);

    const scoreParts = [length6, hasLower, hasUpper, hasNumber, hasSymbol];
    const score = scoreParts.reduce((a, b) => a + (b ? 1 : 0), 0);
    const percent = Math.round((score / scoreParts.length) * 100);
    this.elements.strengthFill.style.width = percent + '%';
    this.elements.strength.setAttribute('aria-valuenow', String(percent));
    if (percent < 40) {
      this.elements.strengthLabel.textContent = 'Weak';
      this.elements.strength.className = 'strength weak';
    } else if (percent < 80) {
      this.elements.strengthLabel.textContent = 'Medium';
      this.elements.strength.className = 'strength medium';
    } else {
      this.elements.strengthLabel.textContent = 'Strong';
      this.elements.strength.className = 'strength strong';
    }

    const pwError = !passwordComplex(pw) && length8
      ? 'Include upper, lower, number, and symbol'
      : (!length8 && pw.length ? 'At least 8 characters recommended' : '');
    document.getElementById('signup-password-error').textContent = pwError;
  }

  setReqState(el, ok) {
    if (!el) return;
    el.className = ok ? 'ok' : 'bad';
    el.setAttribute('aria-label', el.dataset.desc + (ok ? ' satisfied' : ' not satisfied'));
  }

  updateSignupSubmitState() {
    const errs = this.validateSignupForm();
    const canSubmit = Object.keys(errs).length === 0;
    const btn = this.elements.signupForm.querySelector('#signup-submit');
    btn.disabled = !canSubmit;
    this.elements.signupStatus.textContent = canSubmit ? 'All requirements met' : '';
  }

  generateUsernameSuggestions(base) {
    const clean = base.replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    const rand = Math.floor(100 + Math.random() * 900);
    const year = new Date().getFullYear();
    const variants = [
      clean + String(rand),
      clean + String(year % 100),
      clean + String(rand + 7),
    ].filter(v => usernameRegex.test(v));
    return Array.from(new Set(variants)).slice(0, 3);
  }

  renderUsernameSuggestions(list) {
    const box = this.elements.signupUsernameSuggestions;
    box.innerHTML = '';
    if (!list.length) return;
    const label = document.createElement('div');
    label.className = 'hint';
    label.textContent = 'Try one of these:';
    box.appendChild(label);
    const ul = document.createElement('ul');
    ul.className = 'suggestion-list';
    list.forEach(s => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suggestion-btn';
      btn.textContent = s;
      btn.addEventListener('click', () => {
        this.elements.signupForm.username.value = s;
        this.updateUsernameStatus();
        this.updateSignupSubmitState();
      });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    box.appendChild(ul);
  }

  clearUsernameSuggestions() {
    this.elements.signupUsernameSuggestions.innerHTML = '';
  }

  async logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      this.user = null;
      this.elements.userName.textContent = '';
      this.elements.logoutBtn.style.display = 'none';
      if (this.elements.leaderboardBtn) this.elements.leaderboardBtn.style.display = 'none';
      document.body.dataset.auth = 'anonymous';
      window.currentUsername = null;
      this.showOverlay();
      document.dispatchEvent(new CustomEvent('auth:logout'));
    }
  }
}

export const Validation = { usernameRegex, nameValid, passwordComplex };
