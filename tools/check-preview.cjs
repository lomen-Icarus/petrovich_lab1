// Проверяет прототип preview/index.html и снимает скриншоты.
// Запуск: NODE_PATH=$(npm root -g) node tools/check-preview.cjs
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'preview', 'index.html');
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

(async () => {
  const browser = await chromium.launch();

  for (const w of [1440, 768, 360]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto(URL);
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    check(`нет горизонтальной прокрутки на ${w}px`, overflow <= 0, `scrollWidth - clientWidth = ${overflow}`);
    const formFits = await page.evaluate(() => { const r = document.querySelector('form').getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth; });
    check(`форма помещается по ширине на ${w}px`, formFits);
    const shot = w === 1440 ? 'desktop-1440' : w === 360 ? 'mobile-360' : 'tablet-768';
    await page.screenshot({ path: path.join(ROOT, 'screenshots', `preview-${shot}.png`), fullPage: true });
    await page.close();
  }

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL);

  // Все внутренние ссылки ведут на существующие якоря
  const broken = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map(a => a.getAttribute('href')).filter(h => !document.getElementById(h.slice(1))));
  check('все якорные ссылки ведут на существующие разделы', broken.length === 0, broken.join(', '));
  const ids = await page.evaluate(() => ['top', 'services', 'approach', 'panel', 'plans', 'start', 'faq', 'contact'].filter(id => !document.getElementById(id)));
  check('есть все 8 разделов (#top … #contact)', ids.length === 0, ids.join(', '));
  check('ровно один H1', (await page.locator('h1').count()) === 1);
  const imgs = await page.evaluate(() => [...document.querySelectorAll('main img')].filter(i => i.complete && i.naturalWidth > 0 && i.alt.length > 20).length);
  check('не менее 3 содержательных изображений с alt загружены', imgs >= 3, `найдено ${imgs}`);

  // Переход по меню
  await page.click('nav a[href="#plans"]');
  await page.waitForTimeout(800);
  const plansTop = await page.evaluate(() => document.getElementById('plans').getBoundingClientRect().top);
  check('пункт меню «Варианты» прокручивает к #plans', Math.abs(plansTop - 76) < 40, `top=${Math.round(plansTop)}`);

  // FAQ
  const d = page.locator('details').first();
  await d.locator('summary').click();
  const opened = await d.evaluate(e => e.open);
  await d.locator('summary').click();
  const closed = !(await d.evaluate(e => e.open));
  check('FAQ раскрывается и сворачивается мышью', opened && closed);
  await d.locator('summary').focus();
  await page.keyboard.press('Enter');
  check('FAQ раскрывается с клавиатуры', await d.evaluate(e => e.open));

  // Галерея
  await page.click('.gallery button[data-i="0"]');
  check('галерея: изображение открывается в увеличенном виде', await page.locator('.lightbox.open').isVisible());
  await page.keyboard.press('ArrowRight');
  check('галерея: переключение на следующее', (await page.locator('.lightbox img').getAttribute('src')).includes('panel-files'));
  await page.keyboard.press('Escape');
  check('галерея: закрывается по Esc', !(await page.locator('.lightbox').evaluate(e => e.classList.contains('open'))));
  await page.click('.gallery button[data-i="2"]');
  await page.click('.lb-close');
  check('галерея: закрывается кнопкой ×', !(await page.locator('.lightbox').evaluate(e => e.classList.contains('open'))));

  // Форма
  await page.click('form button[type=submit]');
  check('пустая форма не проходит проверку', !(await page.locator('.proto').isVisible()));
  await page.fill('#f-email', 'не-email');
  await page.selectOption('#f-dir', 'Minecraft');
  await page.fill('#f-task', 'LAB1-TEST');
  await page.check('form .check input');
  await page.click('form button[type=submit]');
  check('некорректный email не проходит проверку', !(await page.locator('.proto').isVisible()));
  await page.fill('#f-email', 'test@example.com');
  await page.click('form button[type=submit]');
  check('корректно заполненная форма проходит проверку', await page.locator('.proto').isVisible());

  // Мобильное меню
  const m = await browser.newPage({ viewport: { width: 360, height: 780 } });
  await m.goto(URL);
  check('мобильное меню скрыто до нажатия', !(await m.locator('nav').isVisible()));
  await m.click('.burger');
  await m.click('nav a[href="#faq"]');
  await m.waitForTimeout(800);
  const faqTop = await m.evaluate(() => document.getElementById('faq').getBoundingClientRect().top);
  check('мобильное меню открывается и ведёт к #faq', Math.abs(faqTop - 76) < 40 && !(await m.locator('nav').isVisible()), `top=${Math.round(faqTop)}`);
  await m.screenshot({ path: path.join(ROOT, 'screenshots', 'preview-mobile-360-first-screen.png') });

  await browser.close();
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nИтого: ${results.length - failed} PASS, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})();
