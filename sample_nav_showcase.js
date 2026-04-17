/* ナビ見本市のインタラクション（タブ切替・ページネーション）
   見本としての「動く感じ」を伝える最小実装。
   遷移はしない（preventDefault）、状態はDOMのみ（永続化不要）。 */

document.addEventListener('DOMContentLoaded', () => {
    // タブ切替: [role="tablist"] 内の [role="tab"] をクリックで aria-selected を切替
    document.querySelectorAll('[role="tablist"]').forEach(list => {
        list.addEventListener('click', e => {
            const tab = e.target.closest('[role="tab"]');
            if (!tab || !list.contains(tab)) return;
            list.querySelectorAll('[role="tab"]').forEach(t => t.setAttribute('aria-selected', 'false'));
            tab.setAttribute('aria-selected', 'true');
        });
    });

    // ページネーション: nav.pg-* の <a> クリックで .active / aria-current を切替
    document.querySelectorAll('nav[class^="pg-"]').forEach(nav => {
        nav.addEventListener('click', e => {
            const a = e.target.closest('a');
            if (!a || !nav.contains(a)) return;
            e.preventDefault();
            nav.querySelectorAll('a').forEach(x => {
                x.classList.remove('active');
                x.removeAttribute('aria-current');
            });
            a.classList.add('active');
            a.setAttribute('aria-current', 'page');
        });
    });
});
