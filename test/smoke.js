// 冒煙測試：(1) 亂按機器人確認不會當掉或卡死 (2) 合理打法機器人量測通關所需天數
require('../src/engine.js');
const G = globalThis.G;
let seed = 1;
G.setRng(() => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; });
const rnd = (n) => Math.floor((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296 * n);

function enabled() { return G.scene.choices.map((c, i) => [c, i]).filter(([c]) => !c.disabled); }

// (1) 亂按
for (let s = 1; s <= 30; s++) {
  seed = s * 7919; G.start('測試');
  for (let i = 0; i < 4000; i++) {
    const e = enabled();
    if (!e.length) throw new Error(`卡死：${G.scene.title}`);
    if (!G.scene.lines.every((l) => typeof l.t === 'string' && !/undefined|NaN/.test(l.t))) throw new Error('文字異常：' + JSON.stringify(G.scene.lines));
    if (G.scene.choices.some((c) => /undefined|NaN/.test(c.label + (c.sub || '')))) throw new Error('選項異常');
    while (G.state.points > 0) G.allocate(['str', 'agi', 'vit', 'int', 'per'][rnd(5)]);
    G.choose(e[rnd(e.length)][1]);
    const st = G.state;
    if (st.hp < 0 || st.mp < 0 || st.sta < 0 || st.gold < 0 || Number.isNaN(st.hp + st.exp + st.gold)) throw new Error('數值異常 ' + JSON.stringify(st));
    if (i % 500 === 0 && G.canSave()) G.load(G.serialize());
  }
}
console.log('亂按測試 OK');

// (2) 合理打法
function smart(maxSteps) {
  const find = (k) => enabled().find(([c]) => c.k === k);
  const out = { firstClearDay: null, endingDay: null, losses: 0 };
  for (let i = 0; i < maxSteps; i++) {
    const S = G.state, d = G.derive();
    const order = ['str', 'vit', 'str', 'int', 'vit', 'agi'];
    while (S.points > 0) G.allocate(order[(S.level * 3 + S.points) % order.length]);
    if (S.clears && !out.firstClearDay) out.firstClearDay = S.day;
    if (S.flags.ending && !out.endingDay) { out.endingDay = S.day; out.level = S.level; return out; }
    let c;
    if (S.mode === 'boss') {
      const B = S.boss;
      if (G.scene.title === '敗北') out.losses++;
      if (B && B.charging) c = find('skill:dread') || find('skill:shade') || find('guard');
      else if (B && S.hp < d.maxHp * 0.4) c = find('hp') || find('skill:strike') || find('atk');
      else if (B) c = find('echo') || find('skill:strike') || find('mp') || find('atk');
    } else if (S.mode === 'rift') {
      if (S.hp < d.maxHp * 0.5) c = find('potion');
      // 等級太低就不硬闖首領
      if (!c && G.scene.choices[0].label.includes('首領') && S.hp < d.maxHp * 0.6) c = find('retreat');
      c = c || find('go') || enabled().filter(([x]) => x.k === 'ev')[0];
    } else if (S.mode === 'hub') {
      c = find('task') || (G.scene.loc === '訓練場' ? find('back') : null);
      if (!c && G.scene.loc === '舊城區') {
        if (!G.dailyDone() && S.sta >= 1) c = find('train');
        else if (S.sta >= 2) c = find('rift');
        else if (S.gold >= 25 && S.potions.hp < 3) c = find('shop');
        else c = find('sleep');
      }
      if (!c && G.scene.loc === '黑市藥舖') c = (S.potions.hp < 3 && find('buy')) || find('back');
      if (!c && G.scene.loc === '界隙入口') c = find('enter');
    }
    c = c || find('bind') || find('next') || enabled()[0];
    if (G.scene.title === '敗北') out.losses++;
    G.choose(c[1]);
  }
  return out;
}
const days = [];
for (let s = 1; s <= 40; s++) { seed = s * 104729; G.start('測試'); const r = smart(6000); days.push(r); }
const done = days.filter((r) => r.endingDay);
const avg = (k) => (done.reduce((a, r) => a + r[k], 0) / done.length).toFixed(1);
console.log(`合理打法：${done.length}/40 完成序章，平均第 ${avg('endingDay')} 天、Lv.${avg('level')}、首領戰敗 ${avg('losses')} 次`);
console.log('最快/最慢天數', Math.min(...done.map((r) => r.endingDay)), Math.max(...done.map((r) => r.endingDay)));
if (done.length < 36) { console.error('FAIL: 序章完成率過低'); process.exit(1); }
console.log('OK');
