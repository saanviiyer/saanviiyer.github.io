/* Tabs, deep links, theme toggle and the glossary tab. */
(function () {
  'use strict';
  const { $, $$, esc } = TD;

  /* ---------- glossary tab ---------- */
  const gl = $('#tab-glossary');
  const entries = Object.entries(TD.GLOSSARY).sort((a, b) => a[1].term.localeCompare(b[1].term));
  gl.innerHTML = `
    <header class="tab-head">
      <span class="eyebrow">Reference</span>
      <h2>Glossary</h2>
      <p class="lede">Every term used in the lab, in plain language. Dotted words anywhere on the page show these definitions when you hover or tap them.</p>
      <div class="field"><label for="gl-q">Filter</label><input id="gl-q" class="inp" type="search" autocomplete="off" placeholder="Type to filter, for example prime"></div>
    </header>
    <dl class="gloss" id="gl-list">${entries.map(([k, e]) => `<div class="gl-item" id="gl-${k}" data-text="${esc((e.term + ' ' + e.def).toLowerCase())}"><dt>${esc(e.term)}</dt><dd>${e.def}</dd></div>`).join('')}</dl>
    <p class="small dim" id="gl-empty" hidden>No terms match.</p>`;
  $('#gl-q').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    let shown = 0;
    $$('.gl-item', gl).forEach(it => { const hit = !q || it.dataset.text.includes(q); it.hidden = !hit; shown += hit; });
    $('#gl-empty').hidden = shown > 0;
  });

  /* ---------- tabs ---------- */
  const TABS = ['rsa', 'dh', 'elgamal', 'ec', 'aes', 'sha', 'sign', 'glossary'];
  function show(id, { scroll = true } = {}) {
    if (!TABS.includes(id)) id = 'rsa';
    TABS.forEach(t => {
      const on = t === id;
      $(`#tab-${t}`).hidden = !on;
      const b = $(`[data-tab="${t}"]`);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    try { history.replaceState(null, '', '#' + id); } catch (e) { /* sandboxed frames may refuse */ }
    try { localStorage.setItem('trapdoor-tab', id); } catch (e) { /* storage may be blocked */ }
    if (scroll) { const nav = $('.tabs'); window.scrollTo({ top: Math.min(window.scrollY, nav.offsetTop), behavior: 'auto' }); }
  }
  $('.tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) show(b.dataset.tab); });
  $('.tabs').addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const i = TABS.indexOf($('[aria-selected="true"]', $('.tabs')).dataset.tab);
    const j = (i + (e.key === 'ArrowRight' ? 1 : TABS.length - 1)) % TABS.length;
    show(TABS[j]); $(`[data-tab="${TABS[j]}"]`).focus();
  });
  window.addEventListener('hashchange', () => show(location.hash.slice(1), { scroll: false }));
  TD.openGlossary = key => {
    show('glossary');
    $('#gl-q').value = ''; $('#gl-q').dispatchEvent(new Event('input'));
    const it = document.getElementById('gl-' + key);
    if (it) { it.classList.add('flash'); it.scrollIntoView({ block: 'center' }); setTimeout(() => it.classList.remove('flash'), 1600); }
  };
  let start = location.hash.slice(1);
  if (!TABS.includes(start)) { try { start = localStorage.getItem('trapdoor-tab') || 'rsa'; } catch (e) { start = 'rsa'; } }
  show(start, { scroll: false });

  /* ---------- theme ---------- */
  const btn = $('#theme-btn');
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  };
  const label = () => { btn.textContent = isDark() ? 'Light mode' : 'Dark mode'; btn.setAttribute('aria-pressed', String(isDark())); };
  try { const saved = localStorage.getItem('trapdoor-theme'); if (saved === 'dark' || saved === 'light') document.documentElement.dataset.theme = saved; } catch (e) { /* ignore */ }
  btn.addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('trapdoor-theme', next); } catch (e) { /* ignore */ }
    label();
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', label);
  label();
})();
