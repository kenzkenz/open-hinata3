// src/js/utils/embed.js
// OH3 が iframe 内かどうかを高精度に判定し、最小限の最適化（クラス付与・auto-resize・簡易contextmenu無効）を行う。


export function getEmbedContext() {
    const qs = new URLSearchParams(location.search);


// 〔明示オーバーライド〕
    const embedParam = qs.get('embed');
    if (embedParam === '1' || embedParam === 'true') {
        return { inIframe: true, parentOrigin: getParentOrigin(), reason: 'query' };
    }
    if (embedParam === '0' || embedParam === 'false') {
        return { inIframe: false, parentOrigin: null, reason: 'query' };
    }


// 〔自動判定〕
    let inIframe = false;
    try {
// 参照比較は cross-origin でも例外にならない
        inIframe = (window.self !== window.top);
    } catch (e) {
// まれに上位 frame に触れず例外 → 埋め込みとみなす
        inIframe = true;
    }


// ポップアップ（window.open）との区別（opener があれば iframe ではない）
    if (inIframe && window.opener) inIframe = false;


    const parentOrigin = getParentOrigin();
    return { inIframe, parentOrigin, reason: 'auto' };
}


function getParentOrigin() {
    try {
        if (document.referrer) {
            const u = new URL(document.referrer);
// 同一オリジンの内部遷移 referrer は無視
            if (u.origin !== location.origin) return u.origin;
        }
    } catch (_) {}
    return null; // 取得できない場合は null（postMessage では '*' フォールバック可）
}


export function setupEmbedMode(app) {
    const { inIframe, parentOrigin } = getEmbedContext();
    if (!inIframe) return false;


// DOM マーカー
    document.documentElement.classList.add('oh3-embed');


// どこからでも参照できるよう露出（任意）
    window.__OH3_EMBED__ = { parentOrigin };
    try { app.config.globalProperties.$isEmbed = true; } catch (_) {}


// 高さ自動調整（親に通知）
    setupAutoResize(parentOrigin);


// 右クリックはシンプルに（埋め込み先の UI を尊重）
    try {
        window.addEventListener('contextmenu', (e) => e.preventDefault(), { passive: false });
    } catch (_) {}


    return true;
}


export function setupAutoResize(parentOrigin) {
    const targetOrigin = parentOrigin || '*';
    const sendSize = () => {
        const h = Math.ceil(document.documentElement.scrollHeight);
        parent.postMessage({ type: 'oh3:size', payload: { height: h } }, targetOrigin);
    };
    const ro = new ResizeObserver(sendSize);
    ro.observe(document.body);
    window.addEventListener('load', sendSize);
    document.addEventListener('visibilitychange', sendSize);
    setInterval(sendSize, 1500); // セーフティ（フォントロード等での取りこぼし対策）
}