const { createProxyMiddleware } = require('http-proxy-middleware');

// NOTE: define some proxy targets for the development server

module.exports = function(app) {
    app.use(
        '/results',
        createProxyMiddleware({
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
        })
    );
    app.use(
        '/logfiles',
        createProxyMiddleware({
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
        })
    )
    app.use(
        '/hydracore_docs',
        createProxyMiddleware({
            target: 'http://127.0.0.1:8000',
            changeOrigin: true,
        })
    );
;
};