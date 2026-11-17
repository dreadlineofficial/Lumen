// Lumen Return Key: on Lumen it remembers your keys; on every other site it sends you back to Lumen.
(() => {
  const isLumen = () => !!document.querySelector('meta[name="lumen-app"]');
  const same = (a, b) => String(a).toLowerCase() === String(b).toLowerCase();

  // On Lumen: tell the page the extension is installed and save the user's keys
  function syncFromLumen() {
    if (window !== window.top || !isLumen()) return false;
    document.documentElement.dataset.lumenExt = '1';
    let cfg = {};
    try { cfg = JSON.parse(localStorage.getItem('hub.cfg.v1') || '{}'); } catch {}
    chrome.storage.local.set({
      keys: [cfg.panicKey || '`', cfg.studyKey || 'v', cfg.swapKey || 'b'],
      hotCorner: cfg.hotCorner !== false,
      lumenUrl: location.origin + location.pathname
    });
    // leaving Lumen for another site in this tab: remember it so we can go back
    addEventListener('pagehide', () => { try { chrome.runtime.sendMessage({ t: 'leftLumen' }); } catch {} });
    return true;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncFromLumen); else syncFromLumen();
  setTimeout(syncFromLumen, 1500); // settings can change while Lumen is open

  // Everywhere else: the keys (double-tap while typing) and the top-left hot corner
  let keys = ['`', 'v', 'b'], hotCorner = true;
  chrome.storage.local.get(['keys', 'hotCorner'], s => { if (s.keys) keys = s.keys; if (s.hotCorner === false) hotCorner = false; });
  chrome.storage.onChanged.addListener(c => { if (c.keys) keys = c.keys.newValue; if (c.hotCorner) hotCorner = c.hotCorner.newValue; });
  const back = () => { try { chrome.runtime.sendMessage({ t: 'return' }); } catch {} };
  const typing = t => t && (/INPUT|TEXTAREA|SELECT/.test(t.tagName) || t.isContentEditable);
  let tap = { k: '', at: 0 };
  addEventListener('keydown', e => {
    if (isLumen() || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = keys.find(x => same(x, e.key));
    if (!k) { tap.k = ''; return; }
    if (typing(e.target) && e.key.length === 1) {
      const now = Date.now();
      if (tap.k !== k || now - tap.at > 450) { tap = { k, at: now }; return; }
    }
    e.preventDefault(); e.stopPropagation(); back();
  }, true);
  let wasOut = false, cornerT = 0;
  addEventListener('mousemove', e => {
    if (!hotCorner || isLumen() || window !== window.top) return;
    const inC = e.clientX <= 3 && e.clientY <= 3, moved = e.movementX || e.movementY;
    if (!inC) { if (moved) wasOut = true; clearTimeout(cornerT); cornerT = 0; return; }
    if (moved && wasOut && !cornerT) cornerT = setTimeout(() => { cornerT = 0; wasOut = false; back(); }, 120);
  }, { passive: true, capture: true });
})();
