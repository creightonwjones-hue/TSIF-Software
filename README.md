# TSIF-Software
Software for the TSIF Club

## 🌱 Sprout City — an investing game for 5th graders

Each kid starts with **$1,000** and has **10 years** to grow it. They walk around a pixel-art main street:

- **Bank**: put money in savings (safe, +3%/yr) or take out a loan (costs 8%/yr)
- **Stock Exchange**: 12 made-up companies (with ticker symbols) and 3 bonds
- **Lemonade Stand**: run one shift a year and buy upgrades that grow the business
- **News Stand**: this year's news, plus the occasional "hot tip" (often just hype!)
- **Home**: go to sleep to end the year and see what happened

At the end, kids see their **final score** (net worth: show it to the club leader; the highest wins Top Grower) and the achievements they unlocked: Spread the Risk, Steady Hands, Safety Net, Hype Detector, Debt Free, Business Owner.

### Running it in class
- Play link: **https://creightonwjones-hue.github.io/TSIF-Software/**
- Everyone should play the **same game** so it's fair. Pick it on the start screen, or share a link like `…/TSIF-Software/?scenario=2`.
  - Game 1: The Great Slump · Game 2: Wild Weather · Game 3: Boom Town
- Controls: arrow keys / WASD, or tap the map. The **End Year** button in the top bar works too.
- If a kid refreshes the page, they can pick up where they left off (saved on their device only).
- No accounts, no data sent anywhere. Kids should use a nickname, not their full name.

### Editing the game (club members)
Everything you'd want to change — company names, news headlines, how much the news moves prices, the lemonade stand's prices and upgrades — is in **`js/scenarios.js`**, with comments explaining each part.

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
