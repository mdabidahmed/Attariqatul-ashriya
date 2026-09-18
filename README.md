# At-Tareeqatul Asriyyah — practice app

A multiple-choice drilling app for the exercises in **At-Tareeqatul Asriyyah, Part I**
(الطريقة العصرية). Every question shows exactly four options and you pick one.

It is built for daily use by one learner: land on the app, tap once, practise for a few
minutes, and have the words you got wrong come back until they stick.

## Running it

```bash
npm install
npm run dev
```

Then open <http://localhost:5173>. `./start.sh` does the same thing if you prefer a script.

| Command              | What it does                                          |
| -------------------- | ----------------------------------------------------- |
| `npm run dev`        | Dev server with hot reload on <http://localhost:5173> |
| `npm test`           | Vitest unit tests for the question engine             |
| `npm run test:watch` | The same tests in watch mode                          |
| `npm run typecheck`  | `tsc -b` across app, tests and the Vite config        |
| `npm run lint`       | ESLint (including the React hooks rules)              |
| `npm run format`     | Prettier                                              |
| `npm run build`      | Typecheck, then a production build into `dist/`       |
| `npm run preview`    | Serve the built `dist/` on <http://localhost:4173>    |

Requires Node 18+ (developed on Node 24). No other tooling.

## The data contract

The app reads `data/lessons.json` **at runtime** — it is deliberately not bundled, so the
file can be replaced and picked up on a page refresh with no rebuild. Until that file
exists, the app falls back to the hand-made `data/lessons.seed.json` and shows a banner
saying so.

```jsonc
{
  "book": { "titleEn": "At-Tareeqatul Asriyyah, Part I", "titleAr": "الطريقة العصرية" },
  "lessons": [
    {
      "id": 9,
      "titleEn": "Lesson Nine",
      "titleAr": "أَلدَّرْسُ التَّاسِعُ",
      "topicEn": "Prepositions fi / alaa / fawqa / tahta",
      "scanPages": [12],
      "bookPages": [34, 35],
      "vocabulary": [{ "en": "Pocket", "ar": "جَيْبٌ" }],
      "sentences": [
        {
          "ar": "أَلْقَلَمُ فِي الْجَيْبِ",
          "en": "The pen is in the pocket",
          "group": "فِي",
          "derived": true,
        },
      ],
      "qaPairs": [
        { "questionAr": "أَيْنَ الْقَلَمُ؟", "answerAr": "أَلْقَلَمُ فِي الْجَيْبِ", "derived": false },
      ],
      "translateToArabic": [{ "en": "Where is your brother?", "ar": "أَيْنَ أَخُوكَ؟", "derived": true }],
      "translateToEnglish": [
        { "ar": "أَلْخَطِيبُ عَلَى الْمِنْبَرِ", "en": "The preacher is on the pulpit", "derived": true },
      ],
      "notesEn": ["..."],
    },
  ],
}
```

Every array is optional. `src/domain/validateBook.ts` validates the file at runtime:
malformed lessons and half-written entries are **skipped and reported** in a non-blocking
notice naming what was dropped, rather than crashing or silently losing content. The app
only falls back to the seed file when the live file is missing, unparseable, or contains no
usable lesson at all.

### How `/data/lessons.json` is served

A small inline Vite plugin in `vite.config.ts` (no extra dependencies) handles both modes:

- **Dev** — a `configureServer` middleware serves `/data/*` straight from the repo's
  `data/` directory with `Cache-Control: no-store`, so editing the file and refreshing is
  enough. Requests are path-traversal guarded, and a missing file returns a clean 404.
- **Build** — a `closeBundle` hook copies `data/` into `dist/data/`, so the built output is
  self-contained and `npm run preview` (or any static host) serves it from there.

There is deliberately **no** preview middleware: `npm run preview` serves the real
`dist/data`, so a broken copy step cannot hide behind the dev server.

Because `dist/data` is a build-time snapshot, a production build needs re-running (or the
file copying into `dist/data/`) to pick up new lesson content. Dev picks it up live.

## Project layout

```
index.html              font <link>s and the app mount point
vite.config.ts          React plugin + the inline /data static plugin
data/
  lessons.json          written by the extraction process (not committed here)
  lessons.seed.json     hand-made fallback: Lessons Three, Four and Nine
src/
  domain/               framework-free, unit tested — no React, no DOM
    types.ts            the shared vocabulary for everything below
    arabic.ts           harakat-insensitive normalisation and comparison
    rng.ts              seeded PRNG, shuffle, stable content hashing
    validateBook.ts     runtime validation of the lesson JSON
    items.ts            lessons -> drillable items with stable ids
    bookIndex.ts        precomputed views, so the UI never rescans the bank
    questions.ts        items -> four-option questions, distractor selection
    scheduler.ts        Leitner-box spaced repetition
    plan.ts             which lesson to work on next
    session.ts          which items to drill, in what order
    lessonRanges.ts     selection ranges and lesson search
    scoring.ts          session -> results summary
    studyState.ts       the persisted record: schedules, streak, lifetime
  data/loadBook.ts      runtime fetch with the seed fallback
  state/                localStorage-backed hooks (study, setup, font)
  hooks/                keyboard handling and a render-safe clock
  components/           thin presentational React components
  testing/              synthetic 75-lesson fixture for tests and profiling
  styles/               tokens.css, base.css, components.css
tools/
  make-sample-book.mjs  writes a synthetic book for browser profiling
screenshots/            desktop and phone captures of each screen
```

The hard boundary is `src/domain`: it is pure TypeScript with no imports from React or the
DOM, which is why it can be tested directly with Vitest and why the components stay small.

## Working at the size of the whole book

The book is 75 lessons and roughly 4,500–6,500 drillable items, which changes what
the interface can do:

- **The home screen shows what is in play, not everything.** Only lessons you have
  started plus the next one get a full row; the rest of the book is a grid of tiles
  tinted by mastery, which doubles as a map of where you are. "Show all 75" expands
  the full list on demand — that view is about 10,000px tall, which is exactly why it
  is not the default.
- **The lesson picker is searchable.** Filter by lesson number or topic text, select a
  range ("lessons 1 to 20"), or select and clear the current filter. The selection is
  shown as collapsed ranges ("1–20, 34, 51–52") rather than by expanding 75
  checkboxes. Search matches the Arabic topics too, ignoring harakat, since many of
  this book's topics are written in Arabic.
- **A new student starts at lesson one.** The primary action is "Practise Lesson N" for
  the earliest lesson with unseen material, mixed with whatever is genuinely due from
  the lessons already begun. Interleaving lesson seventy with lesson one would be
  worse than useless on a graded book, so the default selection is never all 75.
  A `next` session also reserves about a third of its slots for new material, so a
  large backlog of mistakes cannot crowd out forward progress indefinitely.
- **`topicEn` appears wherever a lesson is named** — on the home screen, in the picker,
  on the quiz header, in the feedback provenance line and in the results breakdown.
  "Lesson Fifty-Four · Counting from 1 to 10" is far easier to navigate than a number.
- **Reference-only lessons.** Several lessons ("Dictation and laws of Dictation") teach
  orthography and may carry no quizzable exercises. Those are kept, marked _Reference_,
  shown with a dash instead of a permanent 0%, excluded from the "next lesson" pointer,
  and open a reading view of their notes rather than a dead-end quiz.

### Performance

Measured in Chrome against a synthetic 75-lesson book (6,487 items, a 697kB payload):

| Step                                 | Cost  |
| ------------------------------------ | ----- |
| `JSON.parse` of the payload          | 1ms   |
| `validateBook`                       | 2ms   |
| `buildItems` (whole book)            | 48ms  |
| `buildBookIndex`                     | 4ms   |
| `composeSession` (20 questions)      | 2ms   |
| `buildQuestions` (20 questions)      | 2ms   |
| First contentful paint               | 152ms |
| Tap "practise" to question on screen | 6ms   |
| Answer to feedback painted           | ~31ms |
| Picker keystroke (input update)      | 1–2ms |

No task exceeded 50ms during interaction. Two things make that possible:

- **`bookIndex.ts` answers availability analytically.** "How many questions can these
  lessons produce?" is asked on every render, and running the real distractor search to
  find out is O(items × pool) — seconds on a full book. The index instead counts, per
  pool, how many distinct answers exist and how many are locked to a single prompt,
  which makes the per-item answer O(1). A test pins those counts to what the question
  builder actually produces, so the shortcut cannot drift.
- **Per-lesson roll-ups happen in one pass.** `lessonMasteryAll` walks the bank once
  rather than filtering all 6,000 items per lesson, and the picker precomputes its
  search text once per book instead of re-normalising 75 Arabic topics per keystroke.
  Filtering uses `useDeferredValue`, so the input never waits for the list.

`localStorage` holds one compact tuple per practised item,
`[box, due, seen, correct, streak, lastSeen, introduced]`, with second-resolution
timestamps and trailing zeros trimmed. A fully practised 75-lesson book comes to roughly
300kB against a typical 5MB budget; version 1's object form was about twice that and is
migrated on read rather than discarded. It is written once per finished session, not per
answer.

### Developing against a full-size book

The extracted `data/lessons.json` may still be partial, so there is a generator for a
realistic stand-in:

```bash
npm run sample:book                       # data/lessons.sample-75.json
npm run sample:book -- /tmp/book.json 75  # or anywhere else
```

It refuses to write `data/lessons.json`, which belongs to the extraction process. The
same generator backs the Vitest scaling suite, so those tests do not depend on the
extraction being finished. Its Arabic is generated rather than quoted — well-formed
vocalised text that exercises the normaliser and distractor rules, but not book content.

## Quiz modes

| Mode                     | Prompt          | Options              |
| ------------------------ | --------------- | -------------------- |
| Arabic → English         | an Arabic word  | English meanings     |
| English → Arabic         | an English word | Arabic words         |
| Sentence translation     | a full sentence | the other language   |
| Arabic question & answer | `questionAr`    | candidate `answerAr` |

### Distractor rules

These are what separate a useful quiz from a guessable one:

- Always exactly three distractors plus one correct answer, shuffled.
- Distractors come from the same mode **and** the same answer language, preferring the same
  lesson, then lessons within two, then within five, then the whole book.
- No option may duplicate the correct answer after Arabic normalisation — harakat, tatweel
  and alif variants are stripped, so an option that differs only in vowelling can never
  appear. The same normaliser is used for every comparison in the app.
- Two entries that share a prompt are never offered against each other. "Boy" and "Child"
  both gloss طفل, so neither can be a wrong answer to the other.
- Sentence and Q&A distractors are matched on length, so the correct answer is not
  identifiable by shape alone.
- A question is **skipped** rather than padded with junk if the book cannot supply three
  valid distractors.
- Everything is shuffled with a seeded PRNG, so a session is reproducible from its seed and
  the correct answer is not biased toward any position.

## Learning design

- **Spaced repetition.** Every item sits in a Leitner box (0–5) with a due date, kept in
  `localStorage`. A wrong answer drops it to box 0 where it is due immediately and keeps
  returning; each correct answer promotes it and pushes the next review out
  (1, 3, 7, 16, 35 days), so known words stop consuming session slots.
- **Mistake-driven drilling.** Missed items form a weak pool: "Drill mistakes" on the home
  screen and "Drill the N you missed" on the results screen practise only those.
- **Interleaving.** Sessions are ordered so neighbouring questions switch both mode and
  lesson, rather than blocking one kind of question together.
- **Recognition before production.** English → Arabic for a word is withheld until the
  easier Arabic → English direction has reached box 2. The gate only applies when both
  directions are selected, so asking for production alone still works.
- **Pre-exposure.** "Learn words" is a flashcard pass over a lesson's vocabulary with the
  meaning hidden until revealed. It is not scored; it just marks words as seen so they are
  not cold on first test.
- **Short sessions.** 10/20/50/all, with a visible question counter and progress meter. A
  mixed session caps brand-new material at about 40% so you are never asked to learn
  twenty unseen words at once.
- **Feedback that teaches.** After a wrong answer the panel names the mistake, shows the
  correct pairing, and where the data allows shows the model sentence from the book that
  uses the word, plus the lesson and book page. This is the screen that does the teaching.
- **Gentle motivation.** A day streak, per-lesson mastery meters and lifetime accuracy.
  Nothing scolds.

## Arabic typography and fonts

Arabic is the content, so it is set larger than the English around it, with generous
line-height and vertical padding so harakat are never cramped or clipped. Every run of book
text goes through the `Phrase` component, which sets `dir`, `lang` and
`unicode-bidi: isolate` — that isolation is what stops a line mixing Arabic and English
from reordering.

Fonts are loaded from Google Fonts and `verses.quran.foundation`:

- **Amiri** — the default for all quiz Arabic. It is a Naskh face, it matches how the
  textbook is typeset, and it renders vocalised text far more legibly at small sizes than a
  Nastaliq face does.
- **IndoPak Nastaleeq** — the preloaded woff2. A `<link rel="preload">` only warms the
  cache, so the `@font-face` rule is declared in `src/styles/base.css`.
- **Noto Nastaliq Urdu** — the third option.
- **Spectral** for English text, **IBM Plex Mono** for monospaced.

The Arabic face is chosen in **Arabic font** on the home screen and persisted in
`localStorage`. The choice sets `data-arabic-font` on `<html>`, which swaps both the font
stack and its vertical rhythm: Nastaliq descends steeply and stacks diagonally, so it gets
substantially more line-height and padding than Naskh. Each webfont has a local fallback
(`Geeza Pro`, `Al Bayan`, …) so the app stays readable offline, and `display=swap` means
text is never invisible while fonts load.

## Testing

```bash
npm test
```

126 Vitest tests over `src/domain`, covering the invariants that matter:

- exactly four options, with the correct answer present exactly once and `correctIndex`
  agreeing with it;
- no option pair that collides after harakat stripping, and no distractor that is a
  diacritic-only variant of the answer;
- the correct answer spread evenly across all four positions over many seeds;
- identical output for a fixed seed, different output across seeds;
- graceful behaviour when a lesson has too little data to form a question (skip, not pad);
- scheduler promotion and demotion, streaks across day boundaries, and recovery from a
  corrupt `localStorage` record;
- the validator skipping malformed lessons and reporting them;
- the scaling behaviour above: index counts matching the real question builder, session
  composition timing, one-pass roll-ups, the storage budget, lesson search and range
  selection, and reference-only lessons never producing a dead-end session.

The suite also runs against `data/lessons.json` when that file exists, so it doubles as a
check on incoming book data.

## Accessibility and input

- `1`–`4` or `A`–`D` answer; `Enter` or `Space` advances. The hint is on screen.
- Focus moves to **Next** once an answer is locked, so keyboard users are never stranded.
- Options lock after answering, so a question cannot be re-answered.
- Correctness is never colour alone — every state carries an icon and a word.
- Answer feedback is announced through an `aria-live` region.
- Space is reserved for the feedback panel, so answering does not move the options.
- Light and dark themes via `prefers-color-scheme`; motion respects
  `prefers-reduced-motion`.
