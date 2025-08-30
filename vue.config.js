const { defineConfig } = require('@vue/cli-service')
const webpack = require('webpack')
module.exports = defineConfig({
    pages: {
        index: {
            entry: 'src/main.js',
            template: 'public/index.html',
            filename: 'index.html'
        },
        join: {
            entry: 'src/join/main.js',
            template: 'public/join.html',
            filename: 'join.html'
        }
    },
    transpileDependencies: ['vuetify'],
    pwa: {
        name: 'Open-Hinata3',
        themeColor: '#f5f5f5',
        manifestOptions: {
            theme_color: '#f5f5f5',
            background_color: '#f5f5f5',
            display: 'standalone',
            icons: [
                { src: 'img/icons/oh192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
                { src: 'img/icons/oh512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
                { src: 'img/icons/oh192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
                { src: 'img/icons/oh512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
            ]
        },
        iconPaths: {
            favicon32: 'favicon.ico',
        },
        workboxPluginMode: "InjectManifest", // カスタム Service Worker を使用
        workboxOptions: {
            swSrc: "./src/service-worker.js", // カスタム Service Worker のソースファイル
            swDest: "service-worker.js", // ビルド後の出力先
            exclude: [
                /_redirects/,
                /\.html$/            // ← これを追加（index.html / join.html を precache しない）
            ],
        },
    },
    configureWebpack: {
        plugins: [
            new webpack.DefinePlugin({
                __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false) // または true
            })
        ],
        module: {
            rules: [
                {
                    test: /\.geojson$/,
                    loader: 'json-loader'
                }
            ]
        }
    },
    publicPath: process.env.NODE_ENV === 'production' ? '' : '',
    outputDir:'./docs', // ファイルの出力先ルート
    chainWebpack: config => {
        config.module.rules.delete('eslint');
    },
    // transpileDependencies: true,
    pluginOptions: {
        vuetify: {
            // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
        }
    }
})
