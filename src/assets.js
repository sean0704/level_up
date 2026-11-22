/* 殘響 — 美術素材清單
 * 圖檔放在 assets/img/，檔名為「id.副檔名」（png / jpg / jpeg / webp 皆可）。
 * 沒有放圖檔的位置，會使用 art-gen.js 以程式繪製的預設圖。 */
(function () {
  'use strict';

  // 所有圖共用的畫風描述，確保風格一致
  const STYLE = 'Monochrome ink wash illustration, sumi-e inspired, forms rendered as black silhouettes dissolving into mist, dry brush strokes and ink splatter, heavy paper grain, very high contrast, palette strictly limited to pure black, charcoal grey and cold silver-white, no other colors, large areas of negative space, a single small source of pale cold white glow, minimal detail, ominous quiet atmosphere, cinematic composition. No text, no letters, no numbers, no logo, no watermark, no border, no frame.';
  const NEGATIVE = 'color, colorful, warm tones, text, letters, watermark, signature, frame, border, anime, cartoon, 3d render, photograph, detailed face, cute, bright, cluttered';

  const W = '16:9 橫幅（建議 1920×1080 以上）';
  const SQ = '1:1 正方形（建議 1024×1024）';

  const LIST = [
    { group: '標題與序章', id: 'key-visual', name: '標題主視覺', size: W, use: '標題畫面背景、序章結尾',
      subject: 'A lone hooded figure seen from behind, standing small at the bottom center on an abandoned subway platform. His long shadow stretches forward across the floor and rises up into a towering crowd of faceless shadow creatures looming over him, each with faint pale glowing eyes. Vast empty darkness above.' },
    { group: '標題與序章', id: 'pro-1', name: '序章一：墊底的', size: W, use: '序章第一段',
      subject: 'A tiny lone worker carrying a tool bag walks through a wide ruined city street at night. Far ahead, a gigantic vertical tear in the air shimmers like a wound in the sky, dwarfing the buildings. The figure is very small and insignificant.' },
    { group: '標題與序章', id: 'pro-2', name: '序章二：閉合', size: W, use: '序章第二段',
      subject: 'Inside a dark abandoned subway tunnel, a lone figure sits hunched at the edge of the platform hugging a bag. At the far end of the tunnel the exit light has shrunk to a thin closing sliver as darkness swallows everything.' },
    { group: '標題與序章', id: 'pro-3', name: '序章三：殘響', size: W, use: '序章第三段',
      subject: 'A small bare bedroom at dawn. A figure sitting up in bed reaches one hand toward a blank floating rectangle of pale light hovering in mid air in front of him. The rectangle is empty, only light.' },

    { group: '地點背景', id: 'loc-city', name: '舊城區', size: W, use: '據點主畫面',
      subject: 'A narrow old town alley with tangled overhead wires and shuttered market stalls, wet ground. In the far distance a single tall tower rises above the rooftops. No people.' },
    { group: '地點背景', id: 'loc-training', name: '訓練場', size: W, use: '每日任務畫面',
      subject: 'An empty abandoned parking lot beneath a massive elevated concrete bridge, thick pillars receding into fog, cracked ground. One tiny solitary figure training in the distance.' },
    { group: '地點背景', id: 'loc-shop', name: '黑市藥舖', size: W, use: '商店畫面',
      subject: 'The dead end of a dark narrow back alley. A single heavy iron door with no sign, a thin line of pale light leaking from under it. Pipes and stains on the walls.' },
    { group: '地點背景', id: 'loc-home', name: '住處', size: W, use: '就寢確認畫面',
      subject: 'A tiny cramped rooftop room at night seen from inside: a narrow bed, a tool bag by the door, a small window showing a faint city skyline.' },
    { group: '地點背景', id: 'loc-gate', name: '界隙入口', size: W, use: '進入界隙前',
      subject: 'A sealed-off subway entrance stairway at night with barrier tape across it. Behind the tape the air itself ripples and distorts like a vertical sheet of water, glowing faintly.' },
    { group: '地點背景', id: 'loc-rift', name: '廢線月台', size: W, use: '界隙探索中',
      subject: 'An abandoned underground subway platform, rusted rails, broken pillars and hanging cables fading into heavy fog. Empty and silent, a faint light far down the tunnel.' },
    { group: '地點背景', id: 'loc-void', name: '無光迴廊', size: W, use: '懲罰任務',
      subject: 'An endless pitch-black corridor in one-point perspective, walls barely visible. Deep in the darkness far away, the faint suggestion of something huge with many limbs approaching.' },

    { group: '首領與殘響', id: 'boss-1', name: '月台看守者・鐵顎', size: W + '，主體置中', use: '首領戰橫幅、殘響軍團縮圖',
      subject: 'A colossal hulking humanoid creature built from twisted subway turnstiles, gates and bent rails, standing at the end of a platform, centered in frame. It has no eyes. Its head is an enormous hinged iron jaw, half open, with a faint pale glow inside the mouth.' },
    { group: '首領與殘響', id: 'boss-2', name: '隧道之母・蒼繭', size: W + '，主體置中', use: '首領戰橫幅、殘響軍團縮圖',
      subject: 'A gigantic pale cocoon hanging from the ceiling of a subway tunnel, centered in frame, suspended by countless thin white threads that spread across the whole tunnel like a web. Something large is breathing inside, a faint glow through the silk.' },
    { group: '首領與殘響', id: 'boss-3', name: '末班車長・無面', size: W + '，主體置中', use: '首領戰橫幅、殘響軍團縮圖',
      subject: 'A very tall thin figure in a train conductor uniform and peaked cap stepping out of the open door of a ghostly train, centered in frame. Beneath the brim of the cap there is no face at all, only empty darkness. Pale light spills from the train door behind him.' },

    { group: '小怪', id: 'mob-1', name: '軌道鼠群', size: SQ, use: '戰報縮圖',
      subject: 'A swarm of rats pouring along subway rails toward the viewer, a mass of black shapes with dozens of tiny pinpoint glowing eyes.' },
    { group: '小怪', id: 'mob-2', name: '鏽蝕傀儡', size: SQ, use: '戰報縮圖',
      subject: 'A lopsided humanoid puppet assembled from rusted scrap metal and cables, slumped forward with dangling arms, one faint glowing point in its chest.' },
    { group: '小怪', id: 'mob-3', name: '遊蕩的殘影', size: SQ, use: '戰報縮圖',
      subject: 'A wavering translucent afterimage of a human figure, smeared sideways like a long exposure, featureless, drifting above the ground.' },
    { group: '小怪', id: 'mob-4', name: '票閘蜘蛛', size: SQ, use: '戰報縮圖',
      subject: 'A spider-like creature whose body is a subway ticket gate and whose legs are long bent metal bars, crouched on a wall, a cluster of small glowing dots for eyes.' },
    { group: '小怪', id: 'mob-5', name: '黑霧犬', size: SQ, use: '戰報縮圖',
      subject: 'A lean hound made of black mist, its outline dissolving into smoke, head lowered and snarling, two pale glowing eyes.' },

    { group: '菁英', id: 'elite-1', name: '持燈的巡道者', size: SQ, use: '戰報縮圖',
      subject: 'A tall gaunt track walker in a long coat standing on the rails holding a lantern at arm length. The lantern is the only light. His face is hidden in shadow.' },
    { group: '菁英', id: 'elite-2', name: '雙首黑霧犬', size: SQ, use: '戰報縮圖',
      subject: 'A large two-headed hound made of black mist, both heads snarling in different directions, four pale glowing eyes, body trailing smoke.' },
    { group: '菁英', id: 'elite-3', name: '鏽甲站務員', size: SQ, use: '戰報縮圖',
      subject: 'A broad station attendant figure encased in heavy rusted plate armor fused with a uniform, holding a long signal pole like a halberd, a faint glow behind the visor slit.' },

    { group: '事件', id: 'event-1', name: '事件：置物櫃', size: W, use: '界隙隨機事件',
      subject: 'A long row of rusted metal lockers along a subway station wall. One single locker door is slightly ajar with pale light leaking out through the gap.' },
    { group: '事件', id: 'event-2', name: '事件：坍塌的通道', size: W, use: '界隙隨機事件',
      subject: 'A subway passage blocked by a collapsed ceiling, a heap of broken concrete slabs and rebar. Only one narrow dark gap remains between the rubble, a faint light beyond it.' },
    { group: '事件', id: 'event-3', name: '事件：倒下的清道夫', size: W, use: '界隙隨機事件',
      subject: 'A wounded worker in a work vest sitting slumped against a station pillar, head lowered, a tool bag beside him. Seen from a distance, small in the frame, alone.' },
  ];
  LIST.forEach((a) => { a.prompt = `${a.subject} ${STYLE}`; });

  const EXTS = ['png', 'jpg', 'jpeg', 'webp'];
  const cache = {}; // id -> url | null
  const custom = {}; // id -> 是否為使用者上傳的圖檔
  const waiting = {};
  function probe(id, i, done) {
    if (i >= EXTS.length) return done(null);
    const url = `assets/img/${id}.${EXTS[i]}`, img = new Image();
    img.onload = () => done(url);
    img.onerror = () => probe(id, i + 1, done);
    img.src = url;
  }

  window.Art = {
    LIST, STYLE, NEGATIVE,
    byName(name) { const a = LIST.find((x) => x.name === name); return a ? a.id : null; },
    /** 該位置目前是否使用上傳的圖檔（需在 get 回呼之後才準確）。 */
    isCustom(id) { return !!custom[id]; },
    /** 取得圖檔網址：有上傳的圖檔就用圖檔，否則用程式繪製的預設圖。已查過的會同步回呼。 */
    get(id, cb) {
      if (!id) return cb(null);
      if (id in cache) return cb(cache[id]);
      if (waiting[id]) { waiting[id].push(cb); return undefined; }
      waiting[id] = [cb];
      probe(id, 0, (found) => { custom[id] = !!found; const url = found || (window.ArtGen ? window.ArtGen.uri(id) : null); cache[id] = url; const q = waiting[id]; delete waiting[id]; q.forEach((f) => f(url)); });
      return undefined;
    },
  };
})();
