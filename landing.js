// ── Background particle grid ───────────────────────────────────────────────

const bgCanvas = document.getElementById('bg-canvas');
const bgCtx    = bgCanvas.getContext('2d');

let W, H, particles;

function initBg() {
  W = bgCanvas.width  = window.innerWidth;
  H = bgCanvas.height = window.innerHeight;

  // Grid of faint dots
  particles = [];
  const cols = Math.ceil(W / 60);
  const rows = Math.ceil(H / 60);

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      particles.push({
        x:    c * 60 + (Math.random() - 0.5) * 20,
        y:    r * 60 + (Math.random() - 0.5) * 20,
        base: Math.random() * 0.15 + 0.03,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.008 + 0.003,
      });
    }
  }
}

function drawBg(t) {
  bgCtx.clearRect(0, 0, W, H);

  // Radial gradient backdrop
  const grad = bgCtx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  grad.addColorStop(0,   'rgba(0, 40, 35, 0.6)');
  grad.addColorStop(1,   'rgba(2, 12, 16, 0)');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, W, H);

  // Dots
  particles.forEach(p => {
    const alpha = p.base + Math.sin(t * p.speed + p.phase) * 0.06;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, 1, 0, Math.PI * 2);
    bgCtx.fillStyle = `rgba(0,255,204,${alpha})`;
    bgCtx.fill();
  });

  // Horizontal scan line sweeping down
  const scanY = ((t * 0.04) % H);
  const scanGrad = bgCtx.createLinearGradient(0, scanY - 60, 0, scanY + 2);
  scanGrad.addColorStop(0, 'rgba(0,255,204,0)');
  scanGrad.addColorStop(1, 'rgba(0,255,204,0.04)');
  bgCtx.fillStyle = scanGrad;
  bgCtx.fillRect(0, scanY - 60, W, 62);
}

let raf;
function loop(t) {
  drawBg(t);
  raf = requestAnimationFrame(loop);
}

initBg();
requestAnimationFrame(loop);
window.addEventListener('resize', initBg);

// ── CTA → Hub ─────────────────────────────────────────────────────────────

document.getElementById('cta-btn').addEventListener('click', () => {
  setTimeout(() => {
    cancelAnimationFrame(raf);
    App.go('screen-hub');
  }, 600);
});
