// ============================================================
// demtint プロトコル（グローバル不要版）
// 使い方: アプリ初期化時に一度だけ
//   registerDemTintProtocol(maplibregl, { getState: () => store.state.demTint })
// これで action() が常に store の現在値を参照します。
// ============================================================
export function registerDemTintProtocol(maplibregl, { schemeId='demtint', getState } = {}) {
    // デフォパレット（storeが未用意でも動く用）
    const DEFAULT = {
        mode: 'step',
        level: 0,
        palette: {
            aboveDomain:[0,2,5,10,20,35,60,90,130,200,300,450,700,1100,1600,2200,3000,3600],
            aboveRange:['#eaf7e3','#dbf0d1','#c7e6b3','#aede95','#95d27a','#7ec663','#cfc48e','#d7bc82','#dfb376','#e4a768','#d99759','#c88749','#b2733e','#9a6034','#84542d','#bfbfbf','#eaeaea','#ffffff'],
            belowDomain:[0,1,2,3,5,8,12,20,35,60,100,160,260,420,650,1000,1600,2500],
            belowRange:['#eaf6ff','#d7eeff','#c3e5ff','#b0dcff','#9bd1ff','#86c6ff','#71bbff','#5aafff','#439fff','#2f8fe0','#217fcb','#1a70b6','#145fa0','#0f4f8a','#0b416f','#08365b','#072b46','#051f34']
        }
    };

    const hexToRgb = (h)=>{ const s=h.replace('#',''); const v=parseInt(s.length===3?s.split('').map(x=>x+x).join(''):s,16);
        return {r:(v>>16)&255,g:(v>>8)&255,b:v&255}; };
    const stepColor = (domain, range, v)=>{
        if (!domain?.length || !range?.length) return {r:0,g:0,b:0};
        const min=domain[0], max=domain[domain.length-1];
        const vv = Math.max(min, Math.min(max, v));
        let i=0; while (i<domain.length-1 && vv >= domain[i+1]) i++;
        const col = range[i] || '#000000';
        return typeof col==='string' ? hexToRgb(col) : col;
    };
    const parseQS = (u)=>{ const q={}, m=u.match(/\?(.*)$/); if(!m) return q;
        for (const kv of m[1].split('&')){ const [k,v]=kv.split('='); if(!k) continue; q[decodeURIComponent(k)]=v?decodeURIComponent(v):''; }
        return q;
    };

    async function action(params, abortController){
        // URL と ?level 取得
        const raw  = params.url.replace(/^demtint:\/\//,'');
        const qs   = parseQS(raw);
        const url  = raw.replace(/\?.*$/,'');
        const st   = (typeof getState === 'function' ? getState() : null) || DEFAULT;
        const pal  = st.palette || DEFAULT.palette;
        const lvl  = Number.isFinite(+qs.level) ? +qs.level : (st.level ?? 0);

        // タイル取得
        const res  = await fetch(url, { signal: abortController.signal });
        const blob = await res.blob();

        // 画像→Canvas
        const bmp = (self.createImageBitmap)
            ? await createImageBitmap(blob)
            : await new Promise(r=>{ const img=new Image(); img.onload=()=>r(img); img.src=URL.createObjectURL(blob); });

        const w=bmp.width, h=bmp.height;
        let cvs, ctx;
        try { cvs = new OffscreenCanvas(w,h); ctx = cvs.getContext('2d', { willReadFrequently:true }); }
        catch { cvs = document.createElement('canvas'); cvs.width=w; cvs.height=h; ctx=cvs.getContext('2d'); }

        ctx.imageSmoothingEnabled = false; // ドット最優先
        ctx.drawImage(bmp,0,0);

        const id = ctx.getImageData(0,0,w,h);
        const d  = id.data;
        const TH = 0x7F0000; // 8323072 (OL 準拠)

        const { aboveDomain, aboveRange, belowDomain, belowRange } = pal;

        for (let i=0;i<d.length;i+=4){
            if (d[i+3] === 0) continue; // NoData
            let raw = (d[i]<<16) + (d[i+1]<<8) + d[i+2];
            if (raw === 0x800000){ d[i+3]=0; continue; } // NoData
            if (raw >= TH) raw -= 16777216;              // 2の補数
            const elev = raw / 100.0;

            if (elev >= lvl){
                const depth = Math.max(0, Math.min(20000, Math.floor(elev - lvl)));
                const c = stepColor(aboveDomain, aboveRange, depth);
                d[i]=c.r; d[i+1]=c.g; d[i+2]=c.b; d[i+3]=255;
            } else {
                const depth = Math.max(0, Math.min(20000, Math.floor(lvl - elev)));
                const c = stepColor(belowDomain, belowRange, depth);
                d[i]=c.r; d[i+1]=c.g; d[i+2]=c.b; d[i+3]=255;
            }
        }

        ctx.putImageData(id,0,0);
        const out = cvs.convertToBlob ? await cvs.convertToBlob({type:'image/png'})
            : await new Promise(r=>cvs.toBlob(r,'image/png'));
        return { data: await out.arrayBuffer() };
    }

    try { maplibregl.addProtocol(schemeId, action); } catch(_) { /* 二重登録は無視 */ }
}