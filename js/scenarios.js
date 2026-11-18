// =====================================================================
//  SPROUT CITY — GAME DATA
//  Club members: this is the file to edit! You can change company
//  names, descriptions, news headlines, and how much news moves prices.
//  Numbers like 0.25 mean "+25%". Negative numbers mean prices drop.
//  After editing, run `npm test` to check the game is still balanced.
// =====================================================================

export const SETTINGS = {
  years: 10,
  startingCash: 1000,
  savingsRate: 0.03,   // bank savings interest per year
  loanRate: 0.08,      // loan interest per year
  loanLimit: 500,      // most a player can owe at once (before interest)
  // The Mine: one trip per year. Dig your own tunnel; deeper ore is worth more.
  // Every dig costs energy (dirt 1, hard stone 2), and climbing home costs 1 per level deep.
  // Cracked rock can't be dug, and it caves in if you dig right next to it without a beam.
  mine: {
    cols: 9, rows: 10, energy: 24, beams: 2,
    ore: { coal: { value: 2, rows: [0, 3], count: 6 }, silver: { value: 4, rows: [3, 6], count: 4 },
           gold: { value: 8, rows: [6, 8], count: 3 }, gem: { value: 15, rows: [9, 9], count: 1 } },
    cracked: 9,      // cracked rocks (they like to sit near the good stuff)
    stoneFrom: 3,    // hard stone starts appearing at this row
  },
  // Lemonade Stand: one shift per year. Earnings depend on upgrades, not click speed.
  business: {
    customers: 10,     // customers per shift
    price: 2,          // dollars per customer
    upgrades: [
      { id: 'recipe', name: 'Better recipe', cost: 60,  desc: 'Tastier lemonade. +$1 per customer.', price: 1 },
      { id: 'stand',  name: 'Bigger stand',  cost: 100, desc: 'Room for more people. +5 customers each shift.', customers: 5 },
      { id: 'helper', name: 'Hire a helper', cost: 200, desc: 'Sells for you all year. +$25 every year, no clicking.', yearly: 25 },
    ],
  },
};

// risk: 1 = safe, 2 = medium, 3 = bumpy, 4 = wild
// drift = normal yearly growth, vol = how much random wiggle each year
export const STOCKS = [
  { id: 'basket',  ticker: 'CITY', color: '#2F6B4F', name: 'Sprout City Index', emoji: '🧺', risk: 1, start: 50, index: true,
    desc: 'Owns a slice of EVERY company in town. One buy = instantly diversified.' },
  { id: 'grocery', ticker: 'GROC', color: '#5E8C61', name: 'FreshMart Grocery', emoji: '🛒', risk: 1, start: 30, drift: 0.05, vol: 0.03,
    desc: 'People buy food no matter what, so sales stay steady in good times and bad.' },
  { id: 'power',   ticker: 'VOLT', color: '#D2A03C', name: 'Volt Power Co.',    emoji: '⚡', risk: 1, start: 40, drift: 0.05, vol: 0.04,
    desc: 'Runs the city\'s power grid. Heat waves mean everyone cranks the A/C.' },
  { id: 'burgers', ticker: 'BRGR', color: '#C4613F', name: 'Rocket Burgers',    emoji: '🍔', risk: 2, start: 25, drift: 0.07, vol: 0.08,
    desc: 'Most popular burger chain in town — until it tries a weird new menu item.' },
  { id: 'puppy',   ticker: 'PUPS', color: '#8C6BB1', name: 'PupTech Toys',      emoji: '🐶', risk: 2, start: 20, drift: 0.06, vol: 0.09,
    desc: 'Makes high-tech toy pets. One hit product can make its whole year.' },
  { id: 'bus',     ticker: 'ZOOM', color: '#5B7C99', name: 'Zoom Transit',      emoji: '🚌', risk: 2, start: 15, drift: 0.05, vol: 0.08,
    desc: 'Runs the city buses. Cheap gas and new routes help; bad weather hurts.' },
  { id: 'arcade',  ticker: 'PIXL', color: '#3F5BA9', name: 'Pixel Games',       emoji: '🎮', risk: 2, start: 35, drift: 0.07, vol: 0.10,
    desc: 'Video game studio. A hit game sends it flying. A delay hits hard.' },
  { id: 'sneakers',ticker: 'BNCE', color: '#2E8C8C', name: 'Bounce Athletics',  emoji: '👟', risk: 2, start: 30, drift: 0.06, vol: 0.08,
    desc: 'Sneakers and sports gear. Big sporting events are huge for sales.' },
  { id: 'frosty',  ticker: 'FRST', color: '#C97B9A', name: 'Frosty Cone',       emoji: '🍦', risk: 3, start: 12, drift: 0.05, vol: 0.12,
    desc: 'Ice cream shops. Hot summer = record sales. Cold year = empty stores.' },
  { id: 'farms',   ticker: 'FARM', color: '#7A9A3A', name: 'Sprout Farms',      emoji: '🌱', risk: 3, start: 18, drift: 0.05, vol: 0.12,
    desc: 'Grows the city\'s food. Rain is good news; droughts are bad news.' },
  { id: 'slime',   ticker: 'SLIM', color: '#4FA36B', name: 'SlimeCo',           emoji: '🧪', risk: 4, start: 10, drift: 0.02, vol: 0.20,
    desc: 'Makes slime. When it\'s trending, it explodes. When it\'s not, it crashes.' },
  { id: 'moon',    ticker: 'MOON', color: '#3D4A52', name: 'MoonRocket',        emoji: '🚀', risk: 4, start: 8,  drift: -0.04, vol: 0.20,
    desc: 'Promises to reach the moon. Huge hype, very few actual rockets.' },
];

export const BONDS = [
  { id: 'city',   ticker: 'CITY-B', color: '#5B7C99', name: 'City Bond',      emoji: '🏛️', risk: 1, price: 100, rate: 0.04,
    desc: 'Lend $100 to the city. It pays you 4% every year. About as safe as it gets.' },
  { id: 'school', ticker: 'SCHL-B', color: '#8A6E55', name: 'School Bond',    emoji: '🏫', risk: 1, price: 100, rate: 0.05,
    desc: 'Lend $100 to build a new school. Pays 5% every year. Safe.' },
  { id: 'ride',   ticker: 'RIDE-B', color: '#C4613F', name: 'Wild Ride Bond', emoji: '🎢', risk: 4, price: 100, rate: 0.10,
    desc: 'Lend $100 to a theme park company. Pays 10% a year — but if they run out of money, the payments stop.' },
];

export const DEFAULTED_BOND_PRICE = 40;

// ---------------------------------------------------------------------
//  SCENARIOS: everyone in class plays the same scenario, so it's fair.
//  Each year has:
//    headline : the news shown at the START of the year
//    outcome  : what actually happened, shown at the END of the year
//    market   : how much the whole town moves (affects every stock)
//    effects  : extra moves for specific companies
//    tip      : (optional) a "hot tip" rumor at the News Stand
//    lesson   : (optional) a tip shown with the year recap
//    season   : (optional) force the town's season: spring, summer, fall or winter
//    event    : (optional) a "life happens" card at the start of the year:
//               { text, amount } — positive = money in, negative = a bill you must pay
//               (otherwise the seasons cycle spring → summer → fall → winter)
// ---------------------------------------------------------------------
export const SCENARIOS = [
  {
    id: 1,
    name: 'The Great Slump',
    seed: 20261,
    crash: { year: 5, holdYear: 6 },   // crash happens at end of year 5; "Steady Hands" = don't sell in year 6
    rumor: { stock: 'moon', year: 3 },
    years: [
      { headline: 'Sprout City is growing fast — new families and new businesses are moving in.',
        outcome: 'Strong first year. Most companies grew.', market: 0.04 },
      { event: { text: 'Grandma sent you birthday money!', amount: 50 },
        headline: 'BREAKING: Forecasters predict a record-breaking heat wave this summer.',
        outcome: 'Hottest summer ever. Ice cream sold out and power use hit a record.',
        effects: { frosty: 0.35, power: 0.08, farms: -0.10 } },
      { event: { text: 'Your bike got a flat tire and needs a new tube.', amount: -40 },
        headline: 'MoonRocket announces a launch this year… using a rocket made of cardboard.',
        tip: '🚀🚀 MOON IS GOING 10X THIS YEAR. Get in now or regret it forever!!! 💎🙌',
        outcome: 'The cardboard rocket got rained on. MoonRocket stock crashed.',
        effects: { moon: -0.60 },
        lesson: 'Hype isn\'t a reason to buy. Look at what the company actually does.' },
      { headline: 'Pixel Games drops its biggest game yet: "Super Sprout Bros."',
        outcome: 'Massive hit. Pixel Games stock soared.',
        effects: { arcade: 0.30, sneakers: 0.04 }, market: 0.02 },
      { event: { text: 'You won second place at the science fair!', amount: 40 },
        headline: 'Everyone in town is buying stocks. Prices are at an all-time high.',
        outcome: 'MARKET CRASH: The Great Slump hits. Prices fell across the whole city.',
        market: -0.32 },
      { event: { text: 'Your dog ate a sock and needs a trip to the vet.', amount: -150 },
        headline: 'After the crash, lots of investors are panicking and selling. Will prices recover?',
        outcome: 'Prices are bouncing back.', market: 0.16,
        lesson: 'Crashes happen. Investors who stay calm and hold usually see prices recover.' },
      { headline: 'Slime is trending at every school in the city.',
        outcome: 'SlimeCo sales exploded.', effects: { slime: 0.50, puppy: -0.05 }, market: 0.04 },
      { event: { text: 'You dropped your phone and cracked the screen.', amount: -90 },
        headline: 'Reports of a "sticky situation" in a school cafeteria. Principals are meeting.',
        outcome: 'Schools ban slime. SlimeCo stock collapsed.',
        effects: { slime: -0.60 }, market: 0.03,
        lesson: 'Trends fade. A company that\'s hot today can be cold tomorrow.' },
      { event: { text: 'You sold your old toys at a yard sale.', amount: 30 },
        headline: 'Gas prices are dropping and the city is opening new bus routes.',
        outcome: 'Zoom Transit had a huge year. The whole market climbed.',
        effects: { bus: 0.20 }, market: 0.05 },
      { headline: 'Sprout City turns 100 — a giant birthday festival is planned.',
        outcome: 'The festival was a hit. Businesses across town had a great year.',
        effects: { burgers: 0.10, puppy: 0.10 }, market: 0.06 },
    ],
  },
  {
    id: 2,
    name: 'Wild Weather',
    seed: 777,
    crash: { year: 7, holdYear: 8 },
    rumor: { stock: 'slime', year: 5 },
    bondDefault: { bond: 'ride', year: 4 },  // stops paying at end of year 4
    years: [
      { event: { text: 'Grandma sent you birthday money!', amount: 50 },
        headline: 'A rainy spring is in the forecast.',
        outcome: 'Perfect growing season. Sprout Farms had a monster year.',
        effects: { farms: 0.25, frosty: -0.08 }, market: 0.03 },
      { headline: 'Wild Ride Inc. is building the world\'s biggest roller coaster. Its bond pays 10% a year.',
        outcome: 'The coaster is half built. Wild Ride paid its bondholders on time.', market: 0.04 },
      { event: { text: 'Someone took your bike seat. Time for a new one and a lock.', amount: -60 },
        headline: 'No rain for months. A drought is starting.', season: 'summer',
        outcome: 'Dry fields hurt Sprout Farms, but ice cream sales went through the roof.',
        effects: { farms: -0.35, frosty: 0.20, power: 0.06 } },
      { headline: 'Rumors say Wild Ride Inc. is running out of money for its roller coaster.',
        outcome: 'DEFAULT: Wild Ride Inc. couldn\'t pay its bills. The Wild Ride Bond stopped paying.',
        market: -0.04,
        lesson: 'A bond that pays a lot of interest is risky — the company might not pay you back.' },
      { event: { text: 'You won the school spelling bee!', amount: 40 },
        headline: 'A famous streamer posts a SlimeCo unboxing video. It goes viral.',
        tip: 'SLIME TO THE MOON 🧪📈 Everyone online says SLIM triples this year. Don\'t miss out!!',
        outcome: 'Turns out the video was a paid ad. SlimeCo dropped hard.',
        effects: { slime: -0.50 }, market: 0.04,
        lesson: 'Lots of people saying it online doesn\'t make it true. Check the facts.' },
      { headline: 'The biggest snowstorm in 50 years is on the way.', season: 'winter',
        outcome: 'Snow days everywhere: Frosty Cone froze, Pixel Games boomed, buses got stuck.',
        effects: { frosty: -0.25, arcade: 0.20, bus: -0.10 } },
      { headline: 'Prices have climbed for years and everyone feels rich.',
        outcome: 'MARKET CRASH: People got nervous and stopped spending. Prices fell everywhere.',
        market: -0.28 },
      { event: { text: 'Your cat got sick and needs medicine from the vet.', amount: -150 },
        headline: 'Prices are low. Some investors are scared; others are bargain hunting.',
        outcome: 'The market is climbing back.', market: 0.16,
        lesson: 'When prices drop, patient investors hold — some even buy more at the lower price.' },
      { event: { text: 'You dropped your phone and cracked the screen.', amount: -80 },
        headline: 'Forecast: sunny days and rainy nights all season.',
        outcome: 'Perfect weather. Farms and ice cream both crushed it.',
        effects: { farms: 0.20, frosty: 0.15 }, market: 0.03 },
      { event: { text: 'You sold your old games online.', amount: 30 },
        headline: 'Sprout City will host the Youth Olympics this year.',
        outcome: 'Bounce Athletics hit an all-time high.',
        effects: { sneakers: 0.30 }, market: 0.05 },
    ],
  },
  {
    id: 3,
    name: 'Boom Town',
    seed: 4242,
    crash: { year: 7, holdYear: 8 },
    rumor: { stock: 'moon', year: 4 },
    years: [
      { headline: 'Construction starts on a giant new city park.',
        outcome: 'Jobs everywhere. A strong year across the city.',
        effects: { bus: 0.05 }, market: 0.05 },
      { event: { text: 'Your bike got a flat tire and needs a new tube.', amount: -40 },
        headline: 'PupTech reveals a robot puppy that can help with homework.',
        outcome: 'Everyone wanted one. PupTech soared — and kids ditched slime for robot pups.',
        effects: { puppy: 0.30, slime: -0.45 } },
      { headline: 'Rocket Burgers launches the "Galaxy Burger" — with blue bread.',
        outcome: 'Nobody wanted blue bread. Rocket Burgers slipped.', effects: { burgers: -0.20 }, market: 0.03 },
      { event: { text: 'Grandma sent you birthday money!', amount: 50 },
        headline: 'MoonRocket\'s CEO posts: "We land on Mars by Friday."',
        tip: 'Guy on TV says MOON is a "can\'t-lose" stock. Buy buy buy! 🚀🚀🚀',
        outcome: 'Friday came and went. No Mars. MoonRocket fell hard.',
        effects: { moon: -0.55 }, market: 0.03,
        lesson: 'If something sounds too good to be true, it usually is.' },
      { headline: 'FreshMart is opening a second store across town.',
        outcome: 'Slow and steady — FreshMart grew again.', effects: { grocery: 0.08 }, market: 0.04 },
      { event: { text: 'Your headphones broke. You need a new pair for school.', amount: -90 },
        headline: 'Everyone\'s waiting for "Pixel Party 2"… but there are rumors of a delay.',
        outcome: 'Delayed. Pixel Games stock slipped.', effects: { arcade: -0.20 }, market: 0.02 },
      { headline: 'Stocks have gone up for years. People think they\'ll never go down.',
        outcome: 'MARKET CRASH: A big drop hit the whole city.', market: -0.28 },
      { event: { text: 'Your dog ate a sock and needs a trip to the vet.', amount: -150 },
        headline: 'After the drop, investors are nervous.',
        outcome: 'Prices bounced back strong.', market: 0.16,
        lesson: 'Drops feel scary, but over many years the market has usually grown.' },
      { event: { text: 'You won the art contest!', amount: 40 },
        headline: 'Glow-in-the-dark slime is the new trend.',
        outcome: 'SlimeCo lit up.', effects: { slime: 0.40 }, market: 0.03 },
      { event: { text: 'Oops — library late fees.', amount: -30 },
        headline: 'Sprout City is named "Best City to Live" in the country.',
        outcome: 'Record year for the whole city.', market: 0.08 },
    ],
  },
];
