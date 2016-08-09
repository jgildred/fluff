
// APP LAUNCHER
// 
// Will try to load test_config.js if exists, otherwise Fluff will load config.js

var app  = require('./app'),
    path = __dirname + '/test_config.js',
    fs   = require('fs'),
    config = null;
fs.exists(path, function (exists) {
    if (exists) {
        console.log('info: Found test config.');
        config = require('./test_config').config;
        app.launch(config);
    }
    else {
        app.launch(config);
    }
});
