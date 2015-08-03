
var util             = require ('util');
var EventEmitter     = require ('events').EventEmitter;
var os               = require ('os');
var async            = require ('async');
var MongoDB          = require ('mongodb');
var Handlebars       = require ('handlebars');
var submergence      = require ('submergence');
var substation       = require ('substation');
var filth            = require ('filth');
var cachew           = require ('cachew');
var Gateway          = require ('./lib/Gateway');
var Action           = require ('./lib/Action');
var Exacter          = require ('./lib/Exacter');

var GetSession       = require ('./lib/ControlActions/GetSession');
var PostSession      = require ('./lib/ControlActions/PostSession');
var PostEvent        = require ('./lib/ControlActions/PostEvent');
var GetConfig        = require ('./lib/ControlActions/GetConfig');
var PutConfig        = require ('./lib/ControlActions/PutConfig');
var RootActions      = require ('./lib/ControlActions/root');
var AccountActions   = require ('./lib/ControlActions/account');
var SessionActions   = require ('./lib/ControlActions/session');
var DomainActions    = require ('./lib/ControlActions/domain');
var PermitActions    = require ('./lib/ControlActions/permit');
var ConfirmActions   = require ('./lib/ControlActions/confirm');
var DomainPage       = require ('./lib/ControlActions/domainPage');
var NotificationPage = require ('./lib/ControlActions/notificationPage');
var InvoicePage      = require ('./lib/ControlActions/invoicePage');

// Handlebars helpers
Handlebars.registerHelper ('json', JSON.stringify);
Handlebars.registerHelper ('dnsRecordBlock', function (domain) {
    var subdomain = domain.requested.split ('.').slice (0, -2).join ('.');
    var str = 'name';
    for (var i=0,j=Math.max (2, subdomain.length-2); i<j; i++)
        str += ' ';
    str +=   'rr   text\n';
    str += subdomain;
    if (subdomain.length < 4)
        for (var i=0,j=4-subdomain.length; i<j; i++)
            str += ' ';
    str += '  TXT  sublayer.io=';
    str += domain._id;
    return str;
});
var BYTESIZE = {
    kilobytes:  1 << 8,
    megabytes:  1 << 16,
    gigabytes:  1 << 24,
    terabytes:  Math.pow (2, 32),
    petabytes:  Math.pow (2, 40)
};
var BYTE_SHORTS = {
    bytes:      'bytes',
    kilobytes:  'KB',
    megabytes:  'MB',
    gigabytes:  'GB',
    terabytes:  'TB',
    petabytes:  'PB'
};
function byteOrder (bytes) {
    var name = 'bytes';
    for (var order in BYTESIZE) {
        if (bytes < BYTESIZE[order])
            return name;
        name = order;
    }
    return name;
}
Handlebars.registerHelper ('bytesize', function (bytes) {
    var order = byteOrder (bytes);
    var display = String (bytes / BYTESIZE[order]);
    var dot = display.indexOf ('.');
    var dif;
    if (dot < 0)
        display += '.00';
    else if ((dif = display.length - dot) == 2)
        display += '0';
    else if (dif > 3)
        display = display.slice (0, dot + 3);

    var finalStr =
        display
      + '<span class="bytesize"><div class="tip">'
      + order
      + '</div>'
      + BYTE_SHORTS[order]
      + '</span>'
      ;
    return finalStr;
});
Handlebars.registerHelper ('cost', function (domain) {
    var cost = String (
        Math.max (0, Math.round (
            ( ( ( domain.bandwidth - 100000000 ) * 3 ) / 1000000000 )
          + ( ( domain.actions - 3000 ) / 200 )
          + ( ( domain.events - 1000 ) / 200 )
        ) ) / 100
    );
    var dot = cost.indexOf ('.');
    if (dot < 0)
        cost = '$' + cost + '.00';
    else if (cost.length - dot == 2)
        cost = '$' + cost + '0';
    else
        cost = '$' + cost;
    return cost;
});
Handlebars.registerHelper ('commas', function (number) {
    var str = String (number);
    for (var i=str.length - 3; i > 0; i-=3)
        str = str.slice (0, i) + ',' + str.slice (i);
    return str;
});

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
    invoiceCollectionName:      "Invoice",
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
    this.DomainCollection.findOne (
        { domain:domain, config:{ $exists:true } },
        function (err, domainRecord) {
            if (err) {
                self.logger.error ({ domain:domain }, 'failed to look up domain');
                return callback (err);
            }
            if (!domainRecord)
                return callback();

            if (domainRecord.config.actions && domainRecord.config.actions.length) {
                for (var i=0,j=domainRecord.config.actions.length; i<j; i++)
                    domainRecord.config.actions[i] = new Action (
                        domain,
                        domainRecord.apiHash,
                        domainRecord.config.actions[i]
                    );
            }

            if (self.domainCache)
                self.domainCache.set (domain, domainRecord);

            callback (undefined, domainRecord);
        }
    );
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
    this.adminRouter.addAction ('GET', new RegExp ('/domainPage/(\\d+)$'), DomainPage.GET);
    this.adminRouter.addAction ('GET', new RegExp ('/notificationPage/(\\d+)$'), NotificationPage.GET);
    this.adminRouter.addAction ('GET', new RegExp ('/invoicePage/(\\d+)$'), InvoicePage.GET);
    // GET root
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
