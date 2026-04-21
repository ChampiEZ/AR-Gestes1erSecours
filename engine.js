// ═══════════════════════════════════════════════════════════════════════════
// ENGINE — Mission flow + all mini-games
// ═══════════════════════════════════════════════════════════════════════════

// ── Intro screen ──────────────────────────────────────────────────────────

document.getElementById('screen-intro').addEventListener('screenenter', () => {
  const m = App.currentMission;
  if (!m) return;

  document.getElementById('intro-badge').textContent = `MISSION ${m.num}`;
  document.getElementById('intro-badge').style.color = m.color;
  document.getElementById('intro-icon').textContent  = m.icon;
  document.getElementById('intro-title').textContent = m.title;
  document.getElementById('intro-title').style.color = m.color;
  document.getElementById('intro-objective-text').textContent = m.intro.objective;
  document.getElementById('intro-bg').style.background =
    `radial-gradient(ellipse at 50% 40%, ${m.color}25 0%, transparent 65%)`;

  const el = document.getElementById('intro-scenario');
  el.textContent = '';
  let i = 0;
  const type = () => {
    if (i < m.intro.scenario.length) {
      el.textContent += m.intro.scenario[i++];
      setTimeout(type, i < 40 ? 35 : 18);
    }
  };
  setTimeout(type, 500);
});

document.getElementById('intro-next-btn').addEventListener('click', () => {
  App.learnSlide = 0;
  App.go('screen-learn');
});

document.getElementById('intro-back-btn').addEventListener('click', () => App.go('screen-hub'));

// ── Learn screen ──────────────────────────────────────────────────────────

document.getElementById('screen-learn').addEventListener('screenenter', () => {
  renderSlide(App.currentMission, App.learnSlide);
});

function renderSlide(m, idx) {
  const slides = m.learn;
  const s      = slides[idx];

  const container = document.getElementById('learn-slides');
  container.innerHTML = `
    <div class="learn-slide" style="--lc: ${m.color}">
      <div class="ls-step">ÉTAPE ${idx + 1} / ${slides.length}</div>
      <div class="ls-icon">${s.icon}</div>
      <h3 class="ls-title">${s.title}</h3>
      <p class="ls-body">${s.body}</p>
    </div>
  `;

  // Animate in
  requestAnimationFrame(() => container.querySelector('.learn-slide').classList.add('ls--in'));

  // Dots
  document.getElementById('learn-dots').innerHTML = slides
    .map((_, i) => `<span class="dot ${i === idx ? 'dot--on' : ''}" data-i="${i}"></span>`)
    .join('');
  document.querySelectorAll('.dot').forEach(d =>
    d.addEventListener('click', () => { App.learnSlide = +d.dataset.i; renderSlide(m, App.learnSlide); })
  );

  // Prev
  const prevBtn = document.getElementById('learn-prev');
  prevBtn.style.visibility = idx === 0 ? 'hidden' : 'visible';

  // Next
  const nextBtn = document.getElementById('learn-next');
  const isLast  = idx === slides.length - 1;
  nextBtn.innerHTML = isLast
    ? '<span class="cta-label">Démarrer</span> <span>▶</span>'
    : '<span>→</span>';
  nextBtn.className = isLast ? 'learn-nav__btn learn-nav__btn--go' : 'learn-nav__btn learn-nav__btn--next';

  nextBtn.onclick = isLast
    ? () => { Tracker.start().then(() => { App.go('screen-play'); Engine.start(m.game); }); }
    : () => { App.learnSlide++; renderSlide(m, App.learnSlide); };
}

document.getElementById('learn-prev').addEventListener('click', () => {
  if (App.learnSlide > 0) { App.learnSlide--; renderSlide(App.currentMission, App.learnSlide); }
});
document.getElementById('learn-back-btn').addEventListener('click', () => App.go('screen-intro'));

// ── Feedback screen ───────────────────────────────────────────────────────

function showFeedback(stars, stats) {
  App.saveProgress(App.currentMission.id, stars);
  App.go('screen-feedback');

  const m = App.currentMission;
  document.getElementById('feedback-badge').textContent = m.title.toUpperCase();
  document.getElementById('feedback-badge').style.color = m.color;

  // Star reveal
  const starsEl = document.getElementById('feedback-stars');
  starsEl.innerHTML = [1,2,3].map(i =>
    `<span class="fb-star ${i <= stars ? 'fb-star--on' : ''}" style="--delay: ${i * 0.2}s">★</span>`
  ).join('');

  // Stats
  document.getElementById('feedback-stats').innerHTML = stats.map(s =>
    `<div class="fb-stat"><span class="fb-stat__val">${s.val}</span><span class="fb-stat__lbl">${s.lbl}</span></div>`
  ).join('');

  // Random tip
  const tip = m.tips[Math.floor(Math.random() * m.tips.length)];
  document.getElementById('feedback-tip').innerHTML = `<span class="tip-label">LE SAVIEZ-VOUS ?</span> ${tip}`;

  // Next mission
  const missions = App.getMissions();
  const idx = missions.findIndex(m2 => m2.id === m.id);
  const next = missions[idx + 1];
  const contBtn = document.getElementById('feedback-continue');
  if (next && next.unlocked) {
    contBtn.textContent = `${next.icon} Mission ${next.num} →`;
    contBtn.onclick = () => { App.currentMission = next; App.go('screen-intro'); };
  } else {
    contBtn.textContent = '← Carte des missions';
    contBtn.onclick = () => App.go('screen-hub');
  }
}

document.getElementById('feedback-retry').addEventListener('click', () => {
  App.learnSlide = App.currentMission.learn.length - 1;
  App.go('screen-learn');
});

// ── Engine ────────────────────────────────────────────────────────────────

const Engine = {
  _game: null,

  start(config) {
    const ui = document.getElementById('game-ui');
    ui.innerHTML = '';

    switch (config.type) {
      case 'cardiac':    this._game = new CardiacGame(config, ui);    break;
      case 'pls':        this._game = new PLSGame3D(config, ui);       break;
      case 'burn':       this._game = new BurnGame(config, ui);       break;
      case 'mixed':      this._game = new MixedGame(config, ui);      break;
    }

    if (this._game) this._game.start();
  },

  onHand(hands) {
    if (this._game) this._game.onHand(hands);
  },

  end(stars, stats) {
    if (this._game) { clearInterval(this._game._timer); this._game = null; }
    showFeedback(stars, stats);
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// GAME 1 — Cardiac (massage cardiaque en rythme)
// ═══════════════════════════════════════════════════════════════════════════

class CardiacGame {
  constructor(cfg, ui) {
    this.cfg          = cfg;
    this.ui           = ui;
    this.timeLeft     = cfg.duration;
    this.compressions = 0;
    this.goodComps    = 0;
    this.bpm          = 0;
    this.timestamps   = [];
    this.lastY        = null;
    this.dir          = null;
    this.peaked       = false;
    this._timer       = null;
  }

  start() {
    this.ui.innerHTML = `
      <div class="game-hud">
        <div class="gh-top">
          <div class="gh-timer"><span id="g-time">${this.cfg.duration}</span><span class="gh-unit">s</span></div>
          <div class="gh-title">MASSAGE CARDIAQUE</div>
          <div class="gh-comps"><span id="g-comps">0</span><span class="gh-unit"> COMP.</span></div>
        </div>

        <div class="metronome">
          <div class="metro-ring" id="metro-ring"></div>
          <div class="metro-bpm" id="metro-bpm">– BPM</div>
          <div class="metro-target">CIBLE : 100–120 BPM</div>
        </div>

        <div class="gh-bar-wrap">
          <div class="gh-bar-label">RYTHME</div>
          <div class="gh-bar-bg"><div class="gh-bar-fill" id="g-bar"></div></div>
          <div class="gh-bar-zones">
            <span>LENT</span><span>PARFAIT</span><span>RAPIDE</span>
          </div>
        </div>

        <div class="gh-hint" id="g-hint">✋ Montre ta main puis mime les compressions</div>
      </div>
    `;

    this._timer = setInterval(() => {
      this.timeLeft--;
      document.getElementById('g-time').textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);

    // Metronome pulse at 110 BPM
    const ring = document.getElementById('metro-ring');
    const interval = (60 / 110) * 1000;
    this._metronome = setInterval(() => ring.classList.toggle('metro-ring--pulse'), interval / 2);
  }

  onHand(hands) {
    const lm = hands[0];
    if (!lm) return;

    const y = lm[0].y;
    if (this.lastY !== null) {
      const delta = y - this.lastY;
      const newDir = delta > 0.008 ? 'down' : delta < -0.008 ? 'up' : this.dir;

      if (this.dir === 'down' && newDir === 'up' && !this.peaked) {
        this.peaked = true;
        this._record();
      } else if (newDir !== 'down') {
        this.peaked = false;
      }
      this.dir = newDir;
    }
    this.lastY = y;
  }

  _record() {
    const now = Date.now();
    this.compressions++;
    this.timestamps.push(now);
    if (this.timestamps.length > 6) this.timestamps.shift();

    if (this.timestamps.length >= 2) {
      const span = now - this.timestamps[0];
      this.bpm  = Math.round(((this.timestamps.length - 1) / span) * 60000);

      if (this.bpm >= this.cfg.bpmMin && this.bpm <= this.cfg.bpmMax) this.goodComps++;

      // Update UI
      const bpmEl = document.getElementById('metro-bpm');
      const bar   = document.getElementById('g-bar');
      const hint  = document.getElementById('g-hint');

      if (bpmEl) bpmEl.textContent = `${this.bpm} BPM`;

      // Bar: 60 bpm = 0%, 110 = 50%, 160 = 100%
      const pct = Math.min(100, Math.max(0, ((this.bpm - 60) / 100) * 100));
      if (bar) {
        bar.style.width = pct + '%';
        bar.style.background =
          this.bpm < 100 ? '#ffaa00' :
          this.bpm <= 120 ? '#00ffcc' : '#ff4488';
      }

      if (hint) {
        hint.textContent =
          this.bpm < 100 ? '⬆️ Plus vite !' :
          this.bpm <= 120 ? '✅ Parfait ! Continuez !' : '⬇️ Un peu plus lentement';
      }
    }

    if (document.getElementById('g-comps'))
      document.getElementById('g-comps').textContent = this.compressions;
  }

  _finish() {
    clearInterval(this._timer);
    clearInterval(this._metronome);

    const accuracy = this.compressions > 0
      ? Math.round((this.goodComps / this.compressions) * 100)
      : 0;
    const stars = accuracy >= 80 ? 3 : accuracy >= 55 ? 2 : accuracy >= 30 ? 1 : 0;

    Engine.end(stars, [
      { val: this.compressions, lbl: 'Compressions' },
      { val: this.bpm + ' BPM', lbl: 'Dernier rythme' },
      { val: accuracy + '%', lbl: 'Précision rythme' },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 2 — PLS 3D (mannequin 3D interactif + 3 modes)
// ═══════════════════════════════════════════════════════════════════════════

class PLSGame3D {
  constructor(cfg, ui) {
    this.cfg          = cfg;
    this.ui           = ui;
    this.mode         = null;
    this.timeLeft     = cfg.duration;
    this._initDur     = cfg.duration;
    this._timer       = null;
    this._stepTick    = null;
    this.allSteps     = this._buildSteps();
    this.step         = 0;
    this.stepDone     = new Array(5).fill(false);
    this.stepTL       = 0;
    this.victimHP     = 100;
    this.combo        = 0;
    this.sweepPhase   = 0;
    this.stepStart    = null;
    this._wrongCooldown = false;
    this._orderedDisplay = null;
    this._started     = false;

    // Mannequin animation state (each 0→1)
    this.a = {
      headCheck: 0,
      headTilt:  0,
      armLeft:   0,
      kneeRight: 0,
      sideRoll:  0,
      holdPct:   0,
      feedbackType:  'none',
      feedbackAlpha: 0,
      shakeOffset:   0,
      shakeTimer:    0,
      particles:     [],
    };

    this._canvas = null;
    this._ctx    = null;
    this._raf    = null;
    this._lastT  = 0;
  }

  // ── Step definitions ─────────────────────────────────────────────────────

  _buildSteps() {
    return [
      {
        label: 'Vérifier la respiration',
        icon: '👁️',
        hint: 'Main ouverte en HAUT au centre — 1 seconde',
        timeLimit: 9,
        holdMs: 900,
        animKey: 'headCheck',
        check: lm => {
          const w = Tracker.wrist(lm);
          return Tracker.isOpen(lm) && w && w.x > 0.28 && w.x < 0.72 && w.y < 0.38;
        },
      },
      {
        label: 'Basculer la tête en arrière',
        icon: '↗️',
        hint: 'Glisse ta main vers la DROITE',
        timeLimit: 7,
        holdMs: 800,
        animKey: 'headTilt',
        check: lm => {
          const w = Tracker.wrist(lm);
          return w && w.x > 0.73;
        },
      },
      {
        label: 'Avancer le bras côté toi',
        icon: '✊',
        hint: 'Poing FERMÉ à GAUCHE — attrape le bras !',
        timeLimit: 8,
        holdMs: 1000,
        animKey: 'armLeft',
        check: lm => {
          const w = Tracker.wrist(lm);
          return Tracker.isClosed(lm) && w && w.x < 0.25;
        },
      },
      {
        label: 'Plier le genou',
        icon: '🦵',
        hint: 'Descends ta main tout en BAS',
        timeLimit: 7,
        holdMs: 800,
        animKey: 'kneeRight',
        check: lm => {
          const w = Tracker.wrist(lm);
          return w && w.y > 0.78;
        },
      },
      {
        label: 'Basculer sur le côté',
        icon: '🔄',
        hint: 'Balaye de DROITE vers GAUCHE — vite !',
        timeLimit: 10,
        holdMs: 0,
        animKey: 'sideRoll',
        special: 'sweep',
        check: () => false,
      },
    ];
  }

  // ── Entry point ───────────────────────────────────────────────────────────

  start() {
    this._showModeSelector();
  }

  _showModeSelector() {
    this.ui.innerHTML = `
      <div class="pls3d-mode-sel">
        <div class="pls3d-mode-title">CHOISIR LE MODE</div>
        <div class="pls3d-mode-desc">Comment veux-tu pratiquer la PLS ?</div>
        <div class="pls3d-mode-btns">
          <button class="pls3d-mode-btn" id="pls3d-m-normal">
            <span class="pls3d-mode-btn__icon">▶</span>
            <span class="pls3d-mode-btn__label">NORMAL</span>
            <span class="pls3d-mode-btn__sub">Étapes guidées en ordre</span>
          </button>
          <button class="pls3d-mode-btn" id="pls3d-m-ordered">
            <span class="pls3d-mode-btn__icon">🔀</span>
            <span class="pls3d-mode-btn__label">ORDRE</span>
            <span class="pls3d-mode-btn__sub">Reconstitue la bonne séquence</span>
          </button>
          <button class="pls3d-mode-btn pls3d-mode-btn--hot" id="pls3d-m-chrono">
            <span class="pls3d-mode-btn__icon">⚡</span>
            <span class="pls3d-mode-btn__label">CHRONO</span>
            <span class="pls3d-mode-btn__sub">4s par geste — fais vite !</span>
          </button>
        </div>
      </div>
    `;

    const pick = mode => {
      this.mode = mode;
      if (mode === 'chrono') {
        this.allSteps.forEach(s => { s.timeLimit = 4; s.holdMs = Math.min(s.holdMs, 500); });
        this.timeLeft   = 28;
        this._initDur   = 28;
      } else if (mode === 'ordered') {
        this._orderedDisplay = [0, 1, 2, 3, 4].sort(() => Math.random() - 0.5);
      }
      this._startGame();
    };

    document.getElementById('pls3d-m-normal').onclick  = () => pick('normal');
    document.getElementById('pls3d-m-ordered').onclick = () => pick('ordered');
    document.getElementById('pls3d-m-chrono').onclick  = () => pick('chrono');
  }

  _startGame() {
    this._started = true;
    this._renderUI();
    this._startCanvas();
    this._startStepTimer();
    this._timer = setInterval(() => {
      this.timeLeft--;
      const el = document.getElementById('pls3d-time');
      if (el) el.textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);
  }

  // ── UI ────────────────────────────────────────────────────────────────────

  _renderUI() {
    const s       = this.allSteps[this.step];
    const hpColor = this._hpColor();
    const modeTag = this.mode === 'chrono'  ? '⚡ CHRONO'
                  : this.mode === 'ordered' ? '🔀 ORDRE' : '▶ NORMAL';

    this.ui.innerHTML = `
      <div class="pls3d-hud">
        <!-- Full-screen 3D canvas — mannequin centered -->
        <canvas id="pls3d-canvas"></canvas>

        <!-- Top overlay bar -->
        <div class="pls3d-overlay-top">
          <div class="gh-timer"><span id="pls3d-time">${this.timeLeft}</span><span class="gh-unit">s</span></div>
          <div class="pls3d-htitle">
            <div class="gh-title">POSITION DE SÉCURITÉ</div>
            <div class="pls3d-mode-tag">${modeTag}</div>
          </div>
          <div class="pls3d-steptimer">
            <span id="pls3d-step-timer" class="pls-step-tick">${s.timeLimit}</span>
            <span class="gh-unit">/geste</span>
          </div>
        </div>

        <!-- Bottom overlay bar -->
        <div class="pls3d-overlay-bottom">
          <div class="pls3d-pills" id="pls3d-pills">${this._renderPills()}</div>

          <div class="pls3d-victim-bar">
            <span class="pls-victim-lbl">❤️</span>
            <div class="pls-victim-bg">
              <div class="pls-victim-fill" id="pls3d-hp"
                style="width:${this.victimHP}%; background:${hpColor}; box-shadow:0 0 8px ${hpColor}88"></div>
            </div>
            <span class="pls-victim-val" id="pls3d-hp-val" style="color:${hpColor}">${this.victimHP}%</span>
          </div>

          <div id="pls3d-danger" class="pls-danger">⚠️ TROP LENT — ELLE SUFFOQUE !</div>

          <div class="pls3d-hint" id="pls3d-hint">${s.hint}</div>

          <div class="pls-progress">
            <div class="pls-prog-bar" id="pls3d-bar" style="width:0%"></div>
          </div>
        </div>
      </div>
    `;
  }

  // Horizontal step pills for the bottom bar
  _renderPills() {
    const steps = this.allSteps;
    const order = (this.mode === 'ordered' && this._orderedDisplay)
                ? this._orderedDisplay
                : steps.map((_, i) => i);

    return order.map(i => {
      const st     = steps[i];
      const active = i === this.step;
      const done   = this.stepDone[i];
      const failed = i < this.step && !done;
      const cls    = active ? 'pls3d-pill--active' : done ? 'pls3d-pill--done' : failed ? 'pls3d-pill--fail' : '';
      const badge  = done ? '✓' : failed ? '✗' : String(i + 1);
      return `
        <div class="pls3d-pill ${cls}">
          <span class="pls3d-pill__badge">${badge}</span>
          <span class="pls3d-pill__icon">${st.icon}</span>
          <span class="pls3d-pill__label">${st.label}</span>
        </div>`;
    }).join('');
  }

  _hpColor() {
    return this.victimHP > 60 ? '#00ffcc' : this.victimHP > 30 ? '#ffaa00' : '#ff2244';
  }

  _updateUI() {
    const pills = document.getElementById('pls3d-pills');
    if (pills) pills.innerHTML = this._renderPills();
    const hint = document.getElementById('pls3d-hint');
    if (hint) hint.textContent = this.allSteps[this.step]?.hint || '';
    const bar = document.getElementById('pls3d-bar');
    if (bar) bar.style.width = '0%';
    this._updateHP();
  }

  _updateHP() {
    const c = this._hpColor();
    const f = document.getElementById('pls3d-hp');
    const v = document.getElementById('pls3d-hp-val');
    if (f) { f.style.width = this.victimHP + '%'; f.style.background = c; f.style.boxShadow = `0 0 8px ${c}88`; }
    if (v) { v.textContent = this.victimHP + '%'; v.style.color = c; }
  }

  // ── 3D Canvas ─────────────────────────────────────────────────────────────

  _startCanvas() {
    this._canvas = document.getElementById('pls3d-canvas');
    if (!this._canvas) return;
    this._ctx = this._canvas.getContext('2d');
    this._resizeCanvas();
    this._onResize = () => this._resizeCanvas();
    window.addEventListener('resize', this._onResize);
    this._lastT = performance.now();
    this._raf   = requestAnimationFrame(t => this._drawFrame(t));
  }

  _resizeCanvas() {
    if (!this._canvas) return;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  }

  // Camera at (0,3,4) looking at origin.
  // sc scales with screen size so mannequin fills the center.
  _project(x, y, z) {
    const W = this._canvas.width, H = this._canvas.height;
    const tx = x;
    const ty = 0.8 * (y - 3) - 0.6 * (z - 4);
    const tz = 0.6 * (y - 3) + 0.8 * (z - 4);
    const depth = -tz;
    if (depth < 0.1) return { x: W / 2, y: H / 2, depth: 0.1, s: 1 };
    const fov = 3.5;
    const sc  = Math.min(W, H) * 0.46;
    const s   = fov / depth;
    return {
      x:     W / 2 + tx * s * sc,
      y:     H * 0.46 - ty * s * sc,
      depth,
      s:     s * sc,
    };
  }

  _drawFrame(t) {
    if (!this._canvas || !this._ctx) return;
    const dt = Math.min((t - this._lastT) / 1000, 0.1);
    this._lastT = t;
    this._updateAnim(dt);

    const ctx = this._ctx;
    const W = this._canvas.width, H = this._canvas.height;
    ctx.clearRect(0, 0, W, H);

    this._drawFloor(ctx, W, H);
    const joints = this._getJoints();
    this._drawShadows(ctx, joints);
    this._drawBody(ctx, joints);
    this._drawFeedbackFx(ctx, W, H);
    this._drawParticles(ctx);

    // Hold-progress arc on active joint
    if (this.stepStart && this.a.holdPct > 0 && this.a.holdPct < 1) {
      const s   = this.allSteps[this.step];
      const key = { headCheck:'head', headTilt:'head', armLeft:'lElbow', kneeRight:'rKnee', sideRoll:'abdomen' }[s.animKey] || 'chest';
      const p   = this._project(...joints[key]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 20 * p.s / 150, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * this.a.holdPct);
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth   = 2.5;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur  = 8;
      ctx.stroke();
      ctx.shadowBlur  = 0;
    }

    this._raf = requestAnimationFrame(ts => this._drawFrame(ts));
  }

  _drawFloor(ctx, W, H) {
    ctx.save();
    ctx.strokeStyle = 'rgba(0,255,204,0.07)';
    ctx.lineWidth   = 0.5;
    const xs = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0];
    const zs = [-1.0, -0.6, -0.2, 0.2, 0.6, 1.0];
    for (const xv of xs) {
      const p1 = this._project(xv, -0.05, -1.1);
      const p2 = this._project(xv, -0.05,  1.0);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    for (const zv of zs) {
      const p1 = this._project(-1.1, -0.05, zv);
      const p2 = this._project( 1.1, -0.05, zv);
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    ctx.restore();
  }

  _drawShadows(ctx, joints) {
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.fillStyle   = '#000';
    for (const key of ['head', 'chest', 'lElbow', 'rElbow', 'lKnee', 'rKnee']) {
      const j = joints[key]; if (!j) continue;
      const p = this._project(j[0], -0.04, j[2]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, Math.max(3, 11 * p.s / 150), Math.max(2, 4 * p.s / 150), 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Returns joint map: key → [x,y,z]
  // Body laid flat (Y≈0), head at negative Z (top of canvas), feet at positive Z (bottom)
  _getJoints() {
    const j = {
      head:      [ 0,      0,     -0.86],
      neck:      [ 0,      0,     -0.65],
      lShoulder: [-0.24,   0,     -0.50],
      rShoulder: [ 0.24,   0,     -0.50],
      chest:     [ 0,      0,     -0.38],
      lElbow:    [-0.44,   0,     -0.24],
      rElbow:    [ 0.44,   0,     -0.24],
      lWrist:    [-0.44,   0,      0.03],
      rWrist:    [ 0.44,   0,      0.03],
      abdomen:   [ 0,      0,     -0.12],
      lHip:      [-0.20,   0,      0.10],
      rHip:      [ 0.20,   0,      0.10],
      lKnee:     [-0.20,   0,      0.44],
      rKnee:     [ 0.20,   0,      0.44],
      lAnkle:    [-0.20,   0,      0.82],
      rAnkle:    [ 0.20,   0,      0.82],
    };

    // Step 1 — headCheck: glowing pulse (no position change, handled in draw)

    // Step 2 — headTilt: head tilts back / rises
    const ht = this.a.headTilt;
    j.head[1]   += ht * 0.20;
    j.head[2]   += ht * (-0.06);
    j.neck[1]   += ht * 0.07;

    // Step 3 — armLeft: left arm extends out perpendicular to body
    const al = this.a.armLeft;
    j.lElbow[0] += al * (-0.30);
    j.lElbow[2] += al * (-0.26);
    j.lElbow[1] += al * 0.10;
    j.lWrist[0] += al * (-0.60);
    j.lWrist[2] += al * (-0.54);
    j.lWrist[1] += al * 0.12;

    // Step 4 — kneeRight: right knee bends upward
    const kr = this.a.kneeRight;
    j.rKnee[1]  += kr * 0.38;
    j.rKnee[2]  += kr * (-0.26);
    j.rAnkle[1] += kr * 0.12;
    j.rAnkle[2] += kr * (-0.36);
    j.rAnkle[0] += kr * 0.05;

    // Step 5 — sideRoll: rotate all joints ~79° around Z-axis (body's long axis)
    if (this.a.sideRoll > 0) {
      const angle = this.a.sideRoll * (Math.PI * 0.44);
      const cosA  = Math.cos(angle), sinA = Math.sin(angle);
      Object.keys(j).forEach(k => {
        const [x, y, z] = j[k];
        j[k] = [x * cosA - y * sinA, x * sinA + y * cosA, z];
      });
    }

    // Shake offset (bad feedback)
    if (this.a.shakeOffset) {
      Object.keys(j).forEach(k => { j[k] = [j[k][0] + this.a.shakeOffset, j[k][1], j[k][2]]; });
    }

    return j;
  }

  _drawBody(ctx, joints) {
    const { headCheck, feedbackType, feedbackAlpha } = this.a;
    const baseC  = '#00ddcc';
    const goodC  = '#00ffcc';
    const badC   = '#ff5555';
    const boneC  = feedbackType === 'good' ? goodC : feedbackType === 'bad' ? badC : baseC;
    const alpha  = feedbackType === 'bad'  ? Math.max(0.5, 1 - feedbackAlpha * 0.4) : 1;
    const glow   = feedbackType === 'good' ? 1 + feedbackAlpha * 2 : 1;

    const proj = key => this._project(...joints[key]);

    const bone = (k1, k2, r = 0.055) => {
      const p1 = proj(k1), p2 = proj(k2);
      const w  = Math.max(3, r * (p1.s + p2.s));
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = boneC;
      ctx.lineWidth   = w;
      ctx.lineCap     = 'round';
      ctx.shadowColor = boneC;
      ctx.shadowBlur  = 5 * glow;
      ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.restore();
    };

    const joint = (key, r = 0.08) => {
      const p = proj(key);
      const radius = Math.max(2.5, r * p.s);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = boneC;
      ctx.shadowColor = boneC;
      ctx.shadowBlur  = 6 * glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };

    // Torso
    bone('neck', 'chest'); bone('chest', 'abdomen');
    bone('lShoulder', 'rShoulder');
    bone('neck', 'lShoulder'); bone('neck', 'rShoulder');
    bone('abdomen', 'lHip'); bone('abdomen', 'rHip'); bone('lHip', 'rHip');

    // Arms
    bone('lShoulder', 'lElbow'); bone('lElbow', 'lWrist');
    bone('rShoulder', 'rElbow'); bone('rElbow', 'rWrist');

    // Legs
    bone('lHip', 'lKnee'); bone('lKnee', 'lAnkle');
    bone('rHip', 'rKnee'); bone('rKnee', 'rAnkle');

    // Joints
    ['lShoulder','rShoulder','lElbow','rElbow','lHip','rHip','lKnee','rKnee','lWrist','rWrist','lAnkle','rAnkle']
      .forEach(k => joint(k, 0.065));

    // Head — special rendering with breathing check glow
    const ph = proj('head');
    const hr = Math.max(6, 0.17 * ph.s);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (headCheck > 0.05) {
      const pulse = 1 + Math.sin(Date.now() * 0.006) * 0.15 * headCheck;
      const g = ctx.createRadialGradient(ph.x, ph.y, hr * 0.4, ph.x, ph.y, hr * 3.2 * pulse);
      g.addColorStop(0, `rgba(255,220,0,${0.45 * headCheck})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(ph.x, ph.y, hr * 3.2 * pulse, 0, Math.PI * 2); ctx.fill();
    }
    const hg = ctx.createRadialGradient(ph.x - hr * 0.3, ph.y - hr * 0.3, 0, ph.x, ph.y, hr);
    hg.addColorStop(0, '#66ffee');
    hg.addColorStop(1, '#009988');
    ctx.fillStyle   = hg;
    ctx.shadowColor = boneC;
    ctx.shadowBlur  = 10 * glow;
    ctx.beginPath(); ctx.arc(ph.x, ph.y, hr, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Roll effect: dashed axis line when body is rolling
    if (this.a.sideRoll > 0.05) {
      const pa = proj('abdomen');
      ctx.save();
      ctx.globalAlpha = this.a.sideRoll * 0.5;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(proj('neck').x, proj('neck').y);
      ctx.lineTo(proj('rAnkle').x, proj('rAnkle').y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  _drawFeedbackFx(ctx, W, H) {
    const { feedbackType, feedbackAlpha } = this.a;
    if (feedbackAlpha < 0.01) return;
    ctx.save();
    if (feedbackType === 'good') {
      ctx.globalAlpha = feedbackAlpha * 0.45;
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth   = 5;
      ctx.shadowColor = '#00ffcc';
      ctx.shadowBlur  = 18;
      ctx.strokeRect(3, 3, W - 6, H - 6);
    } else if (feedbackType === 'bad') {
      ctx.globalAlpha = feedbackAlpha * 0.45;
      const grad = ctx.createRadialGradient(W / 2, H / 2, H * 0.15, W / 2, H / 2, H * 0.75);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(255,60,60,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  _drawParticles(ctx) {
    for (const p of this.a.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  _updateAnim(dt) {
    const lerp = (a, b, t) => a + (b - a) * Math.min(1, t);
    const spd  = 2.8;

    ['headCheck','headTilt','armLeft','kneeRight','sideRoll'].forEach((k, i) => {
      this.a[k] = lerp(this.a[k], this.stepDone[i] ? 1 : 0, dt * spd);
    });

    if (this.a.feedbackAlpha > 0) {
      this.a.feedbackAlpha = Math.max(0, this.a.feedbackAlpha - dt * 2.5);
      if (this.a.feedbackAlpha < 0.01) this.a.feedbackType = 'none';
    }

    if (this.a.shakeTimer > 0) {
      this.a.shakeTimer  -= dt;
      this.a.shakeOffset  = Math.sin(this.a.shakeTimer * 65) * 0.045 * (this.a.shakeTimer / 0.4);
    } else {
      this.a.shakeOffset = 0;
    }

    this.a.particles = this.a.particles.filter(p => {
      p.life -= dt * 1.4;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 140 * dt;
      return p.life > 0;
    });
  }

  _triggerGood() {
    this.a.feedbackType  = 'good';
    this.a.feedbackAlpha = 1;
    if (!this._canvas) return;
    const joints = this._getJoints();
    const s      = this.allSteps[this.step];
    const jKey   = { headCheck:'head', headTilt:'head', armLeft:'lElbow', kneeRight:'rKnee', sideRoll:'abdomen' }[s.animKey] || 'chest';
    const p      = this._project(...joints[jKey]);
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * Math.PI * 2, spd = 70 + Math.random() * 110;
      this.a.particles.push({
        x: p.x, y: p.y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 70,
        r:  2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#00ffcc' : '#ffdd00',
        life: 0.7 + Math.random() * 0.5,
      });
    }
  }

  _triggerBad() {
    this.a.feedbackType  = 'bad';
    this.a.feedbackAlpha = 1;
    this.a.shakeTimer    = 0.38;
  }

  // ── Step timers ───────────────────────────────────────────────────────────

  _startStepTimer() {
    clearInterval(this._stepTick);
    const s = this.allSteps[this.step];
    if (!s) return;
    this.stepTL = s.timeLimit;
    this._updateStepTimer();

    this._stepTick = setInterval(() => {
      this.stepTL--;
      this._updateStepTimer();
      if (this.stepTL <= 0) {
        this.victimHP = Math.max(0, this.victimHP - 25);
        this.combo    = 0;
        clearInterval(this._stepTick);
        this._flashDanger();
        this._triggerBad();
        if (this.step < 4) {
          this.step++;
          this.sweepPhase = 0;
          this._updateUI();
          this._startStepTimer();
        } else {
          this._finish();
        }
      }
    }, 1000);
  }

  _updateStepTimer() {
    const el = document.getElementById('pls3d-step-timer');
    if (!el) return;
    const danger = this.stepTL <= 3;
    el.textContent = this.stepTL;
    el.style.color = danger ? '#ff2244' : '#ffaa00';
    el.classList.toggle('pls-step-tick--danger', danger);
  }

  _flashDanger() {
    const el = document.getElementById('pls3d-danger');
    if (!el) return;
    el.classList.add('pls-danger--show');
    setTimeout(() => el?.classList.remove('pls-danger--show'), 900);
  }

  // ── Gesture handling ──────────────────────────────────────────────────────

  onHand(hands) {
    if (!this._started) return;
    const lm = hands[0];
    const s  = this.allSteps[this.step];
    if (!s || this.stepDone[this.step]) return;

    // Ordered mode: penalise wrong-order gestures
    if (this.mode === 'ordered' && lm && !this._wrongCooldown) {
      if (this._isWrongGesture(lm)) {
        this._wrongCooldown = true;
        this._triggerBad();
        this.victimHP = Math.max(0, this.victimHP - 5);
        this._updateHP();
        const hint = document.getElementById('pls3d-hint');
        if (hint) {
          hint.textContent = `⚠️ MAUVAIS GESTE — ${s.hint}`;
          setTimeout(() => { if (hint) hint.textContent = s.hint; this._wrongCooldown = false; }, 1400);
        }
        return;
      }
    }

    // Sweep gesture (step 5)
    if (s.special === 'sweep') {
      if (!lm) { this.sweepPhase = 0; return; }
      const w = Tracker.wrist(lm);
      if (!w) return;
      const hint = document.getElementById('pls3d-hint');
      if (this.sweepPhase === 0 && w.x > 0.65) {
        this.sweepPhase = 1;
        if (hint) hint.textContent = '👍 Maintenant balaye vers la GAUCHE !';
      } else if (this.sweepPhase === 1 && w.x < 0.28) {
        this._completeStep();
      }
      return;
    }

    if (!lm) {
      this.stepStart  = null;
      this.a.holdPct  = 0;
      const bar = document.getElementById('pls3d-bar');
      if (bar) bar.style.width = '0%';
      return;
    }

    if (s.check(lm)) {
      if (!this.stepStart) this.stepStart = Date.now();
      const pct = Math.min(100, ((Date.now() - this.stepStart) / s.holdMs) * 100);
      this.a.holdPct = pct / 100;
      const bar = document.getElementById('pls3d-bar');
      if (bar) bar.style.width = pct + '%';
      if (pct >= 100) this._completeStep();
    } else {
      this.stepStart  = null;
      this.a.holdPct  = 0;
      const bar = document.getElementById('pls3d-bar');
      if (bar) bar.style.width = '0%';
    }
  }

  _isWrongGesture(lm) {
    for (let i = 0; i < this.allSteps.length; i++) {
      if (i === this.step || this.stepDone[i]) continue;
      const other = this.allSteps[i];
      if (other.special === 'sweep') continue;
      if (other.check(lm)) return true;
    }
    return false;
  }

  _completeStep() {
    if (this.stepDone[this.step]) return;
    this.stepDone[this.step] = true;
    this.stepStart  = null;
    this.sweepPhase = 0;
    this.a.holdPct  = 0;
    this.combo++;
    this._triggerGood();
    clearInterval(this._stepTick);
    if (this.stepTL >= 5) this.victimHP = Math.min(100, this.victimHP + 5);

    const next = this.step + 1;
    if (next < this.allSteps.length) {
      this.step = next;
      setTimeout(() => { this._updateUI(); this._startStepTimer(); }, 650);
    } else {
      setTimeout(() => this._finish(), 850);
    }
  }

  // ── Finish ────────────────────────────────────────────────────────────────

  _finish() {
    clearInterval(this._timer);
    clearInterval(this._stepTick);
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this._onResize) { window.removeEventListener('resize', this._onResize); this._onResize = null; }

    const done  = this.stepDone.filter(Boolean).length;
    const tUsed = this._initDur - this.timeLeft;
    const stars = (done === 5 && this.victimHP > 60) ? 3
                : done === 5                          ? 2
                : done >= 3                           ? 1 : 0;

    const modeLabel = this.mode === 'chrono' ? '⚡ Chrono' : this.mode === 'ordered' ? '🔀 Ordre' : '▶ Normal';
    Engine.end(stars, [
      { val: `${done}/5`,         lbl: 'Étapes réussies' },
      { val: this.victimHP + '%', lbl: 'Vie victime' },
      { val: modeLabel,           lbl: 'Mode joué' },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 3 — Burn (refroidir la brûlure — couverture de zone)
// ═══════════════════════════════════════════════════════════════════════════

class BurnGame {
  constructor(cfg, ui) {
    this.cfg      = cfg;
    this.ui       = ui;
    this.timeLeft = cfg.duration;
    this._timer   = null;
    this.covered  = new Set();
    this.COLS     = 12;
    this.ROWS     = 8;
  }

  start() {
    this.ui.innerHTML = `
      <div class="game-hud">
        <div class="gh-top">
          <div class="gh-timer"><span id="g-b-time">${this.timeLeft}</span><span class="gh-unit">s</span></div>
          <div class="gh-title">REFROIDIR LA BRÛLURE</div>
          <div class="gh-comps"><span id="g-b-pct">0</span><span class="gh-unit">%</span></div>
        </div>

        <div class="burn-zone">
          <div class="burn-label">Zone à refroidir — main ouverte, mouvements lents</div>
          <div class="burn-grid" id="g-burn-grid"></div>
          <div class="burn-coverage">
            <div class="gh-bar-bg"><div class="gh-bar-fill" id="g-b-bar" style="background: #0088ff; width: 0%"></div></div>
            <div class="burn-target">OBJECTIF : ${Math.round(this.cfg.coverTarget * 100)}% couvert</div>
          </div>
        </div>

        <div class="gh-hint" id="g-b-hint">💧 Ouvre la main et déplace-la lentement sur toute la zone</div>
      </div>
    `;

    // Build grid
    const grid = document.getElementById('g-burn-grid');
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const cell = document.createElement('div');
        cell.className = 'burn-cell';
        cell.id = `bc-${r}-${c}`;
        grid.appendChild(cell);
      }
    }
    grid.style.gridTemplateColumns = `repeat(${this.COLS}, 1fr)`;

    this._timer = setInterval(() => {
      this.timeLeft--;
      const el = document.getElementById('g-b-time');
      if (el) el.textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);
  }

  onHand(hands) {
    const lm = hands[0];
    if (!lm) return;

    const isOpen = Tracker.isOpen(lm);
    const hint = document.getElementById('g-b-hint');

    if (!isOpen) {
      if (hint) hint.textContent = '✋ Ouvre bien la main pour refroidir';
      return;
    }

    const p = Tracker.palm(lm);
    if (!p) return;

    // Map palm position to grid cell (mirror X because canvas is mirrored)
    const col = Math.floor((1 - p.x) * this.COLS);
    const row = Math.floor(p.y * this.ROWS);

    if (col >= 0 && col < this.COLS && row >= 0 && row < this.ROWS) {
      const key = `${row}-${col}`;
      if (!this.covered.has(key)) {
        this.covered.add(key);
        const cell = document.getElementById(`bc-${key}`);
        if (cell) cell.classList.add('burn-cell--wet');

        const pct = Math.round((this.covered.size / (this.COLS * this.ROWS)) * 100);
        const bar = document.getElementById('g-b-bar');
        const pctEl = document.getElementById('g-b-pct');
        if (bar)   bar.style.width = pct + '%';
        if (pctEl) pctEl.textContent = pct;

        if (hint) {
          hint.textContent = pct >= 80
            ? '🌊 Excellent refroidissement !'
            : '💧 Continuez à couvrir toute la zone…';
        }

        if (pct / 100 >= this.cfg.coverTarget) this._finish();
      }
    }
  }

  _finish() {
    clearInterval(this._timer);
    const pct   = Math.round((this.covered.size / (this.COLS * this.ROWS)) * 100);
    const stars = pct >= Math.round(this.cfg.coverTarget * 100) ? 3 : pct >= 50 ? 2 : pct >= 25 ? 1 : 0;
    const timeUsed = this.cfg.duration - this.timeLeft;

    Engine.end(stars, [
      { val: pct + '%', lbl: 'Zone couverte' },
      { val: timeUsed + 's', lbl: 'Temps' },
      { val: stars >= 3 ? 'Brûlure refroidie ✓' : 'Couvrez toute la zone', lbl: 'Résultat' },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 5 — Mixed (quiz gestuel — 4 grandes zones, main devant la réponse)
// ═══════════════════════════════════════════════════════════════════════════

class MixedGame {
  constructor(cfg, ui) {
    this.cfg         = cfg;
    this.ui          = ui;
    this.round       = 0;
    this.correct     = 0;
    this.timeLeft    = cfg.duration;
    this._timer      = null;
    this._answered   = false;
    this._dwellZone  = null;
    this._dwellStart = null;

    this.questions = [
      { q: 'Pas de respiration → tu fais quoi ?',       answers: ['Massage cardiaque', 'Mettre en PLS',        'Attendre les secours',  'Appeler un ami'],      correct: 0 },
      { q: 'Inconscient mais respire → tu fais quoi ?', answers: ['Position PLS',      'Massage cardiaque',    'Lui donner de l\'eau',  'Ne rien faire'],       correct: 0 },
      { q: 'Hémorragie → tu fais quoi ?',               answers: ['Comprimer fort',    'Surélever sans toucher','Rincer à l\'eau',       'Retirer l\'objet'],    correct: 0 },
      { q: 'Brûlure → première action ?',               answers: ['Eau fraîche 15 min','Beurre sur la plaie',  'Bandage serré',         'Percer la cloque'],    correct: 0 },
      { q: 'Appel d\'urgence → quel numéro ?',          answers: ['15 ou 112',         '17 (police)',          '18 uniquement',         '999 international'],   correct: 0 },
    ].slice(0, cfg.rounds);
  }

  start() {
    this._renderQuestion();
    this._timer = setInterval(() => {
      this.timeLeft--;
      const el = document.getElementById('g-m-time');
      if (el) el.textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);
  }

  // Map palm landmark position to visual quadrant (0=TL, 1=TR, 2=BL, 3=BR)
  // The AR canvas is CSS-mirrored (scaleX(-1)), so landmark x is flipped visually.
  _zoneFor(x, y) {
    const col = x > 0.5 ? 0 : 1; // landmark x>0.5 → visual left col
    const row = y < 0.5 ? 0 : 1;
    return row * 2 + col;
  }

  _renderQuestion() {
    const q = this.questions[this.round];
    this._answered   = false;
    this._dwellZone  = null;
    this._dwellStart = null;

    // Shuffle answers, keep track of where the correct one lands
    const indices = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
    const shuffled = indices.map(i => q.answers[i]);
    this._correctShuffled = indices.indexOf(q.correct);

    this.ui.innerHTML = `
      <div class="quiz-ar-hud">
        <div class="quiz-ar-top">
          <div class="gh-timer"><span id="g-m-time">${this.timeLeft}</span><span class="gh-unit">s</span></div>
          <div class="quiz-ar-title">QUIZ SITUATIONS</div>
          <div class="gh-comps">${this.round + 1}/${this.questions.length}</div>
        </div>

        <div class="quiz-ar-question">${q.q}</div>

        <div class="quiz-ar-grid">
          ${shuffled.map((a, i) => `
            <div class="quiz-ar-cell" id="qc-${i}" data-i="${i}">
              <div class="quiz-ar-cell__dwell" id="qdw-${i}"></div>
              <div class="quiz-ar-cell__label">${a}</div>
            </div>
          `).join('')}
        </div>

        <div class="quiz-ar-hint">✋ Garde ta main dans la bonne zone 1.5s — ou clique</div>
      </div>
    `;

    this.ui.querySelectorAll('.quiz-ar-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        if (!this._answered) this._select(+cell.dataset.i);
      });
    });
  }

  onHand(hands) {
    if (this._answered) return;
    const lm = hands[0];

    if (!lm) {
      this._dwellZone  = null;
      this._dwellStart = null;
      this._clearHighlight();
      return;
    }

    const p = Tracker.palm(lm);
    if (!p) return;

    const zone = this._zoneFor(p.x, p.y);
    const now  = Date.now();
    const DWELL_MS = 1500;

    if (zone !== this._dwellZone) {
      this._dwellZone  = zone;
      this._dwellStart = now;
      this._clearHighlight();
    }

    const pct = Math.min(100, ((now - this._dwellStart) / DWELL_MS) * 100);

    document.querySelectorAll('.quiz-ar-cell').forEach((c, i) => {
      c.classList.toggle('quiz-ar-cell--active', i === zone);
    });

    const dwEl = document.getElementById(`qdw-${zone}`);
    if (dwEl) dwEl.style.setProperty('--dwell-pct', pct + '%');

    if (pct >= 100) this._select(zone);
  }

  _clearHighlight() {
    document.querySelectorAll('.quiz-ar-cell--active').forEach(c => c.classList.remove('quiz-ar-cell--active'));
    for (let i = 0; i < 4; i++) {
      const dw = document.getElementById(`qdw-${i}`);
      if (dw) dw.style.setProperty('--dwell-pct', '0%');
    }
  }

  _select(idx) {
    if (this._answered) return;
    this._answered = true;

    if (idx === this._correctShuffled) {
      this.correct++;
      document.getElementById(`qc-${idx}`)?.classList.add('quiz-ar-cell--right');
    } else {
      document.getElementById(`qc-${idx}`)?.classList.add('quiz-ar-cell--wrong');
      document.getElementById(`qc-${this._correctShuffled}`)?.classList.add('quiz-ar-cell--right');
    }

    setTimeout(() => {
      this.round++;
      if (this.round < this.questions.length) this._renderQuestion();
      else this._finish();
    }, 1500);
  }

  _finish() {
    clearInterval(this._timer);
    const pct   = Math.round((this.correct / this.questions.length) * 100);
    const stars = pct === 100 ? 3 : pct >= 60 ? 2 : pct >= 40 ? 1 : 0;

    Engine.end(stars, [
      { val: `${this.correct}/${this.questions.length}`, lbl: 'Bonnes réponses' },
      { val: pct + '%', lbl: 'Score' },
      { val: this.timeLeft + 's', lbl: 'Temps restant' },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// QUIZ GLOBAL
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('screen-quiz').addEventListener('screenenter', () => {
  document.getElementById('ar-layer').classList.remove('hidden');
  const ui = document.getElementById('quiz-content');
  const m = { game: { type: 'mixed', rounds: 5, duration: 90 }, id: 'quiz', num: 0, title: 'Quiz global',
               tips: ['Révisez les gestes régulièrement !'], intro: {}, learn: [] };
  App.currentMission = m;
  ui.innerHTML = '<div id="game-ui"></div>';
  Tracker.start().then(() => {
    const game = new MixedGame(m.game, document.getElementById('game-ui'));
    Engine._game = game;
    game.start();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CHALLENGE MODE
// ═══════════════════════════════════════════════════════════════════════════

document.getElementById('screen-challenge').addEventListener('screenenter', () => {
  const ui = document.getElementById('challenge-content');
  ui.innerHTML = `
    <div class="challenge-menu">
      <div class="corner corner--tl"></div>
      <div class="corner corner--tr"></div>
      <div class="corner corner--bl"></div>
      <div class="corner corner--br"></div>
      <h2 class="ch-title">MODE CHALLENGE</h2>
      <div class="ch-modes">
        <button class="ch-btn" id="ch-cardiac">
          <span class="ch-icon">🫀</span>
          <span class="ch-lbl">Rythme infini</span>
          <span class="ch-sub">Massage cardiaque · 60s</span>
        </button>
        <button class="ch-btn" id="ch-quiz">
          <span class="ch-icon">⚡</span>
          <span class="ch-lbl">Quiz éclair</span>
          <span class="ch-sub">5 questions · 30s</span>
        </button>
        <button class="ch-btn" id="ch-survival">
          <span class="ch-icon">💀</span>
          <span class="ch-lbl">Mode survie</span>
          <span class="ch-sub">Toutes les missions · sans erreur</span>
        </button>
      </div>
      <button class="back-btn" id="ch-back">← Retour</button>
    </div>
  `;

  document.getElementById('ch-back').onclick = () => App.go('screen-hub');

  document.getElementById('ch-cardiac').onclick = () => {
    App.currentMission = MISSIONS[0];
    Tracker.start().then(() => {
      App.go('screen-play');
      Engine.start({ type: 'cardiac', targetBPM: 110, bpmMin: 100, bpmMax: 120, duration: 60 });
    });
  };

  document.getElementById('ch-quiz').onclick = () => {
    App.currentMission = { id: 'quiz', num: 0, title: 'Quiz éclair', tips: ['Entraînez-vous régulièrement !'], intro: {}, learn: [] };
    ui.innerHTML = '<div id="game-ui"></div>';
    const g = new MixedGame({ type: 'mixed', rounds: 5, duration: 30 }, document.getElementById('game-ui'));
    Engine._game = g;
    g.start();
  };

  document.getElementById('ch-survival').onclick = () => {
    App.currentMission = MISSIONS[0];
    App.go('screen-intro');
  };
});
