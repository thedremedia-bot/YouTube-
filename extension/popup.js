// Jarvis Link: the popup. Shows what's paired, lets you pair the dashboard
// you're on, sets the morning wake-up and tries a Bounty read.

const $ = (id) => document.getElementById(id);
const ask = (type, extra = {}) => new Promise((resolve, reject) => chrome.runtime.sendMessage({ from: "popup", type, ...extra }, (res) => (chrome.runtime.lastError ? reject(new Error(chrome.runtime.lastError.message)) : res && res.ok ? resolve(res.result) : reject(new Error((res && res.error) || "No answer.")))));
const activeTab = () => new Promise((r) => chrome.tabs.query({ active: true, currentWindow: true }, (t) => r(t[0])));
const el = (tag, text, cls) => {
  const e = document.createElement(tag);
  if (text != null) e.textContent = text;
  if (cls) e.className = cls;
  return e;
};

async function render() {
  const tab = await activeTab();
  const url = (tab && tab.url) || "";
  const s = await ask("state", { url });
  const here = s.here;
  $("ver").textContent = "Version " + s.version;

  const status = $("status");
  status.textContent = "";
  status.append(el("b", here ? "Connected to this site." : s.dashboard ? "Ready." : "Not connected yet.", here || s.dashboard ? "ok" : ""));
  status.append(el("div", here ? "Your dashboard can use Jarvis Link on this tab." : s.dashboard ? "Last used by " + s.dashboard : "Open your Dre Media dashboard, then press “Pair this site” if it isn't listed below.", "muted"));

  const list = $("sites");
  list.textContent = "";
  for (const site of s.sites) {
    const li = el("li");
    li.append(el("span", site));
    const b = el("button", "remove");
    b.onclick = async () => {
      await ask("unpair", { site });
      render();
    };
    li.append(b);
    list.append(li);
  }
  if (!s.sites.length) list.append(el("li", "None. Pair your dashboard to use it.", "muted"));

  const canPair = /^https?:\/\//.test(url) && !here;
  $("pair").disabled = !canPair;
  $("pairNote").textContent = here ? "this site is paired" : canPair ? new URL(url).host : "open your dashboard first";
  $("pair").onclick = async () => {
    await ask("pair", { url });
    $("pairNote").textContent = "Paired. Refresh the dashboard.";
    render();
  };

  $("dailyOn").checked = !!s.daily.on;
  $("dailyTime").value = s.daily.time || "08:00";
  const saveDaily = () => ask("daily", { daily: { on: $("dailyOn").checked, time: $("dailyTime").value || "08:00" } });
  $("dailyOn").onchange = saveDaily;
  $("dailyTime").onchange = saveDaily;
}

$("bounty").onclick = async () => {
  const out = $("bountyOut");
  out.textContent = "";
  $("bounty").disabled = true;
  $("bountyNote").textContent = "Opening Bounty in a background tab…";
  try {
    const { page } = await ask("bounty");
    $("bountyNote").textContent = page.signedOut ? "" : page.money.length ? "Found:" : "";
    if (page.signedOut) out.append(el("p", "Bounty is signed out in this Chrome. Sign in at create.bounty.app and try again.", "no"));
    else if (!page.money.length) out.append(el("p", "Bounty opened, but that page shows no dollar amounts. Set the right page on your dashboard's Connect page.", "muted"));
    else {
      const t = el("table");
      for (const m of page.money.slice(0, 12)) {
        const tr = el("tr");
        tr.append(el("td", m.label || "(no label)"), el("td", m.raw));
        t.append(tr);
      }
      out.append(t);
    }
  } catch (e) {
    $("bountyNote").textContent = "";
    out.append(el("p", e.message, "no"));
  } finally {
    $("bounty").disabled = false;
  }
};

render().catch((e) => ($("status").textContent = e.message));
