
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
var Exacter      = require ('./lib/Exacter');

var GetSession   = require ('./lib/ControlActions/GetSession');
var PostSession  = require ('./lib/ControlActions/PostSession');
var PostEvent    = require ('./lib/ControlActions/PostEvent');
var GetConfig    = require ('./lib/ControlActions/GetConfig');
var PutConfig    = require ('./lib/ControlActions/PutConfig');
var RootActions  = require ('./lib/ControlActions/root');
var AccountActions  = require ('./lib/ControlActions/account');
var SessionActions  = require ('./lib/ControlActions/session');
var DomainActions  = require ('./lib/ControlActions/domain');
var PermitActions  = require ('./lib/ControlActions/permit');
var ConfirmActions  = require ('./lib/ControlActions/confirm');

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
    databaseName:               "sublayer",
    applicationName:            "sublayer",
    domainCollectionName:       "Domain",
    userCollectionName:         "User",
    usernameCollectionName:     "Username",
    clientCollectionName:       "Client",
    confirmationCollectionName: "Confirm",
    notificationCollectionName: "Notice",
    invoicesCollectionName:     "Invoice",
    actionDefaults:             {},
    domainCacheLength:          2048,
    domainCacheTimout:          1000 * 60
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
    this.exacter = new Exacter (this, this.config);
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

    this.adminRouter.addAction ('GET', 'user_session', GetSession);
    this.adminRouter.addAction ('POST', 'user_session', PostSession);
    this.adminRouter.addAction ('POST', 'event', PostEvent);
    this.adminRouter.addAction ('GET', 'config', GetConfig);
    this.adminRouter.addAction ('PUT', 'config', PutConfig);
    this.adminRouter.addAction ('GET', new RegExp ('/account/([\\w\\-_]+)$'), AccountActions.GET);
    this.adminRouter.addAction ('PUT', new RegExp ('/account/([\\w\\-_]+)$'), AccountActions.PUT);
    this.adminRouter.addAction ('POST', 'account', AccountActions.POST);
    this.adminRouter.addAction ('POST', 'session', SessionActions.POST);
    this.adminRouter.addAction ('DELETE', 'session', SessionActions.DELETE);
     // we can't DELETE from a form, so let's make an RPC-style handler as well
    this.adminRouter.addAction ('GET', 'logout', SessionActions.DELETE);
    this.adminRouter.addAction ('GET', new RegExp ('/domain/([\\w\\-_]+)$'), DomainActions.GET);
    this.adminRouter.addAction ('PUT', new RegExp ('/domain/([\\w\\-_]+)$'), DomainActions.PUT);
    this.adminRouter.addAction ('POST', 'domain', DomainActions.POST);
    this.adminRouter.addAction ('GET', new RegExp ('/permit/([\\w\\-_]+)$'), PermitActions.GET);
    this.adminRouter.addAction ('POST', new RegExp ('/permit/([\\w\\-_]+)$'), PermitActions.POST);
    this.adminRouter.addAction ('DELETE', new RegExp ('/permit/([\\w\\-_]+)/([\\w\\-_]+)$'), PermitActions.DELETE);
    this.adminRouter.addAction ('GET', new RegExp ('/confirm/([\\w\\-_]+)$'), ConfirmActions.GET);
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
        async.parallel ([
            function (callback) {
                Database.collection (self.config.domainCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.DomainCollection = collection;
                    callback();
                });
            },
            function (callback) {
                Database.collection (self.config.userCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.UserCollection = collection;
                    callback();
                });
            },
            function (callback) {
                Database.collection (self.config.usernameCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.UsernameCollection = collection;
                    callback();
                });
            },
            function (callback) {
                Database.collection (self.config.clientCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.ClientCollection = collection;
                    callback();
                });
            },
            function (callback) {
                Database.collection (self.config.confirmationCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.ConfirmationCollection = collection;
                    callback();
                });
            },
            function (callback) {
                Database.collection (self.config.notificationCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.NotificationCollection = collection;
                    callback();
                });
            },
            function (callback) {
                Database.collection (self.config.invoiceCollectionName, function (err, collection) {
                    if (err) {
                        self.logger.fatal (err);
                        return process.exit (1);
                    }
                    self.InvoiceCollection = collection;
                    callback();
                });
            }
        ], function(){
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
