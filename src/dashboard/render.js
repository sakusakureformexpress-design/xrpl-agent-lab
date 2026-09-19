/**
 * ダッシュボードの HTML を組み立てる。
 *
 * データは `<script type="application/json">` に埋め込み、描画はクライアント側で行う。
 * **台帳由来の文字列（アドレス・Memo・結果コード）は必ず textContent で入れる。**
 * Memo は外部が書ける領域であり、innerHTML に通すと XSS になる。
 */

/** JSON を <script> に安全に埋める。`</script>` と行区切りを殺す。 */
function embedJson(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/[\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16));
}

const STYLE = `
:root{
  color-scheme:light;
  --bg:#F7F7FA; --card:#FFFFFF; --soft:#EFEFF5;
  --ink:#191922; --ink2:#4B4B5C; --ink3:#7C7C90;
  --line:#DDDDE8; --line2:#C2C2D2;
  --ac:#5B3FD6; --ac-soft:#ECE8FB;
  /* 深刻度（status パレット。色だけでは意味を運ばない — 必ず記号＋ラベルを添える） */
  --m-normal:#2a78d6; --m-warning:#fab219; --m-critical:#d03b3b;
  --s-good:#0ca30c; --s-good-ink:#006300;
  --s-critical:#d03b3b; --s-critical-ink:#B02F2F;
  --d:'Outfit','Noto Sans JP',system-ui,-apple-system,sans-serif;
  --b:'Noto Sans JP',system-ui,-apple-system,sans-serif;
  --m:'JetBrains Mono',ui-monospace,SFMono-Regular,monospace;
}
@media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
  color-scheme:dark;
  --bg:#0D0D12; --card:#1A1A23; --soft:#22222D;
  --ink:#EDEDF4; --ink2:#B0B0C2; --ink3:#83839A;
  --line:#2C2C39; --line2:#3D3D4D;
  --ac:#A48CFF; --ac-soft:#221B3D;
  --m-normal:#3987e5; --m-warning:#fab219; --m-critical:#d03b3b;
  --s-good:#0ca30c; --s-good-ink:#3FBF3F;
  --s-critical:#d03b3b; --s-critical-ink:#E87171;
}}
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg:#0D0D12; --card:#1A1A23; --soft:#22222D;
  --ink:#EDEDF4; --ink2:#B0B0C2; --ink3:#83839A;
  --line:#2C2C39; --line2:#3D3D4D;
  --ac:#A48CFF; --ac-soft:#221B3D;
  --m-normal:#3987e5; --m-warning:#fab219; --m-critical:#d03b3b;
  --s-good:#0ca30c; --s-good-ink:#3FBF3F;
  --s-critical:#d03b3b; --s-critical-ink:#E87171;
}
*{box-sizing:border-box}
html,body{margin:0}
body{background:var(--bg); color:var(--ink); font-family:var(--b); font-size:15px; line-height:1.8;
     -webkit-font-smoothing:antialiased}
.w{max-width:960px; margin:0 auto; padding:34px 18px 72px; display:flex; flex-direction:column; gap:30px}
h1,h2{font-family:var(--d); margin:0; letter-spacing:-.01em; text-wrap:balance}
h1{font-size:clamp(24px,5vw,32px); font-weight:700; line-height:1.2}
h2{font-size:clamp(17px,3.2vw,20px); font-weight:700}
p{margin:0; color:var(--ink2)}
strong{color:var(--ink); font-weight:700}
code,.mono{font-family:var(--m); font-size:.86em}
a{color:var(--ac)}
.eye{font-family:var(--m); font-size:11px; letter-spacing:.14em; color:var(--ac); font-weight:700; margin:0}
section{display:flex; flex-direction:column; gap:14px}
.sub{font-size:13.5px; color:var(--ink3); line-height:1.7}

/* ---- ヘッダ ---- */
.top{display:flex; flex-wrap:wrap; gap:12px 18px; align-items:flex-end; justify-content:space-between}
.meta{display:flex; flex-wrap:wrap; gap:6px 14px; font-size:12.5px; color:var(--ink3); font-family:var(--m)}
.badge{font-family:var(--m); font-size:10.5px; font-weight:700; letter-spacing:.06em; padding:3px 9px;
       border-radius:20px; background:var(--ac-soft); color:var(--ac); white-space:nowrap}
.ctl{display:flex; gap:8px; align-items:center}
button{font-family:var(--b); font-size:13px; color:var(--ink2); background:var(--card);
       border:1px solid var(--line); border-radius:8px; padding:6px 13px; cursor:pointer; line-height:1.6}
button:hover{border-color:var(--line2); color:var(--ink)}
button[aria-pressed="true"]{background:var(--ac-soft); border-color:var(--ac); color:var(--ac)}

/* ---- ヒーロー数値（1画面に1つだけ） ---- */
.hero{background:var(--card); border:1px solid var(--line); border-radius:14px; padding:24px 26px;
      display:flex; flex-direction:column; gap:6px}
.hero .lab{font-size:13.5px; color:var(--ink3)}
.hero .val{font-family:var(--d); font-weight:700; font-size:clamp(40px,9vw,60px); line-height:1.05;
           letter-spacing:-.02em; color:var(--ink)}
.hero .val .u{font-size:.42em; font-weight:500; color:var(--ink3); margin-left:.3em; letter-spacing:0}
.hero .note{font-size:13px; color:var(--ink3); line-height:1.7}

/* ---- KPI ---- */
.kpi{display:grid; grid-template-columns:repeat(auto-fit,minmax(178px,1fr)); gap:12px}
.tile{background:var(--card); border:1px solid var(--line); border-radius:11px; padding:15px 17px;
      display:flex; flex-direction:column; gap:3px}
.tile .l{font-size:12.5px; color:var(--ink3); line-height:1.5}
.tile .v{font-family:var(--d); font-weight:700; font-size:25px; line-height:1.25; color:var(--ink)}
.tile .v .u{font-size:.5em; font-weight:500; color:var(--ink3); margin-left:.25em}
.tile .by{font-size:11.5px; color:var(--ink3); display:flex; align-items:center; gap:5px; margin-top:2px}
.dot{width:8px; height:8px; border-radius:50%; flex:none; box-shadow:0 0 0 2px var(--card)}

/* ---- メーター行 ---- */
.rows{display:flex; flex-direction:column; gap:10px}
.row{background:var(--card); border:1px solid var(--line); border-radius:11px; padding:14px 16px;
     display:flex; flex-direction:column; gap:9px}
.row .hd{display:flex; flex-wrap:wrap; gap:4px 12px; align-items:baseline; justify-content:space-between}
.row .who{font-family:var(--m); font-size:13px; color:var(--ink); word-break:break-all}
.row .num{font-size:13px; color:var(--ink2); font-variant-numeric:tabular-nums; white-space:nowrap}
.row .num b{color:var(--ink)}
.track{height:10px; border-radius:5px; overflow:hidden; position:relative}
.fill{height:100%; border-radius:0 4px 4px 0; min-width:2px}
.row .ft{display:flex; flex-wrap:wrap; gap:4px 14px; font-size:11.5px; color:var(--ink3); font-family:var(--m)}
.tag{display:inline-flex; align-items:center; gap:5px; font-family:var(--b); font-size:11.5px;
     font-weight:700; padding:2px 8px; border-radius:20px; white-space:nowrap}

/* ---- 表 ---- */
.tbl{overflow-x:auto; border:1px solid var(--line); border-radius:11px; background:var(--card)}
table{width:100%; min-width:700px; border-collapse:collapse; font-size:13px}
th,td{text-align:left; padding:10px 14px; border-bottom:1px solid var(--line); vertical-align:top}
th{font-family:var(--m); font-size:10.5px; letter-spacing:.05em; color:var(--ink3); background:var(--soft); white-space:nowrap}
tr:last-child td{border-bottom:none}
td{color:var(--ink2)} td strong{color:var(--ink)}
td.n{font-variant-numeric:tabular-nums; white-space:nowrap; font-family:var(--m); font-size:12px}
td.who{min-width:230px}
td.res{min-width:186px}
td.res .memo{overflow-wrap:normal; white-space:nowrap}
.memo{font-size:11.5px; color:var(--ink3); overflow-wrap:anywhere; display:block; margin-top:3px; line-height:1.55}
.glyph{font-size:10px; line-height:1}

.note{background:var(--soft); border-radius:10px; padding:14px 16px; font-size:13px; color:var(--ink2); line-height:1.75}
.note strong{color:var(--ink)}
.warnbox{border:1px solid var(--m-critical); background:var(--card)}
.empty{color:var(--ink3); font-size:13.5px; padding:2px 0}
[hidden]{display:none !important}
@media (prefers-reduced-motion:no-preference){ .fill{transition:width .25s ease} }
`;

const SCRIPT = String.raw`
const DATA = JSON.parse(document.getElementById('snapshot').textContent);
let current = DATA;

// 記号はそれぞれ別の形にする。色だけで区別させないため（CVD・白黒印刷）
const SEV = {
  normal:   { css:'--m-normal',   mark:'●', label:'通常' },
  warning:  { css:'--m-warning',  mark:'▲', label:'残りわずか' },
  critical: { css:'--m-critical', mark:'■', label:'ほぼ使い切り' },
  expired:  { css:'--line2',      mark:'—', label:'期限切れ' },
};

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;   // 台帳由来の文字列は必ずここを通す
  return n;
};
const short = (s, head = 8, tail = 6) =>
  typeof s === 'string' && s.length > head + tail + 1 ? s.slice(0, head) + '…' + s.slice(-tail) : (s ?? '');

/** メーター1本。色は深刻度のみが決め、記号とラベルを必ず添える。 */
function meter(percent, severity) {
  const s = SEV[severity] ?? SEV.normal;
  const track = el('div', 'track');
  track.style.background = 'color-mix(in oklab, var(' + s.css + ') 16%, var(--card))';
  const fill = el('div', 'fill');
  fill.style.background = 'var(' + s.css + ')';
  fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
  track.appendChild(fill);
  return track;
}

function sevTag(severity) {
  const s = SEV[severity] ?? SEV.normal;
  const t = el('span', 'tag');
  t.style.background = 'color-mix(in oklab, var(' + s.css + ') 14%, var(--card))';
  t.style.color = 'var(--ink2)';
  const g = el('span', 'glyph', s.mark);
  g.style.color = 'var(' + s.css + ')';
  t.append(g, document.createTextNode(s.label));
  return t;
}

function num(value, unit) {
  const f = document.createDocumentFragment();
  f.append(el('span', null, value));
  if (unit) f.append(el('span', 'u', unit));
  return f;
}

function renderHero(d) {
  const h = document.getElementById('hero');
  h.replaceChildren();
  h.append(el('div', 'lab', 'いまエージェント側が動かせる上限の合計'));
  const v = el('div', 'val');
  v.append(num(d.totals.reachableXrp, 'XRP'));
  h.append(v);
  h.append(el('div', 'note',
    '内訳: 台帳が強制している ' + d.totals.ledgerEnforcedXrp + ' XRP ＋ ' +
    (d.totals.softwareEnforcedXrp != null
      ? 'ブローカー口座の残高 ' + d.totals.softwareEnforcedXrp + ' XRP（ソフトウェアが強制）'
      : 'ブローカーは未稼働')));
}

function tile(label, value, unit, by, sevCss) {
  const t = el('div', 'tile');
  t.append(el('div', 'l', label));
  const v = el('div', 'v');
  v.append(num(value, unit));
  t.append(v);
  if (by) {
    const b = el('div', 'by');
    if (sevCss) { const d = el('span', 'dot'); d.style.background = 'var(' + sevCss + ')'; b.append(d); }
    b.append(el('span', null, by));
    t.append(b);
  }
  return t;
}

function renderKpi(d) {
  const k = document.getElementById('kpi');
  k.replaceChildren(
    tile('台帳が強制している残枠', d.totals.ledgerEnforcedXrp, 'XRP', '強制: XRP レジャー', '--m-normal'),
    tile('ソフトウェアが強制している額',
         d.totals.softwareEnforcedXrp != null ? d.totals.softwareEnforcedXrp : '—', 'XRP',
         '強制: ブローカー（掌握されれば無効）', '--m-warning'),
    tile('有効な予算枠', String(d.totals.budgetCount), '本',
         d.totals.expiredCount ? '期限切れ ' + d.totals.expiredCount + ' 本' : '期限切れなし'),
    tile('本口座の残高', d.totals.ownerBalanceXrp != null ? d.totals.ownerBalanceXrp : '—', 'XRP',
         'エージェントから到達不能', '--s-good'),
  );
}

function renderBudgets(d) {
  const box = document.getElementById('budgets');
  box.replaceChildren();
  if (!d.budgets.length) {
    box.append(el('p', 'empty', '予算枠はまだありません。leash grant で作成します。'));
    return;
  }
  for (const b of d.budgets) {
    const row = el('div', 'row');
    const hd = el('div', 'hd');
    hd.append(el('span', 'who', b.payee));
    const n = el('span', 'num');
    n.append(el('b', null, b.spentXrp), document.createTextNode(' / ' + b.capXrp + ' XRP 使用'));
    hd.append(n);
    row.append(hd, meter(b.percent, b.severity));

    const ft = el('div', 'ft');
    ft.append(el('span', null, '残 ' + b.remainingXrp + ' XRP（' + b.percent.toFixed(1) + '% 使用）'));
    ft.append(el('span', null, 'channel ' + short(b.channelId, 10, 8)));
    if (b.expiresAt) ft.append(el('span', null, (b.expired ? '期限切れ ' : '期限 ') + b.expiresAt.slice(0, 16).replace('T', ' ')));
    row.append(ft);

    const tags = el('div', 'ft');
    tags.append(sevTag(b.severity));
    row.append(tags);
    box.append(row);
  }
}

function renderBudgetTable(d) {
  const t = document.getElementById('budget-table');
  t.replaceChildren();
  const table = el('table');
  const head = el('tr');
  for (const h of ['支払先', '上限 XRP', '使用 XRP', '残 XRP', '使用率', '期限', 'channel']) head.append(el('th', null, h));
  table.append(head);
  for (const b of d.budgets) {
    const tr = el('tr');
    tr.append(el('td', null, b.payee));
    for (const v of [b.capXrp, b.spentXrp, b.remainingXrp, b.percent.toFixed(1) + '%']) tr.append(el('td', 'n', v));
    tr.append(el('td', 'n', b.expiresAt ? b.expiresAt.slice(0, 16).replace('T', ' ') : '無期限'));
    tr.append(el('td', 'n', b.channelId));
    table.append(tr);
  }
  t.append(table);
}

function renderAgents(d) {
  const box = document.getElementById('agents');
  box.replaceChildren();
  if (!d.agents.length) {
    box.append(el('p', 'empty', 'ブローカーのポリシーが読み込まれていません（--policy で指定します）。'));
    return;
  }
  for (const a of d.agents) {
    const row = el('div', 'row');
    const hd = el('div', 'hd');
    hd.append(el('span', 'who', a.name));
    const n = el('span', 'num');
    if (a.dailyCapXrp) n.append(el('b', null, a.spentXrp), document.createTextNode(' / ' + a.dailyCapXrp + ' XRP 本日'));
    else n.append(el('b', null, a.spentXrp), document.createTextNode(' XRP 本日（日次上限なし）'));
    hd.append(n);
    row.append(hd);
    if (a.dailyCapXrp) row.append(meter(a.percent, a.severity));

    const ft = el('div', 'ft');
    if (a.perPaymentMaxXrp) ft.append(el('span', null, '1件あたり上限 ' + a.perPaymentMaxXrp + ' XRP'));
    ft.append(el('span', null, '本日の支払先 ' + a.payeesToday.length + ' 件'
      + (a.newPayeesPerDay != null ? ' / 新規枠 ' + a.newPayeesPerDay : '')));
    if (a.alwaysAllow.length) ft.append(el('span', null, '常時許可 ' + a.alwaysAllow.length + ' 件'));
    if (a.denyList.length) ft.append(el('span', null, '拒否 ' + a.denyList.length + ' 件'));
    ft.append(el('span', null, a.autoApprove ? '未知の支払先を自動承認' : '未知の支払先は人間の承認が要る'));
    if (a.allowedDomains.length) {
      ft.append(el('span', null, 'ドメイン束縛 ' + a.allowedDomains.join(', ')
        + (a.requireVerifiedDomain ? '（双方向検証 必須）' : '')));
    }
    row.append(ft);
    box.append(row);
  }
}

function renderActivity(d) {
  const box = document.getElementById('activity');
  box.replaceChildren();
  if (!d.activity.length) {
    box.append(el('p', 'empty', 'SourceTag ' + d.sourceTag + ' の取引はまだありません。'));
    return;
  }
  const wrap = el('div', 'tbl');
  const table = el('table');
  const head = el('tr');
  for (const h of ['日時', '種別', '相手', '金額 XRP', '台帳の返答']) head.append(el('th', null, h));
  table.append(head);
  for (const a of d.activity) {
    const tr = el('tr');
    tr.append(el('td', 'n', a.at ? a.at.slice(0, 16).replace('T', ' ') : '—'));
    tr.append(el('td', null, a.type));
    const who = el('td', 'who');
    const counterparty = a.direction === 'in' ? a.account : a.destination;
    if (counterparty) who.append(el('span', 'mono', short(counterparty, 10, 8)));
    else if (a.channel) who.append(el('span', 'mono', 'channel ' + short(a.channel, 8, 6)));
    else who.append(el('span', 'mono', '—'));
    if (a.leash) {
      const bits = [];
      if (a.leash.agent) bits.push('agent ' + a.leash.agent);
      if (a.leash.invoice) bits.push('invoice ' + a.leash.invoice);
      if (a.leash.policy) bits.push('policy ' + a.leash.policy.slice(0, 8));
      // 値は相手のサーバ由来になりうる。textContent でのみ入れる
      if (bits.length) who.append(el('span', 'memo', bits.join(' · ')));
      if (a.leash.resource) who.append(el('span', 'memo', a.leash.resource));
    }
    if (a.foreignMemos) who.append(el('span', 'memo', '（他者のメモ ' + a.foreignMemos + ' 件・非表示）'));
    tr.append(who);
    tr.append(el('td', 'n', a.amountXrp ?? '—'));

    const res = el('td', 'res');
    const tag = el('span', 'tag');
    const good = !a.rejected;
    tag.style.background = 'color-mix(in oklab, var(' + (good ? '--s-good' : '--s-critical') + ') 14%, var(--card))';
    tag.style.color = 'var(' + (good ? '--s-good-ink' : '--s-critical-ink') + ')';
    const g = el('span', 'glyph', good ? '✓' : '✕');
    g.style.color = 'var(' + (good ? '--s-good' : '--s-critical') + ')';
    tag.append(g, document.createTextNode(good ? '通った' : '台帳が拒否'));
    res.append(tag, el('span', 'memo', a.result ?? ''));
    tr.append(res);
    table.append(tr);
  }
  wrap.append(table);
  box.append(wrap);
}

function renderMeta(d) {
  const m = document.getElementById('meta');
  m.replaceChildren(
    el('span', null, '口座 ' + short(d.owner.address, 10, 8)),
    el('span', null, 'network ' + d.network),
    el('span', null, 'SourceTag ' + d.sourceTag),
    el('span', null, '取得 ' + d.generatedAt.slice(0, 19).replace('T', ' ') + 'Z'),
  );
  const w = document.getElementById('warnings');
  w.replaceChildren();
  w.hidden = !d.warnings.length;
  for (const line of d.warnings) w.append(el('div', null, '⚠ ' + line));
}

function renderAll(d) {
  current = d;
  renderMeta(d); renderHero(d); renderKpi(d);
  renderBudgets(d); renderBudgetTable(d); renderAgents(d); renderActivity(d);
}

/* 表切り替え: 連続量を色だけで見せない（メーターと同じ数字を表でも出す） */
const tableBtn = document.getElementById('toggle-table');
if (tableBtn) {
  tableBtn.addEventListener('click', () => {
    const on = tableBtn.getAttribute('aria-pressed') === 'true';
    tableBtn.setAttribute('aria-pressed', String(!on));
    document.getElementById('budget-table').hidden = on;
    document.getElementById('budgets').hidden = !on;
  });
}

/* 再取得。取得中も前の描画を残す（スケルトンで画面を飛ばさない） */
const reload = document.getElementById('reload');
if (reload) {
  reload.addEventListener('click', async () => {
    const root = document.querySelector('.w');
    root.style.opacity = '.55';
    try {
      const r = await fetch('/api/snapshot', { headers: { accept: 'application/json' } });
      if (r.ok) renderAll(await r.json());
    } catch { /* 失敗しても前の表示を残す */ }
    root.style.opacity = '1';
  });
}

renderAll(DATA);
`;

/**
 * ページ全体を返す。
 * @param {object} snapshot collect() の戻り
 * @param {{live?:boolean}} [opts] live=false なら再取得ボタンを出さない（保存版）
 */
export function renderPage(snapshot, { live = true } = {}) {
  return `<!doctype html>
<html lang="ja"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Leash ダッシュボード</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@500;700&family=Noto+Sans+JP:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap">
<style>${STYLE}</style>
</head><body>
<div class="w">

  <header class="top">
    <div style="display:flex;flex-direction:column;gap:6px">
      <p class="eye">LEASH DASHBOARD</p>
      <h1>エージェントに渡している上限</h1>
      <div class="meta" id="meta"></div>
    </div>
    <div class="ctl">
      <span class="badge">${live ? 'LIVE' : 'SNAPSHOT'}</span>
      ${live ? '<button id="reload" type="button">再取得</button>' : ''}
    </div>
  </header>

  <div class="note warnbox" id="warnings" hidden></div>

  <div class="hero" id="hero"></div>

  <div class="kpi" id="kpi"></div>

  <section>
    <p class="eye">TIER 1 — LEDGER ENFORCED</p>
    <div class="top">
      <h2>台帳が強制している予算枠</h2>
      <button id="toggle-table" type="button" aria-pressed="false">表で見る</button>
    </div>
    <p class="sub">上限は <code>PaymentChannelCreate.Amount</code>、支払先は <code>Destination</code> に固定されている。
      エージェントが持つのはチャネルの署名鍵だけで、どちらも動かせない。超過したクレームは
      <code>tecUNFUNDED_PAYMENT</code> で落ちる。</p>
    <div class="rows" id="budgets"></div>
    <div class="tbl" id="budget-table" hidden></div>
  </section>

  <section>
    <p class="eye">TIER 2 — SOFTWARE ENFORCED</p>
    <h2>ブローカーが強制している当日上限</h2>
    <p class="sub">x402 のように直接 <code>Payment</code> を要求する相手に払うための段。判定に LLM は入らない。</p>
    <div class="rows" id="agents"></div>
    <p class="note"><strong>この段の限界。</strong>上限とその日の使用量は、このマシン上のファイルにある。
      マシンを掌握した者はどちらも書き換えられる。<strong>最大被害はブローカー口座の残高</strong>であり、
      本口座には届かない。上の Tier 1 はこの限界を受けない。</p>
  </section>

  <section>
    <p class="eye">LEDGER RECORD</p>
    <h2>台帳に残った記録</h2>
    <p class="sub">本ツール経由の取引だけを <code>SourceTag</code> で抽出している。
      <strong>拒否された取引も台帳に残る</strong>ため、止まった証拠が第三者にも確認できる。</p>
    <div id="activity"></div>
  </section>

  <p class="note"><strong>この画面は読み取り専用です。</strong>予算枠を閉じる操作には口座の鍵が要るため、
    ダッシュボードには持たせていない。閉じるときは手元で
    <code>leash revoke --channel &lt;id&gt;</code> を実行する。</p>

</div>
<script id="snapshot" type="application/json">${embedJson(snapshot)}</script>
<script type="module">${SCRIPT}</script>
</body></html>`;
}
