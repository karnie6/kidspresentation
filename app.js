/* =========================================================================
   Topic Spinner — pick a random presentation topic for the kids.
   Data: Marble Open Taxonomy (topics.json), used under ODbL.
   ========================================================================= */

/* -------------------------------------------------------------------------
   👶 CONFIGURE YOUR KIDS HERE
   Change "name" to your child's real name. "age" must match the topic data
   (topics list ages 4–13). Add or remove entries as needed.
   ------------------------------------------------------------------------- */
const KIDS = [
  { name: "Camae", age: 5, emoji: "🐣" },
  { name: "Cyree", age: 8, emoji: "🚀" },
];

/* ------------------------------------------------------------------------- */

const state = {
  topics: [],
  kid: null,          // selected kid object
  subject: null,      // null = all subjects ("Surprise Me!")
  spinning: false,
  lastId: null,       // avoid immediately repeating the same topic
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
    const res = await fetch("data/topics.json");
    const data = await res.json();
    state.topics = Array.isArray(data) ? data : data.topics || [];
  } catch (e) {
    el.reelText.textContent = "Couldn't load topics 😢";
    console.error(e);
    return;
  }
  renderKidButtons();
  renderSubjectChips();
  updateMatchCount();
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

  // "Surprise Me!" = all subjects
  addChip("✨ Surprise Me!", null, true);
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
function matchingTopics() {
  if (!state.kid) return [];
  const age = state.kid.age;
  return state.topics.filter((t) => {
    const start = t.ageRangeStart, end = t.ageRangeEnd;
    const ageOk = start != null && end != null && age >= start && age <= end;
    const subjOk = !state.subject || t.subject === state.subject;
    return ageOk && subjOk;
  });
}

function updateMatchCount() {
  const n = matchingTopics().length;
  const who = state.kid ? state.kid.name : "someone";
  const where = state.subject ? ` in ${state.subject}` : "";
  el.matchCount.textContent = n
    ? `${n} topic${n === 1 ? "" : "s"} ready for ${who}${where}.`
    : `No topics match yet — try another subject.`;
  el.spinBtn.disabled = n === 0 || state.spinning;
}

/* ---- Spin! ---- */
function spin() {
  if (state.spinning) return;
  const pool = matchingTopics();
  if (!pool.length) return;

  // pick winner, avoiding an immediate repeat when possible
  let winner = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && winner.id === state.lastId) {
    winner = pool[(pool.indexOf(winner) + 1) % pool.length];
  }
  state.lastId = winner.id;

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
    // slow down as time passes
    delay *= 1.11;

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
function renderResult(t) {
  const evidence = Array.isArray(t.evidence) ? t.evidence.filter(Boolean) : [];
  const badges =
    `<span class="badge subject">${escapeHtml(t.subject || "Topic")}</span>` +
    (t.domain ? `<span class="badge">${escapeHtml(t.domain)}</span>` : "");

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
  // fall back to a trimmed description if a topic has no name
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
