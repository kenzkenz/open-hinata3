// dem-tint-protocol.js
// DEM PNG (GSI dem_png) を色分けして返すカスタムプロトコル。
// 追加：おすすめの「マイクロ陰影（soft）」をURLパラメータでオン。
// 使い方例： demtint://https://tiles.gsj.jp/tiles/elev/land/{z}/{y}/{x}.png?style=XXXX&shade=soft&sa=0.25&az=315&alt=45

// ===== スタイルレジストリ =====
const PALETTE_REG = new Map();
/** 外側から palette を登録して styleKey で引けるようにする */
export function registerDemTintPalette(styleKey, palette) {
    if (!styleKey || !palette) return;
    PALETTE_REG.set(String(styleKey), normalizePalette(palette));
}

// ===== パレット正規化（HEX→RGB） =====
function normalizePalette(p) {
    const toRGB = (hex) => {
        const m = hex.replace('#','');
        return {
            r: parseInt(m.slice(0,2),16),
            g: parseInt(m.slice(2,4),16),
            b: parseInt(m.slice(4,6),16)
        };
    };
    const nr = (arr)=> (arr||[]).map(toRGB);
    return {
        aboveDomain: [...(p.aboveDomain||[])],
        aboveRange:  nr(p.aboveRange||[]),
        belowDomain: [...(p.belowDomain||[])],
        belowRange:  nr(p.belowRange||[])
    };
}

// ===== クエリ文字列 =====
function parseQS(u){
    const q = {}; const m = u.match(/\?(.*)$/); if (!m) return q;
    for (const kv of m[1].split('&')) {
        const [k,v] = kv.split('=');
        if (!k) continue; q[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
    }
    return q;
}

// ===== dem_png デコード（OL準拠） =====
const NEG_TH = 0x7F0000;        // 8323072
const NODATA = 0x800000;        // 8388608

function decodeElevationRGBA(r,g,b,a){
    if (a === 0) return { ok:false, elev:NaN };  // 透明=NoData
    let raw = (r<<16) + (g<<8) + b;
    if (raw === NODATA) return { ok:false, elev:NaN };
    if (raw >= NEG_TH) raw -= 16777216; // 2の補数
    return { ok:true, elev: raw / 100.0 };
}

// ===== 色分類（ステップ） =====
function pickStepColor(value, domain, range){ // range: [{r,g,b}]
                                              // domain は昇順。value が domain[i]〜domain[i+1) に入る i を選ぶ。
                                              // 最初/最後の外側は端色。
    const n = domain.length;
    if (n === 0 || range.length === 0) return {r:0,g:0,b:0};
    if (n !== range.length) {
        // 念のため長さ不整合はトリム
        const m = Math.min(n, range.length);
        domain = domain.slice(0,m); range = range.slice(0,m);
    }
    if (value <= domain[0]) return range[0];
    for (let i=0; i<n-1; i++){
        if (value < domain[i+1]) return range[i];
    }
    return range[n-1];
}

// ===== 位置→m/px（陰影スケール用） =====
function parseZXY(url){
    const m = url.match(/\/(\d+)\/(\d+)\/(\d+)\.png/);
    return m ? { z:+m[1], x:+m[2], y:+m[3] } : { z:0,x:0,y:0 };
}
function tileYToLat(y, z){
    const n = Math.PI - 2*Math.PI*y/Math.pow(2,z);
    return (180/Math.PI)*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));
}
function metersPerPixel(z, y){
    const lat = tileYToLat(y, z);
    const earth = 6378137, circ = 2*Math.PI*earth;
    return Math.cos(lat*Math.PI/180) * circ / (256*Math.pow(2,z));
}

// ===== マイクロ陰影（Horn法ベース・超弱） =====
function buildSoftShade(elev, w, h, mpp, az=315, alt=45){
    const azr = (360-az) * Math.PI/180;   // 右手座標に合わせ反転
    const altr= alt * Math.PI/180;
    const lx = Math.cos(altr)*Math.cos(azr);
    const ly = Math.cos(altr)*Math.sin(azr);
    const lz = Math.sin(altr);

    const shade = new Float32Array(w*h);
    const idx = (x,y)=>y*w+x;

    // 欠損を埋める（ごく簡易：前方の値 or 0）
    for(let i=0;i<elev.length;i++){
        if (!Number.isFinite(elev[i])) elev[i] = (i>0 && Number.isFinite(elev[i-1])) ? elev[i-1] : 0;
    }

    // Sobel/Horn 風 3x3 勾配
    const k = 1/(8*mpp);
    for(let y=1;y<h-1;y++){
        for(let x=1;x<w-1;x++){
            const z1=elev[idx(x-1,y-1)], z2=elev[idx(x,y-1)],   z3=elev[idx(x+1,y-1)];
            const z4=elev[idx(x-1,y  )], /*z5*/                z6=elev[idx(x+1,y  )];
            const z7=elev[idx(x-1,y+1)], z8=elev[idx(x,y+1)],   z9=elev[idx(x+1,y+1)];
            const dzdx = ((z3 + 2*z6 + z9) - (z1 + 2*z4 + z7)) * k;
            const dzdy = ((z7 + 2*z8 + z9) - (z1 + 2*z2 + z3)) * k;

            const nx = -dzdx, ny = -dzdy, nz = 1;
            const inv = 1/Math.sqrt(nx*nx + ny*ny + nz*nz);
            const nxd = nx*inv, nyd = ny*inv, nzd = nz*inv;
            let s = nxd*lx + nyd*ly + nzd*lz; // -1..1
            s = Math.max(0, s);               // 0..1
            shade[idx(x,y)] = s;
        }
    }
    // 端の埋め
    for(let x=0;x<w;x++){ shade[idx(x,0)]=shade[idx(x,1)]; shade[idx(x,h-1)]=shade[idx(x,h-2)]; }
    for(let y=0;y<h;y++){ shade[idx(0,y)]=shade[idx(1,y)]; shade[idx(w-1,y)]=shade[idx(w-2,y)]; }
    return shade;
}

// ===== メイン：プロトコル登録 =====
export function registerDemTintProtocol(maplibregl, { schemeId='demtint' } = {}) {

    async function action(params, abortController) {
        const rawUrl = params.url.replace(/^demtint:\/\//, '');
        const qs     = parseQS(rawUrl);
        const styleKey = qs.style || '';
        const palette  = PALETTE_REG.get(styleKey);

        // パレット未登録なら安全に抜ける（薄いグレーで返す）
        if (!palette) {
            const res = await fetch(rawUrl, { signal: abortController.signal });
            const blob = await res.blob();
            const bmp  = (self.createImageBitmap)
                ? await createImageBitmap(blob)
                : await new Promise((resolve)=>{ const img=new Image(); img.onload=()=>resolve(img); img.src=URL.createObjectURL(blob); });

            const w=bmp.width, h=bmp.height;
            let cvs, ctx;
            try { cvs = new OffscreenCanvas(w,h); ctx=cvs.getContext('2d'); }
            catch { cvs=document.createElement('canvas'); cvs.width=w; cvs.height=h; ctx=cvs.getContext('2d'); }
            ctx.drawImage(bmp,0,0);
            const id=ctx.getImageData(0,0,w,h), d=id.data;
            for(let i=0;i<d.length;i+=4){ d[i]=d[i+1]=d[i+2]=215; d[i+3]=255; }
            ctx.putImageData(id,0,0);
            const out = cvs.convertToBlob ? await cvs.convertToBlob({type:'image/png'}) : await new Promise(r=>cvs.toBlob(r,'image/png'));
            return { data: await out.arrayBuffer() };
        }

        // 元タイル取得
        const res  = await fetch(rawUrl, { signal: abortController.signal });
        const blob = await res.blob();

        // 画像→Canvas
        const bmp = (self.createImageBitmap)
            ? await createImageBitmap(blob)
            : await new Promise((resolve)=>{ const img=new Image(); img.onload=()=>resolve(img); img.src=URL.createObjectURL(blob); });

        const w=bmp.width, h=bmp.height;
        let cvs, ctx;
        try { cvs = new OffscreenCanvas(w,h); ctx = cvs.getContext('2d'); }
        catch { cvs = document.createElement('canvas'); cvs.width=w; cvs.height=h; ctx=cvs.getContext('2d'); }

        ctx.drawImage(bmp,0,0);
        const id = ctx.getImageData(0,0,w,h);
        const d  = id.data;

        // 1) 標高デコード（m）を配列に確保（陰影用にも使う）
        const elev = new Float32Array(w*h);
        for (let p=0, i=0; i<d.length; i+=4, p++){
            const dec = decodeElevationRGBA(d[i], d[i+1], d[i+2], d[i+3]);
            elev[p] = dec.ok ? dec.elev : NaN;
        }

        // 2) パレットで色塗り（絶対標高：0m以上=陸、0m未満=海）
        const aDom = palette.aboveDomain, aRan = palette.aboveRange;
        const bDom = palette.belowDomain, bRan = palette.belowRange;
        for (let p=0, i=0; i<d.length; i+=4, p++){
            const z = elev[p];
            if (!Number.isFinite(z)) { d[i+3]=0; continue; } // 欠損は透明
            let rgb;
            if (z >= 0) {
                rgb = pickStepColor(z, aDom, aRan);
            } else {
                rgb = pickStepColor(-z, bDom, bRan); // 海は“深さ”
            }
            d[i] = rgb.r; d[i+1] = rgb.g; d[i+2] = rgb.b; d[i+3] = 255;
        }

        // 3) （おすすめ）マイクロ陰影：URLパラメータでON
        //    ?shade=soft&sa=0.25&az=315&alt=45
        const shadeMode = (qs.shade||'').toLowerCase();
        const sa = Math.max(0, Math.min(1, +qs.sa || 0)); // 強さ
        if (shadeMode === 'soft' && sa > 0) {
            const {z, y} = parseZXY(rawUrl);
            const mpp = metersPerPixel(z, y || 0);
            const shade = buildSoftShade(elev, w, h, mpp, +qs.az||315, +qs.alt||45);

            // 乗算系で ±30% * sa までの微調整
            for (let p=0, i=0; i<d.length; i+=4, p++){
                if (d[i+3] === 0) continue;
                const f = 1.0 + (shade[p]-0.5) * 2 * sa * 0.3; // 0.7〜1.3レンジ
                d[i]   = clamp255(d[i]  * f);
                d[i+1] = clamp255(d[i+1]* f);
                d[i+2] = clamp255(d[i+2]* f);
            }
        }

        // 完了
        ctx.putImageData(id,0,0);
        const out = cvs.convertToBlob
            ? await cvs.convertToBlob({type:'image/png'})
            : await new Promise(r=>cvs.toBlob(r,'image/png'));
        return { data: await out.arrayBuffer() };
    }

    function clamp255(v){ return Math.max(0, Math.min(255, Math.round(v))); }

    try { maplibregl.addProtocol(schemeId, action); } catch(_) { /* 二重登録は無視 */ }
}
