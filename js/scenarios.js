// =====================================================================
//  SPROUT CITY — GAME DATA
//  Club members: this is the file to edit! You can change company
//  names, descriptions, news headlines, and how much news moves prices.
//  Numbers like 0.25 mean "+25%". Negative numbers mean prices drop.
// =====================================================================

export const SETTINGS = {
  years: 10,
  startingCash: 1000,
  savingsRate: 0.03,   // bank savings interest per year
  loanRate: 0.08,      // loan interest per year
  loanLimit: 500,      // most a kid can owe at once (before interest)
};

// risk: 1 = steady 🟢, 2 = medium 🟡, 3 = bumpy 🟠, 4 = wild 🔴
// drift = normal yearly growth, vol = how much random wiggle each year
export const STOCKS = [
  { id: 'basket',  name: 'Whole City Basket', emoji: '🧺', risk: 1, start: 50, index: true,
    desc: 'A basket that holds a little bit of EVERY company in town. One buy = instant diversification!' },
  { id: 'grocery', name: 'Corner Grocery',    emoji: '🛒', risk: 1, start: 30, drift: 0.05, vol: 0.03,
    desc: 'Everybody needs food, so sales stay steady in good times and bad.' },
  { id: 'power',   name: 'Sprout Power & Light', emoji: '💡', risk: 1, start: 40, drift: 0.05, vol: 0.04,
    desc: 'Keeps the lights on in Sprout City. Hot summers mean more air conditioning!' },
  { id: 'burgers', name: 'Rocket Burgers',    emoji: '🍔', risk: 2, start: 25, drift: 0.07, vol: 0.08,
    desc: 'The tastiest burgers in town — as long as they don\'t try weird new recipes.' },
  { id: 'puppy',   name: 'Puppy Pals Toys',   emoji: '🐶', risk: 2, start: 20, drift: 0.06, vol: 0.09,
    desc: 'Makes toy puppies. Big holidays and new inventions help a lot.' },
  { id: 'bus',     name: 'Zoom Bus Co.',      emoji: '🚌', risk: 2, start: 15, drift: 0.05, vol: 0.08,
    desc: 'Drives people around town. Cheap gas and new routes help it zoom.' },
  { id: 'arcade',  name: 'Pixel Arcade',      emoji: '🎮', risk: 2, start: 35, drift: 0.07, vol: 0.10,
    desc: 'Makes video games. A hit game = big win. A delay = ouch.' },
  { id: 'sneakers',name: 'Bouncy Sneakers',   emoji: '👟', risk: 2, start: 30, drift: 0.06, vol: 0.08,
    desc: 'Shoes for running, jumping and bouncing. Loves big sports events.' },
  { id: 'frosty',  name: 'Frosty Cone',       emoji: '🍦', risk: 3, start: 12, drift: 0.05, vol: 0.12,
    desc: 'Ice cream shop. Hot weather = lines out the door. Cold weather = empty shop.' },
  { id: 'farms',   name: 'Sprout Farms',      emoji: '🌱', risk: 3, start: 18, drift: 0.05, vol: 0.12,
    desc: 'Grows the town\'s food. Rain helps, droughts hurt.' },
  { id: 'slime',   name: 'SlimeCo',           emoji: '🧠', risk: 4, start: 10, drift: 0.02, vol: 0.20,
    desc: 'Makes slime. When slime is cool, it\'s REALLY cool. When it\'s not… yikes.' },
  { id: 'moon',    name: 'MoonRocket',        emoji: '🚀', risk: 4, start: 8,  drift: -0.04, vol: 0.20,
    desc: 'Promises to fly to the moon. Lots of hype, not a lot of rockets yet.' },
];

export const BONDS = [
  { id: 'city',   name: 'Sprout City Bond', emoji: '🏛️', risk: 1, price: 100, rate: 0.04,
    desc: 'You lend $100 to the town. The town pays you 4% every year. Super safe.' },
  { id: 'school', name: 'School Bond',      emoji: '🏫', risk: 1, price: 100, rate: 0.05,
    desc: 'You lend $100 to build a new school. Pays 5% every year. Safe.' },
  { id: 'ride',   name: 'Wild Ride Bond',   emoji: '🎢', risk: 4, price: 100, rate: 0.10,
    desc: 'You lend $100 to Wild Ride Inc. Pays a juicy 10%… but if they run out of money, they stop paying!' },
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
//    lesson   : (optional) a 💡 Did-you-know shown with the outcome
// ---------------------------------------------------------------------
export const SCENARIOS = [
  {
    id: 1,
    name: 'The Great Sprout Slump',
    seed: 20261,
    crash: { year: 5, holdYear: 6 },   // crash happens at end of year 5; "Steady Hands" = don't sell in year 6
    rumor: { stock: 'moon', year: 3 },
    years: [
      { headline: '☀️ Welcome to Sprout City! New families are moving to town.',
        outcome: 'A great first year! Most businesses grew.', market: 0.04 },
      { headline: '🌡️ Weather forecast: the HOTTEST summer ever is on the way!',
        outcome: 'What a scorcher! Everyone lined up for ice cream and cranked the A/C.',
        effects: { frosty: 0.35, power: 0.08, farms: -0.10 } },
      { headline: '🚀 MoonRocket says it will launch a rocket made of cardboard this year!',
        tip: 'Psst! A kid at school says MoonRocket stock will go up 10 TIMES! Better buy now!!',
        outcome: '💨 The cardboard rocket… got rained on. MoonRocket stock crashed!',
        effects: { moon: -0.60 },
        lesson: 'Hot tips are usually just hype. Find out the facts before you buy!' },
      { headline: '🎮 Pixel Arcade is releasing a brand new game: "Super Sprout Bros!"',
        outcome: 'The game was a huge hit! Pixel Arcade soared.',
        effects: { arcade: 0.30, sneakers: 0.04 }, market: 0.02 },
      { headline: '🎈 Everything is booming! Everyone is buying stocks and prices are sky high!',
        outcome: '😱 Uh oh! The Great Sprout Slump! Prices fell all over town.',
        market: -0.32 },
      { headline: '📉 After the Slump, lots of people are scared and selling. Will prices come back?',
        outcome: '📈 Prices started bouncing back!', market: 0.16,
        lesson: 'Crashes happen! People who stay calm and wait usually see prices come back.' },
      { headline: '🧠 Slime is the #1 craze at every school in town!',
        outcome: 'SlimeCo sales exploded!', effects: { slime: 0.50, puppy: -0.05 }, market: 0.04 },
      { headline: '🍽️ The school cafeteria had a VERY sticky situation with slime…',
        outcome: '🚫 Schools banned slime! SlimeCo stock got slimed. Ouch!',
        effects: { slime: -0.60 }, market: 0.03,
        lesson: 'Fads come and go. A company that\'s hot today can be not tomorrow.' },
      { headline: '🚌 Gas prices are dropping and Sprout City is opening new bus routes.',
        outcome: 'Zoom Bus Co. zoomed ahead! The whole town had a good year.',
        effects: { bus: 0.20 }, market: 0.05 },
      { headline: '🎉 Sprout City\'s 100th birthday party is this year!',
        outcome: 'What a party! Businesses all over town had a great year.',
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
      { headline: '🌧️ Lots of rain is in the forecast this spring.',
        outcome: 'The farms loved the rain! Crops grew huge.',
        effects: { farms: 0.25, frosty: -0.08 }, market: 0.03 },
      { headline: '🎢 Wild Ride Inc. is building the world\'s loopiest roller coaster. Its bond pays 10%!',
        outcome: 'The coaster is half built. Wild Ride paid its bondholders.', market: 0.04 },
      { headline: '🏜️ No rain for months. A drought is starting…',
        outcome: 'Dry fields hurt Sprout Farms, but ice cream sold like crazy.',
        effects: { farms: -0.35, frosty: 0.20, power: 0.06 } },
      { headline: '🎢 People are whispering that Wild Ride Inc. is running out of money…',
        outcome: '💥 Wild Ride Inc. couldn\'t pay its bills! The Wild Ride Bond stopped paying.',
        market: -0.04,
        lesson: 'Bonds that pay a LOT of interest are risky — the company might not pay you back!' },
      { headline: '🧠 A famous unboxing video says SlimeCo is the next big thing!',
        tip: 'Everyone online says SlimeCo will TRIPLE this year! Don\'t miss out!!',
        outcome: '🙃 The video was just a paid ad. SlimeCo dropped.',
        effects: { slime: -0.50 }, market: 0.04,
        lesson: 'Just because lots of people say something online doesn\'t make it true.' },
      { headline: '❄️ The biggest snowstorm in 50 years is on the way!',
        outcome: 'Snow days! Frosty Cone had a cold year, but Pixel Arcade was packed.',
        effects: { frosty: -0.25, arcade: 0.20, bus: -0.10 } },
      { headline: '🎈 Prices have been going up and everyone feels rich!',
        outcome: '😱 People got worried and stopped spending. Prices fell all over town!',
        market: -0.28 },
      { headline: '🤔 Prices are low. Some people are scared, some are bargain shopping.',
        outcome: '📈 Prices started climbing back up!', market: 0.16,
        lesson: 'When prices drop, patient investors often wait — or even buy more at the lower price.' },
      { headline: '🌦️ Perfect weather: sunny days and rainy nights.',
        outcome: 'Farms and ice cream both had a great year!',
        effects: { farms: 0.20, frosty: 0.15 }, market: 0.03 },
      { headline: '👟 Sprout City is hosting the Kids\' Olympics!',
        outcome: 'Bouncy Sneakers bounced to new highs!',
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
      { headline: '🏗️ A giant new park is being built in Sprout City!',
        outcome: 'Construction everywhere! A strong year for the town.',
        effects: { bus: 0.05 }, market: 0.05 },
      { headline: '🐶 Puppy Pals invents a robot puppy that does your homework (sort of).',
        outcome: 'Kids traded their slime for robot puppies! Puppy Pals soared, SlimeCo flopped.',
        effects: { puppy: 0.30, slime: -0.45 } },
      { headline: '🍔 Rocket Burgers adds a "Galaxy Burger" with blue cheese… and blue bread.',
        outcome: 'Nobody wanted blue bread. Rocket Burgers dipped.', effects: { burgers: -0.20 }, market: 0.03 },
      { headline: '🚀 MoonRocket\'s boss posts: "We will be on Mars by Friday!!"',
        tip: 'A guy on TV says MoonRocket is a SURE THING! Buy, buy, buy!',
        outcome: 'Friday came and went… no Mars. MoonRocket fell hard.',
        effects: { moon: -0.55 }, market: 0.03,
        lesson: 'If something sounds too good to be true, it usually is.' },
      { headline: '🛒 Corner Grocery is opening a second store across town.',
        outcome: 'Slow and steady — Corner Grocery grew again.', effects: { grocery: 0.08 }, market: 0.04 },
      { headline: '🎮 Everyone is waiting for "Pixel Party 2"… but it might be delayed.',
        outcome: 'Delayed! Pixel Arcade slipped this year.', effects: { arcade: -0.20 }, market: 0.02 },
      { headline: '🎈 Stocks have gone up for years. Everyone thinks they\'ll go up forever!',
        outcome: '😱 Nope! A big drop hit the whole town.', market: -0.28 },
      { headline: '😬 After the drop, people are nervous.',
        outcome: '📈 Prices bounced back nicely!', market: 0.16,
        lesson: 'Drops feel scary, but over many years prices have usually grown.' },
      { headline: '🧠 Glow-in-the-dark slime is the new craze.',
        outcome: 'SlimeCo glowed up!', effects: { slime: 0.40 }, market: 0.03 },
      { headline: '🎆 Sprout City wins "Best Town in the World"!',
        outcome: 'A record year for the whole town!', market: 0.08 },
    ],
  },
];
