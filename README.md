# TSIF-Software
Software for the TSIF Club

## 🌱 Sprout City — an investing game for 5th graders

Each kid starts with **$1,000** and has **10 years** to grow it. They walk around a pixel-art main street:

- **Bank**: put money in savings (safe, +3%/yr) or take out a loan (costs 8%/yr)
- **Stock Exchange**: 12 made-up companies (with ticker symbols) and 3 bonds
- **Lemonade Stand**: run one shift a year and buy upgrades that grow the business
- **Mine**: one shift a year at a rock wall. You get 25 swings: dirt breaks in 1 hit, rock in 2, granite in 3. Ore (coal, iron, silver, gold) hides in connected veins, so once you find some, follow the sparkles to the rest — 3+ ore blocks in a row from one vein earn a bonus. Same wall for everyone each year; no betting, nothing to lose
- **Dock**: go fishing by the pond — 3 casts a year. Each right answer to an investing question sends your lure one level deeper (and the questions get harder); the first wrong answer stops it and shows the right answer. Then reel up and steer the hook into fish — deeper fish are worth more, your rod holds 4, and junk pays nothing
- **News Stand**: this year's news, plus the occasional "hot tip" (often just hype!)
- **Home**: go to sleep to end the year and see what happened

Each year can also bring a **life event**: surprise money (birthday gift, a contest prize) or a bill (vet visit, cracked phone). Bills come out of cash, then savings — and if that's not enough, the game sells your investments or takes out an emergency loan. That's the lesson behind keeping an emergency fund.

At the end, kids see their **final score** (net worth: show it to the club leader; the highest wins Top Grower) and the achievements they unlocked: Spread the Risk, Steady Hands, Safety Net, Hype Detector, Debt Free, Business Owner, Rainy Day Ready.

### Running it in class
- Play link: **https://creightonwjones-hue.github.io/TSIF-Software/**
- Everyone should play the **same game** so it's fair. Pick it on the start screen, or share a link like `…/TSIF-Software/?scenario=2`.
  - Game 1: The Great Slump · Game 2: Wild Weather · Game 3: Boom Town
- Controls: arrow keys / WASD, or tap the map. The **End Year** button in the top bar works too.
- If a kid refreshes the page, they can pick up where they left off (saved on their device only).
- No accounts, no data sent anywhere. Kids should use a nickname, not their full name.

### Editing the game (club members)
Everything you'd want to change — company names, news headlines, how much the news moves prices, the lemonade stand's prices and upgrades, life events, and what ore and fish are worth — is in **`js/scenarios.js`**, with comments explaining each part. The fishing questions are in **`js/questions.js`** (6 levels of difficulty; add your own!).

After editing, run the tests to make sure smart play (spreading money out and staying calm in a crash) still beats gambling, and that the lemonade stand helps without making investing pointless:

```bash
npm test
```

### Running it on your computer
The game uses JavaScript modules, so open it through a small local server, not by double-clicking `index.html`:

```bash
npm run serve
```

Then open http://localhost:8000.

### How the code is organized
| File | What it does |
|---|---|
| `js/scenarios.js` | Game data: companies, bonds, news for each year |
| `js/engine.js` | The money math (no screen code) |
| `js/town.js` | The walkable town map |
| `js/screens/*.js` | Each building's screen, plus start and end screens |
| `js/main.js` | Wires it all together |
| `css/style.css` | Colors and layout (cozy pixel "main street" theme) |
| `tests/` | Automated tests for the engine |
