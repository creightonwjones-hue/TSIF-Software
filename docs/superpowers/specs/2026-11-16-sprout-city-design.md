# Plan: "Sprout City" — an investing game for 5th graders

## Context
The TSIF Club wants a fun web game for teaching investing to a class of about 30 fifth graders. The club runs the session, and every kid plays on their own device (a Chromebook or tablet) during class time. It's a single-player game: everyone plays the same scenario, and at the end the club compares results to pick winners. The repo (`TSIF-Software`) is empty apart from a README.

**What kids should walk away knowing:**
1. A stock = owning a piece of a company.
2. News moves prices up and down, and you can't perfectly predict them.
3. Don't put all your eggs in one basket (diversification).
4. Being patient helps money grow, and panic-selling in a crash hurts.
5. Saving (safe, slow) is different from investing (risky, can grow more). Bonds sit in between. Borrowing costs money.

**Anti-goals:** a game that teaches "go all-in on one lucky stock" or "borrow as much as you can"; text-heavy lessons that interrupt play; a game that depends on Wi-Fi or a server working on game day.

## Approaches (decided)
- **A. Static web page, no server** ← **chosen for v1.**
- B. Static page plus a live class leaderboard (Firebase, nicknames only). Deferred. The code should make it easy to add later.
- C. Full app with accounts and a dashboard. Rejected as overkill, and it raises kids' privacy issues.

## Decided by the user
- **Name: Sprout City.**
- **10 years.** Each year works as one turn, but the game only calls them "years."
- Individual play, same scenario for everyone, compared at the end. Winner = most money, plus bonus awards.
- Goofy hometown theme in a **cartoon top-down town** with chunky outlines.
- **The kid walks a character around the town.** Walking into a door opens a **full-screen view of that building's actions**.
- Buildings have **purposes**; a building does not stand for a single stock:
  - 🏦 **Bank:** deposit savings or take out a loan.
  - 📈 **Stock Exchange:** buy and sell **more stocks** plus a **small set of bonds**.
- **Colors ("Sunny Saturday"):** sky #8ED1FC, grass #7BD389, roads #F4E1B5, coral buttons #FF8A5B, yellow money/coins #FFD23F, navy text and outlines #2B2D42, up #2ECC71 with ▲, down #E74C3C with ▼, white rounded panels.

## Game design (my calls, which the user can change)

**Start screen:** "Sprout City" title, the kid picks one of about 6 avatars and types a nickname (stored only on the device), and the club picks a scenario (menu, or a link like `?scenario=2`). Then a short guided walk: "Walk to the Bank →", "Now the Stock Exchange →", "Ring the Town Clock to finish the year."

**The town (small enough to cross in about 5 seconds):**
- 🏦 **Bank**
- 📈 **Stock Exchange**
- 📰 **News Stand:** this year's headline plus the occasional "hot tip" rumor. The headline also pops up automatically at the start of each year.
- 🕰️ **Town Clock:** walk in and confirm "End Year 3?" → the year advances. (There's also a small HUD button so tablet players don't have to walk.)
- A few decorative goofy buildings (SlimeCo factory, Rocket Burgers) that match companies on the exchange, for flavor only.

**HUD (always visible):** Year X of 10 · 💵 Cash · 📊 Total worth · 💳 Debt (if any).

**Controls:** arrow keys or WASD on Chromebooks; tap-to-walk on tablets. Collisions use simple tile rectangles.

**Bank screen (full-screen):**
- **Savings:** deposit or withdraw anytime. Earns **3%/yr** and never goes down.
- **Loan:** borrow up to $500. **8%/yr** interest is added to the debt each year, and the kid can repay anytime. Debt is **subtracted from the final total**. The screen shows plainly: "Borrow $500 → you'll owe $540 next year."

**Stock Exchange screen (full-screen):** two tabs, **Stocks** and **Bonds**. Each row shows the name and emoji, the price, the ▲/▼ change since last year, a sparkline, shares owned, and a +/− amount picker with Buy/Sell. Tapping a row shows a one-line company description and a risk meter (🟢 steady → 🔴 wild). Shares are whole numbers only, with no fees.

**Stocks (about 12, mixed risk):**
| Company | Risk | Reacts to |
|---|---|---|
| 🧺 Whole City Basket (index fund) | 🟢 | average of all |
| 🛒 Corner Grocery | 🟢 | barely anything |
| 💡 Sprout Power & Light | 🟢 | weather, slightly |
| 🍔 Rocket Burgers | 🟡 | food fads |
| 🐶 Puppy Pals Toys | 🟡 | holidays, fads |
| 🚌 Zoom Bus Co. | 🟡 | gas prices, city news |
| 🎮 Pixel Arcade | 🟡 | new game releases |
| 👟 Bouncy Sneakers | 🟡 | sports seasons |
| 🍦 Frosty Cone | 🟠 | weather (big swings) |
| 🌱 Sprout Farms | 🟠 | rain and drought |
| 🧠 SlimeCo | 🔴 | school bans, crazes |
| 🚀 MoonRocket | 🔴 | hype and rumors (usually flops) |

**Bonds (3):** buy at $100 each. They pay fixed yearly interest into cash, and the kid can sell back at a price that barely moves.
- 🏛️ Sprout City Bond — 4%/yr, the safest
- 🏫 School Bond — 5%/yr, safe
- 🎢 Wild Ride Bond (a risky company's bond) — 10%/yr, but **can default** in some scenarios (it stops paying, and its price drops). Teaches "higher interest = more risk."

**Price model:** new price = old price × (1 + event effect for that company + small noise). The noise comes from a seeded random generator, so each scenario is **exactly the same for every kid**.

**Scripted story beats (scenario 1):** a mostly positive start; a MoonRocket rumor in year 3 at the News Stand (it crashes in year 4); a **city-wide crash in year 6** (stocks down about 30%, bonds and the bank unaffected); recovery in years 7–10, so patient holders come out ahead. Write 2–3 scenarios in total, one of which has the Wild Ride Bond default.

**Lessons appear in the game itself:** a one-line "💡 Did you know?" after relevant moments (first share bought, first loan, the crash, a rumor flop). No lesson walls.

**End screen (Year 10):** final net worth in large type (cash + savings + investments − debt), a chart of net worth over 10 years with the crash marked, the awards earned, and a 3-line recap based on what this kid actually did. Big enough to read from across the room so the club can compare.

**Awards:**
- 🏆 **Top Grower:** final net worth (compared across the class)
- 🧺 **Best Diversified:** held 4+ different investments in most years
- 💎 **Steady Hands:** didn't sell stocks during the crash year
- 🐷 **Smart Saver:** kept money in savings or bonds the whole game
- 🕵️ **Rumor Buster:** didn't buy into the MoonRocket hype
- 💳 **Debt Free:** finished with no loan (or paid it off)

**Feel:** chunky rounded font (e.g., Fredoka from Google Fonts, with a system fallback), bounce and wiggle animations, a coin sparkle on gains, confetti at the end, and optional "cha-ching" and footstep sounds (Web Audio, with a mute button). Art is built from CSS/SVG shapes plus emoji, so no artist or image files are needed.

## How it gets built
Plain HTML/CSS/JavaScript (ES modules) with no build step, hosted free on GitHub Pages. Works offline once loaded, and laid out for Chromebook (1366×768) and tablet screens. The town is drawn on a `<canvas>` (tile map + avatar); the building screens are HTML overlays.

```
index.html
css/style.css          # Sunny Saturday tokens as CSS variables
js/engine.js           # pure game logic: state, bank, loans, stocks, bonds, advanceYear, awards. No DOM code.
js/scenarios.js        # companies, bonds, scenarios, yearly news/events as plain editable data
js/town.js             # canvas town map, avatar movement, door detection
js/screens/bank.js     # full-screen Bank UI
js/screens/exchange.js # full-screen Stock Exchange UI (Stocks / Bonds tabs)
js/screens/news.js, clock.js, end.js, start.js
js/main.js             # wiring, URL params, HUD
tests/engine.test.js   # node --test, no dependencies
```
- `engine.js` exports pure functions (`createGame`, `deposit`, `withdraw`, `borrow`, `repay`, `buy`, `sell`, `buyBond`, `sellBond`, `advanceYear`, `netWorth`, `computeAwards`, `finalResult`). `finalResult()` returns `{nickname, scenario, netWorth, awards}`, which is the exact hook a future leaderboard (approach B) will send.
- The seeded random generator (mulberry32) lives in the engine.
- Scenarios are written as readable data so club members can add news events without touching the logic.

Also save this design as `docs/superpowers/specs/2026-11-16-sprout-city-design.md`. Work on branch `claude/elegant-meitner-o829at`.

## Left to the builder
Exact starting prices and event effects (tune so a diversified, patient player beats both an all-in gambler and a max-loan gambler in most cases), the exact copy, the town layout, the avatar designs, and the animation details.

## Verification
1. `node --test tests/` covers: the same scenario gives identical prices every run; buy/sell math, including not being able to overspend or oversell; savings never drop; loan interest compounds and is subtracted from net worth; the borrow limit is enforced; bonds pay their coupons and the default case works; the Basket equals the average; each award fires correctly; and a simulated "diversified + patient" strategy beats "all-in MoonRocket" and "max loan into SlimeCo" in each scenario.
2. Play the full game with Playwright at 1366×768 and at tablet size: start → walk to the Bank (deposit, borrow) → Exchange (buy stocks and a bond) → Clock, repeated for 10 years → end screen. Screenshot each screen and check readability and that nothing overflows.
3. Load once, go offline, and confirm the game still plays.
4. Tell the user how to turn on GitHub Pages and share the link.

## Update 2026-11-17: cooler look + simpler Stock Exchange
After playtesting the live game, the user felt it was too kiddy (look and wording) and the Stock Exchange was an overload.
- **Look:** "Night Market" video-game-menu style replaces Sunny Saturday — dark navy, neon lime/cyan/orange/pink, Russo One + Rubik fonts, a town at dusk with neon buildings and street lamps, and a scoreboard HUD.
- **Wording:** news-ticker headlines, "PRO TIP" lessons, "YEAR 05 RECAP", "FINAL SCORE", and achievements (Spread the Risk, Steady Hands, Safety Net, Hype Detector, Debt Free). Companies got cooler names and ticker symbols. All the numbers are unchanged.
- **Stock Exchange:** clean read-only list; tap a row to open one trade card with Buy/Sell.
