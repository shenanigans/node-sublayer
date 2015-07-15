
var crypto = require ('crypto');
var async = require ('async');
var likeness = require ('likeness');
var filth = require ('filth');

/**     @struct substation.Configuration

*/
var DEFAULT_CONFIG = {

};


/**     @module/class substation.Gateway
    @root

@argument/substation parent
@argument/substation.Configuration
*/
function Gateway (parent, config) {
    this.parent = parent;
    this.config = filth.clone (DEFAULT_CONFIG);
    filth.merge (this.config, config);

    this.actions = [];
}


/**     @member/Function init
    Prepare the Gateway to serve requests by running any setup functions on the configured Actions.
@callback
    @argument/Error|undefined err
*/
Gateway.prototype.init = function (callback) {
    var context = new likeness.helpers.JSContext();
    var self = this;
    async.each (this.actions, function (action, callback) {
        action.setup (self.parent, context, callback);
    }, function (err) {
        if (err) {
            self.parent.logger.fatal ('Action failed during setup', err);
            return process.exit (1);
        }
        async.each (self.actions, function (action, callback) {
            action.ready (context, callback);
        }, function (err) {
            if (err) {
                self.parent.logger.fatal ('Action failed during setup', err);
                return process.exit (1);
            }
            callback();
        });
    });
};


/**     @member/Function getDomain

@argument/String domain
@callback
*/
// Gateway.prototype.getDomain = function (domain, callback) {
//     var cached;
//     if (this.parent.domainCache && cached = this.parent.domainCache.get (domain))
//         return callback (cached);

//     var logger = this.parent.logger;
//     var cache = this.parent.domainCache;
//     this.parent.DomainsCollection.findOne ({ domain:domain }, function (err, domainRecord) {
//         if (err) {
//             logger.error ({ domain:domain }, 'failed to look up domain');
//             return callback();
//         }
//         if (!domainRecord)
//             return callback();

//         if (domainRecord.actions && domainRecord.actions.length) {
//             for (var i=0,j=domainRecord.actions.length; i<j; i++)
//                 domainRecord.actions[i] = new Action (
//                     domain,
//                     domainRecord.apiHash,
//                     domainRecord.actions[i]
//                 );
//         }

//         if (cache)
//             cache.set (domain, domainRecord);

//         callback (domainRecord);
//     });
// };


/**     @member/Function getAction
    Synchronously supplies the callback with the first matched route and selecting groups, if any.
@argument/Object path
    A url represntation object as produced by the standard `url` package.
@callback
    @argument/substation.Action|undefined action
    @argument/Array[String] params
        @optional
*/
Gateway.prototype.getAction = function (request, callback) {
    if (!Object.hasOwnProperty.call (request.headers, 'host'))
        return callback();

    this.parent.getDomain (request.headers.host, function (domain) {
        if (!domain)
            return callback();
        for (var i=0,j=this.actions.length; i<j; i++) {
            var action = this.actions[i];
            if (action.method && action.method != request.method)
                continue;
            if (!action.route)
                return callback (action, [ request.url ]);
            var match = action.route.exec (request.url);
            if (!match)
                continue;
            return callback (action, match.slice (1));
        }
        callback();
    });
};


/**     @member/Function getActionByName

*/
Router.prototype.getActionByName = function (name, callback) {
    callback();
};


/**     @member/Function configureActions

*/
Router.prototype.configureActions = function (config, callback) {
    callback();
};


/**     @member/Function getOptions
    Obtain a method list and documentation body for a request url, suitable for service of OPTIONS
    requests.
@argument/String path
*/
var NO_OPTIONS = {};
Gateway.prototype.getOptions = function (request, callback) {
    if (!Object.hasOwnProperty.call (request.headers, 'host'))
        return callback (NO_OPTIONS);

    this.parent.getDomain (request.headers.host, function (domain) {
        if (!domain)
            return callback (NO_OPTIONS);
        var methods = {};
        for (var i=0,j=this.actions.length; i<j; i++) {
            var action = this.actions[i];
            var method = action.method || 'GET';
            if (action.route && !action.route.exec (request.url))
                continue;
            if (Object.hasOwnProperty.call (methods, method))
                continue; // first action wins
            if (!action.querySchemaExport && !action.bodySchemaExport) {
                methods[method] = true;
                continue;
            }
            var doc = methods[method] = {};
            if (action.querySchemaExport)
                doc.query = action.querySchemaExport;
            if (action.bodySchemaExport)
                doc.body = action.bodySchemaExport;
            continue;
        }
        callback (methods);
    });
}


module.exports = Gateway;
