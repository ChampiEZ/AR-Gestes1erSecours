// ── Hub background (constellation) ────────────────────────────────────────

(function hubBackground() {
  const canvas = document.getElementById('hub-bg');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, nodes;

  function init() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    nodes = Array.from({ length: 60 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      r: Math.random() * 1.5 + 0.5,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);

    // Connections between nearby nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(0,255,204,${0.08 * (1 - d / 120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    // Nodes
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,255,204,0.3)';
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  init();
  window.addEventListener('resize', init);
  requestAnimationFrame(draw);
})();

// ── Hub screen ────────────────────────────────────────────────────────────

const Hub = {
  render() {
    const missions = App.getMissions();
    const map = document.getElementById('hub-map');

    document.getElementById('hub-total-stars').textContent = App.totalStars();

    map.innerHTML = missions.map((m, i) => `
      <div class="mission-card ${m.unlocked ? '' : 'mission-card--locked'} ${m.stars > 0 ? 'mission-card--done' : ''}"
           data-id="${m.id}" style="--mc: ${m.color}">
        <div class="mc-glow"></div>
        <div class="mc-num">MISSION ${m.num}</div>
        <div class="mc-icon">${m.unlocked ? m.icon : '🔒'}</div>
        <div class="mc-title">${m.unlocked ? m.title : '???'}</div>
        <div class="mc-stars">
          ${[1,2,3].map(s => `<span class="star ${s <= m.stars ? 'star--on' : ''}">★</span>`).join('')}
        </div>
        ${m.unlocked && m.stars === 0 ? '<div class="mc-badge">DISPONIBLE</div>' : ''}
      </div>
      ${i < missions.length - 1 ? `<div class="mc-path ${missions[i+1].unlocked ? 'mc-path--on' : ''}">···</div>` : ''}
    `).join('');

    map.querySelectorAll('.mission-card:not(.mission-card--locked)').forEach(card => {
      card.addEventListener('click', () => {
        App.currentMission = MISSIONS.find(m => m.id === card.dataset.id);
        App.go('screen-intro');
      });
    });

    const completed = missions.filter(m => m.stars > 0).length;
    document.getElementById('btn-quiz').disabled      = completed < 1;
    document.getElementById('btn-challenge').disabled = completed < 2;
  },
};

document.getElementById('screen-hub').addEventListener('screenenter', () => Hub.render());
document.getElementById('btn-quiz').addEventListener('click', () => App.go('screen-quiz'));
document.getElementById('btn-challenge').addEventListener('click', () => App.go('screen-challenge'));
