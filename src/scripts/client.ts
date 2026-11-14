const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

// Theme toggle
$('theme-toggle').onclick = () => {
  const next = document.documentElement.getAttribute('data-mode') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-mode', next);
  localStorage.setItem('theme', next);
};

// Mobile sidebar drawer
const sidebar = $('sidebar');
const backdrop = $('sidebar-backdrop');
const menuToggle = $('sidebar-trigger');
const setDrawer = (open: boolean) => {
  sidebar.classList.toggle('open', open);
  backdrop.hidden = !open;
  menuToggle.setAttribute('aria-expanded', String(open));
};
menuToggle.onclick = () => setDrawer(!sidebar.classList.contains('open'));
backdrop.onclick = () => setDrawer(false);

// Code header bar with language label & copy button
const langMap: Record<string, string> = { tsx: 'TSX', jsx: 'JSX', css: 'CSS', html: 'HTML', go: 'Go', nix: 'Nix', bash: 'Shell', sh: 'Shell', zsh: 'Shell', js: 'JavaScript', ts: 'TypeScript', py: 'Python', python: 'Python', yaml: 'YAML', toml: 'TOML', json: 'JSON', rust: 'Rust', c: 'C' };
document.querySelectorAll<HTMLPreElement>('.post-content pre.astro-code').forEach((pre) => {
  const wrap = document.createElement('div');
  wrap.className = 'highlight';
  pre.replaceWith(wrap);
  const rawLang = pre.dataset.lang || 'text';
  const label = langMap[rawLang.toLowerCase()] || rawLang.charAt(0).toUpperCase() + rawLang.slice(1);

  const header = document.createElement('div');
  header.className = 'code-header';
  header.innerHTML = `<span class="code-label"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>${label}</span>`;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'copy-btn';
  btn.setAttribute('aria-label', 'Salin kode');
  btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Salin</span>`;
  btn.onclick = () => {
    navigator.clipboard.writeText(pre.innerText);
    btn.querySelector('span')!.textContent = 'Disalin';
    btn.classList.add('copied');
    setTimeout(() => {
      btn.querySelector('span')!.textContent = 'Salin';
      btn.classList.remove('copied');
    }, 1600);
  };
  header.appendChild(btn);
  wrap.append(header, pre);
});

// TOC scrollspy + heading anchor links
const headings = Array.from(document.querySelectorAll<HTMLElement>('.post-content h2[id], .post-content h3[id]'));
const tocLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('#TableOfContents a'));
headings.forEach((h) => {
  const a = document.createElement('a');
  a.href = `#${h.id}`;
  a.className = 'anchor';
  a.setAttribute('aria-label', `Tautan ke ${h.textContent}`);
  a.textContent = '#';
  h.appendChild(a);
});

const backToTop = $('back-to-top');
backToTop.onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });

const onScroll = () => {
  backToTop.hidden = window.scrollY < 240;
  if (!headings.length || !tocLinks.length) return;
  let activeId = headings[0].id;
  for (const h of headings) if (h.getBoundingClientRect().top <= 110) activeId = h.id;
  tocLinks.forEach((l) => l.classList.toggle('is-active-link', l.getAttribute('href') === `#${activeId}`));
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ponytail: client-side JSON array filter, swap for Pagefind/Fuse if post count > 1000
type Hit = { title: string; permalink: string; date: string; summary: string; tags: string[]; categories: string[] };
let searchIndex: Hit[] | null = null;
const searchInput = $<HTMLInputElement>('search-input');
const searchResults = $('search-results');
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

window.addEventListener('keydown', (e) => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput.focus();
  } else if (e.key === 'Escape') {
    searchResults.hidden = true;
    searchInput.blur();
    setDrawer(false);
  }
});

searchInput.addEventListener('input', async () => {
  const q = searchInput.value.trim().toLowerCase();
  if (!q) { searchResults.hidden = true; return; }
  searchIndex ??= await (await fetch('/index.json')).json();
  const hits = searchIndex!.filter((p) =>
    p.title.toLowerCase().includes(q) ||
    p.summary.toLowerCase().includes(q) ||
    p.tags.some((t) => t.toLowerCase().includes(q)) ||
    p.categories.some((c) => c.toLowerCase().includes(q))
  ).slice(0, 8);
  searchResults.innerHTML = hits.length
    ? hits.map((h) => `<a href="${h.permalink}" class="search-hit"><strong>${esc(h.title)}</strong><div class="search-hit-meta"><span>${h.date}</span>${h.categories.length ? ` · <span>${esc(h.categories.join(', '))}</span>` : ''}</div><p>${esc(h.summary)}</p></a>`).join('')
    : '<div class="search-empty">Tidak ada artikel yang cocok. Coba kata kunci lain.</div>';
  searchResults.hidden = false;
});

document.addEventListener('click', (e) => {
  if (!(e.target as Element).closest('.search-wrapper')) searchResults.hidden = true;
});
