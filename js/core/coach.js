/* PHY.coach: the quiet lab partner. No character, just a small lens icon and short sentences.

   PHY.coach.say(text, mood)   floating RTL bubble in the bottom corner. Hides by itself after about 5 s
                               (longer for long text), or on a tap. aria-live polite, never blocks the page.
                               mood: 'right' | 'wrong' | 'hint' (tints the icon). Default 'hint'.
   PHY.coach.hide()
   PHY.coach.autoMount(root)   turns <div data-callout="lab|intuition|trap" data-title="..."> into a styled
                               box with an icon and a title. Default titles: במעבדה, אינטואיציה, מלכודת.
                               PHY.ui.initChapter calls it.
   PHY.coach.icon(kind)        inline SVG string: 'lens' (default), 'lab', 'intuition', 'trap'. */
(function () {
  'use strict';
  const PHY = (window.PHY = window.PHY || {});

  const ICONS = {
    /* A biconvex lens with a ray bending to a focus. */
    lens: '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path class="ci-lens" d="M16 4c3.2 3 3.2 21 0 24c-3.2-3-3.2-21 0-24z"/><path class="ci-ray" d="M2 11h12.6L27 16M2 21h12.6L27 16"/><circle class="ci-focus" cx="27.5" cy="16" r="2.2"/></svg>',
    /* An optical table: a laser box and a beam hitting a mirror. */
    lab: '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><rect class="ci-line" x="3" y="12" width="9" height="8" rx="1.5"/><path class="ci-ray" d="M12 16h11"/><path class="ci-line" d="M27 10l-4 12"/><path class="ci-line" d="M3 26h26"/></svg>',
    /* A light bulb. */
    intuition: '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path class="ci-line" d="M16 4a8 8 0 0 0-4.6 14.5c1 .8 1.6 1.9 1.6 3.1V23h6v-1.4c0-1.2.6-2.3 1.6-3.1A8 8 0 0 0 16 4z"/><path class="ci-line" d="M13 26.5h6M14 29h4"/><path class="ci-ray" d="M16 9v7"/></svg>',
    /* A warning triangle. */
    trap: '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path class="ci-line" d="M16 4L29 27H3z"/><path class="ci-ray" d="M16 12v7"/><circle class="ci-focus" cx="16" cy="23" r="1.6"/></svg>',
  };
  const LABELS = { lab: 'במעבדה', intuition: 'אינטואיציה', trap: 'מלכודת' };

  function icon(kind) { return ICONS[kind] || ICONS.lens; }

  let box = null, textEl = null, timer = 0;

  function ensure() {
    if (box) return;
    box = document.createElement('div');
    box.className = 'coach-bubble';
    box.setAttribute('dir', 'rtl');
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    const ic = document.createElement('span');
    ic.className = 'coach-icon';
    ic.innerHTML = ICONS.lens;
    textEl = document.createElement('span');
    textEl.className = 'coach-text';
    box.appendChild(ic);
    box.appendChild(textEl);
    box.addEventListener('click', hide);
    document.body.appendChild(box);
  }

  function hide() {
    if (!box) return;
    clearTimeout(timer);
    box.classList.remove('is-on');
  }

  function say(text, mood, opts) {
    if (!text) return;
    ensure();
    opts = opts || {};
    clearTimeout(timer);
    box.dataset.mood = mood || 'hint';
    textEl.textContent = text;
    box.classList.remove('is-on');
    void box.offsetWidth;
    box.classList.add('is-on');
    const ms = opts.duration || Math.max(3500, Math.min(8000, 1800 + String(text).length * 45));
    timer = setTimeout(hide, ms);
  }

  function autoMount(root) {
    (root || document).querySelectorAll('[data-callout]').forEach(function (el) {
      if (el.dataset.mounted) return;
      el.dataset.mounted = '1';
      const kind = LABELS[el.dataset.callout] ? el.dataset.callout : 'intuition';
      el.classList.add('callout', 'callout-' + kind);
      const head = document.createElement('div');
      head.className = 'callout-head';
      const ic = document.createElement('span');
      ic.className = 'callout-icon';
      ic.innerHTML = ICONS[kind];
      const title = document.createElement('span');
      title.textContent = el.dataset.title || LABELS[kind];
      head.appendChild(ic);
      head.appendChild(title);
      el.insertBefore(head, el.firstChild);
    });
  }

  PHY.coach = { say, hide, autoMount, icon, LABELS };
})();
