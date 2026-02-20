// 八字算命核心算法
const 天干 = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const 地支 = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const 生肖 = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
const 五行天干 = ['木','木','火','火','土','土','金','金','水','水'];
const 五行地支 = ['水','土','木','木','土','火','火','土','金','金','土','水'];
const 地支藏干 = [
    ['癸'],['己','癸','辛'],['甲','丙','戊'],['乙'],['戊','乙','癸'],['丙','庚','戊'],
    ['丁','己'],['己','丁','乙'],['庚','壬','戊'],['辛'],['戊','辛','丁'],['壬','甲']
];
const 纳音 = [
    '海中金','炉中火','大林木','路旁土','剑锋金','山头火','涧下水','城头土','白蜡金','杨柳木',
    '泉中水','屋上土','霹雳火','松柏木','长流水','沙中金','山下火','平地木','壁上土','金箔金',
    '覆灯火','天河水','大驿土','钗钏金','桑柘木','大溪水','沙中土','天上火','石榴木','大海水'
];

const 十神名 = ['比肩','劫财','食神','伤官','偏财','正财','七杀','正官','偏印','正印'];

function get五行(tg) { return 五行天干[天干.indexOf(tg)]; }
function get地支五行(dz) { return 五行地支[地支.indexOf(dz)]; }

// 年柱
function getYearPillar(year) {
    const tgIdx = (year - 4) % 10;
    const dzIdx = (year - 4) % 12;
    return { tg: 天干[tgIdx], dz: 地支[dzIdx], shengxiao: 生肖[dzIdx] };
}

// 月柱 (简化：以节气近似，用农历月份)
function getMonthPillar(year, month) {
    // 月干 = (年干序号 * 2 + 月份) % 10
    const yearTgIdx = (year - 4) % 10;
    const tgIdx = (yearTgIdx * 2 + month) % 10;
    // 月支：寅月(1月/正月)起 = 地支[2]开始
    const dzIdx = (month + 1) % 12;
    return { tg: 天干[tgIdx], dz: 地支[dzIdx] };
}

// 日柱 (简化算法)
function getDayPillar(year, month, day) {
    // 使用蔡勒公式变体求日干支序号
    const baseDate = new Date(1900, 0, 1); // 1900-01-01 是甲子日 (序号0 偏移需校准)
    const targetDate = new Date(year, month - 1, day);
    const diffDays = Math.floor((targetDate - baseDate) / 86400000);
    // 1900-01-01 实际是甲戌日，偏移量校准
    const offset = diffDays + 10; // 校准到甲子
    const tgIdx = ((offset % 10) + 10) % 10;
    const dzIdx = ((offset % 12) + 12) % 12;
    return { tg: 天干[tgIdx], dz: 地支[dzIdx] };
}

// 时柱
function getHourPillar(dayTgIdx, hour) {
    // 时辰：23-1子, 1-3丑, 3-5寅...
    const shiChen = Math.floor(((hour + 1) % 24) / 2);
    const dzIdx = shiChen;
    // 时干 = (日干序号 * 2 + 时辰序号) % 10
    const tgIdx = (dayTgIdx * 2 + dzIdx) % 10;
    return { tg: 天干[tgIdx], dz: 地支[dzIdx] };
}

function get纳音(tgIdx, dzIdx) {
    return 纳音[Math.floor(((tgIdx % 10) * 12 + dzIdx) % 60 / 2)];
}

function count五行(pillars) {
    const count = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 };
    pillars.forEach(p => {
        count[五行天干[天干.indexOf(p.tg)]]++;
        count[五行地支[地支.indexOf(p.dz)]]++;
    });
    return count;
}

function get十神(dayTg, otherTg) {
    const dayIdx = 天干.indexOf(dayTg);
    const otherIdx = 天干.indexOf(otherTg);
    const diff = ((otherIdx - dayIdx) % 10 + 10) % 10;
    return 十神名[diff];
}

// 性格分析文案库
const 性格库 = {
    '甲': ['如参天大树般正直挺拔，有领袖气质，做事光明磊落。但有时过于固执己见，不善变通。','天性仁慈善良，有济世之心，适合从事管理、教育、法律等行业。'],
    '乙': ['如藤萝花草般柔韧灵活，善于适应环境，有艺术天赋。内心坚韧，外表温和。','聪明伶俐，善于交际，有审美天赋，适合艺术、设计、外交等领域。'],
    '丙': ['如太阳般热情奔放，性格开朗大方，乐于助人。充满正能量，能照亮身边每个人。','热情似火，光明磊落，有感染力和号召力，适合演艺、销售、公关等行业。'],
    '丁': ['如烛火星光般温暖细腻，内心敏感而丰富，有洞察力。看似柔弱，实则内心坚定。','心思细腻，观察力强，有研究精神，适合科研、文学、心理咨询等领域。'],
    '戊': ['如高山大地般沉稳厚重，为人忠厚老实，值得信赖。有包容之心，能承载万物。','稳重踏实，信守承诺，有大将之风，适合金融、房地产、管理等行业。'],
    '己': ['如田园沃土般温润包容，善于培育他人，心地善良。低调务实，不喜张扬。','温和谦虚，善于协调，有服务精神，适合农业、教育、服务等行业。'],
    '庚': ['如刀剑利器般果断刚毅，行事雷厉风行，有决断力。义薄云天，重视义气。','性格刚强，有魄力和执行力，适合军警、外科医生、工程等行业。'],
    '辛': ['如珠玉宝石般精致优雅，内心细腻敏感，有品味。表面温润，内心有主见。','聪慧优雅，追求完美，有鉴赏力，适合珠宝、金融、法律等行业。'],
    '壬': ['如大江大河般气势磅礴，思维开阔活跃，有智慧。善于变通，不拘一格。','智慧过人，思维敏捷，有谋略，适合贸易、航运、信息技术等行业。'],
    '癸': ['如细雨露珠般润物无声，性格温和内敛，有灵性。感受力极强，直觉敏锐。','心思灵巧，有神秘气质，想象力丰富，适合玄学、艺术、医疗等行业。']
};

const 运势评语 = {
    very_good: ['紫气东来，鸿运当头！近期运势如日中天，贵人频现，事业财运双收。','风生水起之象！当前时运极佳，把握机遇可成大事，贵人暗中相助。'],
    good: ['运势渐入佳境，稳中有升。虽无大起大落，但处处有小惊喜，宜积极进取。','春风送暖之象，诸事顺遂。保持积极心态，好运自然来敲门。'],
    normal: ['运势平平，需要韬光养晦。此时不宜激进冒险，以守为攻方为上策。','时运中等偏上，有小波折但无大碍。凡事三思而后行，可保平安顺遂。'],
    bad: ['运势稍有低迷，注意提防小人。遇事需冷静处理，切勿冲动行事。','暂时运势不畅，但否极泰来，困难只是暂时的。修身养性，等待时机。'],
};

const 五行相生 = { '木': '火', '火': '土', '土': '金', '金': '水', '水': '木' };
const 五行相克 = { '木': '土', '土': '水', '水': '火', '火': '金', '金': '木' };
const 五行颜色 = { '金': '#ffd700', '木': '#66cc66', '水': '#6699ff', '火': '#ff6666', '土': '#cc9966' };

function analyzeBazi(year, month, day, hour) {
    const yearP = getYearPillar(year);
    const monthP = getMonthPillar(year, month);
    const dayP = getDayPillar(year, month, day);
    const dayTgIdx = 天干.indexOf(dayP.tg);
    const hourP = getHourPillar(dayTgIdx, hour);

    const pillars = [yearP, monthP, dayP, hourP];
    const wxCount = count五行(pillars);

    // 日主五行
    const dayWx = get五行(dayP.tg);

    // 找最旺和最弱
    const sorted = Object.entries(wxCount).sort((a, b) => b[1] - a[1]);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];

    // 喜用神 (简化：缺什么补什么)
    const lacking = sorted.filter(s => s[1] === 0).map(s => s[0]);
    const xiYong = lacking.length > 0 ? lacking : [weakest[0]];

    // 运势等级
    const balance = Math.max(...Object.values(wxCount)) - Math.min(...Object.values(wxCount));
    let fortuneLevel = balance <= 2 ? 'very_good' : balance <= 4 ? 'good' : balance <= 6 ? 'normal' : 'bad';

    // 纳音
    const yearNayin = get纳音((year - 4) % 10, (year - 4) % 12);

    // 十神
    const shiShen = [
        { pos: '年柱', name: get十神(dayP.tg, yearP.tg) },
        { pos: '月柱', name: get十神(dayP.tg, monthP.tg) },
        { pos: '时柱', name: get十神(dayP.tg, hourP.tg) },
    ];

    return {
        pillars, yearP, monthP, dayP, hourP,
        wxCount, dayWx, strongest, weakest,
        xiYong, fortuneLevel, yearNayin, shiShen,
        dayTg: dayP.tg
    };
}
