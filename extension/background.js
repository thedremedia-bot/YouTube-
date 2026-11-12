// Jarvis Link: the background worker. It opens a page in a background tab of
// your own Chrome (where you're signed in), reads what's on it and closes the
// tab. That's all it does: it never clicks, types, posts, sends or changes
// anything, and it only opens the sites in ALLOWED below.

const VERSION = chrome.runtime.getManifest().version;

/** the only sites that can be read */
const ALLOWED = [/^https:\/\/([\w-]+\.)*bounty\.app\//, /^https:\/\/www\.tiktok\.com\//, /^https:\/\/www\.instagram\.com\//, /^https:\/\/studio\.youtube\.com\//, /^https:\/\/www\.youtube\.com\//, /^https:\/\/discord\.com\//];
const HOSTS = ["bounty.app", "tiktok.com", "instagram.com", "youtube.com", "discord.com"];

/** the dashboards that may ask. yours are here from the start; pair any other from the popup */
const DEFAULT_SITES = ["https://thedremedia-bot.github.io/", "https://andrechizingaugc-spec.github.io/", "http://localhost", "http://127.0.0.1"];

const get = (keys) => new Promise((r) => chrome.storage.local.get(keys, r));
const set = (obj) => new Promise((r) => chrome.storage.local.set(obj, r));

async function sites() {
  const { sites: saved } = await get(["sites"]);
  return Array.isArray(saved) ? saved : DEFAULT_SITES;
}
/** is this address one of the paired dashboards? compared part by part, so a look-alike host never passes */
async function paired(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  return (await sites()).some((s) => {
    try {
      const p = new URL(s);
      return p.protocol === u.protocol && p.hostname === u.hostname && (p.port === "" || p.port === u.port) && u.pathname.startsWith(p.pathname);
    } catch {
      return false;
    }
  });
}

// ---------------------------------------------------------------- reading a page

/** runs inside the page that's being read. must not use anything from outside itself */
function extract() {
  const host = location.hostname;
  const count = (s) => {
    if (!s) return undefined;
    const m = String(s).replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
    if (!m) return undefined;
    return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || "").toUpperCase()] || 1));
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const st = getComputedStyle(el);
    return st.visibility !== "hidden" && st.display !== "none" && Number(st.opacity) > 0.05;
  };
  const body = document.body;
  const text = (body ? body.innerText : "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").slice(0, 30000);

  // every dollar amount on the page, with the words next to it
  const money = [];
  const seen = new Set();
  const amountRe = /(?:US)?\$\s?(\d[\d,]*(?:\.\d{1,2})?)\s?([kK])?/;
  if (body) {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode()) && money.length < 60) {
      const raw = (node.nodeValue || "").replace(/\s+/g, " ").trim();
      const m = raw.match(amountRe);
      const el = node.parentElement;
      if (!m || !el || !visible(el)) continue;
      let label = raw.replace(m[0], "").trim();
      // the amount stands alone ("$412.50"): its label is the nearest short text around it
      let up = el;
      for (let hops = 0; label.replace(/[^a-z]/gi, "").length < 3 && up.parentElement && hops < 5; hops++) {
        up = up.parentElement;
        const t = (up.innerText || "").replace(/\s+/g, " ").trim();
        if (t && t.length <= 140) label = t.replace(m[0], "").trim();
      }
      label = label.replace(/\s+/g, " ").replace(/^[\s:·|-]+|[\s:·|-]+$/g, "").slice(0, 80);
      const amount = parseFloat(m[1].replace(/,/g, "")) * (m[2] ? 1000 : 1);
      const key = label.toLowerCase() + "|" + amount;
      if (!isFinite(amount) || seen.has(key)) continue;
      seen.add(key);
      money.push({ label, amount, raw: m[0].trim() });
    }
  }

  let stats;
  let unread;
  let signedOut = /\/(log-?in|sign-?in|signin|accounts\/login|auth)(\/|$)/i.test(location.pathname);

  if (host.endsWith("tiktok.com")) {
    stats = {};
    try {
      const el = document.getElementById("__UNIVERSAL_DATA_FOR_REHYDRATION__");
      const info = el && JSON.parse(el.textContent).__DEFAULT_SCOPE__["webapp.user-detail"].userInfo;
      if (info) {
        const s = info.statsV2 || info.stats || {};
        stats = { handle: "@" + info.user.uniqueId, followers: Number(s.followerCount), likes: Number(s.heartCount ?? s.heart), videos: Number(s.videoCount) };
      }
    } catch {}
    const q = (sel) => document.querySelector(sel)?.textContent;
    stats.followers ??= count(q('[data-e2e="followers-count"]'));
    stats.likes ??= count(q('[data-e2e="likes-count"]'));
    const views = [...document.querySelectorAll('[data-e2e="video-views"]')].slice(0, 24).map((e) => count(e.textContent)).filter((n) => n != null);
    if (views.length) stats.recentViews = views;
  } else if (host.endsWith("instagram.com")) {
    stats = {};
    const d = document.querySelector('meta[property="og:description"]')?.content || document.querySelector('meta[name="description"]')?.content || "";
    const f = d.match(/([\d.,]+\s*[KMB]?)\s+Followers/i);
    const p = d.match(/([\d.,]+\s*[KMB]?)\s+Posts/i);
    if (f) stats.followers = count(f[1]);
    if (p) stats.videos = count(p[1]);
    const h = location.pathname.split("/").filter(Boolean)[0];
    if (h) stats.handle = "@" + h;
  } else if (host === "discord.com") {
    signedOut = signedOut || /^\/(login|register)/.test(location.pathname);
    const labels = [...document.querySelectorAll("[aria-label]")].map((e) => e.getAttribute("aria-label") || "").filter((l) => /unread|mention/i.test(l) && l.length < 120);
    const name = (l) => l.replace(/^\s*(\d+\s+)?(unread( messages?)?|mentions?|new messages?)\s*,?\s*/i, "").replace(/\s*\((direct message|group message|server)\)\s*$/i, "").replace(/,\s*(unread|\d+ mentions?).*$/i, "").trim();
    const dms = [...new Set(labels.filter((l) => /direct message|group message/i.test(l)).map(name).filter(Boolean))];
    const servers = [...new Set(labels.filter((l) => /mention/i.test(l) && !/direct message|group message/i.test(l)).map(name).filter(Boolean))];
    const t = document.title.match(/^\((\d+)\)/);
    unread = { total: t ? Number(t[1]) : dms.length + servers.length, dms: dms.slice(0, 30), servers: servers.slice(0, 30) };
  } else if (host.endsWith("bounty.app")) {
    // Bounty shows its public pages to anyone: a sign-in button and no money means you're not signed in
    signedOut = signedOut || (money.length === 0 && /\b(log ?in|sign ?in|get started)\b/i.test(text.slice(0, 1500)));
  }
  return { finalUrl: location.href, title: document.title, text, money, signedOut, stats, unread };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitLoaded(tabId, timeout) {
  return new Promise((resolve) => {
    const done = () => {
      chrome.tabs.onUpdated.removeListener(onUpd);
      clearTimeout(timer);
      resolve();
    };
    const onUpd = (id, info) => id === tabId && info.status === "complete" && done();
    const timer = setTimeout(done, timeout);
    chrome.tabs.onUpdated.addListener(onUpd);
    chrome.tabs.get(tabId, (t) => !chrome.runtime.lastError && t && t.status === "complete" && done());
  });
}

async function readPage(url, waitMs = 4000, keepOpen = false) {
  if (typeof url !== "string" || !ALLOWED.some((re) => re.test(url))) throw new Error("That site isn't one Jarvis Link is allowed to read.");
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitLoaded(tab.id, 25000);
    // pages like these fill in after they load
    await sleep(Math.min(15000, Math.max(500, waitMs)));
    const now = await chrome.tabs.get(tab.id);
    // a redirect off the allowed sites (a sign-in on another domain) is not read
    if (!ALLOWED.some((re) => re.test(now.url || ""))) return { url, finalUrl: now.url || url, title: now.title || "", text: "", money: [], signedOut: true };
    const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extract });
    if (!res || !res.result) throw new Error("The page couldn't be read.");
    return { url, ...res.result };
  } finally {
    if (!keepOpen) chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// ---------------------------------------------------------------- messages

async function handle(msg, sender) {
  if (msg.from === "page") {
    // a page may only ask if it's a paired dashboard, checked against the tab's real address
    const url = sender.tab && sender.tab.url;
    if (!(await paired(url))) {
      if (msg.type === "ping") throw new Error("not paired");
      throw new Error("This site isn't paired with Jarvis Link. Click the extension's icon and press “Pair this site”.");
    }
    if (msg.type === "ping") {
      // remembered so the morning alarm knows which page to open
      await set({ dashboard: url.split(/[?#]/)[0] });
      return { version: VERSION, hosts: HOSTS };
    }
    if (msg.type === "readPage") return readPage(msg.payload && msg.payload.url, msg.payload && msg.payload.waitMs, !!(msg.payload && msg.payload.keepOpen));
    if (msg.type === "lastAuto") return (await get(["lastAuto"])).lastAuto || null;
    throw new Error("Unknown request.");
  }
  if (msg.from === "popup") {
    if (msg.type === "state") {
      const s = await get(["dashboard", "lastAuto", "daily"]);
      return { version: VERSION, sites: await sites(), here: await paired(msg.url), dashboard: s.dashboard || "", lastAuto: s.lastAuto || null, daily: s.daily || { on: false, time: "08:00" } };
    }
    if (msg.type === "pair") {
      const u = new URL(msg.url);
      // a GitHub Pages site is paired by its account; anything else by its origin
      const prefix = u.origin + "/";
      const list = await sites();
      if (!list.includes(prefix)) await set({ sites: [...list, prefix] });
      return { sites: await sites() };
    }
    if (msg.type === "unpair") {
      await set({ sites: (await sites()).filter((s) => s !== msg.site) });
      return { sites: await sites() };
    }
    if (msg.type === "daily") {
      await set({ daily: msg.daily });
      await schedule();
      return { daily: msg.daily };
    }
    if (msg.type === "bounty") {
      const page = await readPage("https://create.bounty.app/home", 4000);
      return { page };
    }
    throw new Error("Unknown request.");
  }
  throw new Error("Unknown sender.");
}

chrome.runtime.onMessage.addListener((msg, sender, send) => {
  // only this extension's own pages and content script
  if (sender.id !== chrome.runtime.id) return false;
  handle(msg, sender).then(
    (result) => send({ ok: true, result }),
    (e) => send({ ok: false, error: (e && e.message) || "That didn't work." }),
  );
  return true;
});

// ---------------------------------------------------------------- once a day

async function schedule() {
  await chrome.alarms.clear("daily");
  const { daily } = await get(["daily"]);
  if (!daily || !daily.on) return;
  const [h, m] = String(daily.time || "08:00").split(":").map(Number);
  const at = new Date();
  at.setHours(h || 0, m || 0, 0, 0);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  chrome.alarms.create("daily", { when: at.getTime(), periodInMinutes: 24 * 60 });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "daily") return;
  const { dashboard } = await get(["dashboard"]);
  // opening the dashboard is what runs the day: its routines read Bounty, your accounts and Discord through this extension
  if (dashboard && (await paired(dashboard))) chrome.tabs.create({ url: dashboard, active: false });
});

chrome.runtime.onInstalled.addListener(schedule);
chrome.runtime.onStartup.addListener(schedule);
