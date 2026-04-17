/*
 * Mixable CSS: サイドバー（ライブプレビュー + カート一覧）
 * - 各見本ページの右に固定表示される aside#mixer-sidebar を生成・更新。
 * - 現在ページの category に該当する選択を集め、テキスト/ボタン/画像等の
 *   代表プレビュー要素にマージ適用する（parseCSSSimple がプロパティ抽出）。
 * - モバイル（< 1000px）では画面右下の FAB ボタン .mixer-sb-toggle から開閉する。
 * - ストア書き換え（カート追加/削除/全クリア）は mixer-store.js の関数に委譲。
 *   updateAll → updateSidebar が呼ばれることでサイドバーとバッジが同期する。
 * - escapeHtmlStr / getPageKey は mixer.js 側のグローバル関数。defer ロード後に使われる。
 */

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
