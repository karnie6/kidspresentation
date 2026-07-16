# 🎡 Topic Spinner

A little webapp that helps kids pick a **presentation topic** by "spinning the wheel."
Built for weekend family presentations to practice public speaking and spark curiosity.

## How it works

1. **Pick who's presenting** — kid buttons (configurable by name/age).
2. **Pick a subject** — or leave it on **✨ Surprise Me!** for any subject.
3. **Spin!** — a slot-machine reel lands on a random age-appropriate topic and shows:
   - the topic title + a kid-friendly description,
   - a **"Things to show in your presentation"** checklist to guide prep,
   - a grown-up check-in prompt.

## Customize your kids

Edit the `KIDS` array at the top of [`app.js`](app.js):

```js
const KIDS = [
  { name: "Ada",  age: 5, emoji: "🐣" },
  { name: "Leo",  age: 8, emoji: "🚀" },
];
```

`age` must fall within the topic data's range (ages 4–13).

## Running locally

It's a static site — no build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(A server is needed because the app `fetch`es `data/topics.json`; opening the
file directly via `file://` won't load the data.)

Deploy anywhere that hosts static files (e.g. GitHub Pages).

## Data & attribution

Topics come from the [Marble Open Taxonomy](https://github.com/withmarbleapp/os-taxonomy)
(1,590 micro-topics across 8 subjects), used under the
[Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
The dataset lives in [`data/topics.json`](data/topics.json).
