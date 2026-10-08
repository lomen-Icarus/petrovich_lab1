// Генерирует SVG-исходники и PNG/JPEG-изображения для сайта.
// Запуск: NODE_PATH=$(npm root -g) node tools/make-images.cjs
// Палитра и правила — docs/DESIGN.md. Все картинки нарисованы с нуля, без чужих логотипов и данных.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'images', 'src');
const OUT = path.join(ROOT, 'images');

// Палитра сайта (совпадает с docs/DESIGN.md и preview/index.html)
const C = {
  green: '#1F3D32',     // доминанта: подвал, форма, серверная
  green2: '#2F5A48',    // корпуса построек
  green3: '#47735F',
  bg: '#EEF1EA',        // холодный светлый фон страницы
  stone: '#B9C0B7',     // «камень»: подземный слой, разделители
  stone2: '#A3ABA2',
  deep: '#8C958C',
  soil: '#8F7E61',
  soil2: '#7D6D52',
  copper: '#A8522A',    // акцент: кнопки, кабели
  copperD: '#8F4420',
  led: '#F5C518',       // только огоньки
  ledG: '#8BD17C',
  text: '#14211C',
  muted: '#4B5A53',
  white: '#FFFFFF',
};
const FONT = "'Golos Text', 'DejaVu Sans', Arial, sans-serif";
const MONO = "'DejaVu Sans Mono', 'Liberation Mono', monospace";
const FONTS_LINK = 'https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;600;700&display=swap';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const t = (x, y, s, o = {}) =>
  `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : FONT}" font-size="${o.size || 26}" font-weight="${o.weight || 400}" fill="${o.fill || C.text}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
const r = (x, y, w, h, fill, o = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${o.rx ?? 0}" fill="${fill}"${o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.sw || 2}"` : ''}${o.opacity ? ` opacity="${o.opacity}"` : ''}/>`;

// детерминированный ГПСЧ, чтобы картинки пересобирались одинаково
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let q = Math.imul(seed ^ seed >>> 15, 1 | seed); q = q + Math.imul(q ^ q >>> 7, 61 | q) ^ q; return ((q ^ q >>> 14) >>> 0) / 4294967296; }; }

// ---------- 1. Разрез «проект над землёй — инфраструктура под землёй» ----------
// Чертёжная стилистика: ровные слои со штриховкой, плоские объёмы из блоков, шкала глубины.
const B = 40;
function sectionScene() {
  const R = rng(11);
  const W = 1600, H = 1120, G = 12 * B; // G — линия грунта
  const defs = `<defs>
    <pattern id="hSoil" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="16" height="16" fill="${C.soil}"/><rect width="3" height="16" fill="${C.soil2}"/></pattern>
    <pattern id="hStone" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="${C.stone}"/><rect x="4" y="5" width="4" height="4" fill="${C.stone2}"/><rect x="16" y="15" width="4" height="4" fill="${C.stone2}"/></pattern>
    <pattern id="hDeep" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="20" height="20" fill="${C.deep}"/><rect width="2" height="20" fill="#7C857C"/><rect x="10" width="2" height="20" fill="#7C857C"/></pattern>
  </defs>`;
  let s = defs + r(0, 0, W, H, C.bg);
  // слои
  s += r(0, G, W, 3 * B, 'url(#hSoil)');
  s += r(0, G + 3 * B, W, 7 * B, 'url(#hStone)');
  s += r(0, G + 10 * B, W, H - G - 10 * B, 'url(#hDeep)');
  // границы слоёв — тонкие «чертёжные» линии
  s += `<g stroke="${C.text}" stroke-width="3">
    <line x1="0" x2="${W}" y1="${G}" y2="${G}"/>
    <line x1="0" x2="${W}" y1="${G + 3 * B}" y2="${G + 3 * B}" stroke-dasharray="14 10"/>
    <line x1="0" x2="${W}" y1="${G + 10 * B}" y2="${G + 10 * B}" stroke-dasharray="14 10"/></g>`;
  // полоса травы — одна линия, без текстуры
  s += r(0, G - 10, W, 10, C.green3);

  // серверная в толще камня
  const cv = { x: 15 * B, y: G + 5 * B, w: 12 * B, h: 7 * B };
  s += r(cv.x, cv.y, cv.w, cv.h, C.green) + `<rect x="${cv.x}" y="${cv.y}" width="${cv.w}" height="${cv.h}" fill="none" stroke="${C.text}" stroke-width="3"/>`;
  [cv.x + 1.5 * B, cv.x + 4.5 * B, cv.x + 7.5 * B].forEach((x, i) => {
    const y = cv.y + B, w = 2 * B, h = 5 * B;
    s += r(x, y, w, h, '#14271F');
    for (let u = 0; u < 8; u++) {
      const uy = y + 10 + u * 23;
      s += r(x + 8, uy, w - 16, 17, '#2A4A3D');
      s += r(x + 14, uy + 6, 6, 6, (u + i) % 5 === 2 ? C.led : C.ledG);
      s += r(x + 26, uy + 6, 6, 6, C.led, { opacity: u % 2 ? 1 : 0.35 });
      s += r(x + 42, uy + 7, w - 58, 4, '#3E5F51');
    }
  });
  s += r(cv.x + 10.5 * B - 6, cv.y + 3 * B, 12, 2 * B, '#14271F'); // распределительный щит
  s += r(cv.x + 10.5 * B - 3, cv.y + 3 * B + 10, 6, 6, C.led);

  // кабели (медь) — ортогональные трассы по сетке
  const cable = (pts) => `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1]}`).join(' ')}" fill="none" stroke="${C.copper}" stroke-width="8"/>`;
  s += cable([[17.5 * B, cv.y], [17.5 * B, G + 4 * B], [6.5 * B, G + 4 * B], [6.5 * B, G]]);
  s += cable([[20.5 * B, cv.y], [20.5 * B, G]]);
  s += cable([[23.5 * B, cv.y], [23.5 * B, G + 4.5 * B], [32 * B, G + 4.5 * B], [32 * B, G]]);
  // муфты на поворотах
  [[17.5, 4], [6.5, 4], [23.5, 4.5], [32, 4.5]].forEach(([c, d]) => { s += r(c * B - 9, G + d * B - 9, 18, 18, C.copperD); });

  // шкала глубины слева — деталь чертежа
  s += `<g stroke="${C.text}" stroke-width="3">`;
  s += `<line x1="${B * 0.6}" x2="${B * 0.6}" y1="${G}" y2="${H}"/>`;
  for (let i = 0; i <= 16; i++) s += `<line x1="${B * 0.6}" x2="${B * 0.6 + (i % 5 === 0 ? 26 : 14)}" y1="${G + i * B}" y2="${G + i * B}"/>`;
  s += `</g>`;

  // --- над землёй: плоские объёмы из блоков ---
  const blk = (c, row, fill) => r(c * B, G - (row + 1) * B - 10, B, B, fill) + `<rect x="${c * B}" y="${G - (row + 1) * B - 10}" width="${B}" height="${B}" fill="none" stroke="${C.text}" stroke-opacity="0.18" stroke-width="2"/>`;
  // 1) первый сервер: один блок + флажок
  s += blk(6, 0, C.green) + r(6 * B + 9, G - B - 10 + 12, 6, 6, C.ledG) + r(6 * B + 21, G - B - 10 + 12, 6, 6, C.led);
  s += r(7 * B + 16, G - 4 * B - 10, 6, 3 * B, C.text);
  s += `<path d="M${7 * B + 22} ${G - 4 * B - 10} h58 l-13 19 l13 19 h-58 z" fill="${C.copper}"/>`;
  // 2) дом: сайт или приложение
  for (let c = 18; c <= 22; c++) for (let row = 0; row < 3; row++) s += blk(c, row, C.green2);
  for (let i = 0; i < 3; i++) for (let c = 17 + i; c <= 23 - i; c++) s += blk(c, 3 + i, C.green);
  s += r(20 * B, G - 2 * B - 10, B, 2 * B, '#14271F');
  [[19, 1], [21, 1]].forEach(([c, row]) => { s += r(c * B + 10, G - (row + 1) * B - 10 + 10, 20, 20, C.led); });
  // 3) квартал из нескольких корпусов: несколько связанных сервисов
  const blds = [[28, 3, 5, C.green2], [31, 2, 9, C.green], [33, 1, 3, C.green3], [34, 3, 7, C.green2]];
  blds.forEach(([c0, w, h, fill]) => {
    for (let c = c0; c < c0 + w; c++) for (let row = 0; row < h; row++) s += blk(c, row, fill);
    for (let c = c0; c < c0 + w; c++) for (let row = 1; row < h - 1; row += 2) if (R() < 0.75) s += r(c * B + 12, G - (row + 1) * B - 10 + 12, 16, 16, C.led, { opacity: R() < 0.5 ? 1 : 0.5 });
  });
  s += r(30 * B, G - 4 * B - 10 + 12, B, 16, C.copper); // переход между корпусами
  s += r(32 * B - 4, G - 12 * B - 10, 8, 3 * B, C.text) + r(32 * B - 10, G - 12 * B - 22, 20, 14, C.led);
  // деревья — упрощённые объёмы
  const tree = (c) => { let q = r(c * B + 14, G - 3 * B - 10, 12, 3 * B, C.text); for (let dc = -1; dc <= 1; dc++) for (let dr = 3; dr <= 5; dr++) if (!(Math.abs(dc) === 1 && dr === 5)) q += blk(c + dc, dr - 1, dc === 0 && dr === 4 ? C.green3 : '#5F8A6E'); return q; };
  s += tree(12) + tree(38) + tree(2);
  return { W, H, body: s };
}
function svgWrap(W, H, body, vb) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="${vb || `0 0 ${W} ${H}`}">${body}</svg>`;
}
function hero() {
  const sc = sectionScene();
  return { name: 'hero-section', svg: svgWrap(sc.W, sc.H, sc.body), w: sc.W, h: sc.H, jpg: true };
}
// Крупный фрагмент того же разреза: «первый сервер» — для строки Minecraft
function firstServer() {
  const sc = sectionScene();
  // область вокруг флажка и первого блока, до кабеля в грунте
  return { name: 'first-server', svg: svgWrap(1200, 1000, sc.body, `${3 * B} ${7 * B} ${12 * B} ${10 * B}`), w: 1200, h: 1000, jpg: true };
}

// ---------- 2. Фронт серверной стойки (раздел «Подход») ----------
// Шесть юнитов разного назначения; без подписей и без иконок — только «железо».
function rack() {
  const W = 1000, H = 1040;
  let s = r(0, 0, W, H, C.bg);
  const x0 = 210, y0 = 60, w = 580, h = 930;
  s += r(x0, y0, w, h, C.green, { rx: 6 }) + r(x0 + 40, y0 + 40, w - 80, h - 80, '#14271F');
  // рельсы с отверстиями
  for (let y = y0 + 52; y < y0 + h - 50; y += 28) { s += r(x0 + 14, y, 12, 12, '#0E1C16') + r(x0 + w - 26, y, 12, 12, '#0E1C16'); }
  const ux = x0 + 56, uw = w - 112;
  let y = y0 + 60;
  const unit = (hU, body) => { const uh = hU * 52 - 8; const out = r(ux, y, uw, uh, '#2A4A3D', { rx: 4 }) + body(ux, y, uw, uh); y += hU * 52 + 10; return out; };
  // 1. вычислительный узел: решётка вентиляции + огоньки
  s += unit(3, (x, yy, ww, hh) => { let q = ''; for (let i = 0; i < 14; i++) q += r(x + 120 + i * 22, yy + 20, 10, hh - 40, '#1C352B'); q += r(x + 26, yy + 24, 12, 12, C.ledG) + r(x + 26, yy + 48, 12, 12, C.led); return q; });
  // 2. накопители NVMe: ряд лотков
  s += unit(2, (x, yy, ww, hh) => { let q = ''; for (let i = 0; i < 8; i++) { q += r(x + 22 + i * 52, yy + 14, 44, hh - 28, '#1C352B', { rx: 3 }) + r(x + 36 + i * 52, yy + hh - 30, 16, 6, i % 3 ? C.ledG : C.led); } return q; });
  // 3. консоль управления: маленький экран
  s += unit(2, (x, yy, ww, hh) => r(x + 26, yy + 16, 220, hh - 32, '#0E1C16', { rx: 3 }) + r(x + 42, yy + 30, 120, 8, C.ledG) + r(x + 42, yy + 48, 160, 8, '#3E5F51') + r(x + 42, yy + 66, 90, 8, '#3E5F51') + r(x + ww - 70, yy + hh / 2 - 8, 16, 16, C.ledG));
  // 4. сетевой фильтр (защита): порты в два ряда
  s += unit(2, (x, yy, ww, hh) => { let q = ''; for (let i = 0; i < 12; i++) for (let j = 0; j < 2; j++) q += r(x + 24 + i * 34, yy + 16 + j * 30, 26, 20, '#0E1C16') + r(x + 30 + i * 34, yy + 20 + j * 30, 6, 4, (i + j) % 4 ? C.ledG : C.led); return q; });
  // 5. хранилище резервных копий: крупные корзины
  s += unit(3, (x, yy, ww, hh) => { let q = ''; for (let i = 0; i < 4; i++) q += r(x + 22 + i * 112, yy + 16, 100, hh - 32, '#1C352B', { rx: 3 }) + r(x + 36 + i * 112, yy + 30, 70, 8, '#3E5F51') + r(x + 36 + i * 112, yy + hh - 34, 10, 10, C.ledG); return q; });
  // 6. коммутация: медные патч-корды
  s += unit(2, (x, yy, ww, hh) => { let q = ''; for (let i = 0; i < 10; i++) q += r(x + 26 + i * 44, yy + 18, 30, 20, '#0E1C16'); q += `<path d="M${x + 41} ${yy + 38} v20 h88 v-20 M${x + 173} ${yy + 38} v28 h176 v-28" fill="none" stroke="${C.copper}" stroke-width="6"/>`; return q; });
  // основание
  s += r(x0 - 20, y0 + h, w + 40, 18, C.text);
  return { name: 'rack-front', svg: svgWrap(W, H, s), w: W, h: H };
}

// ---------- 3. Демонстрационные экраны панели ----------
// Нейтральный интерфейс, медь — только в активных элементах. Подпись «Пример интерфейса» на каждом.
const UI = { bg: '#F4F5F3', card: '#FFFFFF', border: '#DDE1DB', side: '#26302B', sideText: '#C9D1CB', ok: '#2E7D4F', okBg: '#E2F1E7', warn: '#B7791F', red: '#B4442F', gray: '#5B6660', grayLight: '#C5CBC6', bar: '#E6E9E4' };
function frame(active, body) {
  const W = 1600, H = 1000;
  const menu = ['Обзор', 'Консоль', 'Файлы', 'Базы данных', 'Резервные копии', 'Сеть', 'Настройки'];
  let s = `<rect width="${W}" height="${H}" fill="#D9DED7"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="10" fill="${UI.bg}" stroke="#BFC6BE" stroke-width="2"/>
  <path d="M40 50 a10 10 0 0 1 10-10 H${W - 50} a10 10 0 0 1 10 10 V110 H40 Z" fill="#FFFFFF"/>
  <line x1="40" y1="110" x2="${W - 40}" y2="110" stroke="${UI.border}" stroke-width="2"/>
  ${r(64, 63, 24, 24, UI.grayLight, { rx: 4 })}${r(98, 63, 24, 24, UI.grayLight, { rx: 4 })}
  ${r(560, 56, 480, 38, '#EEF0EC', { rx: 6 })}
  ${t(800, 83, 'Панель управления сервером', { size: 22, fill: UI.gray, anchor: 'middle' })}
  ${r(1290, 54, 250, 42, '#FFF4D6', { rx: 6, stroke: '#C99A1E', sw: 2 })}
  ${t(1415, 83, 'Пример интерфейса', { size: 22, weight: 700, fill: '#6B4E06', anchor: 'middle' })}
  <path d="M40 110 H318 V${H - 40} H50 a10 10 0 0 1 -10 -10 Z" fill="${UI.side}"/>`;
  menu.forEach((m, i) => {
    const y = 160 + i * 66;
    if (m === active) s += r(54, y - 34, 250, 52, C.copper, { rx: 6 });
    s += r(78, y - 15, 14, 14, m === active ? '#FFFFFF' : '#6F7B74', { rx: 2 });
    s += t(108, y, m, { size: 22, weight: m === active ? 700 : 500, fill: m === active ? '#FFFFFF' : UI.sideText });
  });
  return svgWrap(W, H, s + body);
}
const bar = (x, y, w, pct, color) => r(x, y, w, 14, UI.bar, { rx: 3 }) + r(x, y, Math.round(w * pct), 14, color, { rx: 3 });
const status = (x, y) => r(x, y, 176, 44, UI.okBg, { rx: 6 }) + r(x + 18, y + 15, 14, 14, UI.ok, { rx: 2 }) + t(x + 42, y + 31, 'Работает', { size: 24, weight: 600, fill: UI.ok });

function overview() {
  let b = '';
  b += t(340, 175, 'minecraft-survival', { size: 40, weight: 700 }) + status(720, 143);
  b += t(340, 220, 'Minecraft Java · сборка Paper', { size: 24, fill: UI.gray });
  [['Процессор', '38 %', 0.38], ['Память', '3,1 из 6 ГБ', 0.52], ['Диск', '12 из 40 ГБ', 0.30], ['Игроки онлайн', '7 из 20', 0.35]].forEach((c, i) => {
    const x = 340 + i * 300, y = 260;
    b += r(x, y, 276, 170, UI.card, { rx: 6, stroke: UI.border });
    b += t(x + 24, y + 48, c[0], { size: 24, fill: UI.gray });
    b += t(x + 24, y + 100, c[1], { size: 36, weight: 700 });
    b += bar(x + 24, y + 128, 228, c[2], C.text);
  });
  const gx = 340, gy = 460, gw = 780, gh = 440;
  b += r(gx, gy, gw, gh, UI.card, { rx: 6, stroke: UI.border });
  b += t(gx + 28, gy + 52, 'Память за последний час', { size: 28, weight: 700 });
  for (let i = 0; i < 4; i++) b += `<line x1="${gx + 40}" x2="${gx + gw - 30}" y1="${gy + 120 + i * 80}" y2="${gy + 120 + i * 80}" stroke="${UI.border}" stroke-width="2"/>`;
  const pts = [2.4, 2.5, 2.7, 2.6, 2.9, 3.2, 3.0, 3.3, 3.1, 3.4, 3.2, 3.1];
  const px = (i) => gx + 40 + i * ((gw - 70) / (pts.length - 1));
  const py = (v) => gy + 360 - (v / 6) * 320 + 40;
  const d = pts.map((v, i) => `${i ? 'L' : 'M'}${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join(' ');
  b += `<path d="${d} L${px(pts.length - 1)} ${gy + 400} L${px(0)} ${gy + 400} Z" fill="${C.copper}" opacity="0.10"/>`;
  b += `<path d="${d}" fill="none" stroke="${C.copper}" stroke-width="5" stroke-linejoin="round"/>`;
  b += t(gx + 40, gy + gh - 14, '60 мин назад', { size: 20, fill: UI.gray });
  b += t(gx + gw - 30, gy + gh - 14, 'сейчас', { size: 20, fill: UI.gray, anchor: 'end' });
  const rx = 1150, rw = 390;
  b += r(rx, gy, rw, 200, UI.card, { rx: 6, stroke: UI.border });
  b += t(rx + 28, gy + 52, 'Резервные копии', { size: 28, weight: 700 });
  b += t(rx + 28, gy + 100, 'Последняя: сегодня, 04:00', { size: 24, fill: UI.gray });
  b += r(rx + 28, gy + 124, 220, 50, '#FFFFFF', { rx: 6, stroke: UI.grayLight }) + t(rx + 138, gy + 157, 'Создать копию', { size: 22, weight: 600, anchor: 'middle' });
  b += r(rx, gy + 224, rw, 216, UI.card, { rx: 6, stroke: UI.border });
  b += t(rx + 28, gy + 276, 'Сведения', { size: 28, weight: 700 });
  [['Версия', '1.21'], ['Время работы', '2 ч 14 мин'], ['Доп. порты', '1']].forEach((row, i) => {
    b += t(rx + 28, gy + 324 + i * 40, row[0], { size: 22, fill: UI.gray });
    b += t(rx + rw - 28, gy + 324 + i * 40, row[1], { size: 22, weight: 600, anchor: 'end' });
  });
  return { name: 'panel-overview', svg: frame('Обзор', b), w: 1600, h: 1000 };
}

function files() {
  let b = '';
  b += t(340, 175, 'Файлы', { size: 40, weight: 700 });
  b += t(340, 218, '/ сервер / основная папка', { size: 24, fill: UI.gray });
  [['Загрузить', true], ['Новая папка', false], ['Архивировать', false]].forEach((btn, i) => {
    const x = 760 + i * 200;
    b += r(x, 140, 184, 52, btn[1] ? C.copper : '#FFFFFF', { rx: 6, stroke: btn[1] ? C.copper : UI.grayLight });
    b += t(x + 92, 174, btn[0], { size: 22, weight: 600, fill: btn[1] ? '#FFFFFF' : C.text, anchor: 'middle' });
  });
  const tx = 340, ty = 250, tw = 640;
  b += r(tx, ty, tw, 650, UI.card, { rx: 6, stroke: UI.border });
  b += t(tx + 28, ty + 50, 'Имя', { size: 22, weight: 600, fill: UI.gray });
  b += t(tx + tw - 28, ty + 50, 'Размер', { size: 22, weight: 600, fill: UI.gray, anchor: 'end' });
  const rows = [['plugins', 'папка', true], ['world', 'папка', true], ['logs', 'папка', true], ['server.properties', '1,4 КБ', false], ['ops.json', '0,2 КБ', false], ['whitelist.json', '0,3 КБ', false], ['paper-global.yml', '8,1 КБ', false]];
  rows.forEach((row, i) => {
    const y = ty + 80 + i * 80;
    const sel = row[0] === 'server.properties';
    if (sel) b += r(tx + 10, y, tw - 20, 72, '#F6E9E1', { rx: 4 });
    b += `<line x1="${tx + 20}" x2="${tx + tw - 20}" y1="${y}" y2="${y}" stroke="${UI.border}" stroke-width="2"/>`;
    if (row[2]) b += `<path d="M${tx + 30} ${y + 24} h20 l8 8 h26 v26 h-54 z" fill="#8C958C"/>`;
    else b += `<path d="M${tx + 34} ${y + 18} h28 l12 12 v30 h-40 z" fill="${UI.grayLight}"/>`;
    b += t(tx + 104, y + 46, row[0], { size: 26, weight: sel ? 700 : 500 });
    b += t(tx + tw - 28, y + 46, row[1], { size: 22, fill: UI.gray, anchor: 'end' });
  });
  const ex = 1004, ew = 536;
  b += r(ex, ty, ew, 650, UI.card, { rx: 6, stroke: UI.border });
  b += t(ex + 28, ty + 52, 'server.properties', { size: 28, weight: 700 });
  b += r(ex + 20, ty + 80, ew - 40, 470, '#1A211E', { rx: 4 });
  [['# Настройки сервера', '#7F8A84'], ['motd=Сервер для друзей', '#E4E8E4'], ['max-players=20', '#E4E8E4'], ['difficulty=normal', '#E4E8E4'], ['view-distance=10', '#E4E8E4'], ['white-list=true', '#E4E8E4'], ['pvp=false', '#E4E8E4']].forEach((l, i) => {
    b += t(ex + 44, ty + 136 + i * 56, String(i + 1), { size: 20, fill: '#5B6660', mono: true });
    b += t(ex + 84, ty + 136 + i * 56, l[0], { size: 24, fill: l[1], mono: true });
  });
  b += r(ex + ew - 220, ty + 572, 196, 54, C.copper, { rx: 6 }) + t(ex + ew - 122, ty + 607, 'Сохранить', { size: 24, weight: 600, fill: '#FFFFFF', anchor: 'middle' });
  return { name: 'panel-files', svg: frame('Файлы', b), w: 1600, h: 1000 };
}

function consoleView() {
  let b = '';
  b += t(340, 175, 'Консоль', { size: 40, weight: 700 }) + status(560, 143);
  [['Запустить', '#E6E9E4', '#8C958C'], ['Перезапустить', '#FFFFFF', C.text], ['Остановить', UI.red, '#FFFFFF']].forEach((btn, i) => {
    const x = 920 + i * 206;
    b += r(x, 138, 194, 54, btn[1], { rx: 6, stroke: btn[1] === '#FFFFFF' ? UI.grayLight : btn[1] });
    b += t(x + 97, 173, btn[0], { size: 22, weight: 600, fill: btn[2], anchor: 'middle' });
  });
  const cx = 340, cy = 220, cw = 860, ch = 680;
  b += r(cx, cy, cw, ch, '#141A17', { rx: 6 });
  [['[12:00:01 INFO]: Starting minecraft server version 1.21', '#98A39C'], ['[12:00:02 INFO]: Loading properties', '#98A39C'], ['[12:00:05 INFO]: Preparing level "world"', '#98A39C'], ['[12:00:09 INFO]: Done (8.4s)! For help, type "help"', '#8BD17C'], ['[12:03:41 INFO]: player_1 joined the game', '#E4E8E4'], ['[12:05:12 INFO]: player_2 joined the game', '#E4E8E4'], ['[12:20:30 WARN]: Can\'t keep up! Is the server overloaded?', '#F5C518'], ['[12:31:02 INFO]: Saving the game', '#98A39C']]
    .forEach((l, i) => { b += t(cx + 30, cy + 56 + i * 52, l[0], { size: 22, fill: l[1], mono: true }); });
  b += `<line x1="${cx}" x2="${cx + cw}" y1="${cy + ch - 84}" y2="${cy + ch - 84}" stroke="#2A332E" stroke-width="2"/>`;
  b += t(cx + 30, cy + ch - 32, '> say Перезапуск через 5 минут', { size: 24, fill: '#FFFFFF', mono: true });
  b += r(cx + cw - 176, cy + ch - 68, 150, 52, C.copper, { rx: 6 }) + t(cx + cw - 101, cy + ch - 33, 'Отправить', { size: 22, weight: 600, fill: '#FFFFFF', anchor: 'middle' });
  const rx = 1228, rw = 312;
  [['Процессор', '38 %', 0.38], ['Память', '3,1 из 6 ГБ', 0.52], ['Диск', '12 из 40 ГБ', 0.30]].forEach((c, i) => {
    const y = cy + i * 186;
    b += r(rx, y, rw, 166, UI.card, { rx: 6, stroke: UI.border });
    b += t(rx + 24, y + 48, c[0], { size: 24, fill: UI.gray });
    b += t(rx + 24, y + 98, c[1], { size: 34, weight: 700 });
    b += bar(rx + 24, y + 124, rw - 48, c[2], C.text);
  });
  b += r(rx, cy + 558, rw, 122, UI.card, { rx: 6, stroke: UI.border });
  b += t(rx + 24, cy + 604, 'Время работы', { size: 24, fill: UI.gray });
  b += t(rx + 24, cy + 652, '2 ч 14 мин', { size: 32, weight: 700 });
  return { name: 'panel-console', svg: frame('Консоль', b), w: 1600, h: 1000 };
}

// ---------- 4. Пиктограмма (favicon / логотип в шапке): блок-сервер на линии грунта ----------
function iconBody() {
  return r(0, 0, 512, 512, C.green, { rx: 48 }) +
    r(96, 300, 320, 22, C.bg) +               // линия грунта
    r(176, 140, 160, 160, '#2F5A48') +
    `<rect x="176" y="140" width="160" height="160" fill="none" stroke="${C.bg}" stroke-width="10"/>` +
    r(200, 172, 112, 36, '#14271F') + r(212, 184, 12, 12, '#8BD17C') + r(236, 186, 64, 8, '#3E5F51') +
    r(200, 228, 112, 36, '#14271F') + r(212, 240, 12, 12, C.led) + r(236, 242, 64, 8, '#3E5F51') +
    `<path d="M256 322 V420 H380" fill="none" stroke="${C.copper}" stroke-width="22"/>`;
}
function icon() { return { name: 'icon-server', svg: svgWrap(512, 512, iconBody()), w: 512, h: 512 }; }

// ---------- 5. Превью ссылки для мессенджеров ----------
function og() {
  const W = 1200, H = 630;
  const sc = sectionScene();
  let s = r(0, 0, W, H, C.bg);
  s += `<svg x="640" y="0" width="560" height="${H}" viewBox="${15 * B} 0 ${24 * B} ${27 * B}" preserveAspectRatio="xMidYMid slice">${sc.body}</svg>`;
  s += `<g transform="translate(64 64) scale(0.11)">${iconBody()}</g>`;
  s += t(134, 106, 'Хостинг для проектов', { size: 30, weight: 600, fill: C.muted });
  s += t(64, 260, 'Хостинг, с которого', { size: 52, weight: 700 });
  s += t(64, 332, 'удобно начать', { size: 52, weight: 700 });
  s += t(64, 404, 'и расти', { size: 52, weight: 700 });
  s += t(64, 478, 'Игровые серверы, боты, сайты, VPS', { size: 26, fill: C.muted });
  s += t(64, 566, 'Учебная работа', { size: 24, fill: C.muted });
  return { name: 'og-preview', svg: svgWrap(W, H, s), w: W, h: H, jpg: true };
}

(async () => {
  const items = [hero(), firstServer(), rack(), overview(), files(), consoleView(), icon(), og()];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const it of items) {
    fs.writeFileSync(path.join(SRC, `${it.name}.svg`), it.svg);
    await page.setViewportSize({ width: it.w, height: it.h });
    await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="${FONTS_LINK}"></head><body style="margin:0">${it.svg}</body></html>`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: path.join(OUT, `${it.name}.${it.jpg ? 'jpg' : 'png'}`),
      clip: { x: 0, y: 0, width: it.w, height: it.h },
      ...(it.jpg ? { type: 'jpeg', quality: 90 } : {}),
    });
    console.log('ok', it.name);
  }
  await browser.close();
})();
