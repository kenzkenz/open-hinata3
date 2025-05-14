const eslint = require('@eslint/js');
const importPlugin = require('eslint-plugin-import');
const globals = require('globals');

module.exports = [
    eslint.configs.recommended,
    {
        plugins: {
            import: importPlugin,
        },
        languageOptions: {
            ecmaVersion: 2018,
            sourceType: 'module',
            globals: {
                ...globals.es6,
                ...globals.node,
            },
        },
        rules: {
            ...importPlugin.configs.recommended.rules,
            'no-console': 'off',
            'no-unused-vars': ['error', { vars: 'all', args: 'after-used', ignoreRestSiblings: false }],
        },
    },
];

