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

## Update 2026-11-18: cozy pixel "main street" redesign, Home, and a lemonade business
The neon look and the isometric city-builder mockup were both rejected; the user compared three 2D mockups and picked **cozy pixel art** (Stardew-like), then asked to drop the log-cabin/brown feel.

**Look (decided):**
- Top-down pixel-art town on a 16px tile grid, scaled up crisply.
- Buildings: brick bank, stone townhouse, cream-stone Stock Exchange with columns, painted-siding shops with awnings, cobblestone streets, hedges, lamp posts, a pond, and a tree border.
- UI: light cream panels with dark slate pixel borders, green (Buy / primary) and red (Sell) accents, a soft-blue background behind building screens, and the **Jersey 10** pixel font (picked because its C/O and 5/9 are easy to tell apart).
- Buildings open **full screen** (no side panel).

**Town Clock → Home (decided):** walk home to end the year (like going to bed in Stardew). The "End year" button in the top bar stays as a shortcut.

**Lemonade Stand business (decided):** teaches how a business grows, without making stocks useless.
- One shift per year. Each shift has a fixed number of customers; you click to serve them. Every kid can finish, so **upgrades decide earnings, not click speed**.
- Three one-time upgrades: Better recipe (+$1 per customer), Bigger stand (+5 customers), Hire a helper (earns a fixed amount each year with no clicking).
- Upgrade costs are paid from cash and are not counted as assets, so each upgrade is a real choice against investing ("pays back in ~N years").
- Earnings land in cash. Cash doesn't grow, so investing the profits is what makes money grow.
- Balance rule, enforced by tests: business-only ≲ investing-only < doing both, in every scenario.
- New achievement: **Business Owner** — ran your shift every year.

**Builder's calls:** exact business numbers (set in `js/scenarios.js` → `SETTINGS.business` and tuned by tests); Lemonade Stand placed on the south side of the street; 4-step tutorial: Bank → Exchange → Lemonade Stand → Home; tap-to-walk uses tile pathfinding so kids can tap any building.

## Update 2026-11-18 (later): bring the town to life
The user liked the main-street pixel design but found it bland and said the lemonade stand didn't look like one.
- The Lemonade Stand is now an open-air stand (striped canopy, counter, pitcher, cups, lemons, chalkboard). Customers wait in line until you run your shift; upgrades show up on the stand.
- Seasons cycle each year (a scenario year can force one with `season`), plus townsfolk, ducks, chimney smoke, butterflies, birds, petals, leaves and snow.
- Reactive buildings: a price ticker on the Exchange roof, a "!" on the News Stand for hot tips, and sparkles on the Bank when you have savings.
- Each building screen has an animated pixel scene (`js/scenes.js`); the lemonade shift serves customers in an animated scene.
- Polish: the top bar's numbers roll, prices flash on a new year, the recap reveals step by step, fireworks on the final score, and optional chiptune music (off by default).
- Respects `prefers-reduced-motion`.

## Update 2026-11-18 (later still): real architecture, natural edges, and spotting yourself
- Bank and Stock Exchange are classical stone buildings (flat roofs, pediments, columns, steps). The Exchange has flags, a rooftop price ticker and a bronze bull statue; the News Stand is a green newspaper kiosk with magazine racks and a sandwich board.
- The ring of trees is gone: Main Street runs off both edges, the cross street crosses a creek on a footbridge, and the edges have tree clusters, rocks, bushes, a picket fence and a wildflower meadow.
- Your character has a yellow name tag and a glowing ring at their feet; townsfolk wear muted colors.

## Update 2026-11-18 (evening): life events and the Mine
- **Life events** (`event: { text, amount }` per scenario year): money in, or bills paid from cash → savings → forced sale of stocks (biggest holding first) → bonds → emergency loan (allowed past the limit). Forced sales aren't counted as panic sells. Each game has a big bill in the year right after its crash. New achievement: **Rainy Day Ready**.
- **The Mine** replaces the decorative factory: one shift a year, a 6×4 rock grid seeded per game and year, 10 swings; coal $1, silver $3, gold $6 (best shift ≈ $26). Ore rocks show specks; gold glints most.
- **Balance with work + life events:** doing nothing ≈ $780–840; investing only ≈ $1,260–1,320; working only (stand + mine) ≈ $1,380–1,440; working + investing ≈ $1,930–1,970. Tests require working + investing to beat investing-only and to beat working-only by more than 15%.

## Update 2026-11-18 (night): the Mine becomes a "dig deeper" game
The user wanted the mine to take more skill and be more fun: push-your-luck digging, with readable (never random) danger.
- 9×10 side-view mine per game and year. Steer the miner with the arrow keys, WASD, or a tap; dig left, right or down; walk back through your own tunnel for free; climb only through tunnel you've dug. The lantern lights 2 tiles around you, and your tunnel stays lit.
- Ore by depth: coal $2 (top), silver $4, gold $8, one gem $15 at the bottom.
- Energy 24: dirt costs 1, hard stone 2; climbing home costs 1 per level. Run out underground and you're rescued with half your haul.
- Cracked rock: can't be dug, and digging right next to it causes a cave-in (you lose the cart), unless you Brace first (2 beams). A red "!" outline warns about dangerous tiles next to you.
- Shared rules in the engine (`mineMap`, `mineStep`, `runMine` replays the moves); an in-progress trip is saved, and leaving mid-trip counts as heading home. Maps are rerolled until a safe route to gold exists; a careful-miner bot (no beams) averages about $21 a trip.

## Update 2026-11-18 (late): the Mine becomes "follow the vein"
The user found the cave-in mineshaft confusing and rejected geodes as too much gambling. They wanted ore to be a surprise but the game to reward skill.
- A 10×6 rock wall, seeded per game and year (same for every kid). Hardness is visible: dirt 1 hit, rock 2, granite 3.
- Ore is hidden in connected veins: coal ×5 ($1), iron ×4 ($2), silver ×4 ($3), gold ×3 ($5).
- 25 swings. Unbroken ore next to broken ore sparkles, so finding the rest of a vein is skill. Breaking the 3rd+ ore block in a row from the same vein adds +$1.
- No betting and nothing to lose. A vein-following bot averages about $30 a shift; random tapping about $9. The balance rules are unchanged.
- Shared engine rules (`mineWall`, `mineProgress`, `runMine` replays the hits). An in-progress shift is saved each swing; leaving early banks what's in the cart.

## Update 2026-11-18: the Dock (fishing with questions)
- A wooden dock on the pond. 3 casts a year. The lure lands in the Shallows; each right answer drops it one band deeper (6 bands: Shallows, Reeds, Rocky Ledge, Deep Water, The Drop-off, The Abyss) with a harder question tier. The first wrong answer stops it and shows the right answer with a one-line "why".
- Reel up: steer the hook (arrow keys / drag) into fish on the way back. The rod holds 4. Fish pay $1, $1, $2, $3, $4, $5 by band; junk (boot, can, seaweed) takes a slot and pays $0. Answering all 6 right adds a $2 bonus.
- 72 questions in `js/questions.js` (12 per tier). Questions are picked per kid (seeded by nickname, so neighbors get different ones) from the same tier; no repeats within a tier until it runs out. Fish are the same for every kid.
- Engine: `fishQuestion`, `castProgress`, `fishSchool`, `runCast` (replays answers, checks every hooked item was reachable), `castsLeft`, `fishStats`. New award: Master Angler (reached The Abyss).
- Balance (perfect catches): $12/yr knowing nothing, ~$33/yr reaching band 4, $60/yr perfect. Working + investing still beats working only by 30%+.

## Update 2026-11-18: dock on the river, town fills the window
- The Dock moved from the pond to the river at the bottom of town. The river is now 2 tiles wide (map is 32 × 19), and the cross street ends at a wooden pier where the footbridge used to be. You enter by walking down onto it (`doorTop` buildings). The pond is back to just ducks.
- No more navy bars: the canvas fills the play area. The whole town still fits at the same scale, and countryside fills the rest (Main Street and the river run on to the edges, with groves, fenced crop fields, bushes, rocks and wildflowers). Townsfolk walk out along Main Street, and weather covers the whole screen. The countryside is look-only.
- The tutorial bar moved to the top of the screen so it never covers the dock.

## Update 2026-11-18: fishing levels stay hidden until you reach them
- The lake is taller than the view (each level is 44 px tall), and a camera follows the lure down and back up. You see about 2 levels at a time.
- Levels below the lure are covered in solid dark water, and level labels only appear once reached. A "Level n · Name" badge shows where the lure is, without revealing how many levels there are (the question panel no longer shows level dots).
- The fish list in the side panel only shows levels reached in any cast this game (`fishStats().deepest`). The rest are "???".

## Update 2026-11-18: Shop, Home upgrades, leader controls
- **Shop** (new building between Home and the Exchange): wants that don't grow and aren't counted in net worth. Hats ($15–$120, wear one, switch free, drawn on your character), rides (scooter 1.3× / bike 1.6× walking speed), and treats (ice cream, video game, concert; each once a year). They're cash only, with no loans. Each card shows what the money could grow to at ~6%/yr. `opportunityCost()` shows what the want money would be worth in the Sprout City Index.
- **Home** is now a full screen: upgrades (garden $60 → +$10/yr, solar $200 → +$30/yr, workshop $90 → +3 mine swings, tackle shed $90 → rod holds 5) plus the end-the-year panel. The garden and panels appear on the Home building in town.
- **New award, Treat Yourself (Wisely):** bought a want, but spent no more than 10% of work earnings on wants. The end debrief shows wants spent vs. their Index value, and home-upgrade payback.
- **Leader controls** (`leader.html`): pick the game, skip the tutorial, and copy a class link (`?game=N&class=KEY[&tutorial=off][&codes=off]`). Year codes are `yearCode(key, year)`, 3 letters with no look-alikes. In class mode the start screen locks the game, and Home asks for the year's code before sleeping. Everything works offline.
