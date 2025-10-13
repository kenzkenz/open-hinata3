// /src/js/utils/image-compress.js
// 画像ファイルを targetBytes 以下へ近づける（必要に応じて縮小＋品質調整）
// 呼び出し側から targetBytes や長辺上限などを指定可能
export async function compressImageToTarget(
    file,
    {
        targetBytes = 1 * 1024 * 1024,
        maxLongSide = 2048,
        preferWebP = true,
        qualityRange = [0.5, 0.95], // [min, max]
        maxDownscaleSteps = 4,
        downscaleRatio = 0.85
    } = {}
){
    if (!file || !file.type?.startsWith('image/')) return file;
    // すでに十分小さければそのまま返す
    if (file.size <= targetBytes) return file;

    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
        .catch(async () => {
            const img = await fileToHTMLImage(file);
            return imageToBitmap(img);
        });

    let width = bitmap.width;
    let height = bitmap.height;

    // 長辺上限適用
    const scale0 = Math.min(1, maxLongSide / Math.max(width, height));
    if (scale0 < 1) {
        width = Math.round(width * scale0);
        height = Math.round(height * scale0);
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });

    // 出力フォーマット選択
    const canWebp = supportsWebP();
    const mime = (preferWebP && canWebp) ? 'image/webp' : 'image/jpeg';

    const tryEncode = async (w, h, qMin, qMax, step = 8) => {
        canvas.width = w; canvas.height = h;
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(bitmap, 0, 0, w, h);

        let lo = qMin, hi = qMax, best = null;
        for (let i=0; i<step; i++){
            const q = (lo + hi) / 2;
            const blob = await new Promise(r => canvas.toBlob(r, mime, q));
            if (!blob) break;
            if (blob.size <= targetBytes) { best = blob; lo = q; } else { hi = q; }
        }
        return best;
    };

    // 1st: 現サイズで品質二分探索
    let best = await tryEncode(width, height, qualityRange[0], qualityRange[1]);

    // 2nd: まだ大きければ段階的縮小→再探索
    let w = width, h = height, steps = 0;
    while ((!best || best.size > targetBytes) && steps < maxDownscaleSteps) {
        w = Math.max(2, Math.round(w * downscaleRatio));
        h = Math.max(2, Math.round(h * downscaleRatio));
        const b = await tryEncode(w, h, qualityRange[0], qualityRange[1], 6);
        if (b && (!best || b.size <= targetBytes || b.size < best.size)) best = b;
        steps++;
    }

    // 目標未達でもベストを返す（サーバー側で最終チェック推奨）
    if (!best) return file;

    // 拡張子整合して File で返す
    const newName = renameWithExt(file.name, best.type);
    return new File([best], newName, { type: best.type });
}

// ===== ヘルパ =====
function fileToHTMLImage(file){
    return new Promise((resolve,reject)=>{
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
        img.onerror = (e)=>{ URL.revokeObjectURL(url); reject(e); };
        img.src = url;
    });
}

function imageToBitmap(img){
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return createImageBitmap(c);
}

function supportsWebP(){
    try{
        const d = document.createElement('canvas').toDataURL('image/webp');
        return d.startsWith('data:image/webp');
    }catch(e){
        return false;
    }
}

function renameWithExt(origName, mime){
    const base = (origName && origName.replace(/\.[^.]+$/,'')) || 'image';
    if (mime === 'image/webp') return base + '.webp';
    if (mime === 'image/jpeg') return base + '.jpg';
    // フォールバック
    const guess = mime && mime.split('/')[1] ? '.' + mime.split('/')[1] : '.bin';
    return base + guess;
}
