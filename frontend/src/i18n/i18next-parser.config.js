module.exports = {
    locales: ['en', 'de'],
    output: 'src/i18n/$LOCALE/$NAMESPACE.json',
    defaultNamespace: 'translation',
    ts: [{
      lexer: 'JavascriptLexer',
      functions: ['t'], // Array of functions to match
    }],
    tsx: [{
      lexer: 'JsxLexer',
      functions: ['t'], // Array of functions to match
    }],
    useKeysAsDefaultValue: true,
    sort: true,
    nsSeparator: false,
    keySeparator: false,
}