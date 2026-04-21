// Démarre uniquement après le clic sur CTA
function startAR() {
  const video    = document.getElementById('video');
  const canvas   = document.getElementById('ar-canvas');
  const ctx      = canvas.getContext('2d');
  const statusEl = document.getElementById('ar-status');
  const handInfo = document.getElementById('hand-info');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── MediaPipe ─────────────────────────────────────────

  const hands = new Hands({
    locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
  });

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });

  hands.onResults(onResults);

  const camera = new Camera(video, {
    onFrame: async () => { await hands.send({ image: video }); },
    width: 1280,
    height: 720,
  });

  camera.start()
    .then(() => { statusEl.textContent = 'CAMÉRA ACTIVE · TRACKING ON'; })
    .catch(err => { statusEl.textContent = 'ERREUR : ' + err.message; });

  // ── Drawing ───────────────────────────────────────────

  const CYAN = '#00ffcc';
  const PINK = '#ff4488';

  const FINGERTIPS = [4, 8, 12, 16, 20];

  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [5,9],[9,10],[10,11],[11,12],
    [9,13],[13,14],[14,15],[15,16],
    [13,17],[17,18],[18,19],[19,20],
    [0,17]
  ];

  function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks?.length) {
      handInfo.textContent = 'AUCUNE MAIN DÉTECTÉE';
      return;
    }

    const lines = [];

    results.multiHandLandmarks.forEach((lm, i) => {
      const side = results.multiHandedness[i]?.label?.toUpperCase() ?? '?';

      // Connections
      CONNECTIONS.forEach(([a, b]) => {
        const ax = lm[a].x * canvas.width;
        const ay = lm[a].y * canvas.height;
        const bx = lm[b].x * canvas.width;
        const by = lm[b].y * canvas.height;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.strokeStyle = CYAN + '88';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = CYAN;
        ctx.shadowBlur = 6;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Landmarks
      lm.forEach((pt, idx) => {
        const x = pt.x * canvas.width;
        const y = pt.y * canvas.height;
        const tip = FINGERTIPS.includes(idx);
        ctx.beginPath();
        ctx.arc(x, y, tip ? 7 : 4, 0, Math.PI * 2);
        ctx.fillStyle = tip ? PINK : CYAN;
        ctx.shadowColor = tip ? PINK : CYAN;
        ctx.shadowBlur = tip ? 14 : 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Gesture
      const ext     = getExtended(lm);
      const gesture = classify(ext);
      lines.push(`[${side}]  ${gesture}`);
    });

    handInfo.textContent = lines.join('     ');
  }

  function getExtended(lm) {
    return [
      lm[4].x < lm[3].x,
      lm[8].y  < lm[6].y,
      lm[12].y < lm[10].y,
      lm[16].y < lm[14].y,
      lm[20].y < lm[18].y,
    ];
  }

  function classify([thumb, index, middle, ring, pinky]) {
    const n = [thumb, index, middle, ring, pinky].filter(Boolean).length;
    if (n === 0)                                return '✊  POING';
    if (n === 5)                                return '✋  MAIN OUVERTE';
    if (index && !middle && !ring && !pinky)    return '☝️  POINTAGE';
    if (index && middle && !ring && !pinky)     return '✌️  PEACE';
    if (thumb && !index && !middle && !ring && pinky) return '🤙  SHAKA';
    if (!index && !middle && !ring && !pinky)   return '👍  POUCE';
    return `${n} DOIGTS`;
  }
}

// Si le CTA a déjà été cliqué avant que ce script charge (rare)
if (window.__arReady) startAR();
