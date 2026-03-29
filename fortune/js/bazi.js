// Bazi Four Pillars core algorithm
const STEMS = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const BRANCHES = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];
const ZODIAC = ['Rat','Ox','Tiger','Rabbit','Dragon','Snake','Horse','Goat','Monkey','Rooster','Dog','Pig'];
const STEM_EL = ['Wood','Wood','Fire','Fire','Earth','Earth','Metal','Metal','Water','Water'];
const BRANCH_EL = ['Water','Earth','Wood','Wood','Earth','Fire','Fire','Earth','Metal','Metal','Earth','Water'];
const BRANCH_HIDDEN = [
    ['Gui'],['Ji','Gui','Xin'],['Jia','Bing','Wu'],['Yi'],['Wu','Yi','Gui'],['Bing','Geng','Wu'],
    ['Ding','Ji'],['Ji','Ding','Yi'],['Geng','Ren','Wu'],['Xin'],['Wu','Xin','Ding'],['Ren','Jia']
];
const NAYIN = [
    'Sea Metal','Furnace Fire','Forest Wood','Roadside Earth','Sword Metal','Mountain Fire',
    'Stream Water','Wall Earth','Wax Metal','Willow Wood','Spring Water','Roof Earth',
    'Thunder Fire','Pine Wood','Long Stream Water','Sand Metal','Hill Fire','Plain Wood',
    'Wall Earth','Foil Gold','Lamp Fire','River Water','Earth Post','Hairpin Metal',
    'Mulberry Wood','Creek Water','Sand Earth','Sky Fire','Pomegranate Wood','Ocean Water'
];

// Ten Gods: 0=Peer, 1=Rob, 2=EatGod, 3=Hurting, 4=IndWealth, 5=DirWealth, 6=7Kill, 7=DirOfficer, 8=IndSeal, 9=DirSeal
const TENGAN = ['Jia','Yi','Bing','Ding','Wu','Ji','Geng','Xin','Ren','Gui'];
const DIZHI = ['Zi','Chou','Yin','Mao','Chen','Si','Wu','Wei','Shen','You','Xu','Hai'];

function getElement(tg) { return STEM_EL[STEMS.indexOf(tg)]; }
function getBranchElement(dz) { return BRANCH_EL[BRANCHES.indexOf(dz)]; }

function getYearPillar(year) {
    const tgIdx = (year - 4) % 10;
    const dzIdx = (year - 4) % 12;
    return { tg: STEMS[tgIdx], dz: BRANCHES[dzIdx], zodiac: ZODIAC[dzIdx] };
}

function getMonthPillar(year, month) {
    const yearTgIdx = (year - 4) % 10;
    const tgIdx = (yearTgIdx * 2 + month) % 10;
    const dzIdx = (month + 1) % 12;
    return { tg: STEMS[tgIdx], dz: BRANCHES[dzIdx] };
}

function getDayPillar(year, month, day) {
    const baseDate = new Date(1900, 0, 1);
    const targetDate = new Date(year, month - 1, day);
    const diffDays = Math.floor((targetDate - baseDate) / 86400000);
    const offset = diffDays + 10;
    const tgIdx = ((offset % 10) + 10) % 10;
    const dzIdx = ((offset % 12) + 12) % 12;
    return { tg: STEMS[tgIdx], dz: BRANCHES[dzIdx] };
}

function getHourPillar(dayTgIdx, hour) {
    const shiChen = Math.floor(((hour + 1) % 24) / 2);
    const dzIdx = shiChen;
    const tgIdx = (dayTgIdx * 2 + dzIdx) % 10;
    return { tg: STEMS[tgIdx], dz: BRANCHES[dzIdx] };
}

function getNayin(tgIdx, dzIdx) {
    return NAYIN[Math.floor(((tgIdx % 10) * 12 + dzIdx) % 60 / 2)];
}

function countElements(pillars) {
    const count = { Metal: 0, Wood: 0, Water: 0, Fire: 0, Earth: 0 };
    pillars.forEach(p => {
        count[STEM_EL[STEMS.indexOf(p.tg)]]++;
        count[BRANCH_EL[BRANCHES.indexOf(p.dz)]]++;
    });
    return count;
}

// Ten Gods: 0=比肩, 1=劫财, 2=食神, 3=伤官, 4=偏财, 5=正财, 6=七杀, 7=正官, 8=偏印, 9=正印
const TEN_GOD_NAMES = ['Peer','Rob Wealth','Eat God','Hurting Officer','Ind Wealth','Dir Wealth','7 Killings','Dir Officer','Ind Seal','Dir Seal'];

function getTenGod(dayTg, otherTg) {
    const dayIdx = STEMS.indexOf(dayTg);
    const otherIdx = STEMS.indexOf(otherTg);
    const diff = ((otherIdx - dayIdx) % 10 + 10) % 10;
    return TEN_GOD_NAMES[diff];
}

// Personality descriptions
const PERSONALITY = {
    'Jia': ['Upright like a great tree, born leader. May be too stubborn at times.', 'Kind and compassionate, suited for management, education, law.'],
    'Yi': ['Flexible vines, highly adaptable, artistic talent. Soft exterior, strong inner will.', 'Clever and sociable with aesthetic sense, suited for art, design, diplomacy.'],
    'Bing': ['Radiant like the sun, cheerful and generous. Full of positive energy.', 'Warm-hearted and open with charisma, suited for entertainment, sales, PR.'],
    'Ding': ['Warm candlelight, sensitive and insightful. Soft appearance, inner strength.', 'Detail-oriented and observant, suited for science, literature, counseling.'],
    'Wu': ['Steady as mountains, honest and trustworthy. Generous and enduring.', 'Reliable with leadership, suited for finance, real estate, management.'],
    'Ji': ['Nurturing soil, kind and humble. Low-key and practical.', 'Gentle and modest, good at coordination, suited for agriculture, education, service.'],
    'Geng': ['Sharp as sword, bold and resolute. Values loyalty and justice.', 'Strong-willed with great execution, suited for military, surgery, engineering.'],
    'Xin': ['Precious gems, refined and elegant. Gentle exterior, strong inner will.', 'Intelligent and elegant, suited for jewelry, finance, law.'],
    'Ren': ['Vast rivers, open-minded and wise. Adaptable and unconventional.', 'Highly intelligent and strategic, suited for trade, shipping, IT.'],
    'Gui': ['Morning dew, subtle and intuitive. Extremely perceptive.', 'Clever with mystical quality, suited for metaphysics, art, healing.']
};

// Fortune verdicts
const VERDICTS = {
    very_good: ['Great fortune ahead! Auspicious energy surrounds you.', 'Excellent timing! Stars align in your favor. Seize opportunities.'],
    good: ['Fortune is improving steadily. Pleasant surprises await.', 'Spring breeze — things flow smoothly. Keep a positive mindset.'],
    normal: ['Average fortune. Best to lay low and conserve energy.', 'Moderate fortune with minor bumps. Think twice before acting.'],
    bad: ['Fortune is temporarily low. Beware of petty people.', 'A rough patch — after the darkest night comes the dawn.']
};

const EL_GENERATING = { Wood: 'Fire', Fire: 'Earth', Earth: 'Metal', Metal: 'Water', Water: 'Wood' };
const EL_COLORS = { Metal: '#ffd700', Wood: '#66cc66', Water: '#6699ff', Fire: '#ff6666', Earth: '#cc9966' };

function analyzeBazi(year, month, day, hour) {
    const yearP = getYearPillar(year);
    const monthP = getMonthPillar(year, month);
    const dayP = getDayPillar(year, month, day);
    const dayTgIdx = STEMS.indexOf(dayP.tg);
    const hourP = getHourPillar(dayTgIdx, hour);

    const pillars = [yearP, monthP, dayP, hourP];
    const wxCount = countElements(pillars);
    const dayEl = getElement(dayP.tg);

    const sorted = Object.entries(wxCount).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    const lacking = sorted.filter(s => s[1] === 0).map(s => s[0]);
    const xiYong = lacking.length > 0 ? lacking : [weakest[0]];

    const balance = Math.max(...Object.values(wxCount)) - Math.min(...Object.values(wxCount));
    let fortuneLevel = balance <= 2 ? 'very_good' : balance <= 4 ? 'good' : balance <= 6 ? 'normal' : 'bad';

    const yearNayin = getNayin((year - 4) % 10, (year - 4) % 12);

    const shiShen = [
        { pos: 'Year Pillar', name: getTenGod(dayP.tg, yearP.tg) },
        { pos: 'Month Pillar', name: getTenGod(dayP.tg, monthP.tg) },
        { pos: 'Hour Pillar', name: getTenGod(dayP.tg, hourP.tg) },
    ];

    return {
        pillars, yearP, monthP, dayP, hourP,
        wxCount, dayEl, strongest, weakest,
        xiYong, fortuneLevel, yearNayin, shiShen,
        dayTg: dayP.tg
    };
}
