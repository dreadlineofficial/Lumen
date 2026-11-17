// Sends a tab back to Lumen: one step back if it came from Lumen, otherwise opens Lumen in that tab.
// (Kept in session storage because Chrome stops this script when idle.)
chrome.runtime.onMessage.addListener((msg, sender) => {
  const id = sender.tab && sender.tab.id;
  if (id == null) return;
  const key = 'from' + id;
  if (msg.t === 'leftLumen') { chrome.storage.session.set({ [key]: true }); return; }
  if (msg.t === 'return') {
    chrome.storage.session.get(key, s => chrome.storage.local.get('lumenUrl', ({ lumenUrl }) => {
      const url = lumenUrl || 'https://dreadlineofficial.github.io/Lumen/';
      if (s[key]) {
        chrome.storage.session.remove(key);
        chrome.tabs.goBack(id).catch(() => chrome.tabs.update(id, { url }));
      } else {
        chrome.tabs.update(id, { url });
      }
    }));
  }
});
chrome.tabs.onRemoved.addListener(id => chrome.storage.session.remove('from' + id));
