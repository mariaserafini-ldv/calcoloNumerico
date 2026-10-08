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
   Avvio automatico
   --------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initFlipCards();
  initOverflowDemos();
  initQuizzes();
  initPropagaDemos();
});
