/* 殘響 — 介面與演出 */
(function () {
  'use strict';
  const G = window.G, Sound = window.Sound, Art = window.Art, SAVE = 'echoes-save-v1', THEME = 'echoes-theme-v2';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 忽略 */ } }, del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* 忽略 */ } } };
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let lastScene = null, typers = [], overlayQueue = [], overlayEl = null, overlayTimer = null;

  const bar = (cls, v, max, label) => `<div class="bar ${cls}"><i style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></i><span>${label} ${Math.max(0, v)} / ${max}</span></div>`;

  /* ---------- 側欄 ---------- */
  function renderSide() {
    const S = G.state, d = G.derive();
    const stats = G.STATS.map((s) => `<div class="st"><span>${s.name}</span><b>${S.stats[s.id]}</b><span class="d">${s.desc}</span><button data-alloc="${s.id}" ${S.points > 0 ? '' : 'disabled'}>+</button></div>`).join('');
    const tasks = G.TASKS.map((t) => `<div class="q ${S.daily[t.id] ? 'done' : ''}"><span>${S.daily[t.id] ? '■' : '□'} ${t.name}</span><span>${S.daily[t.id] ? '完成' : '未完成'}</span></div>`).join('');
    const echoes = S.echoes.length ? S.echoes.map((e) => `<div class="echo"><b class="eth" data-art="${esc(e.art || '')}">◆</b>${esc(e.short)}<span>攻擊 ${e.atk}・深度 ${e.tier}</span></div>`).join('') : '<div class="empty">尚無殘響。擊敗首領後可嘗試收服。</div>';
    const skills = G.SKILLS.map((k) => `<div class="skill ${S.level < k.lv ? 'locked' : ''}">【${k.name}】 ${k.mp} MP ${S.level < k.lv ? `<span class="d">Lv.${k.lv} 解鎖</span>` : ''}<div class="d">${k.desc}</div></div>`).join('');
    $('side').innerHTML = `
      <div class="win"><h3><span>STATUS</span><span>狀態</span></h3><div class="body">
        <div class="who"><span class="nm">${esc(S.name)}</span><span class="lv">Lv.${S.level}</span></div>
        <div class="rank">協會登記：F 級清道夫　／　實際評估：${G.rankOf(S.level)} 級</div>
        <div id="pbars">${bar('hp', S.hp, d.maxHp, 'HP')}${bar('mp', S.mp, d.maxMp, 'MP')}${bar('exp', S.exp, G.expNeed(S.level), 'EXP')}</div>
        <div style="margin-top:10px" class="q"><span>能力值</span><span class="pts ${S.points ? 'has' : 'zero'}">可用點數 ${S.points}</span></div>
        ${stats}
        <div class="kv"><span>攻擊力 <b>${d.atk}</b></span><span>防禦力 <b>${d.def}</b></span><span>爆擊率 <b>${d.crit}%</b></span><span>閃避率 <b>${d.dodge}%</b></span>
          <span>金幣 <b>${S.gold}</b></span><span>武器 <b>+${S.weapon}</b></span><span>生命藥水 <b>${S.potions.hp}</b></span><span>魔力藥水 <b>${S.potions.mp}</b></span></div>
      </div></div>
      <div class="win"><h3><span>DAILY QUEST</span><span>每日任務</span></h3><div class="body">${tasks}
        <div class="note ${G.dailyDone() ? '' : 'warn'}">${G.dailyDone() ? '今日任務已完成。' : '⚠ 就寢前未完成，將被傳送至懲罰區域。'}</div>
        <div class="note">獎勵：能力點 +3、生命藥水 ×1、狀態完全恢復</div></div></div>
      <div class="win"><h3><span>ECHOES</span><span>殘響軍團 ${S.echoes.length}</span></h3><div class="body">${echoes}</div></div>
      <div class="win"><h3><span>SKILLS</span><span>技能</span></h3><div class="body">${skills}</div></div>`;
    $('side').querySelectorAll('.eth').forEach((el) => Art.get(el.dataset.art, (url) => { if (url && el.isConnected) el.innerHTML = `<img src="${url}" alt="">`; }));
    const pips = Array.from({ length: d.maxSta }, (_, i) => `<i class="${i < S.sta ? 'on' : ''}"></i>`).join('');
    $('topinfo').innerHTML = `<span>第 <b>${S.day}</b> 天</span><span>體力<span class="pips">${pips}</span></span><span>界隙深度 <b>${S.tier}</b></span><span>擊殺 <b>${S.kills}</b></span>`;
  }

  /* ---------- 場景 ---------- */
  const LOC_ART = { 舊城區: 'loc-city', 訓練場: 'loc-training', 黑市藥舖: 'loc-shop', 住處: 'loc-home', 界隙入口: 'loc-gate', 廢線月台: 'loc-rift', 無光迴廊: 'loc-void' };
  const TITLE_ART = { '序章　墊底的': 'pro-1', '序章　閉合': 'pro-2', '序章　殘響': 'pro-3', '序章　完': 'key-visual', '事件　置物櫃': 'event-1', '事件　坍塌的通道': 'event-2', '事件　倒下的清道夫': 'event-3' };
  let bossArt = null, bannerId = null;
  function updateBanner(sc, S) {
    if (S.boss) bossArt = S.boss.art;
    const id = sc.loc === '首領月台' ? bossArt : (TITLE_ART[sc.title] || LOC_ART[sc.loc] || null);
    if (id === bannerId) return;
    bannerId = id;
    Art.get(id, (url) => {
      if (bannerId !== id) return;
      const b = $('banner');
      b.classList.toggle('hidden', !url);
      if (url) { b.innerHTML = `<img src="${url}" alt="">`; }
    });
  }
  function stopTypers() { typers.forEach((t) => { clearTimeout(t.start); clearInterval(t.tick); t.el.textContent = t.full; }); typers = []; }
  function typewrite(el, delayMs) {
    const full = el.textContent, t = { el, full, start: 0, tick: 0 };
    el.textContent = '';
    t.start = setTimeout(() => {
      let i = 0;
      const caret = document.createElement('span'); caret.className = 'caret';
      t.tick = setInterval(() => {
        i += 2;
        if (i >= full.length) { clearInterval(t.tick); el.textContent = full; typers = typers.filter((x) => x !== t); return; }
        el.textContent = full.slice(0, i); el.appendChild(caret);
      }, 22);
    }, delayMs);
    typers.push(t);
  }

  function renderScene() {
    const sc = G.scene, S = G.state;
    $('loc').textContent = sc.loc ? `◈ ${sc.loc}` : '';
    $('scene-title').textContent = sc.title;
    updateBanner(sc, S);
    const B = S.boss, bb = $('bossbar');
    bb.classList.toggle('hidden', !B);
    if (B) {
      bb.classList.toggle('charging', B.charging);
      bb.innerHTML = `<div class="nm"><span>${esc(B.name)}${B.phase === 2 ? '　【狂暴】' : ''}</span><span>${B.charging ? '⚠ 蓄力中' : ''}</span></div>${bar('hp', Math.max(0, B.hp), B.maxHp, 'HP')}`;
    }
    document.body.classList.toggle('charging', !!(B && B.charging));
    document.body.classList.toggle('rage', !!(B && B.phase === 2 && !B.charging));
    document.body.classList.toggle('void', S.mode === 'penalty');
    Sound.ambient(B ? 'boss' : S.mode === 'penalty' ? 'void' : S.mode === 'rift' ? 'rift' : S.mode === 'hub' ? 'city' : 'none');
    if (sc !== lastScene) {
      stopTypers();
      $('lines').innerHTML = sc.lines.map((l, i) => (l.c === 'pic'
        ? `<p class="ln pic hidden" data-art="${esc(Art.byName(l.t) || '')}"></p>`
        : `<p class="ln ${l.c}" style="animation-delay:${Math.min(i * 0.14, 1.0)}s">${esc(l.t)}</p>`)).join('');
      $('lines').querySelectorAll('.ln.pic').forEach((el) => Art.get(el.dataset.art, (url) => { if (url && el.isConnected) { el.innerHTML = `<img src="${url}" alt="">`; el.classList.remove('hidden'); } }));
      if (!reduced) {
        let sysCount = 0;
        $('lines').querySelectorAll('.ln.sys').forEach((el) => {
          const idx = Array.prototype.indexOf.call(el.parentNode.children, el);
          const delay = Math.min(idx * 140, 1000);
          typewrite(el, delay + 120);
          if (sysCount++ < 2) setTimeout(() => { if (G.scene === sc) Sound.play('sys'); }, delay);
        });
      } else if (sc.lines.some((l) => l.c === 'sys')) Sound.play('sys');
      window.scrollTo({ top: 0 });
    }
    $('choices').innerHTML = sc.choices.map((c, i) => `<button class="ch" data-i="${i}" ${c.disabled ? 'disabled' : ''}><kbd>${i + 1}</kbd><span>${esc(c.label)}</span><span class="sub">${esc(c.sub || '')}</span></button>`).join('');
    $('choices').classList.toggle('many', sc.choices.length > 5);
    lastScene = sc;
  }

  /* ---------- 演出 ---------- */
  function floatText(target, text, cls, dx) {
    const el = typeof target === 'string' ? $(target) : target; if (!el) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'float ' + (cls || ''); f.textContent = text;
    f.style.left = `${r.left + r.width * (0.3 + Math.random() * 0.4) + (dx || 0)}px`;
    f.style.top = `${r.top + r.height / 2 - 14}px`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1000);
  }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function shake(hard) { const g = $('game'); g.classList.remove('shake', 'shake-hard'); void g.offsetWidth; g.classList.add(hard ? 'shake-hard' : 'shake'); }
  function hurtFlash(heal) { const h = $('hurtflash'); h.classList.toggle('heal', !!heal); restart(h, 'on'); }

  function showOverlay(o) {
    overlayQueue.push(o);
    if (!overlayEl) nextOverlay();
  }
  function nextOverlay() {
    clearTimeout(overlayTimer);
    if (overlayEl) { overlayEl.remove(); overlayEl = null; }
    const o = overlayQueue.shift(); if (!o) return;
    overlayEl = document.createElement('div');
    overlayEl.id = 'overlay'; overlayEl.className = o.cls;
    overlayEl.innerHTML = `${o.cls === 'bind' ? '<div class="shadow"></div>' : ''}<div class="ring"></div><div class="ring r2"></div>
      <div class="big">${esc(o.big)}</div>${o.mid ? `<div class="mid">${esc(o.mid)}</div>` : ''}${o.small ? `<div class="small">${esc(o.small)}</div>` : ''}`;
    overlayEl.addEventListener('click', nextOverlay);
    document.body.appendChild(overlayEl);
    Sound.play(o.sound);
    overlayTimer = setTimeout(nextOverlay, o.ms || 1700);
  }

  function playFx() {
    const list = G.fx; G.fx = [];
    let hitDelay = 0;
    list.forEach((e) => {
      switch (e.t) {
        case 'hit': {
          const d = hitDelay; hitDelay += 160;
          setTimeout(() => {
            if ($('bossbar').classList.contains('hidden')) return;
            restart($('bossbar'), 'flash');
            floatText('bossbar', (e.crit ? '爆擊 ' : '') + e.dmg, e.echo ? 'echo' : e.crit ? 'crit' : '');
            Sound.play(e.echo ? 'echo' : e.crit ? 'crit' : 'hit');
          }, d);
          break;
        }
        case 'hurt': setTimeout(() => { shake(e.heavy && !e.guard); hurtFlash(); floatText('pbars', `-${e.dmg}`, 'hurt'); Sound.play(e.heavy ? 'heavy' : 'hurt'); }, hitDelay + 260); break;
        case 'dodge': setTimeout(() => { floatText('pbars', '閃避', 'miss'); Sound.play('dodge'); }, hitDelay + 260); break;
        case 'guard': Sound.play('guard'); break;
        case 'charge': setTimeout(() => Sound.play('charge'), hitDelay + 200); break;
        case 'phase': setTimeout(() => { shake(true); Sound.play('phase'); }, hitDelay + 100); break;
        case 'dread': shake(false); Sound.play('dread'); break;
        case 'heal': hurtFlash(true); Sound.play('heal'); break;
        case 'fight': Sound.play('fight'); if (e.lost) setTimeout(() => floatText('pbars', `-${e.lost}`, 'hurt'), 200); break;
        case 'fail': Sound.play('fail'); break;
        case 'levelup': showOverlay({ cls: 'levelup', big: 'LEVEL UP', mid: `Lv.${e.lv}`, small: '能力點 +3　狀態完全恢復', sound: 'levelup' }); break;
        case 'skill': showOverlay({ cls: 'skill', big: 'NEW SKILL', mid: `【${e.name}】`, small: e.desc, sound: 'skill' }); break;
        case 'daily': showOverlay({ cls: 'daily', big: 'QUEST CLEAR', mid: '每日任務完成', small: '能力點 +3　生命藥水 ×1　狀態完全恢復', sound: 'daily', ms: 1500 }); break;
        case 'win': showOverlay({ cls: 'win', big: 'CLEAR', mid: e.name, small: '首領已被擊敗', sound: 'win' }); break;
        case 'bind': showOverlay({ cls: 'bind', big: '回應我', mid: e.short, small: `【${e.name}】成為你的殘響`, sound: 'bind', ms: 3200 }); break;
        case 'down': showOverlay({ cls: 'down', big: 'DOWN', mid: '強制脫離', sound: 'down', ms: 1900 }); break;
        default: break;
      }
    });
  }

  function render() {
    if (!G.state || !G.scene) return;
    renderScene(); renderSide(); playFx();
    if (G.canSave()) store.set(SAVE, G.serialize());
  }
  G.onChange = render;

  /* ---------- 標題、配色、音效開關 ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t; store.set(THEME, t);
    document.querySelectorAll('.themes button').forEach((b) => b.classList.toggle('on', b.dataset.theme === t));
  }
  document.querySelectorAll('.themes button').forEach((b) => { b.style.setProperty('--sys-rgb', { teal: '95,227,192', violet: '176,140,255', amber: '232,184,96', silver: '205,216,230' }[b.dataset.theme]); b.addEventListener('click', () => { setTheme(b.dataset.theme); Sound.unlock(); Sound.play('sys'); }); });
  const urlTheme = new URLSearchParams(location.search).get('theme');
  setTheme(urlTheme || store.get(THEME) || 'silver');

  function showTitle() {
    $('game').classList.add('hidden'); $('title').classList.remove('hidden');
    document.body.classList.remove('charging', 'rage', 'void'); Sound.ambient('none');
    $('btn-continue').classList.toggle('hidden', !store.get(SAVE));
    Art.get('key-visual', (url) => { if (url) $('title').style.setProperty('--kv', `url("${url}")`); });
  }
  function showGame() { $('title').classList.add('hidden'); $('game').classList.remove('hidden'); lastScene = null; bannerId = null; $('banner').classList.add('hidden'); Sound.unlock(); }
  const muteLabel = () => { $('btn-mute').textContent = `音效：${Sound.muted ? '關' : '開'}`; };
  muteLabel();

  $('btn-new').addEventListener('click', () => { showGame(); G.start($('name').value.trim() || '無名'); });
  $('btn-continue').addEventListener('click', () => { try { showGame(); G.load(store.get(SAVE)); } catch (e) { store.del(SAVE); showTitle(); } });
  $('btn-menu').addEventListener('click', showTitle);
  $('btn-mute').addEventListener('click', () => { Sound.toggle(); muteLabel(); Sound.play('click'); });
  $('name').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-new').click(); });

  function choose(i) {
    if (overlayEl) { nextOverlay(); return; }
    const c = G.scene && G.scene.choices[i]; if (!c || c.disabled) return;
    Sound.unlock(); Sound.play('click');
    G.choose(i);
  }
  document.addEventListener('click', (ev) => {
    const ch = ev.target.closest('.ch'); if (ch && !ch.disabled) { choose(Number(ch.dataset.i)); return; }
    const al = ev.target.closest('[data-alloc]'); if (al && !al.disabled) { Sound.play('point'); G.allocate(al.dataset.alloc); return; }
    if (ev.target.closest('#lines')) stopTypers();
  });
  document.addEventListener('keydown', (ev) => {
    if ($('game').classList.contains('hidden') || ev.metaKey || ev.ctrlKey || ev.altKey) return;
    if (overlayEl) { ev.preventDefault(); nextOverlay(); return; }
    if (/^[1-9]$/.test(ev.key)) { ev.preventDefault(); choose(Number(ev.key) - 1); }
    else if ((ev.key === 'Enter' || ev.key === ' ') && G.scene && G.scene.choices.length === 1) { ev.preventDefault(); choose(0); }
  });

  showTitle();
})();
