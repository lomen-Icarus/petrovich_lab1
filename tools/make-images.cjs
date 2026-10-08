// Генерирует SVG-исходники и PNG-изображения для сайта.
// Запуск: NODE_PATH=$(npm root -g) node tools/make-images.cjs
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'images', 'src');
const OUT = path.join(ROOT, 'images');

const C = {
  navy: '#0B1B33',
  navy2: '#12284A',
  navy3: '#1A3561',
  line: '#2B4C80',
  blue: '#2563EB',
  blueLight: '#60A5FA',
  green: '#22C55E',
  amber: '#F59E0B',
  red: '#EF4444',
  bg: '#EEF2F7',
  card: '#FFFFFF',
  text: '#0F172A',
  gray: '#475569',
  grayLight: '#CBD5E1',
  border: '#E2E8F0',
};
const FONT = "Inter, 'DejaVu Sans', Arial, sans-serif";
const MONO = "'DejaVu Sans Mono', 'Liberation Mono', monospace";

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : FONT}" font-size="${o.size || 26}" font-weight="${o.weight || 400}" fill="${o.fill || C.text}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
const r = (x, y, w, h, fill, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 2}"` : ''}${o.opacity ? ` opacity="${o.opacity}"` : ''}/>`;

// ---------- 1. Иллюстрация серверов для первого экрана (без текста) ----------
function hero() {
  const W = 1600, H = 1200;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#173563"/><stop offset="1" stop-color="${C.navy}"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.55" r="0.5">
      <stop offset="0" stop-color="${C.blue}" stop-opacity="0.35"/><stop offset="1" stop-color="${C.blue}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rack" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1B3B6B"/><stop offset="1" stop-color="#0F2445"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="800" cy="680" rx="760" ry="520" fill="url(#glow)"/>`;
  // точечная сетка
  for (let y = 60; y < H; y += 60) for (let x = 60; x < W; x += 60)
    s += `<circle cx="${x}" cy="${y}" r="2" fill="#FFFFFF" opacity="0.07"/>`;
  // линии связи
  s += `<g fill="none" stroke="${C.blueLight}" stroke-width="3" opacity="0.55" stroke-dasharray="10 12">
    <path d="M420 300 C 420 170, 800 170, 800 250"/>
    <path d="M1180 300 C 1180 170, 800 170, 800 250"/>
  </g>
  <circle cx="800" cy="200" r="14" fill="${C.blueLight}"/>
  <circle cx="800" cy="200" r="30" fill="none" stroke="${C.blueLight}" stroke-width="3" opacity="0.4"/>`;
  // стойки
  const racks = [
    { x: 270, y: 330, w: 300, units: 8 },
    { x: 630, y: 260, w: 340, units: 10 },
    { x: 1030, y: 330, w: 300, units: 8 },
  ];
  racks.forEach((k, ki) => {
    const uh = 62, gap = 12, pad = 22;
    const h = pad * 2 + k.units * uh + (k.units - 1) * gap;
    s += `<rect x="${k.x + 16}" y="${k.y + 24}" width="${k.w}" height="${h}" rx="22" fill="#000" opacity="0.25"/>`;
    s += r(k.x, k.y, k.w, h, 'url(#rack)', { rx: 22, stroke: C.line, sw: 3 });
    for (let i = 0; i < k.units; i++) {
      const ux = k.x + pad, uy = k.y + pad + i * (uh + gap), uw = k.w - pad * 2;
      s += r(ux, uy, uw, uh, '#14305A', { rx: 10, stroke: '#24467A', sw: 2 });
      const on = (i + ki) % 4 !== 3;
      s += `<circle cx="${ux + 26}" cy="${uy + uh / 2}" r="8" fill="${on ? C.green : C.amber}"/>`;
      s += `<circle cx="${ux + 52}" cy="${uy + uh / 2}" r="8" fill="${C.blueLight}" opacity="${(i % 2) ? 1 : 0.45}"/>`;
      if (i % 3 === 1) {
        for (let d = 0; d < 4; d++) s += r(ux + 82 + d * 38, uy + 16, 30, uh - 32, '#0C2141', { rx: 4, stroke: '#2E5590', sw: 2 });
      } else {
        s += r(ux + 82, uy + uh / 2 - 5, uw * 0.38, 10, '#2E5590', { rx: 5 });
      }
      for (let v = 0; v < 5; v++) s += r(ux + uw - 30 - v * 16, uy + 16, 6, uh - 32, '#2E5590', { rx: 3 });
    }
  });
  // значки: защита, резервная копия, мониторинг
  const badge = (cx, cy, inner) => `<g>
    <circle cx="${cx}" cy="${cy}" r="66" fill="#FFFFFF" opacity="0.08"/>
    <circle cx="${cx}" cy="${cy}" r="52" fill="${C.blue}"/>
    <g fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">${inner}</g></g>`;
  s += badge(200, 250, `<path d="M200 220 L226 231 L226 252 C226 270 214 281 200 287 C186 281 174 270 174 252 L174 231 Z"/><path d="M188 254 L197 263 L213 245"/>`);
  s += badge(1400, 260, `<path d="M1378 274 a20 20 0 0 1 4-38 a26 26 0 0 1 48 8 a16 16 0 0 1-2 32 Z"/><path d="M1404 264 V250 M1396 257 L1404 249 L1412 257"/>`);
  s += badge(1410, 980, `<path d="M1382 996 L1398 974 L1412 986 L1438 956"/><path d="M1382 1004 H1440"/>`);
  s += badge(190, 980, `<rect x="168" y="958" width="44" height="44" rx="6"/><path d="M180 958 V950 M200 958 V950 M180 1002 V1010 M200 1002 V1010 M168 970 H160 M168 990 H160 M212 970 H220 M212 990 H220"/>`);
  s += `</svg>`;
  return { name: 'hero-servers', svg: s, w: W, h: H };
}

// ---------- Общая рамка «окна панели» ----------
function frame(active, body) {
  const W = 1600, H = 1000;
  const menu = ['Обзор', 'Консоль', 'Файлы', 'Базы данных', 'Резервные копии', 'Сеть', 'Настройки'];
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#DCE4EF"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="22" fill="${C.bg}" stroke="#C3CEDD" stroke-width="2"/>
  <path d="M40 62 a22 22 0 0 1 22-22 H${W - 62} a22 22 0 0 1 22 22 V110 H40 Z" fill="#FFFFFF"/>
  <line x1="40" y1="110" x2="${W - 40}" y2="110" stroke="${C.border}" stroke-width="2"/>
  <circle cx="80" cy="75" r="9" fill="#F87171"/><circle cx="110" cy="75" r="9" fill="#FBBF24"/><circle cx="140" cy="75" r="9" fill="#34D399"/>
  ${r(560, 56, 480, 38, '#F1F5F9', { rx: 19 })}
  ${t(800, 83, 'Панель управления сервером', { size: 22, fill: C.gray, anchor: 'middle' })}
  ${r(1290, 54, 250, 42, '#FEF3C7', { rx: 21, stroke: C.amber, sw: 2 })}
  ${t(1415, 83, 'Пример интерфейса', { size: 22, weight: 700, fill: '#92400E', anchor: 'middle' })}
  <path d="M40 110 H318 V${H - 40} H62 a22 22 0 0 1 -22 -22 Z" fill="${C.navy}"/>`;
  menu.forEach((m, i) => {
    const y = 160 + i * 66;
    if (m === active) s += r(54, y - 34, 250, 52, C.blue, { rx: 12 });
    s += `<circle cx="86" cy="${y - 8}" r="7" fill="${m === active ? '#FFFFFF' : '#5B7BAE'}"/>`;
    s += t(108, y, m, { size: 22, weight: m === active ? 700 : 500, fill: m === active ? '#FFFFFF' : '#C7D4EA' });
  });
  s += body + `</svg>`;
  return s;
}

const bar = (x, y, w, pct, color) => r(x, y, w, 14, '#E2E8F0', { rx: 7 }) + r(x, y, Math.round(w * pct), 14, color, { rx: 7 });

// ---------- 2. Обзор сервера и ресурсы ----------
function overview() {
  let b = '';
  b += t(340, 175, 'minecraft-survival', { size: 40, weight: 700 });
  b += r(720, 143, 176, 44, '#DCFCE7', { rx: 22 }) + `<circle cx="746" cy="165" r="8" fill="${C.green}"/>` + t(762, 174, 'Работает', { size: 24, weight: 600, fill: '#166534' });
  b += t(340, 220, 'Minecraft Java · сборка Paper', { size: 24, fill: C.gray });
  const cards = [
    ['Процессор', '38 %', 0.38, C.blue],
    ['Память', '3,1 из 6 ГБ', 0.52, C.blue],
    ['Диск', '12 из 40 ГБ', 0.30, C.blue],
    ['Игроки онлайн', '7 из 20', 0.35, C.green],
  ];
  cards.forEach((c, i) => {
    const x = 340 + i * 300, y = 260;
    b += r(x, y, 276, 170, C.card, { rx: 16, stroke: C.border });
    b += t(x + 24, y + 48, c[0], { size: 24, fill: C.gray });
    b += t(x + 24, y + 100, c[1], { size: 36, weight: 700 });
    b += bar(x + 24, y + 128, 228, c[2], c[3]);
  });
  // график
  const gx = 340, gy = 460, gw = 780, gh = 440;
  b += r(gx, gy, gw, gh, C.card, { rx: 16, stroke: C.border });
  b += t(gx + 28, gy + 52, 'Память за последний час', { size: 28, weight: 700 });
  for (let i = 0; i < 4; i++) b += `<line x1="${gx + 40}" x2="${gx + gw - 30}" y1="${gy + 120 + i * 80}" y2="${gy + 120 + i * 80}" stroke="${C.border}" stroke-width="2"/>`;
  const pts = [2.4, 2.5, 2.7, 2.6, 2.9, 3.2, 3.0, 3.3, 3.1, 3.4, 3.2, 3.1];
  const px = (i) => gx + 40 + i * ((gw - 70) / (pts.length - 1));
  const py = (v) => gy + 360 - (v / 6) * 320 + 40;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
  b += `<path d="${d} L${px(pts.length - 1)} ${gy + 400} L${px(0)} ${gy + 400} Z" fill="${C.blue}" opacity="0.12"/>`;
  b += `<path d="${d}" fill="none" stroke="${C.blue}" stroke-width="5" stroke-linejoin="round"/>`;
  b += t(gx + 40, gy + gh - 14, '60 мин назад', { size: 20, fill: C.gray });
  b += t(gx + gw - 30, gy + gh - 14, 'сейчас', { size: 20, fill: C.gray, anchor: 'end' });
  // правая колонка
  const rx = 1150, rw = 390;
  b += r(rx, gy, rw, 200, C.card, { rx: 16, stroke: C.border });
  b += t(rx + 28, gy + 52, 'Резервные копии', { size: 28, weight: 700 });
  b += t(rx + 28, gy + 100, 'Последняя: сегодня, 04:00', { size: 24, fill: C.gray });
  b += r(rx + 28, gy + 124, 220, 50, '#EFF6FF', { rx: 12, stroke: '#BFDBFE' }) + t(rx + 138, gy + 157, 'Создать копию', { size: 22, weight: 600, fill: C.blue, anchor: 'middle' });
  b += r(rx, gy + 224, rw, 216, C.card, { rx: 16, stroke: C.border });
  b += t(rx + 28, gy + 276, 'Сведения', { size: 28, weight: 700 });
  [['Версия', '1.21'], ['Время работы', '2 ч 14 мин'], ['Доп. порты', '1']].forEach((row, i) => {
    b += t(rx + 28, gy + 324 + i * 40, row[0], { size: 22, fill: C.gray });
    b += t(rx + rw - 28, gy + 324 + i * 40, row[1], { size: 22, weight: 600, anchor: 'end' });
  });
  return { name: 'panel-overview', svg: frame('Обзор', b), w: 1600, h: 1000 };
}

// ---------- 3. Файлы и настройки ----------
function files() {
  let b = '';
  b += t(340, 175, 'Файлы', { size: 40, weight: 700 });
  b += t(340, 218, '/ сервер / основная папка', { size: 24, fill: C.gray });
  [['Загрузить', true], ['Новая папка', false], ['Архивировать', false]].forEach((btn, i) => {
    const x = 760 + i * 200;
    b += r(x, 140, 184, 52, btn[1] ? C.blue : '#FFFFFF', { rx: 12, stroke: btn[1] ? C.blue : C.grayLight });
    b += t(x + 92, 174, btn[0], { size: 22, weight: 600, fill: btn[1] ? '#FFFFFF' : C.text, anchor: 'middle' });
  });
  // таблица файлов
  const tx = 340, ty = 250, tw = 640;
  b += r(tx, ty, tw, 650, C.card, { rx: 16, stroke: C.border });
  b += t(tx + 28, ty + 50, 'Имя', { size: 22, weight: 600, fill: C.gray });
  b += t(tx + tw - 28, ty + 50, 'Размер', { size: 22, weight: 600, fill: C.gray, anchor: 'end' });
  const rows = [
    ['plugins', 'папка', true], ['world', 'папка', true], ['logs', 'папка', true],
    ['server.properties', '1,4 КБ', false], ['ops.json', '0,2 КБ', false],
    ['whitelist.json', '0,3 КБ', false], ['paper-global.yml', '8,1 КБ', false],
  ];
  rows.forEach((row, i) => {
    const y = ty + 80 + i * 80;
    const sel = row[0] === 'server.properties';
    if (sel) b += r(tx + 10, y, tw - 20, 72, '#EFF6FF', { rx: 10 });
    b += `<line x1="${tx + 20}" x2="${tx + tw - 20}" y1="${y}" y2="${y}" stroke="${C.border}" stroke-width="2"/>`;
    if (row[2]) b += `<path d="M${tx + 30} ${y + 24} h20 l8 8 h26 v26 h-54 z" fill="${C.amber}"/>`;
    else b += `<path d="M${tx + 34} ${y + 18} h28 l12 12 v30 h-40 z" fill="#94A3B8"/>`;
    b += t(tx + 104, y + 46, row[0], { size: 26, weight: sel ? 700 : 500 });
    b += t(tx + tw - 28, y + 46, row[1], { size: 22, fill: C.gray, anchor: 'end' });
  });
  // редактор
  const ex = 1004, ew = 536;
  b += r(ex, ty, ew, 650, C.card, { rx: 16, stroke: C.border });
  b += t(ex + 28, ty + 52, 'server.properties', { size: 28, weight: 700 });
  b += r(ex + 20, ty + 80, ew - 40, 470, '#0F172A', { rx: 12 });
  const lines = [
    ['# Настройки сервера', '#64748B'],
    ['motd=Сервер для друзей', '#E2E8F0'],
    ['max-players=20', '#E2E8F0'],
    ['difficulty=normal', '#E2E8F0'],
    ['view-distance=10', '#E2E8F0'],
    ['white-list=true', '#E2E8F0'],
    ['pvp=false', '#E2E8F0'],
  ];
  lines.forEach((l, i) => {
    b += t(ex + 44, ty + 136 + i * 56, String(i + 1), { size: 20, fill: '#475569', mono: true });
    b += t(ex + 84, ty + 136 + i * 56, l[0], { size: 24, fill: l[1], mono: true });
  });
  b += r(ex + ew - 220, ty + 572, 196, 54, C.blue, { rx: 12 }) + t(ex + ew - 122, ty + 607, 'Сохранить', { size: 24, weight: 600, fill: '#FFFFFF', anchor: 'middle' });
  return { name: 'panel-files', svg: frame('Файлы', b), w: 1600, h: 1000 };
}

// ---------- 4. Консоль и управление запуском ----------
function consoleView() {
  let b = '';
  b += t(340, 175, 'Консоль', { size: 40, weight: 700 });
  b += r(560, 143, 176, 44, '#DCFCE7', { rx: 22 }) + `<circle cx="586" cy="165" r="8" fill="${C.green}"/>` + t(602, 174, 'Работает', { size: 24, weight: 600, fill: '#166534' });
  [['Запустить', '#E2E8F0', '#94A3B8'], ['Перезапустить', '#FFFFFF', C.text], ['Остановить', C.red, '#FFFFFF']].forEach((btn, i) => {
    const x = 920 + i * 206;
    b += r(x, 138, 194, 54, btn[1], { rx: 12, stroke: btn[1] === '#FFFFFF' ? C.grayLight : btn[1] });
    b += t(x + 97, 173, btn[0], { size: 22, weight: 600, fill: btn[2], anchor: 'middle' });
  });
  const cx = 340, cy = 220, cw = 860, ch = 680;
  b += r(cx, cy, cw, ch, '#0B1220', { rx: 16 });
  const log = [
    ['[12:00:01 INFO]: Starting minecraft server version 1.21', '#94A3B8'],
    ['[12:00:02 INFO]: Loading properties', '#94A3B8'],
    ['[12:00:05 INFO]: Preparing level "world"', '#94A3B8'],
    ['[12:00:09 INFO]: Done (8.4s)! For help, type "help"', '#4ADE80'],
    ['[12:03:41 INFO]: player_1 joined the game', '#E2E8F0'],
    ['[12:05:12 INFO]: player_2 joined the game', '#E2E8F0'],
    ['[12:20:30 WARN]: Can\'t keep up! Is the server overloaded?', '#FBBF24'],
    ['[12:31:02 INFO]: Saving the game', '#94A3B8'],
  ];
  log.forEach((l, i) => { b += t(cx + 30, cy + 56 + i * 52, l[0], { size: 22, fill: l[1], mono: true }); });
  b += `<line x1="${cx}" x2="${cx + cw}" y1="${cy + ch - 84}" y2="${cy + ch - 84}" stroke="#1E293B" stroke-width="2"/>`;
  b += t(cx + 30, cy + ch - 32, '> say Перезапуск через 5 минут', { size: 24, fill: '#FFFFFF', mono: true });
  b += r(cx + cw - 176, cy + ch - 68, 150, 52, C.blue, { rx: 10 }) + t(cx + cw - 101, cy + ch - 33, 'Отправить', { size: 22, weight: 600, fill: '#FFFFFF', anchor: 'middle' });
  // правая колонка
  const rx = 1228, rw = 312;
  [['Процессор', '38 %', 0.38], ['Память', '3,1 из 6 ГБ', 0.52], ['Диск', '12 из 40 ГБ', 0.30]].forEach((c, i) => {
    const y = cy + i * 186;
    b += r(rx, y, rw, 166, C.card, { rx: 16, stroke: C.border });
    b += t(rx + 24, y + 48, c[0], { size: 24, fill: C.gray });
    b += t(rx + 24, y + 98, c[1], { size: 34, weight: 700 });
    b += bar(rx + 24, y + 124, rw - 48, c[2], C.blue);
  });
  b += r(rx, cy + 558, rw, 122, C.card, { rx: 16, stroke: C.border });
  b += t(rx + 24, cy + 604, 'Время работы', { size: 24, fill: C.gray });
  b += t(rx + 24, cy + 652, '2 ч 14 мин', { size: 32, weight: 700 });
  return { name: 'panel-console', svg: frame('Консоль', b), w: 1600, h: 1000 };
}

// ---------- 5. Пиктограмма сервера (favicon) ----------
function icon() {
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="${C.blue}"/>
  <g fill="none" stroke="#FFFFFF" stroke-width="28" stroke-linejoin="round">
    <rect x="112" y="118" width="288" height="112" rx="24"/>
    <rect x="112" y="282" width="288" height="112" rx="24"/>
  </g>
  <circle cx="170" cy="174" r="18" fill="#FFFFFF"/><circle cx="170" cy="338" r="18" fill="#FFFFFF"/>
  <path d="M236 174 H340 M236 338 H340" stroke="#FFFFFF" stroke-width="22" stroke-linecap="round"/>
</svg>`;
  return { name: 'icon-server', svg: s, w: 512, h: 512 };
}

// ---------- 6. Превью ссылки для соцсетей/мессенджеров ----------
function og() {
  const W = 1200, H = 630;
  const s = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#173563"/><stop offset="1" stop-color="${C.navy}"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <g transform="translate(80 96) scale(0.16)">${icon().svg.replace(/<\/?svg[^>]*>/g, '')}</g>
  ${t(186, 148, 'Хостинг для проектов', { size: 40, weight: 600, fill: '#C7D4EA' })}
  ${t(80, 290, 'Хостинг, с которого', { size: 72, weight: 800, fill: '#FFFFFF' })}
  ${t(80, 376, 'удобно начать и расти', { size: 72, weight: 800, fill: '#FFFFFF' })}
  ${t(80, 470, 'Игровые серверы · боты · сайты и приложения · VPS', { size: 32, fill: '#C7D4EA' })}
  ${t(80, 560, 'Учебная работа', { size: 26, fill: '#7F96BD' })}
</svg>`;
  return { name: 'og-preview', svg: s, w: W, h: H };
}

(async () => {
  const items = [hero(), overview(), files(), consoleView(), icon(), og()];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const it of items) {
    fs.writeFileSync(path.join(SRC, `${it.name}.svg`), it.svg);
    await page.setViewportSize({ width: it.w, height: it.h });
    await page.setContent(`<!doctype html><html><body style="margin:0">${it.svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    // Фотоподобные изображения сохраняем в JPEG (меньше вес), интерфейсы — в PNG (чёткий текст).
    const jpg = it.name === 'hero-servers' || it.name === 'og-preview';
    await page.screenshot({
      path: path.join(OUT, `${it.name}.${jpg ? 'jpg' : 'png'}`),
      clip: { x: 0, y: 0, width: it.w, height: it.h },
      ...(jpg ? { type: 'jpeg', quality: 88 } : {}),
    });
    console.log('ok', it.name);
  }
  await browser.close();
})();
