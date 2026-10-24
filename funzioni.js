/* =====================================================================
   funzioni.js — funzioni JavaScript condivise per tutte le pagine
   Si includono a fine <body>:  <script src="funzioni.js"></script>
   Tutte le componenti si attivano da sole al caricamento della pagina.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. FLIP CARD
   Ogni elemento .flip-card si gira con click, Invio o Spazio.
   Nessun id necessario: basta il markup (vedi stile.css).
   --------------------------------------------------------------------- */
function initFlipCards(root = document) {
  root.querySelectorAll('.flip-card').forEach(card => {
    if (card.dataset.ready) return;          // evita doppi listener
    card.dataset.ready = '1';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-pressed', 'false');

    const toggle = () => {
      const on = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', String(on));
    };
    card.addEventListener('click', e => {
      if (e.target.closest('a')) return;     // i link dentro la card restano cliccabili
      toggle();
    });
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

/* ---------------------------------------------------------------------
   2. SIMULAZIONE OVERFLOW (intero con segno a N bit, default 8)
   Markup:
   <div class="overflow-box" data-overflow-demo data-bits="8">
     <div>
       <div class="byte-display mono"></div>
       <div class="bits"></div>
     </div>
     <div>
       <button data-inc>a[0] += 1</button>
       <button class="secondary" data-reset>reset a 0</button>
       <div class="overflow-msg"></div>
     </div>
   </div>
   --------------------------------------------------------------------- */
function initOverflowDemos(root = document) {
  root.querySelectorAll('[data-overflow-demo]').forEach(box => {
    const nBits = parseInt(box.dataset.bits, 10) || 8;
    const min = -Math.pow(2, nBits - 1);
    const max = Math.pow(2, nBits - 1) - 1;
    const byteEl = box.querySelector('.byte-display');
    const bitsEl = box.querySelector('.bits');
    const msgEl  = box.querySelector('.overflow-msg');
    let val = 0;

    const toBits = v => (v < 0 ? v + Math.pow(2, nBits) : v).toString(2).padStart(nBits, '0');

    function render(overflowed) {
      byteEl.textContent = val;
      bitsEl.innerHTML = '';
      for (const b of toBits(val)) {
        const d = document.createElement('div');
        d.className = 'bit' + (b === '1' ? ' on' : '');
        d.textContent = b;
        bitsEl.appendChild(d);
      }
      byteEl.classList.remove('overflow');
      if (overflowed) {
        void byteEl.offsetWidth;             // riavvia l'animazione
        byteEl.classList.add('overflow');
        msgEl.textContent = `⚠ Overflow: da ${max} il bit più significativo diventa 1 → il valore "gira" a ${min}.`;
      }
    }

    box.querySelector('[data-inc]').addEventListener('click', () => {
      const overflowed = (val === max);
      val = overflowed ? min : val + 1;
      if (!overflowed) msgEl.textContent = '';
      render(overflowed);
    });
    box.querySelector('[data-reset]').addEventListener('click', () => {
      val = 0; msgEl.textContent = ''; render(false);
    });
    render(false);
  });
}

/* ---------------------------------------------------------------------
   3. QUIZ A RISPOSTA SINGOLA
   Markup:
   <div class="quiz-q" data-correct="b">
     <p class="qtext">Domanda?</p>
     <label><input type="radio" name="q1" value="a"> Opzione A</label>
     <label><input type="radio" name="q1" value="b"> Opzione B</label>
     <div class="quiz-feedback" data-ok="Esatto! …" data-ko="Non proprio: …"></div>
   </div>
   --------------------------------------------------------------------- */
function initQuizzes(root = document) {
  root.querySelectorAll('.quiz-q[data-correct]').forEach(q => {
    const fb = q.querySelector('.quiz-feedback');
    q.querySelectorAll('input[type=radio]').forEach(inp => {
      inp.addEventListener('change', () => {
        const ok = inp.value === q.dataset.correct;
        fb.className = 'quiz-feedback ' + (ok ? 'ok' : 'ko');
        fb.textContent = ok ? (fb.dataset.ok || 'Corretto!') : (fb.dataset.ko || 'Riprova.');
      });
    });
  });
}

/* ---------------------------------------------------------------------
   4. SIMULAZIONE "PROPAGAZIONE DELL'ERRORE"
   n radici quadrate successive di x, poi n elevamenti al quadrato.
   In matematica si torna a x; con i numeri a 64 bit (double) no.
   Markup: vedi sezione 4 di 01-IntroErrore.html (attributo data-propaga-demo).
   --------------------------------------------------------------------- */
function initPropagaDemos(root = document) {
  const NS = 'http://www.w3.org/2000/svg';
  const EPS2 = Math.pow(2, -53);             // sotto questa distanza 1+δ viene letto come 1
  const N_MAX = 60;

  root.querySelectorAll('[data-propaga-demo]').forEach(box => {
    const $ = s => box.querySelector(s);
    const inX = $('[data-x]'), inN = $('[data-n]'), lblN = $('[data-nlabel]');
    const btnPlay = $('[data-play]'), btnStep = $('[data-step]'), btnReset = $('[data-reset]');
    const selSpeed = $('[data-speed]');
    const svg1 = $('[data-chart-delta]'), svg2 = $('[data-chart-err]');
    const outPhase = $('[data-out="phase"]'), outVal = $('[data-out="value"]');
    const outDist = $('[data-out="dist"]'),   outErr = $('[data-out="err"]');
    const msg = $('[data-msg]');

    let x = 100, n = 30, k = 0, vals = [], errs = [], timer = null;

    /* ---- calcolo ---- */
    function run(x0, m) {
      const v = [x0]; let t = x0;
      for (let i = 0; i < m; i++) { t = Math.sqrt(t); v.push(t); }
      for (let i = 0; i < m; i++) { t = t * t;        v.push(t); }
      return v;
    }
    const fmt = v => { const s = String(v); return (Number.isInteger(v) && !/e/.test(s)) ? s + '.0' : s; };
    const sci = v => v === 0 ? '0' : v.toExponential(2);

    /* ---- utilità SVG ---- */
    function add(parent, tag, attrs, text) {
      const e = document.createElementNS(NS, tag);
      for (const a in attrs) e.setAttribute(a, attrs[a]);
      if (text !== undefined) e.textContent = text;
      parent.appendChild(e);
      return e;
    }
    const tickLabel = e => e === 0 ? '1' : '1e' + e;

    /* ---- grafico 1: quanto manca a 1 dopo ogni passo ---- */
    function drawDelta() {
      svg1.innerHTML = '';
      const W = 560, H = 300, L = 52, R = 14, T = 24, B = 30;
      svg1.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const ymin = -18, ymax = Math.ceil(Math.log10(x - 1));
      const X = i => L + i / (2 * n) * (W - L - R);
      const Y = l => T + (ymax - l) / (ymax - ymin) * (H - T - B);

      for (let e = Math.ceil(ymin / 4) * 4; e <= ymax; e += 4) {
        add(svg1, 'line', { x1: L, x2: W - R, y1: Y(e), y2: Y(e), class: 'c-grid' });
        add(svg1, 'text', { x: L - 6, y: Y(e) + 4, 'text-anchor': 'end', class: 'c-text' }, tickLabel(e));
      }
      // soglia di macchina
      const yF = Y(Math.log10(EPS2));
      add(svg1, 'line', { x1: L, x2: W - R, y1: yF, y2: yF, class: 'c-floor' });
      add(svg1, 'text', { x: W - R, y: yF - 5, 'text-anchor': 'end', class: 'c-text c-floor-t' },
          'soglia: 1+δ = 1');
      // separatore radici | quadrati
      add(svg1, 'line', { x1: X(n), x2: X(n), y1: T, y2: H - B, class: 'c-div' });
      add(svg1, 'text', { x: X(n) - 8, y: T + 10, 'text-anchor': 'end',   class: 'c-text c-down-t' }, '√  ↓');
      add(svg1, 'text', { x: X(n) + 8, y: T + 10, 'text-anchor': 'start', class: 'c-text c-up-t' },   '²  ↑');
      // asse passi
      [[0, '0'], [n, String(n)], [2 * n, String(2 * n)]].forEach(([i, t]) =>
        add(svg1, 'text', { x: X(i), y: H - 10, 'text-anchor': 'middle', class: 'c-text' }, t));

      // percorso ideale (matematica esatta)
      const ideal = [];
      for (let i = 0; i <= 2 * n; i++) {
        const j = i <= n ? i : 2 * n - i;
        const d = Math.expm1(Math.log(x) / Math.pow(2, j));
        ideal.push(`${X(i)},${Y(Math.max(Math.log10(d), ymin))}`);
      }
      add(svg1, 'polyline', { points: ideal.join(' '), class: 'c-ideal' });

      // percorso reale del computer, fino al passo k
      const P = i => `${X(i)},${Y(vals[i] === 1 ? ymin : Math.log10(vals[i] - 1))}`;
      const down = [], up = [];
      for (let i = 0; i <= Math.min(k, n); i++) down.push(P(i));
      for (let i = n; i <= k; i++) up.push(P(i));
      if (down.length > 1) add(svg1, 'polyline', { points: down.join(' '), class: 'c-down' });
      if (up.length > 1)   add(svg1, 'polyline', { points: up.join(' '),   class: 'c-up' });
      for (let i = 0; i <= k; i++) {
        const [px, py] = P(i).split(',');
        add(svg1, 'circle', { cx: px, cy: py, r: 2.6, class: i <= n ? 'c-dot-down' : 'c-dot-up' });
      }
      const [cx, cy] = P(k).split(',');
      add(svg1, 'circle', { cx, cy, r: 6.5, class: 'c-now' + (vals[k] === 1 ? ' lost' : '') });
    }

    /* ---- grafico 2: errore finale in funzione di n ---- */
    function drawErr() {
      svg2.innerHTML = '';
      const W = 560, H = 230, L = 52, R = 14, T = 14, B = 30;
      svg2.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const ymin = -18, ymax = 0.5;
      const X = m => L + 12 + (m - 1) / (N_MAX - 1) * (W - L - R - 18);
      const Y = l => T + (ymax - l) / (ymax - ymin) * (H - T - B);
      const lv = m => errs[m] === 0 ? -17 : Math.log10(errs[m]);

      [-16, -12, -8, -4, 0].forEach(e => {
        add(svg2, 'line', { x1: L, x2: W - R, y1: Y(e), y2: Y(e), class: 'c-grid' });
        add(svg2, 'text', { x: L - 6, y: Y(e) + 4, 'text-anchor': 'end', class: 'c-text' }, tickLabel(e));
      });
      add(svg2, 'text', { x: L - 6, y: Y(-17) + 4, 'text-anchor': 'end', class: 'c-text c-ok-t' }, '0');
      [1, 10, 20, 30, 40, 50, 60].forEach(m =>
        add(svg2, 'text', { x: X(m), y: H - 10, 'text-anchor': 'middle', class: 'c-text' }, String(m)));

      const pts = []; for (let m = 1; m <= N_MAX; m++) pts.push(`${X(m)},${Y(lv(m))}`);
      add(svg2, 'polyline', { points: pts.join(' '), class: 'c-ideal' });
      for (let m = 1; m <= N_MAX; m++) {
        add(svg2, 'circle', { cx: X(m), cy: Y(lv(m)), r: 3.6, class: errs[m] === 0 ? 'c-zero' : 'c-err' });
      }
      add(svg2, 'circle', { cx: X(n), cy: Y(lv(n)), r: 9, class: 'c-ring' });

      svg2.onclick = ev => {
        const r = svg2.getBoundingClientRect();
        const px = (ev.clientX - r.left) / r.width * W;
        const m = Math.round((px - L - 12) / (W - L - R - 18) * (N_MAX - 1)) + 1;
        inN.value = Math.max(1, Math.min(N_MAX, m));
        setup();
      };
    }

    /* ---- pannelli di lettura ---- */
    function readouts() {
      const total = 2 * n, v = vals[k], lost = (v === 1);
      outPhase.textContent = k === 0 ? `pronto · 0/${total}`
        : k === total ? `✔ fine · ${k}/${total}`
        : (k <= n ? '↓ radici' : '↑ quadrati') + ` · ${k}/${total}`;
      outVal.textContent = fmt(v);
      outDist.textContent = lost ? '0  (valore = 1.0)' : sci(v - 1);
      outDist.parentNode.classList.toggle('bad', lost && k > 0);
      const err = Math.abs(vals[total] - x) / x;
      outErr.textContent = k === total ? sci(err) : '—';
      outErr.parentNode.classList.toggle('bad', k === total && err > 1e-9);
      outErr.parentNode.classList.toggle('good', k === total && err === 0);

      let t;
      if (k === 0) t = 'Premi Avvia: x viene radicato n volte e poi elevato al quadrato n volte. In teoria si torna a x.';
      else if (lost) t = '⚠ Il valore è diventato esattamente 1.0: l\'informazione su x è persa, i quadrati non possono più recuperarla.';
      else if (k === total) t = err === 0 ? 'Siamo tornati a x senza errore visibile.'
        : `Dovevamo tornare a ${fmt(x)}, invece abbiamo ${fmt(v)}.`;
      else if (k <= n) t = 'Ogni radice avvicina il valore a 1: la distanza da 1 si dimezza e le cifre significative si consumano.';
      else t = 'Ogni quadrato raddoppia la distanza da 1 — e anche l\'errore commesso in discesa.';
      msg.textContent = t;
    }

    function render() { drawDelta(); readouts(); }

    /* ---- controllo ---- */
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
      btnPlay.textContent = '▶ Avvia';
    }
    function step() {
      if (k < 2 * n) { k++; render(); }
      if (k >= 2 * n) stop();
    }
    function play() {
      if (k >= 2 * n) { k = 0; render(); }
      btnPlay.textContent = '⏸ Pausa';
      timer = setInterval(step, parseInt(selSpeed.value, 10));
    }
    function setup() {
      stop();
      let xv = parseFloat(inX.value);
      if (!isFinite(xv)) xv = 100;
      x = Math.min(1e9, Math.max(1.01, xv));
      inX.value = x;
      n = Math.max(1, Math.min(N_MAX, parseInt(inN.value, 10) || 30));
      lblN.textContent = n;
      vals = run(x, n);
      errs = [0];
      for (let m = 1; m <= N_MAX; m++) { const v = run(x, m); errs.push(Math.abs(v[2 * m] - x) / x); }
      k = 0;
      drawErr(); render();
    }

    inX.addEventListener('change', setup);
    inN.addEventListener('input', setup);
    btnPlay.addEventListener('click', () => timer ? stop() : play());
    btnStep.addEventListener('click', () => { stop(); step(); });
    btnReset.addEventListener('click', setup);
    selSpeed.addEventListener('change', () => { if (timer) { stop(); play(); } });
    box.querySelectorAll('[data-preset]').forEach(b =>
      b.addEventListener('click', () => { inN.value = b.dataset.preset; setup(); }));

    inX.value = box.dataset.x || 100;
    inN.value = box.dataset.n || 30;
    setup();
  });
}

/* ---------------------------------------------------------------------
   5. ZERI DI UNA FUNZIONE: BISEZIONE E NEWTON
   Markup: vedi 02-ZeriFunzione.html (attributo data-zeri-demo).
   Per aggiungere una funzione basta una riga in ZERI_FUNZIONI:
     fn = funzione, df = derivata, [a, b] = intervallo, x0 = partenza di Newton
     (default: punto medio), ylim = [ymin, ymax] (opzionale), hint = suggerimento.
   Con data-funzioni="f1,f4" sul contenitore si sceglie quali mostrare.
   --------------------------------------------------------------------- */
const ZERI_FUNZIONI = {
  f1: { label: 'f(x) = x² − 2', fn: x => x * x - 2, df: x => 2 * x, a: 1, b: 2,
        hint: 'Lo zero di f è √2 ≈ 1,41421.' },
  f2: { label: 'f(x) = x³ − x − 2', fn: x => x * x * x - x - 2, df: x => 3 * x * x - 1, a: 1, b: 2,
        hint: 'Equazione di terzo grado: la formula esiste, ma è complicata. Qui basta un metodo iterativo.' },
  f3: { label: 'f(x) = cos(x) − x', fn: x => Math.cos(x) - x, df: x => -Math.sin(x) - 1, a: 0, b: 1,
        hint: 'Nessuna formula algebrica risolve cos(x) = x: servono i metodi numerici.' },
  f4: { label: 'f(x) = 3ˣ + 3x − 5', fn: x => Math.pow(3, x) + 3 * x - 5, df: x => Math.log(3) * Math.pow(3, x) + 3, a: 0, b: 1,
        hint: 'Esponenziale + retta: nessuna formula risolutiva elementare. Per i metodi iterativi non è un problema.' },
  f5: { label: 'f(x) = x³ − 2x + 2', fn: x => x * x * x - 2 * x + 2, df: x => 3 * x * x - 2, a: -2, b: 1, x0: 0,
        hint: 'Prova Newton: parte da x₀ = 0 e… osserva cosa succede. Poi clicca sul grafico per partire da un altro punto.' },
  f6: { label: 'f(x) = 1/x', fn: x => 1 / x, df: x => -1 / (x * x), a: -1, b: 2, ylim: [-6, 6],
        hint: 'f cambia segno in [−1, 2], ma non è continua. Cosa trova la bisezione?' }
};

let _zeriCounter = 0;
function initZeriDemos(root = document) {
  root.querySelectorAll('[data-zeri-demo]').forEach(box => {
    const $ = s => box.querySelector(s);
    const select = $('[data-func]'), stepBtn = $('[data-step]'), autoBtn = $('[data-auto]'), resetBtn = $('[data-reset]');
    const canvas = $('[data-canvas]'), ctx = canvas.getContext('2d');
    const thead = $('thead'), tbody = $('tbody'), msg = $('[data-msg]');
    const hintEl = $('[data-hint]'), clickHint = $('[data-clickhint]');
    const radios = box.querySelectorAll('[data-method]');
    const id = ++_zeriCounter;
    radios.forEach(r => r.name = 'metodo' + id);

    const keys = (box.dataset.funzioni || Object.keys(ZERI_FUNZIONI).join(',')).split(',').map(s => s.trim());
    keys.forEach(k => select.add(new Option(`${ZERI_FUNZIONI[k].label}  ·  [${ZERI_FUNZIONI[k].a}, ${ZERI_FUNZIONI[k].b}]`, k)));

    const TOL = 1e-4, MAXIT = 20, MARGIN = 0.06;
    const SUBS = '₀₁₂₃₄₅₆₇₈₉';
    const sub = n => String(n).split('').map(d => SUBS[d]).join('');
    const method = () => [...radios].find(r => r.checked).value;
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function niceTicks(min, max, target) {
      const raw = (max - min) / target, mag = Math.pow(10, Math.floor(Math.log10(raw))), norm = raw / mag;
      const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag, out = [];
      for (let i = Math.ceil(min / step - 1e-9); i * step <= max + 1e-9; i++) out.push(+(i * step).toFixed(10));
      return { ticks: out, dec: Math.min(6, Math.max(0, -Math.floor(Math.log10(step) + 1e-9))) };
    }

    let state, view = null, customX0 = null, animToken = 0, autoToken = 0;

    function setMsg(text, fail) { msg.textContent = text; msg.className = 'converged' + (fail ? ' fail' : ''); }

    function reset(keepX0) {
      animToken++; autoToken++; autoBtn.textContent = '▶ Auto';
      if (!keepX0) customX0 = null;
      const def = ZERI_FUNZIONI[select.value], m = method();
      if (m === 'bisezione') {
        state = { def, method: m, a: def.a, b: def.b, iter: 0, done: false, m: null };
        thead.innerHTML = '<tr><th>#</th><th>a</th><th>b</th><th>m</th><th>f(m)</th><th>b−a</th></tr>';
      } else {
        const x0 = customX0 !== null ? customX0 : (def.x0 !== undefined ? def.x0 : (def.a + def.b) / 2);
        state = { def, method: m, x: x0, iter: 0, done: false, hist: [] };
        thead.innerHTML = "<tr><th>#</th><th>x</th><th>f(x)</th><th>f'(x)</th><th>x nuovo</th></tr>";
      }
      tbody.innerHTML = ''; setMsg('');
      hintEl.textContent = def.hint || '';
      clickHint.hidden = (m !== 'newton');
      canvas.style.cursor = m === 'newton' ? 'crosshair' : 'default';
      stepBtn.disabled = false;
      draw();
    }

    function draw(info, t) {
      const { def } = state;
      const w = Math.max(280, canvas.clientWidth || 900), h = Math.max(240, Math.round(w * 0.4));
      const dpr = window.devicePixelRatio || 1;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); canvas.style.height = h + 'px';
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const padL = 48, padR = 16, padT = 16, padB = 18;
      ctx.clearRect(0, 0, w, h);
      const span = def.b - def.a, x0 = def.a - MARGIN * span, x1 = def.b + MARGIN * span;
      const N = 240, ys = []; let yMin = Infinity, yMax = -Infinity;
      for (let i = 0; i <= N; i++) {
        const y = def.fn(x0 + (x1 - x0) * i / N); ys.push(y);
        if (isFinite(y)) { yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
      }
      if (def.ylim) { [yMin, yMax] = def.ylim; }
      else { const pad = (yMax - yMin) * 0.12 || 1; yMin -= pad; yMax += pad; }
      view = { x0, x1, padL, padR };
      const xToPx = x => padL + (x - x0) / (x1 - x0) * (w - padL - padR);
      const yToPx = y => padT + (1 - (y - yMin) / (yMax - yMin)) * (h - padT - padB);
      const axisY = Math.min(h - padB, Math.max(padT, yToPx(0)));

      function label(text, x, y, color, align) {
        ctx.save(); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = align || 'center';
        ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255,255,255,.92)';
        ctx.strokeText(text, x, y); ctx.fillStyle = color || '#4a5468'; ctx.fillText(text, x, y); ctx.restore();
      }
      const tx = niceTicks(x0, x1, w < 500 ? 5 : 8), ty = niceTicks(yMin, yMax, 5);
      ctx.lineWidth = 1; ctx.strokeStyle = '#eeebe1';
      tx.ticks.forEach(v => { const p = xToPx(v); ctx.beginPath(); ctx.moveTo(p, padT); ctx.lineTo(p, h - padB); ctx.stroke(); });
      ty.ticks.forEach(v => { const p = yToPx(v); ctx.beginPath(); ctx.moveTo(padL, p); ctx.lineTo(w - padR, p); ctx.stroke(); });

      ctx.strokeStyle = '#4a5468'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(padL, padT); ctx.lineTo(padL, h - padB); ctx.stroke();
      ty.ticks.forEach(v => { const p = yToPx(v); ctx.beginPath(); ctx.moveTo(padL - 4, p); ctx.lineTo(padL, p); ctx.stroke();
        label(v.toFixed(ty.dec), padL - 7, p + 4, '#4a5468', 'right'); });
      ctx.beginPath(); ctx.moveTo(padL, axisY); ctx.lineTo(w - padR, axisY); ctx.stroke();
      const below = axisY + 15 < h - 2;
      tx.ticks.forEach(v => { const p = xToPx(v); ctx.beginPath(); ctx.moveTo(p, axisY - 4); ctx.lineTo(p, axisY + 4); ctx.stroke();
        label(v.toFixed(tx.dec), p, below ? axisY + 16 : axisY - 8, '#4a5468'); });
      label('x', w - padR - 6, axisY - 8, '#4a5468', 'right');

      ctx.save();
      ctx.beginPath(); ctx.rect(padL, padT, w - padL - padR, h - padT - padB); ctx.clip();
      if (state.method === 'bisezione') {        // fascia dell'intervallo [a, b] corrente
        ctx.fillStyle = 'rgba(47,111,237,.09)';
        ctx.fillRect(xToPx(state.a), padT, xToPx(state.b) - xToPx(state.a), h - padT - padB);
      }
      // curva (interrotta dove la funzione "salta")
      ctx.strokeStyle = '#15213b'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.beginPath();
      let pen = false;
      for (let i = 0; i <= N; i++) {
        const y = ys[i];
        if (!isFinite(y)) { pen = false; continue; }
        const px = xToPx(x0 + (x1 - x0) * i / N), py = yToPx(y);
        if (pen && Math.abs(y - ys[i - 1]) > (yMax - yMin)) pen = false;
        if (pen) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        pen = true;
      }
      ctx.stroke();

      const dot = (x, y, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(xToPx(x), yToPx(y), 5, 0, 7); ctx.fill(); };
      const seg = (xa, ya, xb, yb, c, lw, dash) => {
        ctx.strokeStyle = c; ctx.lineWidth = lw; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(xToPx(xa), yToPx(ya)); ctx.lineTo(xToPx(xb), yToPx(yb)); ctx.stroke(); ctx.setLineDash([]);
      };

      if (state.method === 'bisezione') {
        [[state.a, '#2f6fed', 'a'], [state.b, '#c4432c', 'b'], [state.m, '#d98c1f', 'm']].forEach(([x, c, l]) => {
          if (x === null) return;
          dot(x, def.fn(x), c); label(l, xToPx(x), yToPx(def.fn(x)) - 10, '#15213b');
        });
        ctx.restore(); return;
      }

      const hist = state.hist;
      hist.forEach((hh, k) => {
        const last = (k === hist.length - 1) && !info;
        seg(hh.x, 0, hh.x, hh.fx, 'rgba(47,111,237,.35)', 1, [4, 3]);
        seg(x0, hh.fx + hh.dfx * (x0 - hh.x), x1, hh.fx + hh.dfx * (x1 - hh.x), last ? '#d98c1f' : 'rgba(217,140,31,.35)', last ? 2 : 1.3);
        if (last) dot(hh.xNew, 0, '#d98c1f');
      });
      const cx = state.x, cy = def.fn(cx);
      seg(cx, 0, cx, cy, 'rgba(47,111,237,.7)', 1.3, [4, 3]);
      if (info) {
        const tA = Math.min(1, t / 0.6), tB = Math.max(0, (t - 0.6) / 0.4);
        const L = (info.x - x0) * tA, R = (x1 - info.x) * tA;
        seg(info.x - L, info.fx - info.dfx * L, info.x + R, info.fx + info.dfx * R, '#d98c1f', 2.2);
        if (tA >= 1) {
          dot(info.xNew, 0, '#d98c1f');
          seg(info.xNew, 0, info.xNew, info.fNew * tB, 'rgba(47,111,237,.7)', 1.3, [4, 3]);
          if (tB >= 1) dot(info.xNew, info.fNew, '#2f6fed');
        }
      }
      dot(cx, cy, '#2f6fed');
      ctx.restore();

      const pts = hist.map(hh => hh.x).concat([state.x]), drawn = [];
      for (let k = pts.length - 1; k >= 0; k--) {
        const px = xToPx(pts[k]);
        if (drawn.some(q => Math.abs(q - px) < 22)) continue;
        label('x' + sub(k), px + 2, yToPx(def.fn(pts[k])) - 12, '#2f6fed'); drawn.push(px);
      }
    }

    function addRow(cells) {
      const row = document.createElement('tr');
      row.innerHTML = cells.map(c => `<td>${c}</td>`).join('');
      tbody.appendChild(row);
      tbody.parentNode.parentNode.scrollTop = 1e6;
    }

    function stepBisection() {
      const { def } = state; let { a, b } = state;
      const m = (a + b) / 2, fm = def.fn(m);
      state.iter++;
      addRow([state.iter, a.toFixed(6), b.toFixed(6), m.toFixed(6), fm.toFixed(6), (b - a).toFixed(6)]);
      if (Math.abs(fm) < 1e-9 || (b - a) < TOL || state.iter >= MAXIT) {
        state.done = true; state.m = m; stepBtn.disabled = true;
        if (Math.abs(fm) > 1e-2) setMsg(`⚠ L'intervallo è minuscolo ma f(m) = ${fm.toFixed(2)} è lontano da 0: qui non c'è nessuno zero! (f non è continua in [a, b])`, true);
        else setMsg(`✓ Convergenza raggiunta in ${state.iter} passi — zero stimato in x ≈ ${m.toFixed(6)}`);
      } else {
        if (def.fn(a) * fm < 0) b = m; else a = m;
        state.a = a; state.b = b; state.m = m;
      }
      draw();
      return Promise.resolve();
    }

    function stepNewton() {
      return new Promise(resolve => {
        const { def } = state, x = state.x, fx = def.fn(x), dfx = def.df(x);
        const stop = (text, fail) => { state.done = true; stepBtn.disabled = true; setMsg(text, fail); draw(); resolve(); };
        if (dfx === 0) return stop('⚠ Tangente orizzontale: il metodo non può proseguire da qui.', true);
        const xNew = x - fx / dfx;
        if (!isFinite(xNew)) return stop('⚠ Il metodo è uscito dal dominio della funzione.', true);
        const info = { x, fx, dfx, xNew, fNew: def.fn(xNew) };
        const token = ++animToken, DUR = 1300, start = performance.now();
        stepBtn.disabled = true;
        function frame(now) {
          if (token !== animToken) { resolve(); return; }
          const t = Math.min(1, (now - start) / DUR);
          draw(info, t);
          if (t < 1) { requestAnimationFrame(frame); return; }
          state.hist.push(info); state.x = xNew; state.iter++;
          addRow([state.iter, x.toFixed(6), fx.toFixed(6), dfx.toFixed(6), xNew.toFixed(6)]);
          if (Math.abs(info.fNew) < 1e-9) {
            state.done = true; setMsg(`✓ Convergenza raggiunta in ${state.iter} passi — zero stimato in x ≈ ${xNew.toFixed(6)}`);
          } else if (state.iter >= MAXIT) {
            state.done = true; setMsg(`✗ Dopo ${MAXIT} passi non si è raggiunto nessuno zero: da questo punto di partenza Newton non converge. Prova un altro x₀!`, true);
          }
          stepBtn.disabled = state.done; draw(); resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    const step = () => state.done ? Promise.resolve() : (state.method === 'bisezione' ? stepBisection() : stepNewton());

    async function runAuto() {
      const my = ++autoToken; autoBtn.textContent = '⏸ Pausa';
      while (!state.done && my === autoToken) {
        await step();
        if (my !== autoToken) return;
        await sleep(state.method === 'bisezione' ? 550 : 300);
      }
      if (my === autoToken) autoBtn.textContent = '▶ Auto';
    }

    select.addEventListener('change', () => reset(false));
    radios.forEach(r => r.addEventListener('change', () => reset(true)));
    stepBtn.addEventListener('click', () => { autoToken++; autoBtn.textContent = '▶ Auto'; step(); });
    autoBtn.addEventListener('click', () => {
      if (autoBtn.textContent.startsWith('⏸')) { autoToken++; autoBtn.textContent = '▶ Auto'; }
      else if (!state.done) runAuto();
    });
    resetBtn.addEventListener('click', () => reset(true));
    canvas.addEventListener('click', ev => {         // Newton: si sceglie x₀ cliccando sul grafico
      if (state.method !== 'newton' || !view) return;
      const r = canvas.getBoundingClientRect(), w = r.width;
      const x = view.x0 + (ev.clientX - r.left - view.padL) / (w - view.padL - view.padR) * (view.x1 - view.x0);
      const lo = state.def.a, hi = state.def.b;
      customX0 = Math.min(hi, Math.max(lo, x));
      reset(true);
    });
    window.addEventListener('resize', () => draw());
    reset(false);
  });
}

/* ---------------------------------------------------------------------
   Avvio automatico
   --------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initFlipCards();
  initOverflowDemos();
  initQuizzes();
  initPropagaDemos();
  initZeriDemos();
});
