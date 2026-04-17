/**
 * Mixable CSS 静的検証スクリプト
 * Node 18+ の標準機能のみで動作。npm 不使用規約を遵守。
 * 失敗時は exit code 1 を返す（CI 化する際はこの挙動だけ守ればよい）。
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOMAIN = 'css-showcase-tan.vercel.app';

const results = [];
function report(id, name, ok, detail = '') {
  results.push({ id, name, ok, detail });
}

async function listFiles(dir, ext) {
  const all = await fs.readdir(dir);
  return all.filter(f => f.endsWith(ext)).sort();
}

async function read(f) {
  return fs.readFile(path.join(ROOT, f), 'utf8');
}

async function exists(f) {
  try { await fs.access(path.join(ROOT, f)); return true; } catch { return false; }
}

/* ---------------- T1: JS構文 ---------------- */
async function T1() {
  const files = (await listFiles(ROOT, '.js')).concat(
    await listFiles(path.join(ROOT), '.mjs').catch(() => [])
  );
  const failures = [];
  for (const f of files) {
    if (f.startsWith('tests/')) continue;
    try {
      execFileSync(process.execPath, ['--check', path.join(ROOT, f)], { stdio: 'pipe' });
    } catch (e) {
      failures.push(`${f}: ${(e.stderr?.toString() || e.message).split('\n')[0]}`);
    }
  }
  report('T1', 'JS構文', failures.length === 0,
    failures.length === 0 ? `${files.length} files OK` : failures.join('\n  '));
}

/* ---------------- T2: リンク整合 ---------------- */
async function T2() {
  const htmls = await listFiles(ROOT, '.html');
  const failures = [];
  let total = 0;
  for (const f of htmls) {
    let txt = await read(f);
    // コード例内のダミーパス (<code>...</code>, <pre>...</pre>) を検査対象から除外
    txt = txt.replace(/<code\b[\s\S]*?<\/code>/gi, '').replace(/<pre\b[\s\S]*?<\/pre>/gi, '');
    const re = /(?:href|src)\s*=\s*["']([^"'#]+)["']/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
      const target = m[1];
      if (/^(?:https?:|mailto:|data:|\/\/)/.test(target)) continue;
      if (target.startsWith('#')) continue;
      // ダミー値（コード例内に残っているもの）をスキップ
      if (/^\.\.\.$/.test(target) || target === 'example.com') continue;
      total++;
      const cleanTarget = target.split('#')[0].split('?')[0];
      if (!cleanTarget) continue;
      if (!(await exists(cleanTarget))) {
        failures.push(`${f}: "${target}" が存在しない`);
      }
    }
  }
  report('T2', 'リンク整合', failures.length === 0,
    failures.length === 0 ? `${total} links OK (${htmls.length} pages)` : failures.join('\n  '));
}

/* ---------------- T3: トップナビ整合 ---------------- */
async function T3() {
  const mixerJs = await read('mixer.js');
  const fnMatch = mixerJs.match(/function injectTopNav\([\s\S]*?^}/m);
  if (!fnMatch) {
    report('T3', 'トップナビ整合', false, 'injectTopNav 関数が見つからない');
    return;
  }
  const body = fnMatch[0];
  const hrefs = [...body.matchAll(/href\s*=\s*["']([^"']+\.html)["']/g)].map(m => m[1]);
  const failures = [];
  for (const h of hrefs) {
    if (!(await exists(h))) failures.push(`injectTopNav が参照する ${h} が存在しない`);
  }
  const samples = (await listFiles(ROOT, '.html')).filter(f => f.startsWith('sample_') || f === 'mixer.html');
  for (const s of samples) {
    const txt = await read(s);
    if (!/<script[^>]+src\s*=\s*["']mixer\.js["']/.test(txt)) {
      failures.push(`${s}: mixer.js を読み込んでいない`);
    }
  }
  report('T3', 'トップナビ整合', failures.length === 0,
    failures.length === 0 ? `${hrefs.length} nav targets OK, ${samples.length} pages load mixer.js` : failures.join('\n  '));
}

/* ---------------- T4: ポータル整合 ---------------- */
async function T4() {
  const index = await read('index.html');
  const cardHrefs = [...index.matchAll(/<a[^>]+class\s*=\s*["'][^"']*showcase-card[^"']*["'][^>]*href\s*=\s*["']([^"']+\.html)["']/g)].map(m => m[1]);
  const cardHrefs2 = [...index.matchAll(/href\s*=\s*["']([^"']+\.html)["'][^>]*class\s*=\s*["'][^"']*showcase-card/g)].map(m => m[1]);
  const linked = new Set([...cardHrefs, ...cardHrefs2]);
  const failures = [];
  for (const h of linked) {
    if (!(await exists(h))) failures.push(`index.html カード "${h}" が実在しない`);
  }
  const samples = (await listFiles(ROOT, '.html')).filter(f => f.startsWith('sample_'));
  for (const s of samples) {
    if (!linked.has(s)) failures.push(`${s} が index.html のどのカードからもリンクされていない`);
  }
  report('T4', 'ポータル整合', failures.length === 0,
    failures.length === 0 ? `${linked.size} cards → all resolve, ${samples.length} sample pages all linked` : failures.join('\n  '));
}

/* ---------------- T5: リファレンスデータ整合 ---------------- */
async function T5() {
  let code = await read('sample_css_reference.js');
  // vm.runInContext で const は sandbox に露出しないので var に書き換えて露出させる
  code = code.replace(/^const REF = \{\};/m, 'var REF = {};');
  const sandbox = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      createDocumentFragment: () => ({ appendChild: () => {} }),
      createElement: () => ({ appendChild: () => {}, classList: { add: () => {} }, setAttribute: () => {} }),
    },
    window: { lucide: null },
    console,
  };
  vm.createContext(sandbox);
  try {
    vm.runInContext(code, sandbox, { filename: 'sample_css_reference.js' });
  } catch (e) {
    report('T5', 'リファレンスデータ整合', false, `vm 実行失敗: ${e.message}`);
    return;
  }
  const REF = sandbox.REF;
  if (!REF || typeof REF !== 'object') {
    report('T5', 'リファレンスデータ整合', false, 'REF 辞書が未定義');
    return;
  }
  const expectedKeys = ['sym', ...'ABCDEFGHIJKLMNOPQRSTUVWZ'];
  const failures = [];
  let total = 0;
  const validKinds = new Set(['selector', 'property', 'function', 'at-rule', 'pseudo', 'type', 'global']);
  for (const k of expectedKeys) {
    if (!REF[k] || !Array.isArray(REF[k])) {
      failures.push(`REF.${k} が未定義または配列でない`);
      continue;
    }
    if (REF[k].length === 0) failures.push(`REF.${k} が空`);
    for (const item of REF[k]) {
      total++;
      if (typeof item.n !== 'string' || !item.n) failures.push(`REF.${k} に n 欠損: ${JSON.stringify(item).slice(0,80)}`);
      if (typeof item.k !== 'string' || !validKinds.has(item.k)) failures.push(`REF.${k} 内 "${item.n}" の k="${item.k}" が無効`);
      if (typeof item.c !== 'string') failures.push(`REF.${k} 内 "${item.n}" に c (コード例) 欠損`);
      // d は空文字を許容（サブプロパティ等）、型だけ検査
      if ('d' in item && typeof item.d !== 'string') failures.push(`REF.${k} 内 "${item.n}" の d が文字列でない`);
      if ('p' in item && typeof item.p !== 'string') failures.push(`REF.${k} 内 "${item.n}" の p が文字列でない`);
    }
  }
  report('T5', 'リファレンスデータ整合', failures.length === 0,
    failures.length === 0 ? `${total} items OK (${expectedKeys.length} letters)` : failures.slice(0, 10).join('\n  ') + (failures.length > 10 ? `\n  ... and ${failures.length-10} more` : ''));
}

/* ---------------- T6: プレビューHTML typo検査 ---------------- */
function checkHtmlFragment(html) {
  const voidEls = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
  const stack = [];
  const tagRe = /<(\/)?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(\/)?>/g;
  let m;
  while ((m = tagRe.exec(html)) !== null) {
    const isClose = m[1] === '/';
    const isSelfClose = m[3] === '/';
    const name = m[2].toLowerCase();
    if (isClose) {
      if (stack.length === 0) return `unexpected close </${name}>`;
      const last = stack.pop();
      if (last !== name) return `mismatched close: </${name}> where </${last}> expected`;
    } else if (!isSelfClose && !voidEls.has(name)) {
      stack.push(name);
    }
  }
  if (stack.length) return `unclosed: <${stack.join('>, <')}>`;
  const lt = (html.match(/</g) || []).length;
  const gt = (html.match(/>/g) || []).length;
  if (lt !== gt) return `unbalanced < and > (${lt} vs ${gt})`;
  return null;
}

async function T6() {
  const code = await read('sample_css_reference.js');
  const lines = code.split('\n');
  const failures = [];
  let total = 0;
  // プレビューはテンプレートリテラル `p: \`...\`` の 1 行内に閉じている前提（現状そう）
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\s*p:\s*`(.+)`\s*\}/);
    if (!m) continue;
    total++;
    const html = m[1];
    const issue = checkHtmlFragment(html);
    if (issue) failures.push(`L${i+1}: ${issue}`);
  }
  report('T6', 'プレビューHTML typo検査', failures.length === 0,
    failures.length === 0 ? `${total} previews, 0 issues` : failures.slice(0,10).join('\n  ') + (failures.length > 10 ? `\n  ... and ${failures.length-10} more` : ''));
}

/* ---------------- T7: mixer ページキー連携 ---------------- */
async function T7() {
  const mixerJs = await read('mixer.js');
  const getPageKey = mixerJs.match(/function getPageKey\([\s\S]*?^}/m);
  if (!getPageKey) {
    report('T7', 'mixer ページキー連携', false, 'getPageKey 関数が見つからない');
    return;
  }
  const keys = [...getPageKey[0].matchAll(/path\.includes\(\s*['"]([^'"]+)['"]\s*\)/g)].map(m => m[1]);
  const failures = [];
  for (const k of keys) {
    // nav のような短いキーも、sample_*.html のいずれかに含まれていれば OK
    const htmls = await listFiles(ROOT, '.html');
    const hit = htmls.some(f => f.includes(k));
    if (!hit) failures.push(`getPageKey: "${k}" に該当するページが存在しない`);
  }
  // instrumentShowcase のカート検出セレクタが、各 sample_*_showcase.html のアイテムクラスと整合
  const instrumentFn = mixerJs.match(/function instrumentShowcase\([\s\S]*?^}/m);
  const selMatch = instrumentFn && instrumentFn[0].match(/querySelectorAll\s*\(\s*['"]([^'"]+-item[^'"]*)['"]\s*\)/);
  if (selMatch) {
    const selectors = selMatch[1].split(',').map(s => s.trim().replace(/^\./, '').replace(/-item$/, ''));
    // 各 sample_*_showcase.html 内で使われている `.X-item` を抽出して selectors に含まれているか確認
    const showcases = (await listFiles(ROOT, '.html')).filter(f => f.endsWith('_showcase.html'));
    for (const s of showcases) {
      const txt = await read(s);
      const itemClassMatch = [...txt.matchAll(/class\s*=\s*["'][^"']*\b([a-z]+)-item\b/g)].map(m => m[1]);
      const unique = [...new Set(itemClassMatch)];
      for (const cls of unique) {
        if (!selectors.includes(cls)) {
          failures.push(`${s}: .${cls}-item がカート検出セレクタに含まれていない`);
        }
      }
    }
  }
  report('T7', 'mixer ページキー連携', failures.length === 0,
    failures.length === 0 ? `${keys.length} keys mapped` : failures.join('\n  '));
}

/* ---------------- T8: HTML構造 ---------------- */
async function T8() {
  const htmls = await listFiles(ROOT, '.html');
  const failures = [];
  for (const f of htmls) {
    const txt = await read(f);
    if (!/<!DOCTYPE\s+html>/i.test(txt)) failures.push(`${f}: DOCTYPE 宣言なし`);
    if (!/<html\b/i.test(txt) || !/<\/html>/i.test(txt)) failures.push(`${f}: <html> タグ欠損`);
    if (!/<head\b/i.test(txt) || !/<\/head>/i.test(txt)) failures.push(`${f}: <head> タグ欠損`);
    if (!/<body\b/i.test(txt) || !/<\/body>/i.test(txt)) failures.push(`${f}: <body> タグ欠損`);
    // Lucideを使っているならスクリプト読み込みがあるか
    if (/data-lucide=/.test(txt) && !/unpkg\.com\/lucide/.test(txt)) {
      failures.push(`${f}: data-lucide 属性を使っているのに lucide スクリプトを読み込んでいない`);
    }
  }
  report('T8', 'HTML構造', failures.length === 0,
    failures.length === 0 ? `${htmls.length} files OK` : failures.join('\n  '));
}

/* ---------------- T9: メタタグ整合 ---------------- */
async function T9() {
  const htmls = await listFiles(ROOT, '.html');
  const failures = [];
  const required = [
    { name: 'title', re: /<title>[^<]+<\/title>/ },
    { name: 'meta description', re: /<meta\s+name\s*=\s*["']description["']\s+content\s*=\s*["'][^"']+["']/ },
    { name: 'og:title', re: /<meta\s+property\s*=\s*["']og:title["']\s+content\s*=\s*["'][^"']+["']/ },
    { name: 'og:url', re: /<meta\s+property\s*=\s*["']og:url["']\s+content\s*=\s*["']([^"']+)["']/ },
    { name: 'og:image', re: /<meta\s+property\s*=\s*["']og:image["']\s+content\s*=\s*["'][^"']+["']/ },
  ];
  for (const f of htmls) {
    const txt = await read(f);
    for (const r of required) {
      if (!r.re.test(txt)) failures.push(`${f}: ${r.name} 欠損`);
    }
    // og:url の自己参照整合
    const urlM = txt.match(/<meta\s+property\s*=\s*["']og:url["']\s+content\s*=\s*["']([^"']+)["']/);
    if (urlM) {
      const url = urlM[1];
      if (!url.includes(DOMAIN)) failures.push(`${f}: og:url のドメインが ${DOMAIN} でない (${url})`);
      // ファイル名が自身と一致するか
      const expectedName = f === 'index.html' ? '' : f;
      const urlFile = url.replace(/^https?:\/\/[^/]+\//, '').split('?')[0].split('#')[0];
      if (expectedName === '' && urlFile !== '' && urlFile !== 'index.html') {
        failures.push(`${f}: og:url がルートを指していない (${url})`);
      } else if (expectedName !== '' && urlFile !== expectedName) {
        failures.push(`${f}: og:url のファイル名が自身(${f}) と不一致 (${urlFile})`);
      }
    }
  }
  report('T9', 'メタタグ整合', failures.length === 0,
    failures.length === 0 ? `${htmls.length} files OK` : failures.join('\n  '));
}

/* ---------------- 実行 ---------------- */
const tests = [T1, T2, T3, T4, T5, T6, T7, T8, T9];
for (const t of tests) {
  try {
    await t();
  } catch (e) {
    report(t.name, t.name, false, `テスト自体が例外で失敗: ${e.stack || e.message}`);
  }
}

let failCount = 0;
for (const r of results) {
  const mark = r.ok ? 'PASS' : 'FAIL';
  const line = `[${mark}] ${r.id} ${r.name}${r.detail ? ': ' + r.detail : ''}`;
  if (r.ok) console.log(line);
  else { console.error(line); failCount++; }
}
console.log(`\nTotal: ${results.length}, Failed: ${failCount}`);
process.exit(failCount > 0 ? 1 : 0);
