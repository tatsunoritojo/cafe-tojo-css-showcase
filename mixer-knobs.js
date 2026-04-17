/*
 * Mixable CSS: つまみ（インタラクティブプレビュー）
 * - 各見本の data-knobs 属性（JSON）を読み、コード例の下にスライダーパネルを注入。
 * - スライダーを動かすとデモ要素の style と表示コードを即時更新する。
 * - knob オブジェクトのキー: label, prop, target, unit, displayUnit, template, match, replace, min, max, step, value
 *   - target が省略された場合は findKnobDemoTarget がアイテム内の最初のデモ要素を推定。
 *   - template/match/replace を使えば、複合値（例: "box-shadow" の一部）を書き換えられる。
 * - findKnobDemoTarget は instrumentShowcase（mixer.js）からも参照される（カート追加時に HTML を拾うため）。
 * - escapeHtmlStr は mixer.js 側のグローバル関数を参照する（defer で全スクリプト読み込み後に init() から呼ばれるため順序問題は起きない）。
 */

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
    // knob.target（CSSセレクタ）が指定されていれば内側要素を狙える。複数一致する場合は全要素に適用
    if (knob.prop) {
        if (knob.target) {
            item.querySelectorAll(knob.target).forEach(el => el.style.setProperty(knob.prop, fullValue, 'important'));
        } else {
            const demoEl = findKnobDemoTarget(item);
            if (demoEl) demoEl.style.setProperty(knob.prop, fullValue, 'important');
        }
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
