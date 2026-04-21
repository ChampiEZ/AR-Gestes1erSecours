const App = {
  _screen: 'screen-landing',
  currentMission: null,
  learnSlide: 0,
  gameScore: null,

  go(screenId, params = {}) {
    document.getElementById(this._screen)?.classList.remove('active');

    const arLayer = document.getElementById('ar-layer');
    if (screenId === 'screen-play') {
      arLayer.classList.remove('hidden');
    } else {
      arLayer.classList.add('hidden');
      if (typeof Tracker !== 'undefined') Tracker.stop();
    }

    const screen = document.getElementById(screenId);
    if (!screen) return;
    screen.classList.add('active');
    this._screen = screenId;
    screen.dispatchEvent(new CustomEvent('screenenter', { detail: params }));
  },

  getMissions() {
    const saved = localStorage.getItem('ar01-progress');
    if (saved) {
      try {
        JSON.parse(saved).forEach(s => {
          const m = MISSIONS.find(m => m.id === s.id);
          if (m) { m.stars = s.stars; m.unlocked = s.unlocked; }
        });
      } catch (_) {}
    }
    return MISSIONS;
  },

  saveProgress(id, stars) {
    const missions = this.getMissions();
    const idx = missions.findIndex(m => m.id === id);
    if (idx < 0) return;

    if (stars > missions[idx].stars) missions[idx].stars = stars;
    if (idx + 1 < missions.length) missions[idx + 1].unlocked = true;

    localStorage.setItem('ar01-progress', JSON.stringify(
      missions.map(m => ({ id: m.id, stars: m.stars, unlocked: m.unlocked }))
    ));
  },

  totalStars() {
    return this.getMissions().reduce((s, m) => s + m.stars, 0);
  },
};
