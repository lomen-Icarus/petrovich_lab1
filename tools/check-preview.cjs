// Проверяет прототип preview/index.html и снимает скриншоты.
// Запуск: NODE_PATH=$(npm root -g) node tools/check-preview.cjs
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const URL = 'file://' + path.join(ROOT, 'preview', 'index.html');
const results = [];
const check = (name, ok, extra = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  — ' + extra : ''}`); };

// Плавная прокрутка в тестах отключается: позиция проверяется сразу и точно, без ожидания по таймеру.
async function open(browser, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(URL);
  await page.evaluate(async () => { document.documentElement.style.scrollBehavior = 'auto'; await document.fonts.ready; });
  return page;
}
// Раздел после перехода стоит сразу под липкой шапкой: не закрыт ею и не уехал вниз.
async function sectionUnderHeader(page, id) {
  return page.evaluate((id) => {
    const top = document.getElementById(id).getBoundingClientRect().top;
    const headerBottom = document.querySelector('header').getBoundingClientRect().bottom;
    return { ok: top >= headerBottom - 1 && top <= headerBottom + 8, top: Math.round(top), headerBottom: Math.round(headerBottom) };
  }, id);
}

(async () => {
  const browser = await chromium.launch();
  try {
    for (const w of [1440, 768, 360]) {
      const page = await open(browser, w, 900);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(`нет горизонтальной прокрутки на ${w}px`, overflow <= 0, `scrollWidth - clientWidth = ${overflow}`);
      const formFits = await page.evaluate(() => { const r = document.querySelector('form').getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth; });
      check(`форма помещается по ширине на ${w}px`, formFits);
      const shot = w === 1440 ? 'desktop-1440' : w === 360 ? 'mobile-360' : 'tablet-768';
      await page.screenshot({ path: path.join(ROOT, 'screenshots', `preview-${shot}.png`), fullPage: true });
      await page.close();
    }

    const page = await open(browser, 1440, 900);

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
    const plans = await sectionUnderHeader(page, 'plans');
    check('пункт меню «Варианты» ставит #plans сразу под шапкой', plans.ok, `top=${plans.top}, шапка до ${plans.headerBottom}`);

    // «Наверх» и логотип возвращают в самое начало страницы
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.click('footer a[href="#top"]');
    const y1 = await page.evaluate(() => scrollY);
    check('«Наверх» в подвале возвращает в начало страницы', y1 === 0, `scrollY=${y1}`);
    await page.evaluate(() => window.scrollTo(0, 3000));
    await page.click('.logo');
    const y2 = await page.evaluate(() => scrollY);
    check('логотип возвращает в начало страницы', y2 === 0, `scrollY=${y2}`);

    // Ссылка «Обработка данных формы» раскрывает текст соглашения
    await page.click('footer a[href="#privacy"]');
    check('«Обработка данных формы» раскрывает текст об обработке данных', await page.locator('#privacy').evaluate(e => e.open));

    // FAQ
    const d = page.locator('.faq details').first();
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
    for (let i = 0; i < 6; i++) await page.keyboard.press('Tab');
    const focusInside = await page.evaluate(() => !!document.activeElement.closest('.lightbox'));
    check('галерея: Tab не уводит фокус за пределы окна', focusInside);
    const bgInert = await page.evaluate(() => document.querySelector('main').inert && document.body.classList.contains('locked'));
    check('галерея: страница под окном недоступна и не прокручивается', bgInert);
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

    // Мобильная версия
    const m = await open(browser, 360, 780);
    await m.screenshot({ path: path.join(ROOT, 'screenshots', 'preview-mobile-360-first-screen.png') });
    const ctaVisible = await m.evaluate(() => { const r = document.querySelector('.hero .btn').getBoundingClientRect(); return r.bottom <= innerHeight; });
    check('телефон: основная кнопка видна на первом экране', ctaVisible);
    check('мобильное меню скрыто до нажатия', !(await m.locator('nav').isVisible()));
    await m.click('.burger');
    const label = await m.locator('.burger').getAttribute('aria-label');
    check('мобильное меню: кнопка подписана «Закрыть меню», пока меню открыто', label === 'Закрыть меню', label);
    check('мобильное меню: в нём есть кнопка «Обсудить проект»', await m.locator('nav .nav-cta a').isVisible());
    await m.keyboard.press('Escape');
    check('мобильное меню закрывается по Esc', !(await m.locator('nav').isVisible()));
    await m.click('.burger');
    await m.click('nav a[href="#faq"]');
    const faq = await sectionUnderHeader(m, 'faq');
    check('мобильное меню ведёт к #faq и закрывается', faq.ok && !(await m.locator('nav').isVisible()), `top=${faq.top}, шапка до ${faq.headerBottom}`);
    const swipe = await m.evaluate(() => { const g = document.querySelector('.gallery'); return g.scrollWidth > g.clientWidth; });
    check('телефон: экраны панели листаются вбок', swipe);
  } finally {
    await browser.close();
  }
  const failed = results.filter(r => !r.ok).length;
  console.log(`\nИтого: ${results.length - failed} PASS, ${failed} FAIL`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
