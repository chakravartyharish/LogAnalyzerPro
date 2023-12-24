// NOTE: it seems that "create-react-app" does not expose the webpack config
//       which we need to add some polyfills
//       => We therefore use "react-app-rewired" to give us more control over the configuration
//          (this module is used by the rewired crap to achieve that ... what a bs :-/ )
webpack = require("webpack")

module.exports = function override(config, env) {
    // customize the webpack config
    config.resolve.fallback = {
        "buffer": require.resolve('buffer/'),
        "os": require.resolve("os-browserify/browser"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "path": require.resolve("path-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "buffer": require.resolve("buffer/"),
        "url": require.resolve("url/"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert/"),
        "fs": false,
    }
    config.plugins.push(
        // NOTE: we have this to make a dependency of "dcrf-client" / "react-pdf" happy ... hipster JS FTW :-/
        new webpack.ProvidePlugin({
            // Make a global `process` variable that points to the `process` package,
            // because the `util` package expects there to be a global variable named `process`.
            // Thanks to https://stackoverflow.com/a/65018686/14239942
            "process": "process/browser",
            // Needed for react-pdf
            Buffer: ['buffer', 'Buffer']
        })
    )
    return config;
}