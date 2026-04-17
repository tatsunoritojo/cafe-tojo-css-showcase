/*
 * Mixable CSS: カート選択状態のストア
 * - localStorage に保存された選択（見本のCSS）の CRUD と、
 *   変更時のUI同期（追加ボタンのバッジ/アイコン反映 + サイドバー更新）。
 * - 他モジュールから直接 localStorage を触らず、ここで定義する関数経由で読み書きする。
 * - updateAll が依存する updateSidebar / refreshIcons は別ファイル（mixer-sidebar.js / mixer.js）の
 *   グローバル関数に委譲。全スクリプトが defer で順次ロード後に初めて呼ばれるため、参照順の問題は起きない。
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
    if (typeof updateSidebar === 'function') updateSidebar();
    if (typeof refreshIcons === 'function') refreshIcons();
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
