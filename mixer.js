/**
 * CSS見本市 ミキサー機能
 * - 見本ページに右サイドバー（カート）を常時表示
 * - プレビューは現在のページのカテゴリで即時反映
 * - mixer.html は「レジ」（コードコピー用）
 */

/* ---------------- 見本ページへのフック ---------------- */

function instrumentShowcase() {
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

    const items = document.querySelectorAll('.btn-item, .text-item, .effect-item, .layout-item, .card-item, .color-item, .anim-item, .form-item, .nav-item');
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
    if (path.includes('nav')) return 'ナビ';
    if (path.includes('css_showcase')) return 'CSS Notes';
    return 'その他';
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
            <a href="sample_nav_showcase.html" class="${path.includes('nav_showcase') ? 'tn-active' : ''}"><i data-lucide="compass" class="icn"></i> ナビ</a>
            <a href="sample_css_showcase.html" class="tn-note ${path.includes('css_showcase') ? 'tn-active' : ''}"><i data-lucide="book-open" class="icn"></i> Notes</a>
            <a href="sample_css_reference.html" class="tn-note ${path.includes('css_reference') ? 'tn-active' : ''}"><i data-lucide="book-marked" class="icn"></i> Reference</a>
            <a href="mixer.html" class="tn-cta ${path.includes('mixer') ? 'tn-active' : ''}"><i data-lucide="shopping-cart" class="icn"></i> レジ</a>
        </div>
    `;
    document.body.prepend(nav);
    document.body.classList.add('has-top-nav');
}

/* ---------------- 共通ヘルパー ---------------- */

function escapeHtmlStr(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
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
