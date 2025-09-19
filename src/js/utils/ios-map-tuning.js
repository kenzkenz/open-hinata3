// ios-map-tuning.js
// MapLibre 5.7.x / Vue2/3 両対応のユーティリティ
// - store.state.isIOS を前提に iOS 時のみ軽量化・復帰動線を適用
// - 依存: maplibregl(MapLibre GL JS)

/**
 * iOS向け: WebGLコンテキスト喪失/復帰ハンドラと軽量化をまとめて適用
 * @param {maplibregl.Map} map
 * @param {Object} store - Vuex ストア（state.isIOS を読む）
 * @param {Object} [opts]
 * @param {string[]} [opts.heavyLayerIds] - iOSで不可視にしたい重いレイヤID群
 * @param {boolean} [opts.disable3D=true] - iOSで fill-extrusion 等の3Dを自動的に隠す
 * @param {boolean} [opts.reduceLabels=true] - 文字密度を下げる
 */
export function tuneMapForIOS(map, store, opts = {}){
    const isIOS = !!(store && store.state && store.state.isIOS);
    if(!isIOS || !map) return;

    const {
        heavyLayerIds = [],
        disable3D = true,
        reduceLabels = true,
    } = opts;

    // ===== 1) WebGL context lost / restored 対応 =====
    const canvas = map.getCanvas();
    if (!canvas.__oh3_gl_handlers_installed) {
        canvas.addEventListener('webglcontextlost', (e) => {
            try { e.preventDefault(); } catch(_){}
            // 復旧は restored に任せる
        }, { passive: true });

        canvas.addEventListener('webglcontextrestored', () => {
            // 軽い復帰（描画領域再計算）
            try { map.resize(); } catch(_){}
            // 必要なら setTimeout で再レイヤ適用など追加
        }, { passive: true });

        // ページ可視性の変化で一時停止/再開（iOSの復帰時クラッシュ軽減）
        const onVis = () => {
            try{
                if (document.hidden) { map.pause && map.pause(); }
                else { map.resume && map.resume(); map.triggerRepaint && map.triggerRepaint(); }
            }catch(_){}
        };
        document.addEventListener('visibilitychange', onVis, { passive: true });

        canvas.__oh3_gl_handlers_installed = true;
        canvas.__oh3_gl_onVis = onVis;
    }

    // ===== 2) iOS向け軽量化（ロード後に実行） =====
    const applyLightweight = () => {
        try {
            const style = map.getStyle && map.getStyle();
            if(!style || !style.layers) return;

            // 2-1) 3D系を不可視化
            if (disable3D) {
                style.layers.forEach(l => {
                    if (l.type === 'fill-extrusion' || l.type === 'hillshade') {
                        if (map.getLayer(l.id)) map.setLayoutProperty(l.id, 'visibility', 'none');
                    }
                });
            }

            // 2-2) 重い指定レイヤを不可視化
            heavyLayerIds.forEach(id => {
                if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
            });

            // 2-3) 文字密度の削減（symbol の text-size を少し抑える）
            if (reduceLabels) {
                style.layers.forEach(l => {
                    if (l.type === 'symbol' && map.getLayer(l.id)) {
                        try {
                            const baseSize = map.getLayoutProperty(l.id, 'text-size');
                            // 既存の text-size を少しだけ縮小（式にも対応）
                            const smaller = ['case',
                                ['has', 'zoom'],
                                ['max', 10, ['-', ['get', 'zoom'], 0.5]], // ほぼダミー（互換用）
                                baseSize ? ['*', toExpression(baseSize), 0.9] : 12
                            ];
                            map.setLayoutProperty(l.id, 'text-size', smaller);
                        } catch(_){}
                    }
                });
            }
        } catch(_){}
    };

    if (map.isStyleLoaded && map.isStyleLoaded()) applyLightweight();
    else map.once('load', applyLightweight);
}

/**
 * 可能なら既存の値を式に包む簡易ヘルパ（最小限の安全対策）
 */
function toExpression(v){
    if (Array.isArray(v)) return v; // すでに式
    if (typeof v === 'number') return ['literal', v];
    return ['coalesce', v, 12];
}

/**
 * Map を安全に破棄
 */
export function disposeMap(map){
    if(!map) return;
    try { map.remove(); } catch(_){}
}

/**
 * move/drag 等にぶら下げる自前ハンドラをまとめて登録・解除するユーティリティ。
 * iOS では過剰なリスナがリークや負荷悪化につながるため一極管理を推奨。
 */
export function attachManagedHandlers(map, handlers){
    // handlers: [{ type: 'move', fn, opts }, ...]
    if(!map || !handlers) return () => {};
    handlers.forEach(h => {
        try{ map.on(h.type, h.fn, h.opts || {}); }catch(_){ }
    });
    return () => {
        handlers.forEach(h => {
            try{ map.off(h.type, h.fn); }catch(_){ }
        });
    };
}


// -----------------------------------------------
// App.vue（またはマップ初期化箇所）への組み込み例
// -----------------------------------------------
/*
<template>
  <div id="map" class="map"></div>
</template>

<script>
import maplibregl from 'maplibre-gl';
import { tuneMapForIOS, attachManagedHandlers, disposeMap } from './ios-map-tuning';

export default {
  name: 'MapRoot',
  data(){
    return { map: null, detachHandlers: null };
  },
  mounted(){
    this.initMap();
  },
  beforeUnmount(){
    if (this.detachHandlers) this.detachHandlers();
    disposeMap(this.map); this.map = null;
  },
  methods: {
    initMap(){
      const isIOS = this.$store.state.isIOS;

      // iOS 向けにアンチエイリアスは切って安全側へ
      const map = new maplibregl.Map({
        container: 'map',
        style: 'https://your/style.json',
        antialias: false,
        // ここで iOS 向けの他オプションを追加するならこの位置で
      });

      // iOS 向けチューニング適用（重いレイヤIDはあなたのスタイルに合わせて）
      tuneMapForIOS(map, this.$store, {
        heavyLayerIds: [
          // 例: 'oh-dem-tint', 'hillshade', 'population-3d-extrusion',
        ],
        disable3D: true,
        reduceLabels: true,
      });

      // （例）自前リスナを一括管理（あとで off できるように）
      const detach = attachManagedHandlers(map, [
        { type: 'move', fn: this.onMovePassive },
      ]);

      this.map = map;
      this.detachHandlers = detach;
    },

    onMovePassive(){
      // 重い処理は入れない。必要なら requestAnimationFrame / throttle
    }
  }
}
</script>

<style scoped>
.map{ position: absolute; inset: 0; }
</style>
*/
