// 공용 부품(머리말, 그림, 안내판, 네비게이션, 마지막 섹션, 꼬리)을 네 페이지에 끼워 넣어 완성 HTML을 만듭니다.
// 실행: node build.mjs   (페이지 원본은 src/pages/, 결과는 이 폴더의 *.html)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = join(root, 'src');
const read = (p) => readFileSync(join(src, p), 'utf8');
const parts = {
  HEAD: read('head.html'),
  SPRITE: read('drawings.svg'),
  BOARD: read('board.html'),
  CTA: read('cta.html'),
  FOOTER: read('footer.html'),
  STRIPE: '<span></span>'.repeat(60),
};
const NAV = [
  ['clinic.html', '진료 안내'],
  ['hours.html', '진료 시간 · 예약'],
  ['care.html', '치료 전후 주의사항'],
];

for (const file of readdirSync(join(src, 'pages'))) {
  if (!file.endsWith('.html')) continue;
  let html = read(join('pages', file));
  const nav = NAV.map(([href, label]) => `<a href="${href}"${href === file ? ' aria-current="page"' : ''}>${label}</a>`).join('\n      ');
  html = html.replace(/\{\{NAV\}\}/g, nav);
  for (const [k, v] of Object.entries(parts)) html = html.replaceAll(`{{${k}}}`, v);
  writeFileSync(join(root, file), html);
  console.log('built', file);
}
