
var util         = require ('util');
var EventEmitter = require ('events').EventEmitter;
var bunyan       = require ('bunyan');
var async        = require ('async');
var submergence  = require ('submergence');
var filth        = require ('filth');
var cachew       = require ('cachew');
var Gateway      = require ('./lib/Gateway');

var GetSession   = require ('./ControlActions/GetSession');
var PostSession  = require ('./ControlActions/PostSession');
var PostEvent    = require ('./ControlActions/PostEvent');
var GetConfig    = require ('./ControlActions/GetConfig');
var PutConfig    = require ('./ControlActions/PutConfig');

/**     @struct sublayer.Configuration
    @super submergence.Configuration

@member/String databaseName
    @default `"sublayer"`
@member/String applicationName
    @default `"sublayer"`
@member/Object actionDefaults
    Default configuration options used for all Actions.
*/
var DEFAULT_CONFIG = {
    databaseName:           "sublayer",
    applicationName:        "sublayer",
    actionDefaults:         {},
    domainCacheLength:      2048,
    domainCacheTimout:      1000 * 60
};


/**     @module/class sublayer
    Realtime and peer to peer service layer.
@argument/.Configuration config
@returns/sublayer
    If the `new` keyword is not used, an instance is created and returned.
@event userOnline
@event clientOnline
@event userOffline
@event clientOffline
*/
function sublayer (config) {
    if (!(this instanceof sublayer))
        return new sublayer (config);

    this.config = filth.clone (DEFAULT_CONFIG);
    filth.merge (this.config, config);

    this.server = new submergence (this.config);
    this.logger = this.server.logger;
    this.gateway = new Gateway (this, this.config);
    this.controlRouter = new substation.Router (this.server, this.config);

    var self = this;
    this.getDomain = function (domain, callback) {
        var cached;
        if (self.cache && cached = self.cache.get (domain))
            return callback (cached);

        self.collection.findOne ({ domain:domain }, function (err, domainRecord) {
            if (err) {
                self.logger.error ({ domain:domain }, 'failed to look up domain');
                return callback();
            }
            if (!domainRecord)
                return callback();

            if (domainRecord.actions && domainRecord.actions.length) {
                for (var i=0,j=domainRecord.actions.length; i<j; i++)
                    domainRecord.actions[i] = new Action (
                        domain,
                        domainRecord.apiHash,
                        domainRecord.actions[i]
                    );
            }

            if (self.cache)
                self.cache.set (domain, domainRecord);

            callback (domainRecord);
        });
    };
}
module.exports = sublayer;

/**     @member/Function listen
@argument/Number port
@callback
    @argument/Error|undefined err
*/
sublayer.prototype.listen = function (port, controlPort, callback) {
    if (this.config.domainCacheLength)
        this.cache = new cachew.ChainCache (
            this.config.domainCacheLength,
            this.config.domainCacheTimout
        );

    var self = this;
    self.gateway.init (router, function(){
        self.server.listen (port, self.gateway, function(){
            self.server.listen (controlPort, self.controlRouter, callback);
        });
    });
};
