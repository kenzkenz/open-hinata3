const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
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
