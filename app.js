/* =========================================================================
   Topic Spinner — pick a random presentation topic for the kids.
   Data: Marble Open Taxonomy (topics.json + clusters.json), used under ODbL.
   ========================================================================= */

/* -------------------------------------------------------------------------
   👶 CONFIGURE YOUR KIDS HERE
   Change "name" to your child's real name. "age" must match the topic data
   (topics list ages 4–13). Add or remove entries as needed.
   ------------------------------------------------------------------------- */
const KIDS = [
  { name: "Camae", age: 5, emoji: "🧋" },
  { name: "Cyree", age: 8, emoji: "🍋" },
];

// "Fun picks" quick filter — the naturally presentable subjects.
const FUN_SUBJECTS = ["Science", "History", "Computing"];
const FUN = "__FUN__";

/* ------------------------------------------------------------------------- */

const state = {
  topics: [],
  clusterMap: {},     // "subject|domain" -> [cluster summaries]
  kid: null,          // selected kid object
  subject: null,      // null = all; a subject string; or FUN
  spinning: false,
  lastId: null,       // avoid immediately repeating the same topic
  lastDomain: null,   // avoid immediately repeating the same domain
};

const el = {
  kidButtons: document.getElementById("kid-buttons"),
  subjectChips: document.getElementById("subject-chips"),
  reel: document.getElementById("reel"),
  reelText: document.getElementById("reel-text"),
  spinBtn: document.getElementById("spin-btn"),
  matchCount: document.getElementById("match-count"),
  result: document.getElementById("result"),
};

/* ---- Load data ---- */
async function init() {
  try {
    const [topicsRes, clustersRes] = await Promise.all([
      fetch("data/topics.json"),
      fetch("data/clusters.json"),
    ]);
    const topicsData = await topicsRes.json();
    state.topics = Array.isArray(topicsData) ? topicsData : topicsData.topics || [];
    const clustersData = await clustersRes.json();
    const clusters = Array.isArray(clustersData) ? clustersData : clustersData.clusters || [];
    state.clusterMap = buildClusterMap(clusters);
  } catch (e) {
    el.reelText.textContent = "Couldn't load topics 😢";
    console.error(e);
    return;
  }
  renderKidButtons();
  renderSubjectChips();
  updateMatchCount();
}

function buildClusterMap(clusters) {
  const map = {};
  clusters.forEach((c) => {
    const key = `${c.subject}|${c.domain}`;
    (map[key] = map[key] || []).push(c);
  });
  return map;
}

/* ---- Presenter buttons ---- */
function renderKidButtons() {
  el.kidButtons.innerHTML = "";
  KIDS.forEach((kid, i) => {
    const btn = document.createElement("button");
    btn.className = "kid-btn";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    btn.innerHTML =
      `<span class="emoji">${kid.emoji}</span>` +
      `<span>${escapeHtml(kid.name)}</span>` +
      `<span class="sub">age ${kid.age}</span>`;
    btn.addEventListener("click", () => selectKid(kid, btn));
    el.kidButtons.appendChild(btn);
    if (i === 0) selectKid(kid, btn); // default to first kid
  });
}

function selectKid(kid, btn) {
  state.kid = kid;
  [...el.kidButtons.children].forEach((b) =>
    b.setAttribute("aria-pressed", b === btn ? "true" : "false")
  );
  updateMatchCount();
}

/* ---- Subject chips (derived from the data) ---- */
function renderSubjectChips() {
  const counts = {};
  state.topics.forEach((t) => {
    if (t.subject) counts[t.subject] = (counts[t.subject] || 0) + 1;
  });
  const subjects = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

  el.subjectChips.innerHTML = "";
  addChip("✨ Surprise Me!", null, true);
  addChip("🔬 Fun picks", FUN, false);
  subjects.forEach((s) => addChip(s, s, false, counts[s]));
}

function addChip(label, value, active, count) {
  const chip = document.createElement("button");
  chip.className = "chip";
  chip.type = "button";
  chip.setAttribute("aria-pressed", active ? "true" : "false");
  chip.innerHTML =
    escapeHtml(label) +
    (count != null ? ` <span class="count">${count}</span>` : "");
  chip.addEventListener("click", () => selectSubject(value, chip));
  el.subjectChips.appendChild(chip);
}

function selectSubject(value, chip) {
  state.subject = value;
  [...el.subjectChips.children].forEach((c) =>
    c.setAttribute("aria-pressed", c === chip ? "true" : "false")
  );
  updateMatchCount();
}

/* ---- Filtering ---- */
function subjectMatches(t) {
  if (!state.subject) return true;
  if (state.subject === FUN) return FUN_SUBJECTS.includes(t.subject);
  return t.subject === state.subject;
}

function matchingTopics() {
  if (!state.kid) return [];
  const age = state.kid.age;
  return state.topics.filter((t) => {
    const start = t.ageRangeStart, end = t.ageRangeEnd;
    const ageOk = start != null && end != null && age >= start && age <= end;
    return ageOk && subjectMatches(t);
  });
}

function subjectLabel() {
  if (!state.subject) return "";
  if (state.subject === FUN) return " in fun subjects";
  return ` in ${state.subject}`;
}

function updateMatchCount() {
  const n = matchingTopics().length;
  const who = state.kid ? state.kid.name : "someone";
  el.matchCount.textContent = n
    ? `${n} topic${n === 1 ? "" : "s"} ready for ${who}${subjectLabel()}.`
    : `No topics match yet — try another subject.`;
  el.spinBtn.disabled = n === 0 || state.spinning;
}

/* ---- Choosing a winner ----
   Weight away from the most "foundational" topics (high centrality =
   rote basics like counting/handwriting) so spins land on richer,
   more presentable topics. Also avoid repeating the last topic/domain. */
function weightFor(t) {
  const c = typeof t.centrality === "number" ? t.centrality : 0;
  const w = Math.pow(1 - Math.min(c, 0.999), 2);
  return w > 0 ? w : 0.001;
}

function weightedPick(pool) {
  const total = pool.reduce((s, t) => s + weightFor(t), 0);
  let r = Math.random() * total;
  for (const t of pool) {
    r -= weightFor(t);
    if (r <= 0) return t;
  }
  return pool[pool.length - 1];
}

function chooseWinner(pool) {
  let candidates = pool;
  // prefer a different domain than last spin, if we can
  if (state.lastDomain) {
    const diff = candidates.filter((t) => (t.domain || "") !== state.lastDomain);
    if (diff.length) candidates = diff;
  }
  // never repeat the exact same topic back-to-back if avoidable
  if (candidates.length > 1 && state.lastId) {
    const diff = candidates.filter((t) => t.id !== state.lastId);
    if (diff.length) candidates = diff;
  }
  return weightedPick(candidates);
}

/* ---- Spin! ---- */
function spin() {
  if (state.spinning) return;
  const pool = matchingTopics();
  if (!pool.length) return;

  const winner = chooseWinner(pool);
  state.lastId = winner.id;
  state.lastDomain = winner.domain || null;

  state.spinning = true;
  el.spinBtn.disabled = true;
  el.result.classList.add("hidden");
  el.reel.classList.remove("landed");
  el.reel.classList.add("spinning");

  // Slot-machine effect: cycle random names, decelerating, then land.
  let delay = 55;
  const startTime = Date.now();
  const minSpinMs = 1500;

  function tick() {
    const random = pool[Math.floor(Math.random() * pool.length)];
    el.reelText.textContent = topicTitle(random);

    const elapsed = Date.now() - startTime;
    delay *= 1.11; // slow down as time passes

    if (elapsed >= minSpinMs && delay > 220) {
      land(winner);
      return;
    }
    setTimeout(tick, delay);
  }
  tick();
}

function land(winner) {
  el.reelText.textContent = topicTitle(winner);
  el.reel.classList.remove("spinning");
  el.reel.classList.add("landed");
  state.spinning = false;
  el.spinBtn.disabled = false;
  renderResult(winner);
}

/* ---- Result card ---- */
function domainBlurb(t) {
  const list = state.clusterMap[`${t.subject}|${t.domain}`];
  if (!list || !list.length) return null;
  const age = state.kid ? state.kid.age : 99;
  // pick the summary whose ageRangeStart is the closest one at/below the kid's age
  let best = null;
  list.forEach((c) => {
    const s = c.ageRangeStart != null ? c.ageRangeStart : 0;
    if (s <= age && (!best || s > best.ageRangeStart)) best = c;
  });
  if (!best) {
    best = list.reduce((a, b) =>
      (a.ageRangeStart != null ? a.ageRangeStart : 99) <
      (b.ageRangeStart != null ? b.ageRangeStart : 99) ? a : b
    );
  }
  return best ? best.summary : null;
}

function renderResult(t) {
  const evidence = Array.isArray(t.evidence) ? t.evidence.filter(Boolean) : [];
  const badges =
    `<span class="badge subject">${escapeHtml(t.subject || "Topic")}</span>` +
    (t.domain ? `<span class="badge">${escapeHtml(t.domain)}</span>` : "");

  const blurb = domainBlurb(t);
  const blurbHtml = blurb
    ? `<p class="blurb">💡 ${escapeHtml(blurb)}</p>`
    : "";

  let checklist = "";
  if (evidence.length) {
    checklist =
      `<p class="checklist-title">📋 Things to show in your presentation</p>` +
      `<ul class="checklist">` +
      evidence.map((e) => `<li>${escapeHtml(e)}</li>`).join("") +
      `</ul>`;
  }

  let tip = "";
  if (t.assessmentPrompt) {
    const prompt = t.assessmentPrompt.replace(/\{\{name\}\}/g, state.kid.name);
    tip =
      `<div class="parent-tip"><strong>Grown-up check-in:</strong> ` +
      `${escapeHtml(prompt)}</div>`;
  }

  el.result.innerHTML =
    `<div class="badges">${badges}</div>` +
    `<h3>${escapeHtml(topicTitle(t))}</h3>` +
    `<p class="desc">${escapeHtml(t.description || "")}</p>` +
    blurbHtml +
    checklist +
    tip +
    `<button class="again-btn" type="button">🎡 Spin again</button>`;

  el.result.classList.remove("hidden");
  el.result
    .querySelector(".again-btn")
    .addEventListener("click", () => {
      el.result.scrollIntoView({ behavior: "smooth", block: "start" });
      spin();
    });
  el.result.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---- Helpers ---- */
function topicTitle(t) {
  if (t.name) return t.name;
  const d = t.description || "Mystery Topic";
  return d.length > 60 ? d.slice(0, 57) + "…" : d;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

el.spinBtn.addEventListener("click", spin);
init();
