const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

const Tracker = {
  hands: [],
  isRunning: false,
  _mp: null,
  _cam: null,
  _canvas: null,
  _ctx: null,
  _drawOverlay: true,

  init() {
    this._canvas = document.getElementById('ar-canvas');
    this._ctx    = this._canvas.getContext('2d');

    window.addEventListener('resize', () => this._resize());
    this._resize();

    this._mp = new Hands({
      locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`,
    });
    this._mp.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6,
    });
    this._mp.onResults(r => this._onResults(r));

    const video = document.getElementById('video');
    this._cam = new Camera(video, {
      onFrame: async () => {
        if (this.isRunning) await this._mp.send({ image: video });
      },
      width: 1280,
      height: 720,
    });
  },

  start() {
    this.isRunning = true;
    return this._cam.start();
  },

  stop() {
    this.isRunning = false;
    this.hands = [];
    if (this._ctx) this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
  },

  _resize() {
    if (!this._canvas) return;
    this._canvas.width  = window.innerWidth;
    this._canvas.height = window.innerHeight;
  },

  _onResults(results) {
    this.hands = results.multiHandLandmarks || [];
    if (this._drawOverlay) this._draw();
    if (typeof Engine !== 'undefined') Engine.onHand(this.hands);
  },

  _draw() {
    const ctx = this._ctx;
    const w   = this._canvas.width;
    const h   = this._canvas.height;
    ctx.clearRect(0, 0, w, h);

    this.hands.forEach(lm => {
      HAND_CONNECTIONS.forEach(([a, b]) => {
        ctx.beginPath();
        ctx.moveTo(lm[a].x * w, lm[a].y * h);
        ctx.lineTo(lm[b].x * w, lm[b].y * h);
        ctx.strokeStyle = 'rgba(0,255,204,0.5)';
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = '#00ffcc';
        ctx.shadowBlur  = 5;
        ctx.stroke();
        ctx.shadowBlur  = 0;
      });

      lm.forEach((pt, i) => {
        const tip = [4,8,12,16,20].includes(i);
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, tip ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle   = tip ? '#ff4488' : '#00ffcc';
        ctx.shadowColor = tip ? '#ff4488' : '#00ffcc';
        ctx.shadowBlur  = tip ? 14 : 7;
        ctx.fill();
        ctx.shadowBlur  = 0;
      });
    });
  },

  // ── Gesture helpers ──────────────────────────────────────────────────────

  extended(lm) {
    if (!lm) return [false, false, false, false, false];
    return [
      lm[4].x < lm[3].x,
      lm[8].y  < lm[6].y,
      lm[12].y < lm[10].y,
      lm[16].y < lm[14].y,
      lm[20].y < lm[18].y,
    ];
  },

  isOpen(lm)   { return this.extended(lm).filter(Boolean).length >= 4; },
  isClosed(lm) { return this.extended(lm).filter(Boolean).length <= 1; },
  wrist(lm)    { return lm ? { x: lm[0].x, y: lm[0].y } : null; },
  palm(lm)     { return lm ? { x: lm[9].x, y: lm[9].y } : null; },

  first() { return this.hands[0] ?? null; },
};

// Init after MediaPipe is loaded (scripts load sequentially)
window.addEventListener('load', () => {
  if (typeof Hands !== 'undefined') Tracker.init();
});
