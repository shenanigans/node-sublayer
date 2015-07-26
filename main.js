
var util         = require ('util');
var EventEmitter = require ('events').EventEmitter;
var os           = require ('os');
var async        = require ('async');
var MongoDB      = require ('mongodb');
var submergence  = require ('submergence');
var substation   = require ('substation');
var filth        = require ('filth');
var cachew       = require ('cachew');
var Gateway      = require ('./lib/Gateway');
var Action       = require ('./lib/Action');

var GetSession   = require ('./lib/ControlActions/GetSession');
var PostSession  = require ('./lib/ControlActions/PostSession');
var PostEvent    = require ('./lib/ControlActions/PostEvent');
var GetConfig    = require ('./lib/ControlActions/GetConfig');
var PutConfig    = require ('./lib/ControlActions/PutConfig');
var RootActions  = require ('./lib/ControlActions/root');

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
    domainCollectionName:   "Domain",
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

    this.config = filth.clone (submergence.DEFAULT_CONFIG);
    filth.merge (this.config, DEFAULT_CONFIG);
    filth.merge (this.config, config);

    this.server = new submergence (this.config);
    this.logger = this.server.logger;
    this.gateway = new Gateway (this, this.config, this.server);
    this.adminRouter = new substation.Router (this, this.config);
}
module.exports = sublayer;

sublayer.prototype.getDomain = function (domain, callback) {
    var cached;
    if (this.domainCache && ( cached = this.domainCache.get (domain) ))
        return callback (undefined, cached);

    var self = this;
    this.DomainCollection.findOne ({ domain:domain }, function (err, domainRecord) {
        if (err) {
            self.logger.error ({ domain:domain }, 'failed to look up domain');
            return callback (err);
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

        if (self.domainCache)
            self.domainCache.set (domain, domainRecord);

        callback (undefined, domainRecord);
    });
};

/**     @member/Function listen
@argument/Number port
@callback
    @argument/Error|undefined err
*/
sublayer.prototype.listen = function (port, adminPort, callback) {
    var self = this;

    if (this.config.domainCacheLength)
        this.domainCache = new cachew.ChainCache (
            this.config.domainCacheLength,
            this.config.domainCacheTimout
        );

    if (this.config.DomainCollection) {
        this.DomainCollection = this.config.DomainCollection;
        this.gateway.init (router, function(){
            self.server.listen (port, self.gateway, function(){
                self.server.listen (adminPort, self.adminRouter, callback);
            });
        });
        return;
    }

    this.adminRouter.addAction ('GET', 'session', GetSession);
    this.adminRouter.addAction ('POST', 'session', PostSession);
    this.adminRouter.addAction ('POST', 'event', PostEvent);
    this.adminRouter.addAction ('GET', 'config', GetConfig);
    this.adminRouter.addAction ('PUT', 'config', PutConfig);
    this.adminRouter.addAction ('GET', undefined, RootActions.GET);

    var Database = new MongoDB.Db (
        this.config.databaseName,
        new MongoDB.Server (this.config.databaseAddress, this.config.databasePort),
        { w:'majority', journal:true }
    );
    Database.open (function (err) {
        if (err) {
            self.logger.fatal (err);
            return;
        }
        Database.collection (self.config.domainCollectionName, function (err, collection) {
            if (err) {
                self.logger.fatal (err);
                return process.exit (1);
            }
            self.DomainCollection = collection;
            self.gateway.init (function(){
                self.server.listen (port, self.gateway, function(){
                    self.adminRouter.init (function(){
                        self.server.listen (adminPort, self.adminRouter, function(){
                            self.nodeInfo = {
                                port:       port,
                                adminPort:  adminPort,
                                hostname:   os.hostname()
                            };
                            callback();
                        });
                    });
                });
            });
        });
    });
};
