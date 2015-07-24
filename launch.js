#!/usr/bin/env node

var path = require ('path');
var fs = require ('graceful-fs');
// var likeness = require ('likeness');
var sublayer = require ('./main');

var argv = require ('minimist') (process.argv, {
    default:        { verbose:'info' },
    boolean:        [  ],
    string:         [ 'verbose', 'config', 'port', 'adminPort' ],
    alias:          { v:'verbose', c:'config', p:'port', a:'adminPort' }
});

var config;
if (!argv.config)
    config = {};
else {
    try {
        var configPath = path.resolve (process.cwd(), argv.config);
        var configStr = fs.readFileSync (configPath).toString();
    } catch (err) {
        console.log ('cannot resolve config file at '+argv.config);
        return process.exit (1);
    }

    try {
        var config = JSON.parse (configStr);
    } catch (err) {
        console.log ('config file was invalid json');
        console.log (err);
        return process.exit (1);
    }
}

// var context = new likeness.helpers.JSContext();
// context.compile (config, function (err, configValidator, metaschema) {
//     if (err) {
//         console.log ('unexpected error while compiling configuration validation schema');
//         console.log (err);
//         return process.exit (1);
//     }

//     try {
//         configValidator.validate (config);
//     } catch (err) {
//         console.log ('config file failed validation');
//         console.log (err);
//         return process.exit (1);
//     }

//     // etc
// });

var port = argv.port || config.port;
var adminPort = argv.adminPort || config.adminPort;
if (!port || !adminPort) {
    console.log ('both --port and --adminPort must be configured');
    return process.exit (1);
}

var layer = new sublayer (config);
layer.listen (port, adminPort, function (err) {
    if (err)
        return layer.logger.fatal (err);
    layer.logger.info (layer.nodeInfo, 'layer node online');
});
