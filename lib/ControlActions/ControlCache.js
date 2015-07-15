
var filth = require ('filth');
var cachew = require ('cachew');

var KeysCollection;
var DEFAULT_CONFIG = {
    depth:  1024,
    time:   1000 * 30
};
function setup (keys, config) {
    KeysCollection = keys;

    this.config = filth.clone (DEFAULT_CONFIG);
    if (config)
        filth.merge (config, this.config);

    this.cache = new cachew.chainCache (this.config.depth, this.config.time);
}

function checkKey (key, callback) {
    var cached;
    if (cached = this.cache.get (key))
        return callback (undefined, cached);

    var cache = this.cache;
    KeysCollection.findOne ({ _id:key }, function (err, keyRec) {
        if (err)
            return callback (err);
        if (!keyRec)
            return callback (undefined, keyRec);
        cache.set (key, keyRec);
        callback (undefined, keyRec);
    });
}
