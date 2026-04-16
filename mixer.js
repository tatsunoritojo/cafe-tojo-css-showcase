/**
 * CSS見本市 ミキサー機能
 * - 見本ページに右サイドバー（カート）を常時表示
 * - プレビューは現在のページのカテゴリで即時反映
 * - mixer.html は「レジ」（コードコピー用）
 */

const STORAGE_KEY = 'cssMixer.selections';

/* ---------------- ストレージ操作 ---------------- */

function getSelections() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function setSelections(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    updateAll();
}

function toggleSelection(item) {
    const selections = getSelections();
    const idx = selections.findIndex(s => s.id === item.id);
    if (idx >= 0) {
        selections.splice(idx, 1);
    } else {
        selections.push(item);
    }
    setSelections(selections);
    return idx < 0;
}

function isSelected(id) {
    return getSelections().some(s => s.id === id);
}

function clearAll() {
    setSelections([]);
}

function removeById(id) {
    setSelections(getSelections().filter(s => s.id !== id));
}

/* ---------------- UI共通更新 ---------------- */

function updateAll() {
    updateCards();
    updateSidebar();
    refreshIcons();
}

function updateCards() {
    const count = getSelections().length;
    document.querySelectorAll('.mixer-badge').forEach(el => {
        el.textContent = count;
        el.classList.toggle('has-items', count > 0);
    });
    document.querySelectorAll('.add-to-mixer').forEach(btn => {
        const id = btn.dataset.itemId;
        const selected = isSelected(id);
        btn.classList.toggle('added', selected);
        btn.innerHTML = selected ? '<i data-lucide="check" class="icn"></i>' : '<i data-lucide="plus" class="icn"></i>';
        btn.title = selected ? 'カートから削除' : 'カートに追加';
        const card = btn.closest('.btn-item, .text-item, .effect-item');
        if (card) card.classList.toggle('mixer-selected', selected);
    });
}

/* ---------------- 見本ページへのフック ---------------- */

function instrumentShowcase() {
    injectStyles();

    // 全ページにトップナビを挿入
    injectTopNav();

    // 学習リソース系（CSS Notes / CSS Reference）ではカート追加無効
    const isReferencePage = location.pathname.includes('css_showcase') || location.pathname.includes('css_reference');
    if (isReferencePage) {
        // サイドバーは表示するが、+ボタンは一切つけない
        if (!location.pathname.includes('mixer.html')) {
            injectSidebar();
        }
        return;
    }

    const items = document.querySelectorAll('.btn-item, .text-item, .effect-item, .layout-item, .card-item, .color-item, .anim-item, .form-item');
    const pageKey = getPageKey();

    items.forEach((item, idx) => {
        const codeEl = item.querySelector('pre.code, pre.code-block-wide')
                     || item.querySelector('figcaption code');
        const labelEl = item.querySelector('.label, figcaption strong');
        if (!codeEl) return;

        const id = `${pageKey}-${idx}`;
        const name = labelEl ? labelEl.textContent.trim() : `${pageKey}項目${idx + 1}`;

        const btn = document.createElement('button');
        btn.className = 'add-to-mixer';
        btn.dataset.itemId = id;
        btn.innerHTML = isSelected(id) ? '<i data-lucide="check" class="icn"></i>' : '<i data-lucide="plus" class="icn"></i>';
        btn.title = isSelected(id) ? 'カートから削除' : 'カートに追加';
        if (isSelected(id)) {
            btn.classList.add('added');
            item.classList.add('mixer-selected');
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // CSSとHTMLは click時に再取得する（つまみ調整後の値を拾うため）
            const currentCSS = codeEl.textContent.trim();
            const demoEl = findKnobDemoTarget(item);
            const html = demoEl ? demoEl.outerHTML : '';
            toggleSelection({ id, name, css: currentCSS, category: pageKey, html });
        });

        item.style.position = 'relative';
        item.appendChild(btn);
    });

    // mixer.htmlではサイドバーを出さない
    if (!location.pathname.includes('mixer.html')) {
        injectSidebar();
    }
}

function getPageKey() {
    const path = location.pathname.split('/').pop();
    if (path.includes('button')) return 'ボタン';
    if (path.includes('text')) return '文字装飾';
    if (path.includes('image')) return '画像活用';
    if (path.includes('layout')) return 'レイアウト';
    if (path.includes('card')) return 'カード';
    if (path.includes('color')) return 'カラー';
    if (path.includes('animation')) return 'アニメ';
    if (path.includes('form')) return 'フォーム';
    if (path.includes('css_showcase')) return 'CSS Notes';
    return 'その他';
}

/* ---------------- つまみ（インタラクティブプレビュー） ---------------- */

function initKnobs() {
    document.querySelectorAll('[data-knobs]').forEach(item => {
        if (item.dataset.knobsInit === '1') return;
        item.dataset.knobsInit = '1';

        let knobs;
        try {
            knobs = JSON.parse(item.dataset.knobs);
        } catch (e) {
            console.warn('Invalid data-knobs JSON', item, e);
            return;
        }
        if (!Array.isArray(knobs) || knobs.length === 0) return;

        const panel = document.createElement('div');
        panel.className = 'knob-panel';
        panel.innerHTML = `
            <p class="knob-panel-title"><i data-lucide="sliders-horizontal" class="icn"></i> つまみで試す</p>
            ${knobs.map((k, idx) => `
                <label class="knob-row" data-knob-idx="${idx}">
                    <span class="knob-label" title="${escapeHtmlStr(k.prop)}">${escapeHtmlStr(k.label || k.prop)}</span>
                    <input type="range" class="knob-input"
                        min="${k.min}" max="${k.max}" step="${k.step}" value="${k.value}"
                        data-idx="${idx}">
                    <span class="knob-value">${escapeHtmlStr(renderKnobDisplay(k, k.value))}</span>
                </label>
            `).join('')}
        `;

        const codeEl = item.querySelector('pre.code, pre.code-block-wide');
        if (codeEl) {
            codeEl.insertAdjacentElement('afterend', panel);
        } else {
            item.appendChild(panel);
        }

        // 元のコード文字列を保存（逐次書き換えるため）
        const codeInner = item.querySelector('pre.code code, pre.code-block-wide code');
        if (codeInner && !codeInner.dataset.origText) {
            codeInner.dataset.origText = codeInner.textContent;
        }

        panel.querySelectorAll('.knob-input').forEach(input => {
            input.addEventListener('input', () => applyKnob(item, knobs, input));
        });
    });
}

function applyKnob(item, knobs, input) {
    const idx = parseInt(input.dataset.idx, 10);
    const knob = knobs[idx];
    if (!knob) return;

    const val = input.value;
    const fullValue = renderKnobFull(knob, val);

    // 表示値を更新
    const valueEl = input.parentElement.querySelector('.knob-value');
    if (valueEl) valueEl.textContent = renderKnobDisplay(knob, val);

    // デモ要素のプロパティを更新（ページ側CSSが !important を使うケースに備えて important 付き）
    // knob.target（CSSセレクタ）が指定されていれば内側要素を狙える
    const demoEl = knob.target ? item.querySelector(knob.target) : findKnobDemoTarget(item);
    if (demoEl && knob.prop) {
        demoEl.style.setProperty(knob.prop, fullValue, 'important');
    }

    // コードブロックの該当行を書き換え（origから全つまみを再適用）
    const codeInner = item.querySelector('pre.code code, pre.code-block-wide code');
    if (codeInner) {
        const base = codeInner.dataset.origText || codeInner.textContent;
        let newText = base;
        knobs.forEach((k, i) => {
            const ki = item.querySelector(`.knob-input[data-idx="${i}"]`);
            if (!ki) return;
            newText = applyKnobToText(newText, k, ki.value);
        });
        codeInner.textContent = newText;
    }
}

function applyKnobToText(text, knob, val) {
    // 部分置換モード（match/replace が指定されていれば優先）
    if (knob.match && knob.replace) {
        const regex = new RegExp(knob.match);
        return text.replace(regex, knob.replace.replace(/\{v\}/g, val));
    }
    // フォールバック: プロパティ値全体を置換
    if (!knob.prop) return text;
    const fullValue = renderKnobFull(knob, val);
    return replaceCSSValue(text, knob.prop, fullValue);
}

function renderKnobFull(knob, val) {
    const tpl = knob.template || `{v}${knob.unit || ''}`;
    return tpl.replace(/\{v\}/g, val);
}

function renderKnobDisplay(knob, val) {
    const u = knob.displayUnit != null ? knob.displayUnit : (knob.unit || '');
    return `${val}${u}`;
}

function findKnobDemoTarget(item) {
    return Array.from(item.children).find(ch =>
        !ch.matches('figcaption, pre.code, pre.code-block-wide, .add-to-mixer, .label, .tuning, .knob-panel'));
}

function replaceCSSValue(text, prop, newValue) {
    const escaped = prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // コメント部分と非コメント部分に分割して、非コメント部分の最初の一致のみ置換
    const parts = text.split(/(\/\*[\s\S]*?\*\/)/);
    const regex = new RegExp(`(${escaped}\\s*:\\s*)([^;]+)(;)`);
    let done = false;
    return parts.map(part => {
        if (done || part.startsWith('/*')) return part;
        const next = part.replace(regex, (m, before, old, after) => {
            done = true;
            return before + newValue + after;
        });
        return next;
    }).join('');
}


/* ---------------- トップナビゲーション ---------------- */

function injectTopNav() {
    if (document.getElementById('mixable-top-nav')) return;
    if (location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/css-showcase/')) return;

    const pageKey = getPageKey();
    const path = location.pathname.split('/').pop();

    const nav = document.createElement('nav');
    nav.id = 'mixable-top-nav';
    nav.innerHTML = `
        <a href="index.html" class="tn-home" title="ポータルへ"><i data-lucide="home" class="icn"></i> Mixable CSS</a>
        <div class="tn-links">
            <a href="sample_button_showcase.html" class="${path.includes('button') ? 'tn-active' : ''}"><i data-lucide="mouse-pointer-click" class="icn"></i> ボタン</a>
            <a href="sample_text_showcase.html" class="${path.includes('text') ? 'tn-active' : ''}"><i data-lucide="type" class="icn"></i> 文字</a>
            <a href="sample_image_effects.html" class="${path.includes('image') ? 'tn-active' : ''}"><i data-lucide="image" class="icn"></i> 画像活用</a>
            <a href="sample_layout_showcase.html" class="${path.includes('layout') ? 'tn-active' : ''}"><i data-lucide="layout-grid" class="icn"></i> レイアウト</a>
            <a href="sample_card_showcase.html" class="${path.includes('card') ? 'tn-active' : ''}"><i data-lucide="layers" class="icn"></i> カード</a>
            <a href="sample_color_showcase.html" class="${path.includes('color') ? 'tn-active' : ''}"><i data-lucide="palette" class="icn"></i> 色</a>
            <a href="sample_animation_showcase.html" class="${path.includes('animation') ? 'tn-active' : ''}"><i data-lucide="zap" class="icn"></i> アニメ</a>
            <a href="sample_form_showcase.html" class="${path.includes('form') ? 'tn-active' : ''}"><i data-lucide="text-cursor-input" class="icn"></i> フォーム</a>
            <a href="sample_css_showcase.html" class="tn-note ${path.includes('css_showcase') ? 'tn-active' : ''}"><i data-lucide="book-open" class="icn"></i> Notes</a>
            <a href="sample_css_reference.html" class="tn-note ${path.includes('css_reference') ? 'tn-active' : ''}"><i data-lucide="book-marked" class="icn"></i> Reference</a>
            <a href="mixer.html" class="tn-cta ${path.includes('mixer') ? 'tn-active' : ''}"><i data-lucide="shopping-cart" class="icn"></i> レジ</a>
        </div>
    `;
    document.body.prepend(nav);
    document.body.classList.add('has-top-nav');
}

/* ---------------- サイドバー ---------------- */

function injectSidebar() {
    const sidebar = document.createElement('aside');
    sidebar.className = 'mixer-sidebar';
    sidebar.id = 'mixer-sidebar';
    sidebar.innerHTML = `
        <div class="sb-head">
            <h2><i data-lucide="shopping-cart" class="icn"></i> デザインカート</h2>
            <button class="sb-close" id="sb-close" aria-label="閉じる"><i data-lucide="x" class="icn"></i></button>
        </div>

        <div class="sb-status">
            <strong><span id="sb-count">0</span></strong> 個のスタイル
        </div>

        <div class="sb-preview-block">
            <h3><i data-lucide="eye" class="icn"></i> ライブプレビュー</h3>
            <label class="sb-input-label">
                <span>プレビューテキスト</span>
                <input type="text" id="sb-text" value="カフェ東城">
            </label>
            <div class="sb-preview-area" id="sb-preview-area">
                <span id="sb-preview-el">カフェ東城</span>
            </div>
            <p class="sb-preview-hint" id="sb-preview-hint">このページの効果を追加するとプレビューされます</p>
        </div>

        <div class="sb-list-block">
            <h3><i data-lucide="clipboard" class="icn"></i> カート内</h3>
            <div class="sb-list" id="sb-list">
                <p class="empty-note">「<i data-lucide="plus" class="icn"></i>」ボタンで追加</p>
            </div>
        </div>

        <div class="sb-actions">
            <a class="sb-btn sb-btn-primary" href="mixer.html">
                レジへ進む →
            </a>
            <button class="sb-btn sb-btn-ghost" id="sb-clear">全クリア</button>
        </div>

        <style id="mixer-sb-injected"></style>
    `;
    document.body.appendChild(sidebar);
    document.body.classList.add('has-mixer-sidebar');

    // モバイル用トグル
    const toggle = document.createElement('button');
    toggle.className = 'mixer-sb-toggle';
    toggle.innerHTML = `<i data-lucide="shopping-cart" class="icn"></i> カート <span class="mixer-badge">0</span>`;
    toggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
    document.body.appendChild(toggle);

    sidebar.querySelector('#sb-close').addEventListener('click', () => {
        sidebar.classList.remove('open');
    });

    sidebar.querySelector('#sb-clear').addEventListener('click', () => {
        if (confirm('全ての選択を削除しますか?')) clearAll();
    });

    sidebar.querySelector('#sb-text').addEventListener('input', updateSidebarPreview);

    updateSidebar();
}

function updateSidebar() {
    const sidebar = document.getElementById('mixer-sidebar');
    if (!sidebar) return;

    const selections = getSelections();
    const countEl = document.getElementById('sb-count');
    if (countEl) countEl.textContent = selections.length;

    document.querySelectorAll('.mixer-badge').forEach(b => {
        b.textContent = selections.length;
        b.classList.toggle('has-items', selections.length > 0);
    });

    const list = document.getElementById('sb-list');
    if (list) {
        if (selections.length === 0) {
            list.innerHTML = '<p class="empty-note">「<i data-lucide="plus" class="icn"></i>」ボタンで追加</p>';
        } else {
            list.innerHTML = selections.map(s => `
                <div class="sb-item">
                    <span class="sb-item-cat">${escapeHtmlStr(s.category)}</span>
                    <span class="sb-item-name">${escapeHtmlStr(s.name)}</span>
                    <button class="sb-item-remove" data-id="${escapeHtmlStr(s.id)}" title="削除">×</button>
                </div>
            `).join('');

            list.querySelectorAll('.sb-item-remove').forEach(btn => {
                btn.addEventListener('click', () => removeById(btn.dataset.id));
            });
        }
    }

    updateSidebarPreview();
}

function updateSidebarPreview() {
    const previewEl = document.getElementById('sb-preview-el');
    const hintEl = document.getElementById('sb-preview-hint');
    const previewArea = document.getElementById('sb-preview-area');
    if (!previewEl) return;

    const text = (document.getElementById('sb-text')?.value) || 'カフェ東城';
    const pageKey = getPageKey();
    const selections = getSelections();
    const relevant = selections.filter(s => s.category === pageKey);

    // プレビュー要素をページに合わせて切り替え
    previewArea.innerHTML = ''; // リセット
    let el;

    if (pageKey === 'ボタン') {
        el = document.createElement('button');
        el.textContent = text;
    } else if (pageKey === '画像活用') {
        el = document.createElement('img');
        el.src = 'images/cafe-exterior.jpg';
        el.alt = 'プレビュー';
        el.style.maxWidth = '100%';
        el.style.maxHeight = '160px';
    } else if (pageKey === 'レイアウト') {
        el = document.createElement('div');
        el.className = 'preview-layout';
        el.innerHTML = '<span class="demo-box">A</span><span class="demo-box">B</span><span class="demo-box">C</span>';
        el.style.width = '100%';
        el.style.height = '100%';
    } else if (pageKey === 'カード') {
        el = document.createElement('div');
        el.className = 'preview-card';
        el.innerHTML = `<h4>${escapeHtmlStr(text)}</h4><p>こだわりの一杯を。</p>`;
    } else if (pageKey === 'カラー') {
        el = document.createElement('div');
        el.className = 'preview-color';
        el.style.width = '100%';
        el.style.height = '100%';
        el.style.minHeight = '110px';
        el.style.borderRadius = '6px';
    } else if (pageKey === 'アニメ') {
        el = document.createElement('div');
        el.className = 'preview-anim';
        el.textContent = text;
    } else if (pageKey === 'フォーム') {
        el = document.createElement('input');
        el.type = 'text';
        el.placeholder = text || 'プレビュー入力';
        el.className = 'preview-form';
    } else {
        el = document.createElement('span');
        el.textContent = text;
    }
    el.id = 'sb-preview-el';
    previewArea.appendChild(el);

    if (relevant.length === 0) {
        if (hintEl) hintEl.textContent = `このページの効果を追加するとプレビューに反映されます`;
        return;
    }

    // プロパティをマージ
    const merged = {};
    const blocks = [];
    relevant.forEach(item => {
        const parsed = parseCSSSimple(item.css);
        Object.assign(merged, parsed.properties);
        parsed.blocks.forEach(b => { if (!blocks.includes(b)) blocks.push(b); });
    });

    Object.entries(merged).forEach(([prop, val]) => {
        try { el.style.setProperty(prop, val); } catch (e) {}
    });

    const injStyle = document.getElementById('mixer-sb-injected');
    if (injStyle) injStyle.textContent = blocks.join('\n\n');

    if (hintEl) hintEl.textContent = `${pageKey}の効果を ${relevant.length} 個適用中`;
}

function parseCSSSimple(code) {
    let clean = code.replace(/\/\*[\s\S]*?\*\//g, '');
    const blocks = [];

    const atRuleRegex = /@[-\w]+\s+[^{]*\{(?:[^{}]|\{[^{}]*\})*\}/g;
    clean = clean.replace(atRuleRegex, m => { blocks.push(m); return ''; });

    const selectorBlockRegex = /[^{};]+\{[^}]*\}/g;
    clean = clean.replace(selectorBlockRegex, m => { blocks.push(m); return ''; });

    const properties = {};
    clean.split(/[\n;]/).forEach(line => {
        line = line.trim();
        if (!line || !line.includes(':')) return;
        const colonIdx = line.indexOf(':');
        const prop = line.substring(0, colonIdx).trim();
        const val = line.substring(colonIdx + 1).trim().replace(/;$/, '');
        if (prop && val && !prop.startsWith('//')) {
            properties[prop] = val;
        }
    });

    return { properties, blocks };
}

function escapeHtmlStr(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

/* ---------------- スタイル注入 ---------------- */

function injectStyles() {
    if (document.getElementById('mixer-injected-styles')) return;

    const style = document.createElement('style');
    style.id = 'mixer-injected-styles';
    style.textContent = `
        /* Lucideアイコン共通 */
        .icn {
            width: 16px;
            height: 16px;
            display: inline-block;
            vertical-align: -0.2em;
            stroke-width: 2;
        }

        /* トップナビゲーション（ダーク背景で視認性向上） */
        body.has-top-nav {
            padding-top: 56px !important;
        }
        #mixable-top-nav {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 56px;
            background: #1a1a1a;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 1.2em;
            z-index: 1001;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
            font-family: sans-serif;
            border-bottom: 1px solid rgba(255, 215, 0, 0.2);
        }
        #mixable-top-nav .tn-home {
            color: #ffd700;
            font-weight: bold;
            text-decoration: none;
            font-size: 1rem;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 0.4em;
        }
        #mixable-top-nav .tn-home .icn {
            width: 18px;
            height: 18px;
        }
        #mixable-top-nav .tn-links {
            display: flex;
            gap: 0.3em;
            flex-wrap: wrap;
            align-items: center;
        }
        #mixable-top-nav .tn-links a {
            color: #e0e0e0;
            padding: 0.4em 0.9em;
            border-radius: 6px;
            text-decoration: none;
            font-size: 0.9rem;
            transition: all 0.2s;
            white-space: nowrap;
            display: inline-flex;
            align-items: center;
            gap: 0.4em;
        }
        #mixable-top-nav .tn-links a:hover {
            background: rgba(255, 215, 0, 0.15);
            color: #ffd700;
        }
        #mixable-top-nav .tn-links a.tn-active {
            background: #ffd700;
            color: #1a1a1a;
            font-weight: bold;
        }
        #mixable-top-nav .tn-note {
            border-left: 1px solid rgba(255, 255, 255, 0.2);
            padding-left: 0.9em !important;
            margin-left: 0.2em;
        }
        #mixable-top-nav .tn-cta {
            background: #c44;
            color: white !important;
        }
        #mixable-top-nav .tn-cta:hover {
            background: #e55 !important;
            color: white !important;
        }
        #mixable-top-nav .tn-cta.tn-active {
            background: #ffd700 !important;
            color: #1a1a1a !important;
        }
        @media (max-width: 720px) {
            #mixable-top-nav {
                height: auto;
                padding: 0.5em 0.8em;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.3em;
            }
            #mixable-top-nav .tn-links a {
                font-size: 0.8rem;
                padding: 0.3em 0.5em;
            }
            body.has-top-nav {
                padding-top: 100px !important;
            }
        }

        /* 追加ボタン */
        .add-to-mixer {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            border: 2px solid #6b4423;
            background: white;
            color: #6b4423;
            font-size: 1.3rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 10;
            padding: 0;
            line-height: 1;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
        }
        .add-to-mixer:hover {
            transform: scale(1.15);
            background: #f5efe6;
        }
        .add-to-mixer.added {
            background: #6b4423;
            color: white;
        }
        .mixer-selected {
            outline: 3px solid #ffd700 !important;
            outline-offset: 2px;
        }

        /* デスクトップ: サイドバー分のpadding */
        @media (min-width: 1000px) {
            body.has-mixer-sidebar {
                padding-right: 360px;
            }
            body.has-mixer-sidebar .mixer-sidebar {
                transform: none !important;
            }
        }

        /* サイドバー */
        .mixer-sidebar {
            position: fixed;
            top: 0;
            right: 0;
            width: 340px;
            height: 100vh;
            background: white;
            border-left: 2px solid #6b4423;
            padding: 1.5em 1.2em;
            overflow-y: auto;
            z-index: 900;
            box-shadow: -6px 0 20px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            gap: 1em;
            transform: translateX(100%);
            transition: transform 0.3s;
            font-family: sans-serif;
        }
        .mixer-sidebar.open {
            transform: translateX(0);
        }

        .sb-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .sb-head h2 {
            margin: 0;
            color: #6b4423;
            font-size: 1.2rem;
        }
        .sb-close {
            background: none;
            border: none;
            font-size: 1.3rem;
            cursor: pointer;
            color: #999;
            padding: 0 0.4em;
        }
        @media (min-width: 1000px) {
            .sb-close { display: none; }
        }

        .sb-status {
            background: #f5efe6;
            padding: 0.6em 0.9em;
            border-radius: 6px;
            font-size: 0.95rem;
        }
        .sb-status strong {
            color: #6b4423;
            font-size: 1.4rem;
        }

        .sb-preview-block h3,
        .sb-list-block h3 {
            margin: 0 0 0.5em;
            font-size: 0.95rem;
            color: #6b4423;
        }

        .sb-input-label {
            display: block;
            margin-bottom: 0.5em;
        }
        .sb-input-label span {
            display: block;
            font-size: 0.8rem;
            color: #555;
            margin-bottom: 0.2em;
        }
        .sb-input-label input {
            width: 100%;
            padding: 0.45em 0.6em;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 0.9rem;
            font-family: inherit;
            box-sizing: border-box;
        }

        .sb-preview-area {
            position: relative;           /* absolute 子要素を閉じ込める */
            min-height: 120px;
            height: 150px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0.8em;
            background: #fafafa;
            border: 1px dashed #ddd;
            border-radius: 4px;
            overflow: hidden;
            contain: layout paint;
        }
        .sb-preview-area > * {
            max-width: 100% !important;
            max-height: 100% !important;
            position: static !important;
            top: auto !important;
            left: auto !important;
            object-fit: contain;
        }
        #sb-preview-el {
            font-size: 1.4rem;
            font-weight: bold;
            color: #6b4423;
        }
        .sb-preview-area button {
            padding: 0.6em 1.2em;
            border: none;
            background: #6b4423;
            color: white;
            border-radius: 4px;
            font-size: 1rem;
            cursor: pointer;
            font-family: inherit;
        }
        /* つまみパネル */
        .knob-panel {
            background: #eff6ff;
            border-left: 3px solid #4a90e2;
            border-radius: 4px;
            padding: 0.55em 0.75em;
            font-size: 0.75rem;
            margin: 0;
            font-family: sans-serif;
        }
        .knob-panel-title {
            margin: 0 0 0.45em;
            font-size: 0.78rem;
            color: #2c5282;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 0.4em;
        }
        .knob-panel-title .icn {
            color: #4a90e2;
        }
        .knob-row {
            display: grid;
            grid-template-columns: minmax(60px, 90px) 1fr minmax(48px, 62px);
            align-items: center;
            gap: 0.45em;
            margin: 0.3em 0;
            cursor: pointer;
        }
        .knob-label {
            font-family: 'Courier New', monospace;
            font-size: 0.7rem;
            color: #2c5282;
            font-weight: bold;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .knob-input {
            width: 100%;
            accent-color: #4a90e2;
            cursor: pointer;
            margin: 0;
        }
        .knob-value {
            text-align: right;
            font-family: 'Courier New', monospace;
            font-size: 0.7rem;
            color: #2c5282;
            font-weight: bold;
        }

        .sb-preview-area .preview-layout .demo-box {
            background: #6b4423;
            color: white;
            padding: 0.3em 0.6em;
            border-radius: 3px;
            font-size: 0.8rem;
            font-weight: bold;
            display: inline-block;
        }
        .sb-preview-area .preview-card {
            width: 100%;
            padding: 0.8em;
            background: white;
            font-family: sans-serif;
        }
        .sb-preview-area .preview-card h4 {
            margin: 0 0 0.3em;
            font-size: 0.95rem;
            color: #6b4423;
        }
        .sb-preview-area .preview-card p {
            margin: 0;
            font-size: 0.78rem;
            color: #555;
        }
        .sb-preview-area .preview-anim {
            background: #6b4423;
            color: white;
            padding: 0.6em 1.2em;
            border-radius: 4px;
            font-weight: bold;
            font-size: 0.9rem;
            display: inline-block;
        }
        .sb-preview-area .preview-form {
            padding: 0.6em 0.9em;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 0.9rem;
            font-family: inherit;
            width: 90%;
            background: white;
        }
        .sb-preview-hint {
            margin: 0.5em 0 0;
            font-size: 0.8rem;
            color: #888;
            font-style: italic;
        }

        .sb-list {
            max-height: 220px;
            overflow-y: auto;
        }
        .sb-item {
            display: flex;
            align-items: center;
            gap: 0.4em;
            padding: 0.4em 0.6em;
            background: #fafafa;
            border-radius: 4px;
            margin-bottom: 0.3em;
            font-size: 0.85rem;
        }
        .sb-item-cat {
            background: #6b4423;
            color: white;
            padding: 0.1em 0.4em;
            border-radius: 3px;
            font-size: 0.7rem;
            font-weight: bold;
            white-space: nowrap;
        }
        .sb-item-name {
            flex: 1;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 0.85rem;
        }
        .sb-item-remove {
            background: none;
            border: none;
            color: #999;
            cursor: pointer;
            font-size: 1rem;
            padding: 0 0.2em;
        }
        .sb-item-remove:hover { color: #c44; }

        .empty-note {
            text-align: center;
            color: #999;
            font-style: italic;
            font-size: 0.9rem;
            margin: 1em 0;
        }

        .sb-actions {
            display: flex;
            flex-direction: column;
            gap: 0.5em;
            margin-top: auto;
        }
        .sb-btn {
            padding: 0.8em 1em;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            text-align: center;
            cursor: pointer;
            border: none;
            font-size: 0.95rem;
            font-family: inherit;
            transition: all 0.2s;
            display: block;
        }
        .sb-btn-primary {
            background: #6b4423;
            color: white;
        }
        .sb-btn-primary:hover {
            background: #8a5a30;
            transform: translateY(-2px);
        }
        .sb-btn-ghost {
            background: transparent;
            color: #c44;
            border: 1px solid #c44;
        }
        .sb-btn-ghost:hover {
            background: #fff0f0;
        }

        /* モバイル用トグル */
        .mixer-sb-toggle {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #6b4423;
            color: white;
            padding: 0.8em 1.3em;
            border-radius: 999px;
            border: none;
            cursor: pointer;
            font-size: 0.95rem;
            font-weight: bold;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            gap: 0.5em;
            z-index: 1000;
            font-family: inherit;
        }
        @media (min-width: 1000px) {
            .mixer-sb-toggle { display: none; }
        }

        .mixer-badge {
            background: white;
            color: #6b4423;
            border-radius: 999px;
            min-width: 1.5em;
            height: 1.5em;
            padding: 0 0.5em;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
        }
        .mixer-badge.has-items {
            background: #ffd700;
            color: #333;
        }
    `;
    document.head.appendChild(style);
}

/* ---------------- エントリポイント ---------------- */

function refreshIcons() {
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
        try { window.lucide.createIcons(); } catch (e) {}
    }
}

function init() {
    instrumentShowcase();
    initKnobs();
    // Lucideが読み込まれるまで少し待ってからcreateIcons
    if (window.lucide) {
        refreshIcons();
    } else {
        setTimeout(refreshIcons, 100);
        setTimeout(refreshIcons, 500);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
