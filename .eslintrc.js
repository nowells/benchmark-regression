'use strict';

module.exports = {
    env: {
        node: true,
        commonjs: true,
        es6: true
    },
    'extends': ['eslint:recommended'],
    parserOptions: {
        ecmaVersion: 2018,
    },
    rules: {
        'no-console': ['off'],
        indent: ['error', 4, {SwitchCase: 1}],
    }
};
