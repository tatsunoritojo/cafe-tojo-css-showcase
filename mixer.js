/**
 * CSS見本市 ミキサー機能（MVP / モック版）
 * - 各見本に「+」ボタンを自動付与
 * - localStorageで選択状態を保存
 * - ページ遷移しても選択が保持される
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
    updateAllBadges();
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
    return idx < 0; // true = added, false = removed
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

/* ---------------- UI更新 ---------------- */

function updateAllBadges() {
    const count = getSelections().length;
    document.querySelectorAll('.mixer-badge').forEach(el => {
        el.textContent = count;
        el.classList.toggle('has-items', count > 0);
    });
    document.querySelectorAll('.add-to-mixer').forEach(btn => {
        const id = btn.dataset.itemId;
        const selected = isSelected(id);
        btn.classList.toggle('added', selected);
        btn.innerHTML = selected ? '✓' : '＋';
        btn.title = selected ? 'ミキサーから削除' : 'ミキサーに追加';
    });
}

/* ---------------- 見本ページへのフック ---------------- */

function instrumentShowcase() {
    injectStyles();

    // 対象となるセル（各見本市ページの共通クラス）
    const items = document.querySelectorAll('.btn-item, .text-item, .effect-item');

    const pageKey = getPageKey();

    items.forEach((item, idx) => {
        const codeEl = item.querySelector('pre.code, pre.code-block-wide');
        const labelEl = item.querySelector('.label, figcaption strong');
        if (!codeEl) return;

        const id = `${pageKey}-${idx}`;
        const name = labelEl ? labelEl.textContent.trim() : `${pageKey}項目${idx + 1}`;
        const css = codeEl.textContent.trim();

        const btn = document.createElement('button');
        btn.className = 'add-to-mixer';
        btn.dataset.itemId = id;
        btn.innerHTML = isSelected(id) ? '✓' : '＋';
        btn.title = isSelected(id) ? 'ミキサーから削除' : 'ミキサーに追加';
        if (isSelected(id)) btn.classList.add('added');

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSelection({ id, name, css, category: pageKey });
        });

        item.style.position = 'relative';
        item.appendChild(btn);
    });

    injectMixerFloat();
}

function getPageKey() {
    const path = location.pathname.split('/').pop();
    if (path.includes('button')) return 'ボタン';
    if (path.includes('text')) return '文字装飾';
    if (path.includes('image')) return '画像エフェクト';
    if (path.includes('css_showcase')) return 'CSS基礎';
    return 'その他';
}

function injectMixerFloat() {
    // 既にミキサーページならスキップ
    if (location.pathname.includes('mixer.html')) return;

    const link = document.createElement('a');
    link.href = 'mixer.html';
    link.className = 'mixer-float';
    link.innerHTML = `🎨 ミキサー <span class="mixer-badge ${getSelections().length > 0 ? 'has-items' : ''}">${getSelections().length}</span>`;
    document.body.appendChild(link);
}

function injectStyles() {
    if (document.getElementById('mixer-injected-styles')) return;

    const style = document.createElement('style');
    style.id = 'mixer-injected-styles';
    style.textContent = `
        .add-to-mixer {
            position: absolute;
            top: 8px;
            right: 8px;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #6b4423;
            background: white;
            color: #6b4423;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
            z-index: 10;
            padding: 0;
            line-height: 1;
        }
        .add-to-mixer:hover {
            transform: scale(1.1);
            background: #f5efe6;
        }
        .add-to-mixer.added {
            background: #6b4423;
            color: white;
        }

        .mixer-float {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #6b4423;
            color: white;
            padding: 0.8em 1.3em;
            border-radius: 999px;
            text-decoration: none;
            font-weight: bold;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
            display: flex;
            align-items: center;
            gap: 0.5em;
            z-index: 1000;
            transition: transform 0.2s;
        }
        .mixer-float:hover {
            transform: translateY(-3px);
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', instrumentShowcase);
} else {
    instrumentShowcase();
}
