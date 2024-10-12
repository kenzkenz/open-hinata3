const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
    configureWebpack: {
        module: {
            rules: [
                {
                    test: /\.geojson$/,
                    loader: 'json-loader'
                }
            ]
        }
    },
    pwa: {
        iconPaths: {
            favicon32: 'favicon.ico',
        }
    },
    publicPath: process.env.NODE_ENV === 'production' ? '' : '',
    outputDir:'./docs', // ファイルの出力先ルート
    chainWebpack: config => {
        config.module.rules.delete('eslint');
    },
    transpileDependencies: true,
    pluginOptions: {
        vuetify: {
            // https://github.com/vuetifyjs/vuetify-loader/tree/next/packages/vuetify-loader
        }
    }
})
