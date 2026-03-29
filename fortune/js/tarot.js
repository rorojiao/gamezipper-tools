// Tarot card data - 22 Major Arcana + 56 Minor Arcana
const majorArcana = [
    { name: 'The Fool', num: 0, img: '🃏',
      upright: 'New beginnings, adventure, freedom, innocence. You stand at a crossroads with a brand new journey about to unfold. Do not be bound by convention — trust your inner voice and take that first brave step. The universe is paving a path full of possibilities.',
      reversed: 'Recklessness, lack of planning, blind optimism. You may be acting too impulsively, overlooking potential risks. Think twice before making important decisions. Steady progress leads to lasting success.' },
    { name: 'The Magician', num: 1, img: '🎩',
      upright: 'Creativity, willpower, mastery of skills. You have the power to turn ideas into reality, with all four elements at your command. Now is the perfect time to showcase your talents — every creative spark has the potential to blossom.',
      reversed: 'Deception, manipulation, lack of skill. Beware of those using sweet words to blind you. Also reflect on whether you have been overconfident in certain areas. Stay grounded to achieve great things.' },
    { name: 'The High Priestess', num: 2, img: '🌙',
      upright: 'Intuition, wisdom, hidden knowledge. Your subconscious is sending you important messages. Quiet your mind and listen to your inner voice. The answer lies not outside, but deep within. Trust your sixth sense — it will not deceive you.',
      reversed: 'Ignoring intuition, unclear information, superficiality. You may be relying too much on rational analysis while ignoring your feelings. The full truth has not surfaced yet. Be patient and do not rush to conclusions.' },
    { name: 'The Empress', num: 3, img: '👑',
      upright: 'Abundance, nurturing, natural beauty. Life is showing you its most bountiful side. Whether in love, career, or finances, harvest is on the horizon. Enjoy the present beauty and learn to share your happiness with others.',
      reversed: 'Creative block, dependency, overindulgence. You may be going through a period of creative drought, or losing yourself in a relationship. Time to reclaim your inner strength and independence.' },
    { name: 'The Emperor', num: 4, img: '🏛️',
      upright: 'Authority, structure, stability, leadership. You are in a period that calls for leadership. Build order and rules, manage your life with reason and discipline. You have the power to be the master of your own destiny.',
      reversed: 'Tyranny, rigidity, excessive control. Too much control backfires. Learn to let go and give yourself and others some freedom. Flexibility is sometimes more effective than an iron fist.' },
    { name: 'The Hierophant', num: 5, img: '⛪',
      upright: 'Tradition, faith, spiritual guidance. Seeking wisdom from a mentor will benefit you greatly. This is a time for learning and exploring the spiritual world. Traditional wisdom holds the key to your current challenges.',
      reversed: 'Dogmatism, rebellion against tradition, poor advice. Do not blindly follow authority, nor reject all tradition. Use critical thinking to evaluate advice and find your own path.' },
    { name: 'The Lovers', num: 6, img: '💕',
      upright: 'Love, harmony, important choices. A beautiful romance is blooming in your life, or you face a crucial decision about love and values. Follow your heart, but let reason have its say too.',
      reversed: 'Disharmony, value conflicts, indecision. You may be facing relationship troubles or torn values. Do not avoid the issue — face your true feelings to find the way forward.' },
    { name: 'The Chariot', num: 7, img: '⚔️',
      upright: 'Victory, willpower, overcoming obstacles. You are charging forward with unstoppable momentum! Firm will and indomitable spirit will help you overcome all difficulties. Victory is near — do not stop now.',
      reversed: 'Loss of control, unclear direction, inner conflict. You may be feeling lost and directionless. Inner contradictions prevent you from focusing. Stop, sort your thoughts, and find your goal again.' },
    { name: 'Strength', num: 8, img: '🦁',
      upright: 'Inner strength, courage, patience. True strength lies not in external toughness, but in inner resilience. You have the ability to tame your inner beast. Face current challenges with gentleness and patience.',
      reversed: 'Self-doubt, weakness, lack of confidence. Do not let fear and self-doubt consume your power. You are stronger than you think. Believe in yourself and face things bravely.' },
    { name: 'The Hermit', num: 9, img: '🏔️',
      upright: 'Introspection, solitude, seeking truth. This is a time for solitude and deep reflection. Step away from the noise and find your inner answers in stillness. The light of wisdom shines from within.',
      reversed: 'Isolation, closed-mindedness, escapism. Excessive isolation only disconnects you from the world. It is time to step out of your comfort zone and reconnect with others.' },
    { name: 'Wheel of Fortune', num: 10, img: '☸️',
      upright: 'Turning point, good luck, destiny shifts. The wheel of fortune is spinning — a major turning point is coming! Stay optimistic and open-minded. Embrace the changes ahead. The universe is writing the best script for you.',
      reversed: 'Adversity, blocked changes, bad luck. You may be in a low period, but remember — the wheel keeps turning. After the darkest hour comes the dawn. Stay patient and good fortune will return.' },
    { name: 'Justice', num: 11, img: '⚖️',
      upright: 'Fairness, truth, karma. The truth will be revealed and justice served. The good seeds you have planted are bearing fruit. Stay upright and honest — the universe will reward you fairly.',
      reversed: 'Injustice, avoiding responsibility, bias. You may be facing unfair treatment, or lacking objectivity. Examine your actions and take due responsibility.' },
    { name: 'The Hanged Man', num: 12, img: '🙃',
      upright: 'Sacrifice, new perspective, letting go. Sometimes seeing things from a different angle changes everything. Temporary pause and sacrifice lead to greater gains. Let go of attachments and discover new possibilities.',
      reversed: 'Procrastination, needless sacrifice, stubbornness. You may be wasting time and energy on something meaningless. It is time to make a change and stop self-sacrificing.' },
    { name: 'Death', num: 13, img: '💀',
      upright: 'Endings and new beginnings, transformation, letting go. Do not be scared by the name — it represents the end of the old and the start of the new. Let go of what must go, and make room for a new chapter. Like a phoenix rising from the ashes.',
      reversed: 'Resisting change, stagnation, unable to let go. You are holding tightly to the past, which blocks your growth. Learn to accept change — it is the essence of life.' },
    { name: 'Temperance', num: 14, img: '🏺',
      upright: 'Balance, harmony, moderation. Now is the time to pursue inner balance. Avoid extremes and find the perfect equilibrium between opposing forces. Moderation and patience will bring lasting success.',
      reversed: 'Imbalance, excess, impatience. Your life may have lost its balance. Over-investment in one area has caused neglect in others. Time to reassess your priorities.' },
    { name: 'The Devil', num: 15, img: '😈',
      upright: 'Bondage, temptation, material obsession. Beware of things that seem alluring but will entrap you. You may be controlled by an obsession or bad habit. Recognize these chains, and you will have the power to break them.',
      reversed: 'Liberation, awakening, breaking free. Congratulations! You are being freed from bondage. Stay awakened and do not fall back into old patterns.' },
    { name: 'The Tower', num: 16, img: '🗼',
      upright: 'Upheaval, awakening, shattered foundations. A sudden change may disrupt your current life. Though painful, the universe is clearing what was built on false foundations. Upon the ruins, you will rebuild something stronger.',
      reversed: 'Delayed disaster, fear of change, clinging. You may sense approaching change yet actively avoid it. Rather than passively enduring, proactively embrace the transformation.' },
    { name: 'The Star', num: 17, img: '⭐',
      upright: 'Hope, inspiration, serenity. The sky is clearest after the storm. You are entering a period of hope and inspiration. The universe is sending you signals of blessing. Keep faith — your wishes will come true.',
      reversed: 'Disappointment, lack of faith, no inspiration. You may have temporarily lost faith in the future. But remember, even the darkest night has stars twinkling. Do not give up hope.' },
    { name: 'The Moon', num: 18, img: '🌕',
      upright: 'Illusion, subconscious, fear. Things are not what they seem on the surface. Your subconscious is warning you — watch for hidden truths. Trust your intuition but maintain clear judgment.',
      reversed: 'Emerging from the fog, truth revealed, fears fading. The fog that plagued you is lifting, and truth is coming to light. No longer confused by illusions, your clarity is returning.' },
    { name: 'The Sun', num: 19, img: '☀️',
      upright: 'Success, joy, vitality. One of the most auspicious cards in the tarot! The sun shines on everything. You are in the brightest period of your life. Enjoy this joy! Success and happiness are waving at you.',
      reversed: 'Temporary setback, excessive optimism, low energy. Clouds temporarily cover the sun, but this is only temporary. Stay positive — clouds will part and sunshine will return.' },
    { name: 'Judgement', num: 20, img: '📯',
      upright: 'Awakening, rebirth, calling. An important awakening moment is arriving. You will gain a new understanding of past experiences and an opportunity for rebirth. Listen to your inner calling and bravely start a new chapter.',
      reversed: 'Self-doubt, refusing reflection, missed opportunities. Do not be paralyzed by past failures. Every experience is a valuable lesson — learn from it and look forward.' },
    { name: 'The World', num: 21, img: '🌍',
      upright: 'Completion, achievement, journey fulfilled. Congratulations! You are harvesting the fruits of a completed journey. All efforts were worthwhile. The universe rewards your persistence with the highest prize. Enjoy this accomplishment while preparing for greater challenges ahead.',
      reversed: 'Incompletion, lack of closure, giving up halfway. Your journey is not truly complete. Do not rush into a new adventure before finishing what is at hand. See things through to the end.' }
];

const suits = ['Wands','Cups','Swords','Pentacles'];
const suitEmoji = { Wands: '🪄', Cups: '🏆', Swords: '⚔️', Pentacles: '💰' };
const suitElement = { Wands: 'Fire', Cups: 'Water', Swords: 'Air', Pentacles: 'Earth' };
const ranks = ['Ace','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Page','Knight','Queen','King'];

const minorMeanings = {
    Wands: {
        upright: ['Creative spark, inspiration burst','Ambitious planning, big vision','Expanding horizons, awaiting harvest','Celebrating success, stable harmony','Fierce competition, constant challenges','Triumphant victory, earned glory','Standing firm, defending beliefs','Swift action, unstoppable force','Steadfast resolve, battle-ready','Heavy burden, bearing weight','Passionate exploration, adventurous spirit','Bold and brave, charging forward','Warm and generous, naturally attractive','Natural leader, strategic mastermind'],
        reversed: ['Delays and blocks, plans on hold','Indecisive, lacking confidence','Disappointed expectations, unclear direction','Instability, lack of belonging','Avoiding conflict, behind-the-scenes moves','Deflated confidence, setback','Retreating, wavering stance','Impatient, off-course','Paranoid, over-defensive','Overloaded, need to let go','Lacking direction, overly idealistic','Impulsive, careless actions','Low confidence, overly dependent','Dictatorial, refuses advice']
    },
    Cups: {
        upright: ['New feelings, intuition awakened','Mutual attraction, building connection','Celebrating friendship, sharing joy','Emotional burnout, inner reflection','Loss and grief, appreciate what remains','Nostalgia, revisiting old dreams','Rich fantasies, time to choose','Leaving the past, seeking new paths','Wish fulfilled, deep contentment','Family happiness, emotional fulfillment','Sensitive and gentle, expressing love','Romantic pursuit, radiating charm','Empathetic, emotionally rich','Emotionally mature, generous and kind'],
        reversed: ['Blocked feelings, closed heart','Imbalanced relationship, poor communication','Overindulgence, ignoring what matters','Opportunity appears, emerging from burnout','Recovering from loss, letting go','Living in the present, accepting reality','Lost in fantasy, escaping reality','Giving up too easily, lacking persistence','Never satisfied, wanting more','Family discord, unrealistic expectations','Emotionally unstable, oversensitive','Unrealistic, emotionally dependent','Overly emotional, no boundaries','Emotional manipulation, over-sacrifice']
    },
    Swords: {
        upright: ['Clear insight, sharp thinking','Difficult choices, seeking balance','Heartbreak, accepting reality','Retreat and recovery, temporary withdrawal','Victory in conflict, possible cost','Leaving difficulties, transition period','Clever strategy, unconventional approach','Self-limitation, feeling trapped','Anxiety and fear, nightmares','Rock bottom, dawn after darkness','Curious, seeking truth','Swift action, straightforward','Independent and rational, perceptive','Fair authority, truth above all'],
        reversed: ['Clouded thinking, poor judgment','Avoiding decisions, missing info','Releasing pain, beginning to heal','Exhausted, needing rest','Defeat, learning from failure','Ongoing difficulty, hard to escape','Deception exposed, plans fail','Liberation, breaking limits','Hope returns, fear recedes','Past the worst, recovering','Gossip, immaturity','Careless, unthinking','Cold and harsh, overly critical','Abuse of power, unfairness']
    },
    Pentacles: {
        upright: ['New financial opportunity, material start','Balancing act, juggling priorities','Refining skills, teamwork','Conservative wealth, material security','Hard times, financial pressure','Generous giving, sharing wealth','Patient investment, awaiting harvest','Focused on skills, mastering craft','Independent wealth, enjoying fruits','Family legacy, material abundance','Diligent learner, practical and grounded','Steady progress, one step at a time','Prosperous, savvy investor','Career success, wealth peak'],
        reversed: ['Lost opportunity, poor planning','Imbalanced, spreading thin','Declining quality, poor teamwork','Stingy, over-controlling','Emerging from difficulty, finances improving','Conditional giving, inequality','Anxious waiting, insufficient returns','Impatient, seeking quick gains','Over-dependent on material things','Family disputes, inheritance issues','Unfocused, reaching too high','Stagnant, lacking drive','Poor money management, materialistic','Overworking, neglecting life']
    }
};

function getAllCards() {
    const cards = majorArcana.map(c => ({ ...c, type: 'major' }));
    suits.forEach(suit => {
        ranks.forEach((rank, i) => {
            cards.push({
                type: 'minor',
                name: `${rank} of ${suit}`,
                suit, rank, rankIdx: i,
                img: suitEmoji[suit],
                upright: `${minorMeanings[suit].upright[i]}. The energy of ${suitElement[suit]} flows through this card, bringing insights from the realm of ${suit}. Go with the flow and harness the power that ${suit} represents.`,
                reversed: `${minorMeanings[suit].reversed[i]}. When reversed, ${suit} reminds you to watch for imbalance in the ${suitElement[suit]} element. Adjust your mindset and reassess your situation.`
            });
        });
    });
    return cards;
}

function drawCards(count) {
    const all = getAllCards();
    const drawn = [];
    const used = new Set();
    for (let i = 0; i < count; i++) {
        let idx;
        do { idx = Math.floor(Math.random() * all.length); } while (used.has(idx));
        used.add(idx);
        drawn.push({ ...all[idx], isReversed: Math.random() > 0.5 });
    }
    return drawn;
}
