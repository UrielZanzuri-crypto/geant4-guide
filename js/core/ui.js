/* PHY.ui: shared components. Everything takes a host element and appends to it.
   Slider, Toggle, Choice, Button, Readouts, StarScore, PredictCard, Quiz, StepSolution, Problem, GameHud,
   renderMath, burst, h, topbar, footer, seriesList, chapterNav, themeButton, initChapter.
   Feedback after a guess or an answer goes through PHY.coach.say. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});

  /* Tiny element builder. attrs: class, html, text, on<event>, or anything for setAttribute. */
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (children || []).forEach(function (c) {
      if (c) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }

  /* A Latin "number unit" pair inside Hebrew text ("800 nm", "2×10⁸ m/s") is reordered by the bidi
     algorithm into "nm 800". isolateNumbers wraps every such pair, and an inline formula followed by a
     unit ("\(t = 30\) fs"), in <span class="num">, an LTR isolate. renderMath runs it, so prose in the
     chapter and everything the components add is covered. Text set with textContent uses F.unit instead. */
  /* A minus is U+2212, or "-" that does not follow a Hebrew letter (in "ב-800 nm" it is a maqaf). */
  const NUM_UNIT = /(?:\u2212|(?<![\u0590-\u05FF])-)?\d[\d,]*(?:\.\d+)?(?:\s?[×·]\s?10[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+|[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]+)?[ \u00A0][A-Za-zµÅ][A-Za-z0-9µ/²³⁴⁻¹·]*(?![A-Za-z0-9])/g;
  const UNIT_AFTER = /^[ \u00A0][A-Za-zµÅ][A-Za-z0-9µ/²³⁴⁻¹·]*(?![A-Za-z0-9])/;
  function isolateNumbers(root) {
    root = root || document.body;
    if (!root || !document.createTreeWalker) return;
    const skip = '.katex, .num, script, style, textarea, code, pre, svg, [data-no-iso]';
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n) {
        const p = n.parentElement;
        if (!p || p.closest(skip)) return NodeFilter.FILTER_REJECT;
        const v = n.nodeValue;
        return /[\d⁰¹²³⁴⁵⁶⁷⁸⁹][ \u00A0][A-Za-zµÅ]/.test(v) && !/[\u2066\u2067]/.test(v) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function (n) {
      const s = n.nodeValue;
      const frag = document.createDocumentFragment();
      let m, last = 0;
      NUM_UNIT.lastIndex = 0;
      while ((m = NUM_UNIT.exec(s))) {
        if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
        frag.appendChild(h('span', { class: 'num', text: m[0] }));
        last = m.index + m[0].length;
      }
      if (!last) return;
      if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
      n.parentNode.replaceChild(frag, n);
    });
    (root.querySelectorAll ? root.querySelectorAll('.katex') : []).forEach(function (k) {
      if (k.closest('.katex-display') || (k.parentElement && k.parentElement.closest('.num'))) return;
      /* auto-render puts each formula inside a bare <span>, so the unit text follows that wrapper,
         not .katex itself. Climb through single-child bare wrappers to the node the text follows. */
      let node = k;
      while (!node.nextSibling && node.parentElement && node.parentElement.tagName === 'SPAN' &&
             !node.parentElement.className && node.parentElement.childNodes.length === 1) node = node.parentElement;
      const t = node.nextSibling;
      if (!t || t.nodeType !== 3) return;
      const m = UNIT_AFTER.exec(t.nodeValue);
      if (!m) return;
      const span = h('span', { class: 'num num-k' });   /* num-k: the line may still break before the unit */
      node.parentNode.insertBefore(span, node);
      span.appendChild(node);
      span.appendChild(document.createTextNode(m[0]));
      t.nodeValue = t.nodeValue.slice(m[0].length);
    });
  }

  /* KaTeX: \( inline \) and \[ display \] in any element. Each result gets dir="ltr".
     If the CDN is unreachable the raw TeX is shown as code, so the page stays readable.
     Then isolateNumbers(root). */
  function renderMath(root) {
    root = root || document.body;
    if (window.renderMathInElement) {
      window.renderMathInElement(root, {
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
      root.querySelectorAll('.katex, .katex-display').forEach(function (k) { k.setAttribute('dir', 'ltr'); });
    } else {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) if (/\\[(\[]/.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        const span = document.createElement('span');
        span.innerHTML = n.nodeValue
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/\\[(\[]([\s\S]*?)\\[)\]]/g, '<code class="tex-fallback" dir="ltr">$1</code>');
        n.parentNode.replaceChild(span, n);
      });
    }
    isolateNumbers(root);
  }

  function reduced() {
    return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Decorative confetti from an element's center. */
  function burst(el, n) {
    if (reduced() || !el || !el.getBoundingClientRect) return;
    const r = el.getBoundingClientRect();
    const colors = ['--c-gamma', '--accent', '--c-electron', '--c-neutron', '--c-volume', '--good'];
    for (let i = 0; i < (n || 22); i++) {
      const d = document.createElement('i');
      d.className = 'burst-dot';
      d.setAttribute('aria-hidden', 'true');
      const a = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 110;
      d.style.left = r.left + r.width / 2 + 'px';
      d.style.top = r.top + r.height / 2 + 'px';
      d.style.background = 'var(' + colors[i % colors.length] + ')';
      d.style.setProperty('--dx', Math.cos(a) * dist + 'px');
      d.style.setProperty('--dy', Math.sin(a) * dist + 'px');
      document.body.appendChild(d);
      setTimeout(function () { d.remove(); }, 850);
    }
  }

  /* ---------- Button / Toggle ---------- */
  function Button(host, text, onClick, o) {
    o = o || {};
    const b = h('button', { type: 'button', class: 'btn ' + (o.primary ? 'btn-primary ' : '') + (o.ghost ? 'btn-ghost ' : '') + (o.class || ''), text: text, onclick: onClick });
    if (o.disabled) b.disabled = true;
    if (host) host.appendChild(b);
    return b;
  }

  function Toggle(host, label, o) {
    o = o || {};
    const input = h('input', { type: 'checkbox' });
    input.checked = !!o.value;
    input.addEventListener('change', function () { if (o.onChange) o.onChange(input.checked); });
    const el = h('label', { class: 'toggle' }, [input, h('span', { text: label })]);
    if (host) host.appendChild(el);
    return { el, input, get value() { return input.checked; }, set(v) { input.checked = !!v; } };
  }

  /* ---------- Slider ---------- */
  let sliderId = 0;
  /* Native range input: keyboard and touch work out of the box.
     o: {label, min, max, step, value, unit, digits, format(v), color (CSS color, e.g. 'var(--c-neutron)'), onInput(v), onCommit(v)}
     unit is a PHY.fmt unit key ('nm', 'fs', 'um-1') or any string. label may hold \( TeX \).
     The track is LTR on purpose: more is always to the right, same as the x axis in the sims. */
  function Slider(host, o) {
    const id = 'phy-slider-' + ++sliderId;
    const input = h('input', { type: 'range', id: id, min: o.min, max: o.max, step: o.step || 1, dir: 'ltr' });
    const out = h('output', { for: id });
    const el = h('div', { class: 'slider' }, [h('label', { for: id, html: o.label }), out, input]);
    if (o.color) el.style.setProperty('--slider-color', o.color);
    const show = function () {
      const v = +input.value;
      out.textContent = o.format ? o.format(v) : PHY.fmt.unit(v, o.unit || '', o.digits === undefined ? 1 : o.digits);
      const f = ((v - +input.min) / (+input.max - +input.min)) * 100;
      input.style.setProperty('--fill', f + '%');
      input.setAttribute('aria-valuetext', out.textContent);
    };
    input.value = o.value;
    show();
    input.addEventListener('input', function () { show(); if (o.onInput) o.onInput(+input.value); });
    input.addEventListener('change', function () { if (o.onCommit) o.onCommit(+input.value); });
    if (host) host.appendChild(el);
    return {
      el, input,
      get value() { return +input.value; },
      /* Sets the value without firing onInput, so sims can sync sliders without feedback loops. */
      set(v) { input.value = v; show(); },
      setRange(min, max) { input.min = min; input.max = max; show(); },
      setEnabled(on) { input.disabled = !on; },
    };
  }

  /* ---------- Readouts ---------- */
  /* items: [{key, label, color}] where color is a CSS color such as var(--c-neutron). label may hold HTML. */
  function Readouts(host, items) {
    const el = h('div', { class: 'readouts' });
    const vals = {};
    items.forEach(function (it) {
      const v = h('span', { class: 'r-value', text: it.value || '–' });
      const box = h('div', { class: 'readout' }, [h('span', { class: 'r-label', html: it.label }), v]);
      if (it.color) box.style.setProperty('--r-color', it.color);
      vals[it.key] = v;
      el.appendChild(box);
    });
    if (host) host.appendChild(el);
    return { el, set(k, t) { if (vals[k] && vals[k].textContent !== t) vals[k].textContent = t; } };
  }

  /* ---------- StarScore ---------- */
  const STAR_PATH = 'M12 2.4l2.95 6.3 6.9.85-5.1 4.72 1.35 6.83L12 17.2l-6.1 3.9 1.35-6.83-5.1-4.72 6.9-.85z';
  function StarScore(host, o) {
    o = o || {};
    const max = o.max || 3;
    const el = h('span', { class: 'stars', role: 'img' });
    if (o.size) el.style.setProperty('--star-size', o.size + 'px');
    const stars = [];
    for (let i = 0; i < max; i++) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('viewBox', '0 0 24 24');
      s.setAttribute('class', 'star');
      s.innerHTML = '<path d="' + STAR_PATH + '"/>';
      el.appendChild(s);
      stars.push(s);
    }
    function set(n, animate) {
      el.setAttribute('aria-label', n + ' מתוך ' + max + ' כוכבים');
      stars.forEach(function (s, i) {
        s.classList.toggle('is-on', i < n);
        s.classList.remove('is-pop');
        if (animate && i < n) {
          s.style.animationDelay = i * 0.14 + 's';
          void s.getBoundingClientRect();
          s.classList.add('is-pop');
        }
      });
    }
    set(o.value || 0, !!o.animate);
    if (host) host.appendChild(el);
    return { el, set };
  }

  /* ---------- PredictCard ---------- */
  /* The host's existing children (normally a <figure class="sim">) become the stage between the
     options and the explanation, so the animation is always right under the "run" button.

     o: {
       chapter, id, section,        // progress bookkeeping
       question, options: [{text, correct, why}],   // text, why and question may hold HTML and \( TeX \)
       runLabel, againLabel,
       onRun(index, option) -> Promise or undefined  // plays the animation; the reveal waits for it
       explanation,                 // HTML, shown after the run
       sayRight, sayWrong,          // what the coach says (short, first person plural)
       onDone(correct, index)
     } */
  function PredictCard(host, o) {
    const stage = h('div', { class: 'predict-stage' });
    while (host.firstChild) stage.appendChild(host.firstChild);
    const tag = h('div', { class: 'predict-tag', text: o.tag || 'קודם ניחוש' });
    const q = h('div', { class: 'predict-q', html: o.question });
    const list = h('div', { class: 'predict-options', role: 'radiogroup', 'aria-label': 'אפשרויות' });
    const run = h('button', { type: 'button', class: 'btn btn-primary', text: o.runLabel || 'להריץ', disabled: true });
    const hint = h('span', { class: 'muted small', text: 'קודם ניחוש. ככה זה נשאר בראש.' });
    const row = h('div', { class: 'btn-row' }, [run, hint]);
    const verdict = h('div', { class: 'predict-verdict' });
    const why = h('div', { class: 'predict-why' });
    const resultIn = h('div', { class: 'predict-result-in' }, [verdict, why]);
    const result = h('div', { class: 'predict-result' }, [resultIn]);
    host.classList.add('predict');
    host._phyCardId = o.id;
    [tag, q, list, row, stage, result].forEach(function (n) { host.appendChild(n); });

    let choice = -1;
    let running = false;
    let finished = false;

    const buttons = o.options.map(function (opt, i) {
      const mark = h('span', { class: 'opt-mark', 'aria-hidden': 'true' });
      const b = h('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false' }, [mark, h('span', { html: opt.text })]);
      b.addEventListener('click', function () { pick(i); });
      list.appendChild(b);
      return b;
    });

    function pick(i) {
      if (running || finished) return;
      choice = i;
      buttons.forEach(function (b, j) {
        b.classList.toggle('is-selected', j === i);
        b.setAttribute('aria-checked', j === i ? 'true' : 'false');
      });
      run.disabled = false;
      run.classList.add('is-ready');
      hint.textContent = '';
    }

    function bringStageIntoView() {
      const target = stage.firstElementChild;
      if (!target) return;
      const r = target.getBoundingClientRect();
      if (r.top < 60 || r.bottom > window.innerHeight - 10) {
        target.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
      }
    }

    function playAnimation() {
      running = true;
      run.disabled = true;
      run.classList.remove('is-ready');
      run.textContent = 'רץ...';
      buttons.forEach(function (b) { b.disabled = true; });
      bringStageIntoView();
      let p;
      try { p = o.onRun ? o.onRun(choice, o.options[choice]) : null; } catch (e) { console.error(e); }
      return Promise.resolve(p).catch(function (e) { console.error(e); });
    }

    run.addEventListener('click', function () {
      if (running) return;
      playAnimation().then(function () {
        running = false;
        if (!finished) reveal();
        run.disabled = false;
        run.textContent = o.againLabel || 'עוד פעם';
      });
    });

    function reveal() {
      finished = true;
      const opt = o.options[choice];
      const right = !!opt.correct;
      buttons.forEach(function (b, j) {
        const oj = o.options[j];
        b.querySelector('.opt-mark').textContent = oj.correct ? '✓' : j === choice ? '✗' : '';
        b.classList.toggle('is-correct', !!oj.correct);
        b.classList.toggle('is-wrong', j === choice && !oj.correct);
        b.classList.toggle('is-dim', j !== choice && !oj.correct);
      });
      verdict.textContent = right ? 'ניחוש נכון.' : 'לא הפעם. ודווקא בגלל זה, עכשיו זה לא יישכח.';
      verdict.className = 'predict-verdict ' + (right ? 'good' : 'bad');
      why.innerHTML = opt.why ? '<p>' + opt.why + '</p>' : '';
      if (o.steps) StepSolution(why, { steps: o.steps, open: true });
      if (o.explanation) why.appendChild(h('div', { class: 'predict-after', html: o.explanation }));
      renderMath(why);
      result.classList.add('is-open');
      releaseHeld(host);
      if (o.chapter) {
        PHY.progress.recordPrediction(o.chapter, o.id, choice, right);
        if (o.section) PHY.progress.markSection(o.chapter, o.section);
      }
      if (PHY.coach) {
        if (right) PHY.coach.say(o.sayRight || 'ניחוש נכון. עכשיו נראה גם למה.', 'right');
        else PHY.coach.say(o.sayWrong || 'גם רוב הפיזיקאים ניחשו ככה בפעם הראשונה. הפתרון מחכה למטה.', 'wrong');
      }
      if (right) burst(buttons[choice], 16);
      if (o.onDone) o.onDone(right, choice);
    }

    renderMath(q);
    renderMath(list);
    return { el: host, stage, get finished() { return finished; } };
  }

  /* ---------- StepSolution ---------- */
  /* A ladder for a full worked solution. Each step shows a hint first, and its work only after a click.
     o: {steps: [{hint, work, label}], open, startLabel, onDone}. The last step must state the final answer.
     open: show the first hint right away. Otherwise a start button waits, so an exercise stays unspoiled. */
  function StepSolution(host, o) {
    const steps = o.steps;
    const total = steps.length;
    const box = h('div', { class: 'solution' });
    const list = h('div', { class: 'steps', 'aria-live': 'polite' });
    const hintLabel = h('span', { class: 'step-label' });
    const hintText = h('div', { class: 'step-hint' });
    const nextRow = h('div', { class: 'btn-row' });
    const prompt = h('div', { class: 'step-next' }, [hintLabel, hintText, nextRow]);
    let shown = 0;
    let startBtn = null;
    const revealBtn = Button(nextRow, '', showNext, { primary: true });

    function paintPrompt() {
      hintLabel.textContent = 'רמז לשלב ' + (shown + 1) + ' מתוך ' + total;
      hintText.innerHTML = steps[shown].hint;
      renderMath(hintText);
      revealBtn.textContent = shown === total - 1 ? 'לחשוף את השלב האחרון' : 'לחשוף את שלב ' + (shown + 1);
    }

    function open() {
      if (startBtn) { startBtn.parentNode.remove(); startBtn = null; }
      if (prompt.parentNode || shown >= total) return;
      box.appendChild(h('div', { class: 'solution-title', text: 'הפתרון, שלב אחר שלב' }));
      box.appendChild(list);
      box.appendChild(prompt);
      paintPrompt();
    }

    function showNext() {
      if (shown >= total) return;
      const s = steps[shown];
      const node = h('div', { class: 'step', tabindex: '-1' }, [
        h('span', { class: 'step-label', text: s.label || 'שלב ' + (shown + 1) + ' מתוך ' + total }),
        h('div', { class: 'step-q', html: s.hint }),
        h('div', { class: 'step-work', html: s.work }),
      ]);
      list.appendChild(node);
      renderMath(node);
      shown++;
      const behavior = reduced() ? 'auto' : 'smooth';
      if (shown < total) {
        paintPrompt();
        prompt.scrollIntoView({ block: 'nearest', behavior });
      } else {
        prompt.remove();
        node.focus({ preventScroll: true });
        node.scrollIntoView({ block: 'nearest', behavior });
        if (o.onDone) o.onDone();
      }
    }

    host.appendChild(box);
    if (o.open) open();
    else {
      const startRow = h('div', { class: 'btn-row' });
      box.appendChild(startRow);
      startBtn = Button(startRow, o.startLabel || 'לפתרון בשלבים, עם רמז לפני כל שלב', open, { ghost: true });
    }
    return { el: box, open, showNext };
  }

  /* ---------- Numeric checking ---------- */
  /* Default tolerance is ±3% of the answer. An answer of 0 uses an absolute tolerance (abs, default 0.05).
     Scientific input ("3e8", "3×10^8") is accepted. */
  function numClose(input, answer, tol, abs) {
    const v = PHY.fmt.parse(input);
    if (isNaN(v)) return false;
    const t = tol === undefined ? 0.03 : tol;
    const margin = answer === 0 ? (abs === undefined ? 0.05 : abs) : Math.max(Math.abs(answer) * t, abs || 0);
    return Math.abs(v - answer) <= margin * (1 + 1e-9);
  }

  function numField(id, label, unit) {
    const aria = label ? String(label).replace(/<[^>]+>/g, '').replace(/\\[()]/g, '') : 'תשובה';
    const input = h('input', { class: 'num-input', id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off', dir: 'ltr', placeholder: '?', 'aria-label': aria });
    const name = unit ? PHY.fmt.unitName(unit) : '';
    return {
      input,
      el: h('div', { class: 'num-field' }, [label ? h('label', { for: id, html: label }) : null, input, name ? h('span', { class: 'num-unit', html: name }) : null]),
    };
  }

  /* ---------- Problem: exam-style exercise with answer checking and graded hints ---------- */
  /* o: {chapter, section, id, tag, text, fields: [{label, answer, unit, tol, abs}], steps: [...], onSolved}
     Answers are plain decimals in the field's unit: use prefixed units (THz, fs, µm⁻¹) or a unit such as
     "×10⁸ m/s", so the number typed is short. */
  let fieldId = 0;
  function Problem(host, o) {
    const box = h('div', { class: 'problem' });
    if (o.tag) box.appendChild(h('div', { class: 'problem-tag', text: o.tag }));
    box.appendChild(h('div', { class: 'problem-text', html: o.text }));
    const fieldsBox = h('div', { class: 'problem-fields' });
    const fields = o.fields.map(function (f) {
      const nf = numField('phy-f-' + ++fieldId, f.label, f.unit);
      fieldsBox.appendChild(nf.el);
      nf.input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
      return Object.assign({}, f, { input: nf.input });
    });
    box.appendChild(fieldsBox);
    const row = h('div', { class: 'btn-row' });
    Button(row, 'בדיקה', check, { primary: true });
    box.appendChild(row);
    const fb = h('div', { class: 'problem-feedback', role: 'status' });
    box.appendChild(fb);
    host.appendChild(box);

    function check() {
      let ok = 0, empty = 0;
      fields.forEach(function (f) {
        const raw = f.input.value.trim();
        if (!raw) { empty++; f.input.classList.remove('is-right', 'is-off'); return; }
        const good = numClose(raw, f.answer, f.tol, f.abs);
        f.input.classList.toggle('is-right', good);
        f.input.classList.toggle('is-off', !good);
        if (good) ok++;
      });
      if (ok === fields.length) {
        fb.textContent = 'בדיוק. כך זה נראה בשיעורי הבית.';
        fb.className = 'problem-feedback good';
        burst(fb, 18);
        if (PHY.coach) PHY.coach.say('תשובה נכונה, עם יחידות. ככה בודקים גם במעבדה.', 'right');
        finish();
      } else if (empty === fields.length) {
        fb.textContent = 'קודם צריך מספר. מותר לטעות, בשביל זה יש בדיקה.';
        fb.className = 'problem-feedback bad';
      } else {
        fb.textContent = 'עוד לא. כדאי לבדוק סימנים ויחידות, או לעבור לפתרון בשלבים.';
        fb.className = 'problem-feedback bad';
      }
    }

    function finish() {
      if (o.chapter && o.section) PHY.progress.markSection(o.chapter, o.section);
      if (o.onSolved) o.onSolved();
    }

    StepSolution(box, { steps: o.steps, onDone: finish });
    renderMath(box);
    return { el: box };
  }

  /* ---------- Quiz ---------- */
  /* questions: {type: 'mc', q, options: [...], answer: index, steps: [{hint, work}]}
                {type: 'num', q, answer, unit, tol, abs, steps: [{hint, work}]}
     unit: a PHY.fmt unit key or any string. A review question from an earlier chapter starts its q with
     <span class="chip">חזרה מפרק N</span>.
     Each question is checked on its own, and its worked solution opens right there.
     After a wrong answer the right one stays hidden until the last step is revealed.
     Fraction correct maps to stars with PHY.progress.quizStars. The best score is saved. */
  function Quiz(host, o) {
    const root = h('div', { class: 'quiz' });
    host.appendChild(root);
    let items = [];
    let resultBox;

    function build() {
      root.innerHTML = '';
      items = o.questions.map(function (qd, i) {
        const box = h('div', { class: 'q' });
        box.appendChild(h('div', { class: 'q-head', html: '<span class="q-num">' + (i + 1) + '.</span>' + qd.q }));
        const item = { qd, box, choice: -1, done: false, good: false };
        const checkRow = h('div', { class: 'btn-row' });
        item.checkRow = checkRow;
        item.checkBtn = Button(checkRow, 'בדיקה', function () { checkItem(item); }, { primary: true, disabled: true });
        if (qd.type === 'num') {
          const nf = numField('phy-q-' + ++fieldId, '', qd.unit);
          item.input = nf.input;
          nf.input.addEventListener('input', function () { item.checkBtn.disabled = nf.input.value.trim() === ''; });
          nf.input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && nf.input.value.trim() !== '') checkItem(item);
          });
          box.appendChild(nf.el);
        } else {
          const list = h('div', { class: 'predict-options', role: 'radiogroup' });
          item.opts = qd.options.map(function (text, j) {
            const b = h('button', { type: 'button', class: 'opt', role: 'radio', 'aria-checked': 'false' }, [h('span', { class: 'opt-mark', 'aria-hidden': 'true' }), h('span', { html: text })]);
            b.addEventListener('click', function () {
              if (item.done) return;
              item.choice = j;
              item.opts.forEach(function (x, k) {
                x.classList.toggle('is-selected', k === j);
                x.setAttribute('aria-checked', k === j ? 'true' : 'false');
              });
              item.checkBtn.disabled = false;
            });
            list.appendChild(b);
            return b;
          });
          box.appendChild(list);
        }
        box.appendChild(checkRow);
        item.whyBox = h('div', { class: 'q-why', hidden: true });
        box.appendChild(item.whyBox);
        root.appendChild(box);
        return item;
      });
      resultBox = h('div', { role: 'status' });
      root.appendChild(resultBox);
      renderMath(root);
    }

    function showAnswer(it) {
      const qd = it.qd;
      if (qd.type === 'num') {
        it.whyBox.appendChild(h('div', { class: 'q-answer', text: 'התשובה: ' + PHY.fmt.auto(qd.answer, qd.unit || '', 3) }));
        return;
      }
      it.opts.forEach(function (b, j) {
        b.classList.toggle('is-correct', j === qd.answer);
        b.classList.toggle('is-dim', j !== it.choice && j !== qd.answer);
        if (j === qd.answer) b.querySelector('.opt-mark').textContent = '✓';
      });
    }

    function checkItem(it) {
      if (it.done) return;
      it.done = true;
      const qd = it.qd;
      it.checkRow.remove();
      if (qd.type === 'num') {
        it.good = numClose(it.input.value, qd.answer, qd.tol, qd.abs);
        it.input.classList.toggle('is-right', it.good);
        it.input.classList.toggle('is-off', !it.good);
        it.input.readOnly = true;
      } else {
        it.good = it.choice === qd.answer;
        it.opts.forEach(function (b, j) {
          b.disabled = true;
          b.classList.remove('is-selected');
          b.classList.toggle('is-correct', it.good && j === qd.answer);
          b.classList.toggle('is-wrong', j === it.choice && !it.good);
          b.classList.toggle('is-dim', it.good && j !== qd.answer);
          b.querySelector('.opt-mark').textContent = j === it.choice ? (it.good ? '✓' : '✗') : '';
        });
      }
      it.box.classList.add(it.good ? 'is-right' : 'is-off');
      it.whyBox.innerHTML = it.good
        ? '<span class="q-verdict good">נכון.</span>'
        : '<span class="q-verdict bad">לא מדויק.</span> התשובה תיחשף בשלב האחרון.';
      it.whyBox.hidden = false;
      StepSolution(it.whyBox, {
        steps: qd.steps,
        open: !it.good,
        startLabel: 'איך מגיעים לזה? לפתרון בשלבים',
        onDone: it.good ? null : function () { showAnswer(it); },
      });
      if (items.every(function (x) { return x.done; })) finish();
    }

    function finish() {
      const right = items.filter(function (x) { return x.good; }).length;
      const score = right / items.length;
      const stars = PHY.progress.quizStars(score);
      if (o.chapter) {
        PHY.progress.setQuiz(o.chapter, score);
        if (o.section) PHY.progress.markSection(o.chapter, o.section);
      }
      resultBox.className = 'quiz-result';
      resultBox.innerHTML = '';
      StarScore(resultBox, { value: stars, size: 34, animate: true });
      resultBox.appendChild(h('span', { text: right + ' מתוך ' + items.length + ' נכונות.' }));
      Button(resultBox, 'עוד ניסיון', build, { ghost: true });
      if (PHY.coach) {
        if (score >= 0.9) {
          burst(resultBox, 30);
          PHY.coach.say('שלושה כוכבים. אפשר להמשיך לפרק הבא.', 'right');
        } else if (score >= 0.6) {
          PHY.coach.say('יפה מאוד. הפתרונות בשלבים סוגרים את הפינות שנשארו.', 'right');
        } else {
          PHY.coach.say('נעבור על הפתרונות בשלבים וננסה שוב. ככה זה נלמד באמת.', 'hint');
        }
      }
      if (o.onDone) o.onDone(score, stars);
    }

    build();
    return { el: root, rebuild: build };
  }

  /* ---------- Choice: segmented buttons that act as one radio group ---------- */
  /* o: {label, options: [{value, text}], value, onChange(value)}. text may hold HTML and \( TeX \).
     Every button is at least 44px high. Returns {el, get value(), set(v), setEnabled(on)}. */
  function Choice(host, o) {
    let value = o.value !== undefined ? o.value : o.options[0].value;
    const row = h('div', { class: 'choice-row', role: 'radiogroup', 'aria-label': o.label ? String(o.label).replace(/<[^>]+>/g, '') : 'בחירה' });
    const buttons = o.options.map(function (opt) {
      const b = h('button', { type: 'button', class: 'choice-btn', role: 'radio', html: opt.text });
      b.addEventListener('click', function () {
        if (b.disabled || opt.value === value) return;
        set(opt.value);
        if (o.onChange) o.onChange(value);
      });
      row.appendChild(b);
      return b;
    });
    function set(v) {
      value = v;
      buttons.forEach(function (b, i) {
        const on = o.options[i].value === v;
        b.classList.toggle('is-on', on);
        b.setAttribute('aria-checked', on ? 'true' : 'false');
      });
    }
    set(value);
    const el = h('div', { class: 'choice' }, [o.label ? h('span', { class: 'choice-label', html: o.label }) : null, row]);
    if (host) host.appendChild(el);
    renderMath(el);
    return {
      el,
      get value() { return value; },
      set,
      setEnabled(on) { buttons.forEach(function (b) { b.disabled = !on; }); },
    };
  }

  /* ---------- GameHud: level pips, task, feedback and the end-of-game star panel ---------- */
  /* const hud = U.GameHud(controlsEl, ['שלב 1', 'שלב 2', 'שלב 3']);
     hud.main is where the game puts its sliders and buttons. hud.paint(level, points, done),
     hud.setTask(html), hud.say(text, 'good'|'bad'), hud.showFinal(stars, text, again), hud.showMain(). */
  function GameHud(controlsEl, names) {
    const levels = h('div', { class: 'game-levels' });
    const pips = names.map(function (n) { const p = h('span', { class: 'game-pip', text: n }); levels.appendChild(p); return p; });
    const task = h('div', { class: 'game-task' });
    const feedback = h('div', { class: 'game-feedback', role: 'status' });
    const main = h('div', { class: 'game-hud' }, [task]);
    const final = h('div', { class: 'game-final', hidden: true });
    controlsEl.appendChild(h('div', { class: 'game-hud' }, [levels, main, feedback, final]));
    return {
      levels, pips, main, task, feedback, final,
      paint(level, points, done) {
        pips.forEach(function (p, i) {
          p.className = 'game-pip' + (i === level && !done ? ' is-now' : '') + (points[i] !== undefined ? ' is-done' : '');
        });
      },
      say(text, kind) { feedback.textContent = text; feedback.className = 'game-feedback ' + (kind || ''); },
      setTask(html) { task.innerHTML = html; renderMath(task); },
      showFinal(stars, text, again) {
        main.hidden = true;
        feedback.hidden = true;
        final.hidden = false;
        final.innerHTML = '';
        StarScore(final, { value: stars, animate: true });
        final.appendChild(h('div', { class: 'game-task', text: text }));
        Button(final, 'עוד סיבוב', again, { primary: true });
        burst(final, 30);
      },
      showMain() { main.hidden = false; feedback.hidden = false; final.hidden = true; },
    };
  }

  /* ---------- Page chrome ---------- */
  const ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3L7 7M17 17l1.7 1.7M5.3 18.7L7 17M17 7l1.7-1.7"/></svg>';
  const ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>';

  function themeButton(host) {
    const b = h('button', { type: 'button', class: 'icon-btn' });
    const paint = function () {
      const dark = PHY.theme.get() === 'dark';
      b.innerHTML = dark ? ICON_SUN : ICON_MOON;
      b.setAttribute('aria-label', dark ? 'מעבר למצב בהיר' : 'מעבר למצב כהה');
      b.title = b.getAttribute('aria-label');
    };
    b.addEventListener('click', PHY.theme.toggle);
    document.addEventListener('phy:theme', paint);
    paint();
    if (host) host.appendChild(b);
    return b;
  }

  /* The sticky top bar: brand (course title), page title, theme toggle, and an optional progress bar.
     o: {title, home: link for the brand or null, bar: true}. Returns {el, bar}. */
  function topbar(host, o) {
    o = o || {};
    host.innerHTML = '';
    host.classList.add('topbar');
    const brand = h(o.home ? 'a' : 'span', { class: 'brand', href: o.home || null, 'aria-label': o.home ? 'חזרה לדף הבית' : null }, [
      h('span', { class: 'brand-icon', html: PHY.coach ? PHY.coach.icon('lens') : '' }),
      h('span', { class: 'brand-name', text: PHY.course.title }),
    ]);
    const inner = h('div', { class: 'topbar-in' }, [brand, h('span', { class: 'topbar-spacer' }), o.title ? h('span', { class: 'topbar-title', text: o.title }) : null]);
    themeButton(inner);
    host.appendChild(inner);
    let bar = null;
    if (o.bar) {
      bar = h('span', { 'data-chapter-bar': '' });
      host.appendChild(h('div', { class: 'chapter-bar' }, [bar]));
    }
    return { el: host, bar };
  }

  /* The attribution, from PHY.course.attribution.html (nothing if it is missing).
     o: {reset: true} adds a reset-progress link. */
  function footer(host, o) {
    o = o || {};
    const A = PHY.course.attribution;
    host.innerHTML = '';
    host.classList.add('footer');
    const inner = h('div', { class: 'footer-in' }, [
      A && A.html ? h('p', { class: 'attribution', html: A.html }) : null,
    ]);
    const note = h('p', { class: 'muted small', text: 'ההתקדמות נשמרת בדפדפן הזה בלבד. ' });
    if (o.reset) {
      note.appendChild(h('button', {
        type: 'button', class: 'link-btn', text: 'איפוס התקדמות',
        onclick: function () { if (window.confirm('למחוק את כל ההתקדמות והכוכבים באתר הזה?')) PHY.progress.reset(); },
      }));
    }
    inner.appendChild(note);
    host.appendChild(inner);
    return host;
  }

  /* The four sites of the series, from PHY.course.series. The current one is marked. */
  function seriesList(host) {
    const ul = h('ul', { class: 'series-list' });
    PHY.course.series.forEach(function (s) {
      const here = s.url === PHY.course.siteUrl;
      ul.appendChild(h('li', { class: here ? 'is-here' : '' }, [
        here ? h('span', { class: 'series-title', text: s.title }) : h('a', { class: 'series-title', href: s.url, text: s.title }),
        here ? h('span', { class: 'badge', text: 'האתר הזה' }) : null,
        s.desc ? h('span', { class: 'series-desc', text: s.desc }) : null,
      ]));
    });
    if (host) host.appendChild(ul);
    return ul;
  }

  /* Prev / home / next, from PHY.course.chapters. A neighbour whose stamp does not load stays hidden. */
  function chapterNav(host, id) {
    const list = PHY.course.chapters;
    const i = PHY.course.indexOf(id);
    const nav = h('nav', { class: 'chapter-nav wrap', 'aria-label': 'ניווט בין פרקים' });
    const slot = function (c, label) {
      const a = h('a', { class: 'btn is-spacer', 'aria-hidden': 'true', tabindex: '-1', text: c ? label + ': ' + c.title : '' });
      a.dataset.id = c ? c.id : '';
      return a;
    };
    const prev = slot(list[i - 1], 'הקודם');
    const next = slot(list[i + 1], 'הבא');
    nav.appendChild(prev);
    nav.appendChild(h('a', { class: 'btn', href: '../index.html', text: 'הבית' }));
    nav.appendChild(next);
    host.appendChild(nav);
    const ids = [list[i - 1], list[i + 1]].filter(Boolean).map((c) => c.id);
    PHY.course.detect(ids, '../').then(function (live) {
      [prev, next].forEach(function (a) {
        const c = PHY.course.find(a.dataset.id);
        if (!c || !live.has(c.id)) return;
        a.classList.remove('is-spacer');
        a.removeAttribute('aria-hidden');
        a.removeAttribute('tabindex');
        a.setAttribute('href', c.file);
      });
    });
    return nav;
  }

  function slotOrCreate(sel, tag, where) {
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement(tag);
      el.setAttribute(sel.slice(1, -1), '');
      if (where === 'top') document.body.insertBefore(el, document.body.firstChild);
      else if (where === 'after-main' && document.querySelector('main')) document.querySelector('main').after(el);
      else document.body.appendChild(el);
    }
    return el;
  }

  /* Text right after a card often states its answer, so it stays closed until the reveal.
     It holds the card's following siblings up to the next card, a <nav>, or an element marked
     data-no-hold. A card answered on an earlier visit holds nothing back. Held elements keep their
     width, so a canvas inside one stays correctly sized. */
  function holdAfterCards(chapterId) {
    const answered = PHY.progress.chapter(chapterId).predictions || {};
    document.querySelectorAll('.predict').forEach(function (host) {
      if (host._phyCardId && answered[host._phyCardId]) return;
      const els = [];
      for (let n = host.nextElementSibling; n; n = n.nextElementSibling) {
        if (n.matches('.predict, nav, script, style, [data-no-hold]') || n.querySelector('.predict')) break;
        els.push(n);
      }
      if (!els.length) return;
      els.forEach(function (el) { el.classList.add('held'); });
      const note = h('p', { class: 'held-note muted small', text: 'ההמשך ייפתח אחרי הניחוש.' });
      host.after(note);
      host._held = { els: els, note: note };
    });
  }

  function releaseHeld(host) {
    const held = host._held;
    if (!held) return;
    host._held = null;
    held.note.remove();
    held.els.forEach(function (el) {
      el.classList.remove('held');
      el.classList.add('held-open');
    });
  }

  /* Call once at the bottom of every chapter page. Builds the top bar, the chapter nav and the footer
     (into [data-topbar], [data-chapter-nav], [data-footer], created if missing), tracks progress, mounts
     the callouts, holds the text after each unanswered card and renders the math. Passive sections
     (data-passive) are marked done when seen for 1 s; all the rest are marked by their components
     through the `section` option. */
  function initChapter(o) {
    const id = o.id;
    const c = PHY.course.find(id);
    PHY.course.ready(id);
    const title = c ? 'פרק ' + +id + ': ' + c.title : '';
    const top = topbar(slotOrCreate('[data-topbar]', 'header', 'top'), { title, home: '../index.html', bar: true });

    const sections = Array.prototype.slice.call(document.querySelectorAll('section[data-section]'));
    PHY.progress.setTotal(id, sections.length);
    function paint() {
      sections.forEach(function (s) {
        s.classList.toggle('is-done', PHY.progress.hasSection(id, s.dataset.section));
      });
      top.bar.style.width = PHY.progress.fraction(id) * 100 + '%';
    }
    document.addEventListener('phy:progress', paint);
    paint();

    chapterNav(slotOrCreate('[data-chapter-nav]', 'div', 'after-main'), id);
    footer(slotOrCreate('[data-footer]', 'footer', 'end'));

    if ('IntersectionObserver' in window) {
      /* A section counts as read after 1 s with 25% of it visible, or, for one taller than that
         allows, with it filling half the screen. */
      const timers = new Map();
      const io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          const name = e.target.dataset.section;
          const rootH = e.rootBounds ? e.rootBounds.height : window.innerHeight;
          const reading = e.isIntersecting && (e.intersectionRatio >= 0.25 || e.intersectionRect.height >= rootH * 0.5);
          if (reading && !timers.has(name)) {
            timers.set(name, setTimeout(function () {
              PHY.progress.markSection(id, name);
              io.unobserve(e.target);
            }, 1000));
          } else if (!reading && timers.has(name)) {
            clearTimeout(timers.get(name));
            timers.delete(name);
          }
        });
      }, { threshold: [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1] });
      sections.forEach(function (s) {
        if (s.hasAttribute('data-passive') && !PHY.progress.hasSection(id, s.dataset.section)) io.observe(s);
      });
    }
    holdAfterCards(id);
    if (PHY.coach) PHY.coach.autoMount();
    renderMath(document.body);
  }

  /* The home page, entirely from PHY.course: hero, chapter map, about, attribution, the series, footer.
     Slots: [data-topbar] [data-home-hero] [data-home-map] [data-home-about] [data-home-series] [data-footer]. */
  function initHome() {
    const C = PHY.course, P = PHY.progress;
    document.title = C.title;
    topbar(slotOrCreate('[data-topbar]', 'header', 'top'), { home: null });
    const hero = document.querySelector('[data-home-hero]');
    const actions = h('div', { class: 'home-actions' });
    if (hero) {
      hero.innerHTML = '';
      hero.appendChild(h('span', { class: 'brand-icon hero-icon', html: PHY.coach.icon('lens') }));
      hero.appendChild(h('h1', { text: C.title }));
      hero.appendChild(h('p', { class: 'lead', text: C.subtitle }));
      hero.appendChild(actions);
    }
    const mapHost = document.querySelector('[data-home-map]');
    let live = null;

    function paint() {
      if (!mapHost) return;
      mapHost.innerHTML = '';
      const ol = h('ol', { class: 'map' });
      C.chapters.forEach(function (c) {
        const on = !!live && live.has(c.id);
        const pc = P.chapter(c.id), frac = P.fraction(c.id);
        const done = on && frac >= 1;
        const li = h('li', { class: 'map-item ' + (on ? 'is-active' : 'is-soon') + (done ? ' is-done' : '') });
        li.appendChild(h('span', { class: 'map-node', 'aria-hidden': 'true', text: String(+c.id) }));
        const titleRow = h('div', { class: 'map-title-row' }, [
          h('span', { class: 'map-title', text: 'פרק ' + +c.id + ': ' + c.title }),
          on ? null : h('span', { class: 'badge badge-soon', text: live ? 'בקרוב' : '' }),
        ]);
        const card = h(on ? 'a' : 'div', { class: 'map-card', href: on ? 'chapters/' + c.file : null }, [
          titleRow,
          h('p', { class: 'map-desc', text: c.desc }),
          c.ref ? h('p', { class: 'map-lectures', text: c.ref }) : null,
        ]);
        if (on && P.started(c.id)) {
          card.appendChild(h('div', { class: 'map-bar' }, [h('span', { style: 'width:' + Math.round(frac * 100) + '%' })]));
          const meta = h('div', { class: 'map-meta' });
          const quizBox = h('span', { text: 'בוחן' });
          StarScore(quizBox, { value: P.quizStars(pc.quiz || 0) });
          const gameBox = h('span', { text: 'אתגר' });
          StarScore(gameBox, { value: pc.game || 0 });
          meta.appendChild(quizBox);
          meta.appendChild(gameBox);
          meta.appendChild(h('span', { text: Math.round(frac * 100) + '% מהפרק' }));
          card.appendChild(meta);
        }
        li.appendChild(card);
        ol.appendChild(li);
      });
      mapHost.appendChild(ol);
      isolateNumbers(mapHost);

      actions.innerHTML = '';
      const ready = C.chapters.filter((c) => live && live.has(c.id));
      if (ready.length) {
        const nextUp = ready.find((c) => P.fraction(c.id) < 1) || ready[0];
        const any = ready.some((c) => P.started(c.id));
        actions.appendChild(h('a', { class: 'btn btn-primary', href: 'chapters/' + nextUp.file, text: (any ? 'להמשיך: ' : 'להתחיל: ') + 'פרק ' + +nextUp.id }));
      }
      actions.appendChild(h('a', { class: 'btn', href: '#about', text: 'על הקורס' }));
    }

    const about = document.querySelector('[data-home-about]');
    if (about) {
      about.innerHTML = '';
      about.appendChild(h('h2', { text: 'על הקורס' }));
      about.appendChild(h('p', { text: C.level }));
      about.appendChild(h('h3', { class: 'block-gap', text: 'קריאה' }));
      const ul = h('ul', { class: 'reading' });
      C.reading.forEach(function (r) { ul.appendChild(h('li', {}, [h('bdi', { class: 'book', text: r.title }), r.note ? h('span', { class: 'muted', text: ' ' + r.note }) : null])); });
      about.appendChild(ul);
      const K = C.credit;
      if (K && (K.title || K.html || K.note)) {
        about.appendChild(h('div', { class: 'credit-card' }, [
          K.title ? h('h3', { text: K.title }) : null,
          K.html ? h('p', { html: K.html }) : null,
          K.note ? h('p', { class: 'muted small', text: K.note }) : null,
        ]));
      }
    }
    const series = document.querySelector('[data-home-series]');
    if (series) {
      series.innerHTML = '';
      series.appendChild(h('h2', { text: 'עוד בסדרה' }));
      seriesList(series);
    }
    footer(slotOrCreate('[data-footer]', 'footer', 'end'), { reset: true });
    document.addEventListener('phy:progress', paint);
    paint();
    C.detect(null, '').then(function (set) { live = set; paint(); });
  }

  PHY.ui = {
    h, renderMath, isolateNumbers, burst, reduced,
    Button, Toggle, Choice, Slider, Readouts, StarScore,
    PredictCard, StepSolution, Problem, Quiz, GameHud, numClose,
    themeButton, topbar, footer, seriesList, chapterNav, initChapter, initHome,
  };
})();
