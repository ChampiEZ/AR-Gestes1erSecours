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
      case 'pls':        this._game = new PLSGame(config, ui);        break;
      case 'hemorrhage': this._game = new HemorrhageGame(config, ui); break;
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
// GAME 2 — PLS (position latérale de sécurité, 5 gestes + vie victime)
// ═══════════════════════════════════════════════════════════════════════════

class PLSGame {
  constructor(cfg, ui) {
    this.cfg        = cfg;
    this.ui         = ui;
    this.step       = 0;
    this.steps5     = this._buildSteps();
    this.stepDone   = new Array(5).fill(false);
    this.stepStart  = null;
    this._timer     = null;
    this._stepTick  = null;
    this.timeLeft   = cfg.duration;
    this.stepTL     = 0;
    this.victimHP   = 100;
    this.combo      = 0;
    this.sweepPhase = 0;
  }

  _buildSteps() {
    return [
      {
        label: 'Vérifier la respiration',
        icon: '👁️',
        hint: 'Main ouverte en HAUT au centre — 1 seconde',
        timeLimit: 9,
        holdMs: 900,
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
        special: 'sweep',
        check: () => false,
      },
    ];
  }

  start() {
    this._render();
    this._startStepTimer();
    this._timer = setInterval(() => {
      this.timeLeft--;
      const el = document.getElementById('g-pls-time');
      if (el) el.textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);
  }

  _startStepTimer() {
    clearInterval(this._stepTick);
    const s = this.steps5[this.step];
    if (!s) return;
    this.stepTL = s.timeLimit;
    this._updateStepTimer();

    this._stepTick = setInterval(() => {
      this.stepTL--;
      this._updateStepTimer();
      if (this.stepTL <= 0) {
        this.victimHP = Math.max(0, this.victimHP - 25);
        this.combo = 0;
        clearInterval(this._stepTick);
        this._flashDanger();
        if (this.step < 4) {
          this.step++;
          this.sweepPhase = 0;
          this._render();
          this._startStepTimer();
        } else {
          this._finish();
        }
      }
    }, 1000);
  }

  _updateStepTimer() {
    const el = document.getElementById('g-step-timer');
    if (!el) return;
    el.textContent = this.stepTL;
    const danger = this.stepTL <= 3;
    el.style.color = danger ? '#ff2244' : '#ffaa00';
    el.classList.toggle('pls-step-tick--danger', danger);
  }

  _flashDanger() {
    const el = document.getElementById('g-pls-danger');
    if (!el) return;
    el.classList.add('pls-danger--show');
    setTimeout(() => el?.classList.remove('pls-danger--show'), 900);
  }

  _render() {
    const steps = this.steps5;
    const s = steps[this.step];
    const hpColor = this.victimHP > 60 ? '#00ffcc' : this.victimHP > 30 ? '#ffaa00' : '#ff2244';

    this.ui.innerHTML = `
      <div class="game-hud pls-hud">
        <div class="gh-top">
          <div class="gh-timer"><span id="g-pls-time">${this.timeLeft}</span><span class="gh-unit">s</span></div>
          <div class="gh-title">POSITION DE SÉCURITÉ</div>
          <div class="pls-steptimer-wrap">
            <span id="g-step-timer" class="pls-step-tick">${s.timeLimit}</span>
            <span class="gh-unit">/étape</span>
          </div>
        </div>

        <div class="pls-victim-bar">
          <span class="pls-victim-lbl">❤️ VIE VICTIME</span>
          <div class="pls-victim-bg">
            <div class="pls-victim-fill" id="g-victim-fill"
              style="width:${this.victimHP}%; background:${hpColor}; box-shadow: 0 0 8px ${hpColor}88"></div>
          </div>
          <span class="pls-victim-val" id="g-victim-val" style="color:${hpColor}">${this.victimHP}%</span>
        </div>

        <div id="g-pls-danger" class="pls-danger">⚠️ TROP LENT — ELLE SUFFOQUE !</div>

        <div class="pls-steps">
          ${steps.map((st, i) => {
            const active = i === this.step;
            const done   = this.stepDone[i];
            const failed = i < this.step && !done;
            return `
            <div class="pls-step ${active ? 'pls-step--active' : ''} ${done ? 'pls-step--done' : ''} ${failed ? 'pls-step--failed' : ''}">
              <span class="pls-step__num">${i + 1}</span>
              <span class="pls-step__icon">${st.icon}</span>
              <span class="pls-step__label">${st.label}</span>
              ${done   ? '<span class="pls-step__check">✓</span>'                     : ''}
              ${failed ? '<span class="pls-step__check pls-step__check--fail">✗</span>' : ''}
            </div>`;
          }).join('')}
        </div>

        <div class="pls-hint" id="g-pls-hint">${s.hint}</div>

        ${this.combo >= 2 ? `<div class="pls-combo">⚡ COMBO ×${this.combo} !</div>` : '<div class="pls-combo pls-combo--hidden"></div>'}

        <div class="pls-progress">
          <div class="pls-prog-bar" id="g-pls-bar" style="width: 0%"></div>
        </div>
      </div>
    `;
  }

  onHand(hands) {
    const lm = hands[0];
    const s  = this.steps5[this.step];
    if (!s || this.stepDone[this.step]) return;

    if (s.special === 'sweep') {
      if (!lm) { this.sweepPhase = 0; return; }
      const w = Tracker.wrist(lm);
      if (!w) return;
      const hint = document.getElementById('g-pls-hint');
      if (this.sweepPhase === 0 && w.x > 0.65) {
        this.sweepPhase = 1;
        if (hint) hint.textContent = '👍 Maintenant balaye vers la GAUCHE !';
      } else if (this.sweepPhase === 1 && w.x < 0.28) {
        this._completeStep();
      }
      return;
    }

    if (!lm) {
      this.stepStart = null;
      const bar = document.getElementById('g-pls-bar');
      if (bar) bar.style.width = '0%';
      return;
    }

    if (s.check(lm)) {
      if (!this.stepStart) this.stepStart = Date.now();
      const pct = Math.min(100, ((Date.now() - this.stepStart) / s.holdMs) * 100);
      const bar = document.getElementById('g-pls-bar');
      if (bar) bar.style.width = pct + '%';
      if (pct >= 100) this._completeStep();
    } else {
      this.stepStart = null;
      const bar = document.getElementById('g-pls-bar');
      if (bar) bar.style.width = '0%';
    }
  }

  _completeStep() {
    if (this.stepDone[this.step]) return;
    this.stepDone[this.step] = true;
    this.stepStart  = null;
    this.sweepPhase = 0;
    this.combo++;
    clearInterval(this._stepTick);
    if (this.stepTL >= 5) this.victimHP = Math.min(100, this.victimHP + 5);

    const next = this.step + 1;
    if (next < this.steps5.length) {
      this.step = next;
      this._render();
      this._startStepTimer();
    } else {
      this._finish();
    }
  }

  _finish() {
    clearInterval(this._timer);
    clearInterval(this._stepTick);
    const done     = this.stepDone.filter(Boolean).length;
    const timeUsed = this.cfg.duration - this.timeLeft;
    const stars    = (done === 5 && this.victimHP > 60) ? 3
                   : done === 5                          ? 2
                   : done >= 3                           ? 1 : 0;

    Engine.end(stars, [
      { val: `${done}/5`,           lbl: 'Étapes réussies' },
      { val: this.victimHP + '%',   lbl: 'Vie victime' },
      { val: timeUsed + 's',        lbl: 'Temps utilisé' },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 3 — Hemorrhage (maintenir la pression)
// ═══════════════════════════════════════════════════════════════════════════

class HemorrhageGame {
  constructor(cfg, ui) {
    this.cfg         = cfg;
    this.ui          = ui;
    this.timeLeft    = cfg.duration;
    this.heldTime    = 0;
    this.pressing    = false;
    this.stability   = 0;
    this.lastPos     = null;
    this._timer      = null;
    this._holdTimer  = null;
    this.totalHeld   = 0;
  }

  start() {
    // Target zone: center of screen (normalized)
    this.target = { x: 0.5, y: 0.55, r: 0.18 };

    this.ui.innerHTML = `
      <div class="game-hud">
        <div class="gh-top">
          <div class="gh-timer"><span id="g-h-time">${this.timeLeft}</span><span class="gh-unit">s</span></div>
          <div class="gh-title">COMPRESSION DE PLAIE</div>
          <div></div>
        </div>

        <div class="hem-zone">
          <div class="hem-wound" id="g-wound">
            <div class="hem-wound__inner"></div>
            <div class="hem-label">PLAIE</div>
          </div>
          <div class="hem-status" id="g-hem-status">Pose ton poing fermé sur la plaie</div>
        </div>

        <div class="gh-bar-wrap">
          <div class="gh-bar-label">PRESSION MAINTENUE — OBJECTIF : ${this.cfg.holdDuration}s</div>
          <div class="gh-bar-bg"><div class="gh-bar-fill" id="g-h-bar" style="background: #cc2200; width: 0%"></div></div>
        </div>

        <div class="hem-held">
          <span id="g-held">0.0</span><span class="gh-unit">s tenu / ${this.cfg.holdDuration}s</span>
        </div>
      </div>
    `;

    // Draw wound on AR canvas (in game-specific layer)
    this._timer = setInterval(() => {
      this.timeLeft--;
      const el = document.getElementById('g-h-time');
      if (el) el.textContent = this.timeLeft;
      if (this.timeLeft <= 0) this._finish();
    }, 1000);

    this._holdTimer = setInterval(() => {
      if (this.pressing) {
        this.heldTime += 0.1;
        this.totalHeld += 0.1;
        const pct = Math.min(100, (this.heldTime / this.cfg.holdDuration) * 100);
        const bar = document.getElementById('g-h-bar');
        const hld = document.getElementById('g-held');
        if (bar) bar.style.width = pct + '%';
        if (hld) hld.textContent = this.heldTime.toFixed(1);
        if (this.heldTime >= this.cfg.holdDuration) this._finish();
      }
    }, 100);
  }

  onHand(hands) {
    const lm = hands[0];
    const statusEl = document.getElementById('g-hem-status');
    const wound    = document.getElementById('g-wound');

    if (!lm) {
      this.pressing = false;
      if (statusEl) statusEl.textContent = 'Pose ton poing fermé sur la plaie';
      if (wound) wound.classList.remove('hem-wound--active');
      return;
    }

    const w   = Tracker.wrist(lm);
    const inZone = Math.abs(w.x - this.target.x) < this.target.r &&
                   Math.abs(w.y - this.target.y) < this.target.r;
    const fist = Tracker.isClosed(lm);

    // Stability: check hand not moving too much
    let stable = true;
    if (this.lastPos) {
      const dx = Math.abs(w.x - this.lastPos.x);
      const dy = Math.abs(w.y - this.lastPos.y);
      stable = dx < 0.04 && dy < 0.04;
    }
    this.lastPos = w;

    this.pressing = inZone && fist && stable;

    if (wound) wound.classList.toggle('hem-wound--active', this.pressing);
    if (statusEl) {
      statusEl.textContent =
        !fist    ? 'Ferme ton poing !' :
        !inZone  ? 'Déplace ta main sur la plaie ↕' :
        !stable  ? 'Ne bouge plus — tiens ferme' :
        '✅ Pression maintenue !';
    }

    // Reset if let go
    if (!this.pressing && this.heldTime > 0 && this.heldTime < this.cfg.holdDuration) {
      this.heldTime = Math.max(0, this.heldTime - 0.5);
    }
  }

  _finish() {
    clearInterval(this._timer);
    clearInterval(this._holdTimer);

    const held  = Math.min(this.totalHeld, this.cfg.holdDuration);
    const pct   = (held / this.cfg.holdDuration) * 100;
    const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;

    Engine.end(stars, [
      { val: held.toFixed(1) + 's', lbl: 'Pression totale tenue' },
      { val: Math.round(pct) + '%', lbl: 'Objectif atteint' },
      { val: stars === 3 ? 'Hémorragie contrôlée ✓' : 'Continuez à pratiquer', lbl: 'Résultat' },
    ]);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME 4 — Burn (refroidir la brûlure — couverture de zone)
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
