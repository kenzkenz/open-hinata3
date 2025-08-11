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
        iconPaths: {
            favicon32: 'favicon.ico',
        },
        workboxPluginMode: "InjectManifest", // カスタム Service Worker を使用
        workboxOptions: {
            swSrc: "./src/service-worker.js", // カスタム Service Worker のソースファイル
            swDest: "service-worker.js", // ビルド後の出力先
            exclude: [/_redirects/], // キャッシュから除外するファイル
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
