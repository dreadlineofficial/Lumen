/* AI overview for Lumen search: Claude answers the query using live web search, streamed with cited sources.
   Each user supplies their own Anthropic API key (Settings → AI overview); it stays in their browser. */
import { Anthropic } from './anthropic.js';
const L = window.Lumen;

const SYSTEM = `You write the AI overview at the top of a search results page.
Answer the user's search directly in 2-4 short paragraphs or a short list, the way a knowledgeable friend would.
Search the web when the answer depends on facts, news, prices, dates or anything that may have changed.
Lead with the answer itself, not with "Based on my search". Use **bold** for key terms sparingly.
If the query is ambiguous, cover the most likely meaning and mention the other briefly.
Today's date is ${new Date().toDateString()}.`;

let controller = null;

// tiny, safe markdown: escape first, then bold/italics/lists/paragraphs
function md(text) {
  const e = L.esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<i>$2</i>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  return e.split(/\n{2,}/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*([-*•]|\d+\.)\s+/.test(l)))
      return '<ul>' + lines.map(l => `<li>${l.replace(/^\s*([-*•]|\d+\.)\s+/, '')}</li>`).join('') + '</ul>';
    if (/^#{1,4}\s/.test(block)) return `<h4>${block.replace(/^#{1,4}\s/, '')}</h4>`;
    return `<p>${block.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

async function overview(query, box) {
  controller?.abort();
  const key = L.cfg.aiKey;
  if (!L.cfg.aiOn) { box.innerHTML = ''; return; }
  if (!key) {
    box.innerHTML = `<div class="ai card"><div class="ai-h">✦ AI overview</div><p class="muted">Add your Anthropic API key in <a href="#" data-aiset>Settings → AI overview</a> to get AI answers here.</p></div>`;
    box.querySelector('[data-aiset]').onclick = e => { e.preventDefault(); L.go('settings'); };
    return;
  }
  box.innerHTML = `<div class="ai card"><div class="ai-h">✦ AI overview <span class="ai-st">Searching the web…</span></div><div class="ai-body"><div class="ai-skel"></div><div class="ai-skel" style="width:80%"></div><div class="ai-skel" style="width:60%"></div></div><div class="ai-src"></div></div>`;
  const body = box.querySelector('.ai-body'), st = box.querySelector('.ai-st'), srcBox = box.querySelector('.ai-src');
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true });
  controller = new AbortController();
  const sources = new Map();
  let text = '';
  const messages = [{ role: 'user', content: query }];
  const render = () => {
    body.innerHTML = md(text) || '<div class="ai-skel"></div>';
    srcBox.innerHTML = sources.size ? [...sources.values()].slice(0, 6).map(s => {
      let h = ''; try { h = new URL(s.url).hostname.replace(/^www\./, ''); } catch {}
      return `<a class="ai-chip" data-go="${L.esc(s.url)}" title="${L.esc(s.title || h)}"><img src="${L.favUrl(h)}" alt="">${L.esc(h)}</a>`;
    }).join('') : '';
    srcBox.querySelectorAll('[data-go]').forEach(a => a.onclick = () => L.browser.open(a.dataset.go));
  };
  try {
    // a long web-search turn can pause; continue it a couple of times
    for (let round = 0; round < 3; round++) {
      const stream = client.beta.messages.stream({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        system: SYSTEM,
        output_config: { effort: 'low' },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
        messages,
      }, { signal: controller.signal });
      for await (const ev of stream) {
        if (ev.type === 'content_block_start' && ev.content_block.type === 'server_tool_use') st.textContent = 'Searching the web…';
        if (ev.type === 'content_block_start' && ev.content_block.type === 'text') st.textContent = 'Writing…';
        if (ev.type === 'content_block_delta') {
          if (ev.delta.type === 'text_delta') { text += ev.delta.text; render(); }
          else if (ev.delta.type === 'citations_delta' && ev.delta.citation.url) {
            const c = ev.delta.citation; if (!sources.has(c.url)) { sources.set(c.url, c); render(); }
          }
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === 'refusal') { text ||= 'No AI overview is available for this search.'; break; }
      if (final.stop_reason !== 'pause_turn') break;
      messages.push({ role: 'assistant', content: final.content });
    }
    st.textContent = 'Claude · web search';
    render();
  } catch (err) {
    if (err?.name === 'AbortError' || err instanceof Anthropic.APIUserAbortError) return;
    const msg = err instanceof Anthropic.AuthenticationError ? 'Your API key was rejected. Check it in Settings → AI overview.'
      : err instanceof Anthropic.RateLimitError ? 'Too many requests right now. Try again in a moment.'
      : err instanceof Anthropic.APIConnectionError ? 'Couldn’t reach the AI service.'
      : 'AI overview failed: ' + (err?.message || err);
    body.innerHTML = `<p class="muted">${L.esc(msg)}</p>`; st.textContent = '';
  }
}

L.aiOverview = overview;
L.aiCancel = () => controller?.abort();
