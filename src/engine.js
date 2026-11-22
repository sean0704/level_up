/* 殘響 — 文字冒險引擎（不依賴 DOM，可在 Node 中測試）
 * 模型：G.scene = { loc, title, lines:[{t,c}], choices:[{label, sub, k, disabled, go}] }
 * 介面只負責顯示 scene，並呼叫 G.choose(i)。 */
(function (root) {
  'use strict';

  let rng = Math.random;
  const R = () => rng();
  const ri = (a, b) => a + Math.floor(R() * (b - a + 1));
  const pick = (a) => a[Math.floor(R() * a.length)];
  const vary = (v) => Math.round(v * (0.9 + R() * 0.2));

  const n = (t) => ({ t, c: 'n' });
  const sys = (t) => ({ t, c: 'sys' });
  const good = (t) => ({ t, c: 'good' });
  const bad = (t) => ({ t, c: 'bad' });
  const warn = (t) => ({ t, c: 'warn' });
  const dim = (t) => ({ t, c: 'dim' });

  const STATS = [
    { id: 'str', name: '力量', desc: '攻擊力 +2' },
    { id: 'agi', name: '敏捷', desc: '閃避率、逃脫判定' },
    { id: 'vit', name: '體質', desc: '生命 +10、防禦' },
    { id: 'int', name: '智力', desc: '魔力 +5、收服成功率' },
    { id: 'per', name: '感知', desc: '爆擊率、搜索判定' },
  ];
  const SKILLS = [
    { id: 'strike', name: '強擊', lv: 1, mp: 5, desc: '造成 180% 傷害' },
    { id: 'shade', name: '疾影', lv: 3, mp: 6, desc: '造成 120% 傷害，並必定閃過首領的下一次攻擊' },
    { id: 'dread', name: '威壓', lv: 5, mp: 8, desc: '打斷首領蓄力並使其停頓一回合（冷卻 4 回合）' },
  ];
  const TASKS = [
    { id: 'swing', name: '揮擊 100 次', text: '你握著撿來的鋼筋，一下、一下地揮。到第七十下時手臂已經不像自己的。', stat: '力量' },
    { id: 'run', name: '負重跑 5 公里', text: '背包裡塞滿水泥塊，繞著廢棄停車場跑。肺像被砂紙磨過。', stat: '體能' },
    { id: 'focus', name: '靜坐凝神 30 分鐘', text: '你閉上眼。黑暗裡，那個視窗的微光始終懸在視野邊緣，安靜地看著你。', stat: '精神' },
  ];
  const BOSSES = [
    { name: '月台看守者・鐵顎', short: '鐵顎', art: 'boss-1', intro: '月台盡頭，一具由閘門與鐵軌絞成的巨軀緩緩轉過身。它沒有眼睛，只有一張不停開闔的鐵顎。' },
    { name: '隧道之母・蒼繭', short: '蒼繭', art: 'boss-2', intro: '隧道頂垂下無數蒼白的絲線。絲線的中心，有什麼東西正在呼吸。' },
    { name: '末班車長・無面', short: '無面', art: 'boss-3', intro: '一輛不存在於任何時刻表上的列車進站了。車門打開，戴著制帽的身影走下來——帽簷底下什麼也沒有。' },
  ];
  const MOBS = ['軌道鼠群', '鏽蝕傀儡', '遊蕩的殘影', '票閘蜘蛛', '黑霧犬'];
  const ELITES = ['持燈的巡道者', '雙首黑霧犬', '鏽甲站務員'];

  const G = { state: null, scene: null, STATS, SKILLS, TASKS, onChange: null, fx: [] };
  const fx = (t, d) => { G.fx.push(Object.assign({ t }, d || {})); };
  let S = null;

  /* ---------- 基本數值 ---------- */
  function newState(name) {
    const s = {
      name: name || '無名', day: 1, level: 1, exp: 0, points: 0, gold: 30,
      stats: { str: 5, agi: 5, vit: 5, int: 5, per: 5 }, weapon: 0,
      hp: 0, mp: 0, sta: 5, potions: { hp: 2, mp: 1 },
      daily: { swing: false, run: false, focus: false, rewarded: false },
      echoes: [], tier: 1, clears: 0, kills: 0, weak: false, pendingBind: null,
      flags: { prologue: false, ending: false, penaltySeen: false }, mode: 'title',
    };
    const d = derive(s); s.hp = d.maxHp; s.mp = d.maxMp;
    return s;
  }
  function derive(s) {
    s = s || S; const t = s.stats;
    return {
      maxHp: 60 + t.vit * 10 + s.level * 5,
      maxMp: 10 + t.int * 5,
      atk: t.str * 2 + s.weapon * 2,
      def: Math.floor(t.vit / 2),
      crit: Math.min(60, 5 + t.per),
      dodge: Math.min(45, Math.round(t.agi * 0.8)),
      maxSta: s.weak ? 3 : 5,
      echoAtk: s.echoes.reduce((a, e) => a + e.atk, 0),
    };
  }
  const expNeed = (lv) => Math.round(30 * Math.pow(lv, 1.5));
  const weaponCost = () => 40 * (S.weapon + 1);
  const POTION = 25;
  const dailyDone = () => TASKS.every((t) => S.daily[t.id]);
  const scale = (tier) => Math.pow(1.45, tier - 1);
  const rankOf = (lv) => (lv >= 25 ? 'S' : lv >= 18 ? 'A' : lv >= 12 ? 'B' : lv >= 8 ? 'C' : lv >= 5 ? 'D' : lv >= 3 ? 'E' : 'F');

  function heal(full) { const d = derive(); S.hp = d.maxHp; S.mp = d.maxMp; if (full) S.sta = d.maxSta; }
  function gainExp(v, L) {
    S.exp += v;
    while (S.exp >= expNeed(S.level)) {
      S.exp -= expNeed(S.level); S.level++; S.points += 3; heal(false);
      L.push(sys(`等級提升　Lv.${S.level - 1} → Lv.${S.level}\n能力點 +3　生命與魔力已完全恢復`));
      fx('levelup', { lv: S.level });
      SKILLS.filter((k) => k.lv === S.level).forEach((k) => { L.push(sys(`習得技能【${k.name}】\n${k.desc}`)); fx('skill', { name: k.name, desc: k.desc }); });
    }
  }
  G.allocate = (id) => {
    if (!S || S.points <= 0 || !(id in S.stats)) return false;
    const a = derive(); S.stats[id]++; S.points--; const b = derive();
    S.hp += b.maxHp - a.maxHp; S.mp += b.maxMp - a.maxMp;
    changed(); return true;
  };
  function check(stat, dc) { // d20 + 能力值 >= dc
    return ri(1, 20) + S.stats[stat] >= dc;
  }
  const chance = (stat, dc) => Math.max(5, Math.min(100, (21 - (dc - S.stats[stat])) * 5));

  /* ---------- 場景 ---------- */
  function show(loc, title, lines, choices) { G.scene = { loc, title, lines, choices }; }
  function changed() { if (G.onChange) G.onChange(); }
  G.choose = (i) => {
    const c = G.scene && G.scene.choices[i];
    if (!c || c.disabled) return false;
    G.fx = [];
    c.go(); changed(); return true;
  };
  const next = (label, go, k) => [{ label: label || '繼續', go, k: k || 'next' }];

  /* ---------- 序章 ---------- */
  G.start = (name) => { S = G.state = newState(name); S.mode = 'story'; prologue(0); changed(); };
  function prologue(i) {
    const pages = [
      ['序章　墊底的', [
        n(`界隙出現在這座城市的第十一年，人們已經習慣了它。`),
        n(`習慣有人天生就能劈開怪物，習慣那些人被稱為「探索者」，也習慣像你這樣的人——協會登記在案的最低階，F 級，${S.name}。`),
        n(`你不攻略界隙。你負責在別人攻略完之後，進去撿剩下的東西。\n同行叫你們「清道夫」，叫你「墊底的」。`),
      ]],
      ['序章　閉合', [
        n(`那天夜班，你獨自在廢棄地鐵線的界隙裡拆卸殘骸。頭頂的燈管閃了一下。`),
        n(`然後是聲音。像是整條隧道被人從兩端擰緊。`),
        bad(`界隙正在閉合——而你還在裡面。`),
        n(`沒有人會回來找一個清道夫。你抱著工具包坐在月台邊，看著黑暗一寸一寸吃掉出口的光。`),
        n(`在一切消失之前，你聽見了回音。不是你的聲音。`),
      ]],
      ['序章　殘響', [
        n(`你在自己的床上醒來。窗外是早晨，工具包好好地放在門邊，像什麼都沒發生過。`),
        n(`只有一樣東西不同。你的視野正中央，懸著一塊別人看不見的光。`),
        sys(`已偵測到適格者。\n【殘響系統】啟動。\n\n你將能夠成長。只有你。`),
        sys(`每日任務已發布。\n未於當日就寢前完成者，將受到相應的懲罰。`),
        n(`你伸手去碰，手指穿了過去。但那行字沒有消失。`),
      ]],
    ];
    const [title, lines] = pages[i];
    show('', title, lines, next(i < pages.length - 1 ? '繼續' : '起身', () => {
      if (i < pages.length - 1) prologue(i + 1); else { S.flags.prologue = true; hub([sys('提示：右側是只有你看得見的狀態視窗。\n完成每日任務、進入界隙、變強。')]); }
    }));
  }

  /* ---------- 據點 ---------- */
  function hub(pre) {
    S.mode = 'hub';
    const d = derive(), L = pre ? pre.slice() : [];
    if (!pre) L.push(n(pick([
      '舊城區的早市剛收攤，空氣裡還有油煙味。沒有人多看你一眼。',
      '遠處協會大樓的螢幕牆正在播報今日的界隙警報。',
      '你把連帽衫的拉鍊拉到頂。視野邊緣，那塊光安靜地懸著。',
    ])));
    if (S.pendingBind) L.push(sys(`【${S.pendingBind.short}】的殘響仍在界隙深處徘徊。\n再次擊敗它，即可重新嘗試收服。`));
    const left = TASKS.filter((t) => !S.daily[t.id]).length;
    show('舊城區', `第 ${S.day} 天`, L, [
      { k: 'train', label: '前往訓練場', sub: left ? `每日任務尚餘 ${left} 項` : '每日任務已完成', go: () => training() },
      { k: 'rift', label: '前往界隙【廢線月台】', sub: `深度 ${S.tier}・消耗 2 體力`, disabled: S.sta < 2, go: () => riftGate() },
      { k: 'shop', label: '黑市藥舖', sub: `持有 ${S.gold} 金`, go: () => shop() },
      { k: 'sleep', label: '回住處就寢', sub: dailyDone() ? '結束這一天' : '⚠ 每日任務未完成', go: () => (dailyDone() ? sleep() : sleepConfirm()) },
    ]);
    void d;
  }

  function training(pre) {
    const L = pre || [n('橋下的廢棄停車場。沒有器材，沒有教練，只有你和那塊光。')];
    const ch = TASKS.map((t) => ({
      k: 'task', label: t.name, sub: S.daily[t.id] ? '已完成' : '消耗 1 體力', disabled: S.daily[t.id] || S.sta < 1,
      go: () => {
        S.sta--; S.daily[t.id] = true;
        const out = [n(t.text), good(`【每日任務】${t.name}　完成`)];
        gainExp(6 + S.level * 2, out);
        if (dailyDone() && !S.daily.rewarded) {
          S.daily.rewarded = true; fx('daily'); S.points += 3; S.potions.hp++; heal(false);
          out.push(sys(`每日任務全數完成。\n獎勵：能力點 +3、生命藥水 ×1、狀態完全恢復`));
        }
        training(out);
      },
    }));
    ch.push({ k: 'back', label: '離開訓練場', go: () => hub() });
    show('訓練場', '每日任務', L, ch);
  }

  function shop(pre) {
    const L = pre || [n('巷底一扇沒有招牌的鐵門。老闆從不問客人的等級，只看錢。')];
    const buy = (cost, fn, msg) => () => { S.gold -= cost; fn(); shop([good(msg)]); };
    show('黑市藥舖', '交易', L, [
      { k: 'buy', label: '生命藥水', sub: `${POTION} 金・恢復 50% 生命`, disabled: S.gold < POTION, go: buy(POTION, () => S.potions.hp++, '買下一瓶生命藥水。') },
      { k: 'buy', label: '魔力藥水', sub: `${POTION} 金・恢復 60% 魔力`, disabled: S.gold < POTION, go: buy(POTION, () => S.potions.mp++, '買下一瓶魔力藥水。') },
      { k: 'buy', label: `磨礪武器 +${S.weapon + 1}`, sub: `${weaponCost()} 金・攻擊力 +2`, disabled: S.gold < weaponCost(), go: buy(weaponCost(), () => S.weapon++, '老闆把你的武器丟回櫃檯上。刃口亮了一些。') },
      { k: 'back', label: '離開', go: () => hub() },
    ]);
  }

  /* ---------- 就寢、換日與懲罰 ---------- */
  function sleepConfirm() {
    show('住處', '警告', [
      warn('每日任務尚未完成。'),
      sys('未完成每日任務即就寢者，將被傳送至【懲罰區域】。\n確定要就寢嗎？'),
    ], [
      { k: 'back', label: '再想想', go: () => hub() },
      { k: 'sleepforce', label: '就這樣睡吧', sub: '接受懲罰', go: () => penaltyStart() },
    ]);
  }
  function sleep(pre) {
    S.day++; S.daily = { swing: false, run: false, focus: false, rewarded: false };
    const wasWeak = S.weak; S.weak = !!S.nextWeak; S.nextWeak = false;
    heal(true);
    const L = (pre || []).concat([n('你睡得很沉，沒有作夢。'), sys(`第 ${S.day} 天。\n每日任務已重新發布。`)]);
    if (S.weak) L.push(bad('【衰弱】懲罰的後遺症尚未消退，今日體力上限降為 3。'));
    else if (wasWeak) L.push(good('【衰弱】已解除。'));
    hub(L);
  }

  function penaltyStart() {
    S.mode = 'penalty'; S.flags.penaltySeen = true;
    S.pen = { turn: 1, need: 5 };
    penaltyTurn([
      n('你一閉上眼，床就消失了。'),
      sys('每日任務未完成。\n【懲罰任務：存活】\n在無光迴廊中存活 5 個回合。'),
      n('你站在一條看不見盡頭的走廊裡。身後的黑暗中，有東西開始朝你移動。'),
    ]);
  }
  function penaltyTurn(L) {
    const P = S.pen, dc = 13 + S.level;
    const opt = (stat, label, okT, failT) => ({
      k: 'pen', label, sub: `${STATS.find((x) => x.id === stat).name}判定・成功率 ${chance(stat, dc)}%`,
      go: () => {
        const out = [];
        if (check(stat, dc)) { out.push(good(okT)); fx('dodge'); }
        else { const dmg = Math.round(derive().maxHp * 0.3); S.hp -= dmg; fx('hurt', { dmg }); out.push(bad(`${failT}（-${dmg} 生命）`)); }
        if (S.hp <= 0) return penaltyEnd(false, out);
        P.turn++;
        if (P.turn > P.need) return penaltyEnd(true, out);
        penaltyTurn(out);
      },
    });
    L.push(dim(`存活回合 ${P.turn} / ${P.need}`));
    show('無光迴廊', '懲罰任務', L, [
      opt('agi', '全力奔跑', '你的腳步聲拉開了與那東西的距離。', '你被絆倒，某種冰冷的東西劃過你的背。'),
      opt('per', '屏息躲藏', '你貼進牆縫。它從你面前經過，沒有停下。', '它在你藏身的地方停了下來。'),
      opt('str', '轉身迎擊', '你一拳砸進黑暗裡。那東西退了半步。', '你的攻擊像打進泥裡，反擊立刻就來了。'),
    ]);
  }
  function penaltyEnd(ok, L) {
    delete S.pen;
    if (ok) {
      L.push(sys('【懲罰任務】完成。\n你活下來了。'));
      gainExp(10 + S.level * 4, L);
    } else {
      const lost = Math.floor(S.gold / 2); S.gold -= lost; S.nextWeak = true; S.hp = 1;
      L.push(sys(`【懲罰任務】失敗。\n金幣 -${lost}　隔日陷入【衰弱】狀態`));
    }
    show('無光迴廊', ok ? '存活' : '倒下', L, next('醒來', () => sleep([n('你在自己的床上驚醒，滿身冷汗。')]), 'next'));
  }

  /* ---------- 界隙探索 ---------- */
  function riftGate() {
    const boss = BOSSES[(S.tier - 1) % BOSSES.length];
    show('界隙入口', `廢線月台・深度 ${S.tier}`, [
      n('封鎖線後方，空氣像水面一樣晃動。穿過去，就是另一邊的月台。'),
      dim(`首領：${boss.name}`),
      dim(`進入將消耗 2 體力。界隙內的小型戰鬥會自動結算，首領戰由你親自指揮。`),
    ], [
      { k: 'enter', label: '穿過界隙', go: () => { S.sta -= 2; S.mode = 'rift'; S.rift = { step: 0, f: scale(S.tier) }; riftNode([]); } },
      { k: 'back', label: '折返', go: () => hub() },
    ]);
  }
  const STEPS = ['mob', 'event', 'elite', 'camp'];
  function riftNode(L) {
    const r = S.rift, kind = STEPS[r.step];
    if (kind === 'mob' || kind === 'elite') {
      const el = kind === 'elite', f = r.f;
      const e = el
        ? { name: pick(ELITES), hp: Math.round(42 * f), atk: Math.round(10 * f), def: Math.round(2 * f), exp: Math.round(26 * f), gold: Math.round(14 * f) }
        : { name: pick(MOBS), hp: Math.round(24 * f), atk: Math.round(7 * f), def: Math.round(1 * f), exp: Math.round(13 * f), gold: Math.round(7 * f) };
      L.push({ t: e.name, c: 'pic' });
      L.push(n(el ? `通道盡頭的身影比其他的都要高大。${e.name}擋住了去路。` : `黑暗中傳來窸窣聲——${e.name}。`));
      if (!autoFight(e, L)) return riftFail(L);
      return riftAfter(L);
    }
    if (kind === 'event') return riftEvent(L);
    if (kind === 'camp') {
      L.push(n('通往首領月台的樓梯前，有一間還算完整的站務室。這是最後能喘口氣的地方。'));
      return riftAfter(L, true);
    }
    return bossStart();
  }
  function riftAfter(L, beforeBoss) {
    const d = derive();
    show('廢線月台', `深度 ${S.tier}・第 ${S.rift.step + 1} 區`, L, [
      { k: 'go', label: beforeBoss ? '走上首領月台' : '繼續深入', go: () => { S.rift.step++; riftNode([]); } },
      { k: 'potion', label: '喝生命藥水', sub: `持有 ${S.potions.hp}`, disabled: !S.potions.hp || S.hp >= d.maxHp, go: () => { const out = []; usePotion('hp', out); riftAfter(out, beforeBoss); } },
      { k: 'retreat', label: '撤退', sub: '保留已取得的經驗與金幣', go: () => { delete S.rift; hub([n('你沿著原路退出界隙。封鎖線外的空氣聞起來像活著。')]); } },
    ]);
  }
  function riftFail(L) {
    delete S.rift; S.hp = 1;
    fx('down');
    L.push(bad('你撐不住了。'), sys('生命值過低。強制脫離界隙。'));
    show('廢線月台', '重傷撤退', L, next('爬回入口', () => hub([n('你幾乎是用爬的回到封鎖線外。該休息了——或者該變得更強。')])));
  }
  function usePotion(kind, L) {
    const d = derive();
    if (kind === 'hp') { const v = Math.round(d.maxHp * 0.5); S.hp = Math.min(d.maxHp, S.hp + v); L.push(good(`喝下生命藥水，恢復 ${v} 生命。`)); }
    else { const v = Math.round(d.maxMp * 0.6); S.mp = Math.min(d.maxMp, S.mp + v); L.push(good(`喝下魔力藥水，恢復 ${v} 魔力。`)); }
    S.potions[kind]--; fx('heal');
  }

  function autoFight(e, L) {
    const d = derive(); let ehp = e.hp, rounds = 0, lost = 0, crits = 0;
    while (rounds < 40) {
      rounds++;
      let dmg = Math.max(1, vary(d.atk) - e.def);
      if (R() * 100 < d.crit) { dmg = Math.round(dmg * 1.75); crits++; }
      ehp -= dmg + Math.round(d.echoAtk * 0.5);
      if (ehp <= 0) break;
      if (R() * 100 < d.dodge) continue;
      lost += Math.max(1, vary(e.atk) - d.def);
      if (S.hp - lost <= 0) break;
    }
    S.hp -= lost;
    if (S.hp <= 0) { L.push(bad(`【戰報】與 ${e.name} 交戰 ${rounds} 回合，你倒下了。`)); return false; }
    const tone = rounds <= 2 ? '你甚至沒有停下腳步。' : rounds <= 5 ? '幾次交錯之後，對方不再動了。' : '一場苦戰。你靠著牆喘了很久。';
    L.push(n(tone));
    if (d.echoAtk && rounds <= 5) L.push(dim('你的影子裡，殘響們無聲地撲了上去。'));
    L.push(good(`【戰報】擊敗 ${e.name}　${rounds} 回合${crits ? `・爆擊 ${crits} 次` : ''}・損失 ${lost} 生命\n經驗 +${e.exp}　金幣 +${e.gold}`));
    S.gold += e.gold; S.kills++; fx('fight', { lost });
    gainExp(e.exp, L);
    return true;
  }

  function riftEvent(L) {
    const dc = 10 + S.tier * 3, f = S.rift.f;
    const done = (out) => riftAfter(out);
    const hurt = (out, text) => { const dmg = Math.round(derive().maxHp * 0.15); S.hp = Math.max(1, S.hp - dmg); fx('hurt', { dmg }); out.push(bad(`${text}（-${dmg} 生命）`)); };
    const pct = (s) => `${STATS.find((x) => x.id === s).name}判定・成功率 ${chance(s, dc)}%`;
    const events = [
      () => show('廢線月台', '事件　置物櫃', L.concat([n('牆邊一排鏽死的置物櫃，其中一格的門縫透出微光。')]), [
        { k: 'ev', label: '仔細檢查再打開', sub: pct('per'), go: () => { const o = []; if (check('per', dc)) { const g = Math.round(25 * f); S.gold += g; S.potions.hp++; o.push(good(`你避開了門後的絲線。裡面有前人留下的補給。（金幣 +${g}、生命藥水 ×1）`)); } else hurt(o, '門一開，某種東西炸了開來。'); done(o); } },
        { k: 'ev', label: '直接撬開', sub: pct('str'), go: () => { const o = []; if (check('str', dc)) { const g = Math.round(18 * f); S.gold += g; o.push(good(`櫃門整片被你扯了下來。（金幣 +${g}）`)); } else hurt(o, '撬棍滑開，你的手狠狠撞在鐵板上。'); done(o); } },
        { k: 'ev', label: '不碰它', go: () => done([n('你繞了過去。有些光不值得靠近。')]) },
      ]),
      () => show('廢線月台', '事件　坍塌的通道', L.concat([n('前方的通道被坍落的天花板堵住，只剩一道縫隙。')]), [
        { k: 'ev', label: '側身鑽過去', sub: pct('agi'), go: () => { const o = []; if (check('agi', dc)) { o.push(good('你像影子一樣滑了過去，還在縫隙裡撿到一枚核心碎片。')); gainExp(Math.round(15 * f), o); } else hurt(o, '碎石在你鑽到一半時又塌了一次。'); done(o); } },
        { k: 'ev', label: '把石塊搬開', sub: pct('str'), go: () => { const o = []; if (check('str', dc)) { o.push(good('你一塊一塊清出了路。手臂在發燙，但感覺不壞。')); gainExp(Math.round(15 * f), o); } else hurt(o, '一塊石板砸在你肩上。'); done(o); } },
      ]),
      () => show('廢線月台', '事件　倒下的清道夫', L.concat([n('柱子後面坐著一個穿著和你同款工作背心的人，腿上的傷口已經發黑。他抬頭看你，沒有求救——清道夫知道沒有人會救清道夫。')]), [
        { k: 'ev', label: '給他一瓶生命藥水', sub: `持有 ${S.potions.hp}`, disabled: !S.potions.hp, go: () => { S.potions.hp--; const o = [n('他愣了很久才接過去。「……我會記得你。」他把一袋東西塞進你手裡。')]; const g = Math.round(40 * f); S.gold += g; o.push(good(`金幣 +${g}`)); gainExp(Math.round(20 * f), o); done(o); } },
        { k: 'ev', label: '默默離開', go: () => done([n('你沒有回頭。背後很安靜。')]) },
      ]),
    ];
    pick(events)();
  }

  /* ---------- 首領戰 ---------- */
  function bossStart() {
    const f = S.rift.f, def = BOSSES[(S.tier - 1) % BOSSES.length];
    const hp = Math.round(340 * f);
    S.mode = 'boss';
    S.boss = { name: def.name, short: def.short, art: def.art, hp, maxHp: hp, atk: Math.round(20 * f), def: Math.round(5 * f), turn: 1, charging: false, phase: 1, stun: 0, dreadCd: 0, echoCd: 0, evade: false, guard: false, period: 4 };
    bossScene([n(def.intro), sys(`首領【${def.name}】\n擊敗它以完成攻略。`)]);
  }
  function bossScene(L) {
    const B = S.boss, d = derive();
    if (B.charging) L.push(warn(`⚠ ${B.short}正在蓄力——下一擊將是重擊。防禦、閃避，或打斷它！`));
    const ch = [{ k: 'atk', label: '攻擊', sub: `約 ${Math.max(1, d.atk - B.def)} 傷害`, go: () => bossTurn('atk') }];
    SKILLS.forEach((k) => {
      if (S.level < k.lv) return;
      const cd = k.id === 'dread' && B.dreadCd > 0;
      ch.push({ k: 'skill:' + k.id, label: `技能【${k.name}】`, sub: cd ? `冷卻中（${B.dreadCd}）` : `${k.mp} 魔力・${k.desc}`, disabled: S.mp < k.mp || cd, go: () => bossTurn(k.id) });
    });
    ch.push({ k: 'guard', label: '防禦', sub: '本回合受到的傷害降低 60%', go: () => bossTurn('guard') });
    if (S.echoes.length) ch.push({ k: 'echo', label: '指揮殘響【全軍突擊】', sub: B.echoCd > 0 ? `冷卻中（${B.echoCd}）` : `約 ${Math.round(d.echoAtk * 2.5)} 傷害`, disabled: B.echoCd > 0, go: () => bossTurn('echo') });
    ch.push({ k: 'hp', label: '生命藥水', sub: `持有 ${S.potions.hp}`, disabled: !S.potions.hp || S.hp >= d.maxHp, go: () => bossTurn('hp') });
    ch.push({ k: 'mp', label: '魔力藥水', sub: `持有 ${S.potions.mp}`, disabled: !S.potions.mp || S.mp >= d.maxMp, go: () => bossTurn('mp') });
    ch.push({ k: 'flee', label: '逃離', sub: '放棄這次攻略', go: () => { delete S.boss; delete S.rift; hub([n('你轉身就跑。身後的聲音沒有追來——它不屑追。'), dim('你還不夠強。')]); } });
    show('首領月台', `第 ${B.turn} 回合`, L, ch);
  }
  function hitBoss(mult, L, label) {
    const B = S.boss, d = derive();
    let dmg = Math.max(1, Math.round(vary(d.atk) * mult) - B.def);
    const crit = R() * 100 < d.crit; if (crit) dmg = Math.round(dmg * 1.75);
    B.hp -= dmg; fx('hit', { dmg, crit });
    L.push(n(`${label}，對${B.short}造成 ${dmg} 傷害${crit ? '（爆擊！）' : ''}。`));
  }
  function bossTurn(act) {
    const B = S.boss, d = derive(), L = [];
    B.guard = false;
    if (act === 'atk') hitBoss(1, L, '你揮出一擊');
    else if (act === 'strike') { S.mp -= 5; hitBoss(1.8, L, '【強擊】你把全身的重量壓了上去'); }
    else if (act === 'shade') { S.mp -= 6; B.evade = true; hitBoss(1.2, L, '【疾影】你的身形一晃，從死角切入'); }
    else if (act === 'dread') {
      S.mp -= 8; B.dreadCd = 5; B.stun = 1; fx('dread');
      L.push(n(`【威壓】你抬起眼。${B.short}的動作凍住了。`));
      if (B.charging) { B.charging = false; L.push(good('蓄力被打斷了！')); }
    } else if (act === 'guard') { B.guard = true; fx('guard'); L.push(n('你壓低重心，架起防禦。')); }
    else if (act === 'echo') { const dmg = Math.round(vary(d.echoAtk) * 2.5); B.hp -= dmg; B.echoCd = 4; fx('hit', { dmg, echo: true, big: true }); L.push(n(`「上。」\n影子從你腳下湧出。殘響們撲向${B.short}，造成 ${dmg} 傷害。`)); }
    else if (act === 'hp' || act === 'mp') usePotion(act, L);
    // 殘響每回合的自動追擊
    if (d.echoAtk && act !== 'echo' && B.hp > 0) { const dmg = Math.max(1, Math.round(d.echoAtk * 0.5)); B.hp -= dmg; fx('hit', { dmg, echo: true }); L.push(dim(`殘響追擊，造成 ${dmg} 傷害。`)); }
    if (B.hp <= 0) return bossWin(L);
    if (B.phase === 1 && B.hp <= B.maxHp / 2) {
      B.phase = 2; B.atk = Math.round(B.atk * 1.3); B.period = 3; fx('phase');
      L.push(warn(`${B.short}發出刺耳的尖鳴，身上的裂縫透出紅光。`), sys('首領進入【狂暴】階段。攻擊力上升，蓄力更加頻繁。'));
    }
    // 首領行動
    if (B.stun > 0) { B.stun--; L.push(dim(`${B.short}動彈不得。`)); }
    else if (B.charging) { B.charging = false; bossHit(2.6, true, L); }
    else if (B.turn % B.period === 0) { B.charging = true; fx('charge'); }
    else bossHit(1, false, L);
    if (S.hp <= 0) return bossLose(L);
    B.turn++; if (B.dreadCd > 0) B.dreadCd--; if (B.echoCd > 0) B.echoCd--;
    bossScene(L);
  }
  function bossHit(mult, heavy, L) {
    const B = S.boss, d = derive();
    if (B.evade) { B.evade = false; fx('dodge'); L.push(good(`${B.short}的${heavy ? '重擊' : '攻擊'}砸在你的殘影上。`)); return; }
    if (!heavy && R() * 100 < d.dodge) { fx('dodge'); L.push(good(`你閃過了${B.short}的攻擊。`)); return; }
    let dmg = Math.max(1, Math.round(vary(B.atk) * mult) - d.def);
    if (B.guard) dmg = Math.max(1, Math.round(dmg * 0.4));
    S.hp -= dmg; fx('hurt', { dmg, heavy, guard: B.guard });
    L.push(bad(`${B.short}${heavy ? '的重擊轟然落下' : '攻擊了你'}，${B.guard ? '你擋下了大半，仍' : ''}受到 ${dmg} 傷害。`));
  }
  function bossLose(L) {
    delete S.boss; delete S.rift;
    const lost = Math.floor(S.gold * 0.3); S.gold -= lost; S.hp = 1; S.sta = 0;
    fx('down');
    L.push(bad('視野暗了下去。'), sys(`生命值歸零。強制脫離界隙。\n金幣 -${lost}　體力歸零`));
    show('首領月台', '敗北', L, next('……', () => hub([n('你在封鎖線外醒來，不知道是誰把你拖出來的。也許沒有人。'), dim('今天已經什麼都做不了了。回去睡吧。')])));
  }
  function bossWin(L) {
    const B = S.boss, f = S.rift.f;
    const exp = Math.round(80 * f), gold = Math.round(60 * f);
    S.gold += gold; S.clears++; S.kills++; fx('win', { name: B.name });
    L.push(good(`${B.name}轟然倒下。`), sys(`界隙【廢線月台・深度 ${S.tier}】攻略完成。\n經驗 +${exp}　金幣 +${gold}`));
    gainExp(exp, L);
    const cand = { name: B.name, short: B.short, art: B.art, atk: Math.max(3, Math.round(B.atk * 0.5)), tier: S.tier };
    S.tier++;
    delete S.boss; delete S.rift;
    if (S.echoes.some((e) => e.short === cand.short && e.tier === cand.tier)) return show('首領月台', '勝利', L, next('離開界隙', () => afterClear()));
    L.push(n('它的屍骸上方，浮著一團還沒散去的黑霧。你的視窗亮了起來。'), sys('偵測到可收服的殘響。\n是否嘗試【收服】？（最多 3 次）'));
    show('首領月台', '勝利', L, [
      { k: 'bind', label: '伸出手', go: () => bindTry(cand, 1, []) },
      { k: 'skipbind', label: '不收服，離開', go: () => afterClear() },
    ]);
  }
  function bindTry(cand, attempt, L) {
    const p = Math.min(95, 35 + S.stats.int * 3 + (attempt - 1) * 15);
    L.push(n(pick(['「回應我。」', '你對著那團黑霧開口：「回應我。」', '「——回應我。」'])));
    if (R() * 100 < p) {
      S.echoes.push(cand); S.pendingBind = null; fx('bind', { name: cand.name, short: cand.short });
      L.push(n(`黑霧收束成形。${cand.short}在你面前單膝跪下，鐵與影構成的身軀不再有一絲敵意。`),
        sys(`收服成功。\n【${cand.name}】成為你的殘響。\n殘響會在戰鬥中自動追擊，首領戰中可下令【全軍突擊】。`));
      return show('首領月台', '殘響', L, next('離開界隙', () => afterClear()));
    }
    if (attempt >= 3) {
      S.pendingBind = cand;
      fx('fail');
      L.push(bad('黑霧散開了。'), sys('收服失敗。已無剩餘次數。'));
      return show('首領月台', '消散', L, next('離開界隙', () => afterClear()));
    }
    fx('fail');
    L.push(bad('黑霧劇烈地翻騰，拒絕了你。'), sys(`收服失敗。剩餘 ${3 - attempt} 次。\n下次成功率 ${Math.min(95, p + 15)}%`));
    show('首領月台', '抗拒', L, [
      { k: 'bind', label: '再一次', go: () => bindTry(cand, attempt + 1, []) },
      { k: 'skipbind', label: '放棄，離開', go: () => { S.pendingBind = cand; afterClear(); } },
    ]);
  }
  function afterClear() {
    if (!S.flags.ending && S.echoes.length) {
      S.flags.ending = true;
      return show('', '序章　完', [
        n('你走出界隙時，天剛亮。'),
        n('封鎖線旁值夜的協會職員瞥了你一眼，又低頭滑手機。在他的名冊上，你仍然是 F 級，仍然是那個墊底的清道夫。'),
        n('他沒有看見，你的影子比昨天深了一些。也沒有看見，影子裡有什麼東西，正安靜地跟著你。'),
        sys(`目前等級 Lv.${S.level}　殘響 ${S.echoes.length}\n更深層的界隙已經開啟。`),
        dim('—— 試玩版主線到此為止。你可以繼續挑戰更深的界隙、收服更多殘響。'),
      ], next('繼續', () => hub()));
    }
    hub([n('你穿過界隙回到城市。封鎖線外，沒有人知道裡面發生過什麼。'), sys(`【廢線月台】深度 ${S.tier} 已開啟。`)]);
  }

  /* ---------- 存讀檔 ---------- */
  G.canSave = () => !!S && S.mode === 'hub';
  G.serialize = () => JSON.stringify(S);
  G.load = (json) => {
    const base = newState('');
    const data = JSON.parse(json);
    S = G.state = Object.assign(base, data);
    hub([dim('（讀取進度）')]); changed();
  };
  G.derive = () => derive(S);
  G.expNeed = expNeed; G.rankOf = rankOf; G.dailyDone = dailyDone;
  G.setRng = (f) => { rng = f; };

  root.G = G;
})(typeof window !== 'undefined' ? window : globalThis);
