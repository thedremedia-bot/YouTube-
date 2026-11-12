// Jarvis Link: the content script. It runs on your dashboard's pages and
// carries messages between the page and the extension. It answers only on
// sites you've paired (see the popup), so no other website can use it.

(() => {
  const PAGE = "dremedia-jarvis";
  const LINK = "dremedia-jarvis-link";

  const reply = (id, ok, body) => window.postMessage(ok ? { source: LINK, id, ok: true, result: body } : { source: LINK, id, ok: false, error: body }, window.location.origin);

  window.addEventListener("message", (e) => {
    const m = e.data;
    // only this page's own messages, addressed to the extension
    if (e.source !== window || e.origin !== window.location.origin || !m || m.source !== PAGE || typeof m.id !== "string") return;
    try {
      chrome.runtime.sendMessage({ from: "page", type: m.type, payload: m.payload, url: window.location.href }, (res) => {
        if (chrome.runtime.lastError) return reply(m.id, false, "The Jarvis Link extension was reloaded. Refresh this page.");
        if (!res) return reply(m.id, false, "The extension didn't answer.");
        reply(m.id, res.ok, res.ok ? res.result : res.error);
      });
    } catch {
      reply(m.id, false, "The Jarvis Link extension was reloaded. Refresh this page.");
    }
  });
})();
