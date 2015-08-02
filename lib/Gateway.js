
var crypto = require ('crypto');
var http = require ('http');
var https = require ('https');
var url = require ('url');
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
function Gateway (parent, config, server) {
    this.parent = parent;
    this.config = filth.clone (DEFAULT_CONFIG);
    filth.merge (this.config, config);

    this.actions = [];

    var self = this;
    function forwardEvent (domain, event, info, callback) {
        self.parent.getDomain (domain, function (err, domainRecord) {
            if (!domainRecord) {
                if (callback)
                    return process.nextTick (function(){ callback(); });
                return;
            }

            // is the remote actually listening?
            if (!domainRecord.events || !Object.hasOwnProperty.call (domainRecord.events, event)) {
                if (callback)
                    process.nextTick (callback);
                return;
            }
            var options = filth.clone (domainRecord.events[event]);

            var tech;
            if (!self.config.tls)
                tech = http;
            else {
                tech = https;
                if (self.config.tls instanceof Buffer)
                    options.cert = self.config.tls;
            }
            var eventBodyStr = JSON.stringify (info);
            options.headers = {
                'X-Substation-Event':   event,
                'Content-Length':       Buffer.byteLength (eventBodyStr)
            };
            var remoteRequest = tech.request (options, function (response) {
                if (!callback) {
                    response.emit ('end');
                    return;
                }

                var chunks = [];
                response.on ('data', function (chunk) { chunks.push (chunk); });
                response.on ('error', function (err) { if (callback) callback (err); });
                response.on ('end', function(){
                    try {
                        var body = JSON.parse (Buffer.concat (chunks).toString());
                    } catch (err) {
                        callback (new Error ('remote service responded with invalid json'));
                        return;
                    }
                    if (response.statusCode == '200')
                        callback (undefined, body);
                    else
                        callback (body);
                });
            });
            remoteRequest.on ('error', function (err) {
                if (callback)
                    callback();
            });
            remoteRequest.write (eventBodyStr);
            remoteRequest.end();
        });
    }

    server.on ('userOnline', function (domain, user) {
        forwardEvent (domain, 'userOnline', { domain:domain, user:user });
    });
    server.on ('userOffline', function (domain, user) {
        forwardEvent (domain, 'userOffline', { domain:domain, user:user });
    });
    server.on ('clientOnline', function (domain, user, client) {
        forwardEvent (domain, 'clientOnline', { domain:domain, user:user, client:client });
    });
    server.on ('clientOffline', function (domain, user, client) {
        forwardEvent (domain, 'clientOffline', { domain:domain, user:user, client:client });
    });
    server.on ('peerRequest', function (domain, agent, peerInfo, connect) {
        forwardEvent (domain, 'peerRequest', {
            domain: domain,
            query:  peerInfo,
            agent:  agent.export()
        }, function (err, response) {
            if (err) {
                connect();
                return;
            }
            connect (response.user, response.client, response.info);
        });
    });
    server.on ('liveConnection', function (domain, agent, reply) {
        forwardEvent (domain, 'liveConnection', {
            domain: domain,
            agent:  agent.export()
        }, function (err, response) {
            if (err) {
                reply.done();
                return;
            }
            if (response) for (var i=0,j=response.length; i<j; i++)
                reply.event.apply (reply, response[i]);
            reply.done();
        });
    });
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


/**     @member/Function getAction
    Synchronously supplies the callback with the first matched route and selecting groups, if any.
@argument/Object path
    A url represntation object as produced by the standard `url` package.
@callback
    @argument/substation.Action|undefined action
    @argument/Array[String] params
        @optional
*/
Gateway.prototype.getAction = function (request, pathstr, callback) {
    if (!Object.hasOwnProperty.call (request.headers, 'host'))
        return callback();

    var logger = this.parent.logger;
    this.parent.getDomain (request.headers.host, function (err, domain) {
        if (err)
            return callback();
        if (!domain) {
            logger.warn ({ domain:domain }, 'unknown domain requested');
            return callback();
        }
        if (!domain.actions || !domain.actions.length)
            return callback();

        for (var i=0,j=domain.actions.length; i<j; i++) {
            var action = domain.actions[i];
            if (action.method && action.method != request.method)
                continue;
            if (!action.route)
                return callback (action, [ request.url ]);
            var match = action.route.exec (pathstr);
            if (!match)
                continue;
            var params = match.slice (1);
            for (var i=0,j=params.length; i<j; i++)
                params[i] = decodeURIComponent (params[i]);
            return callback (action, params);
        }

        callback();
    });
};


/**     @member/Function getActionByName

*/
Gateway.prototype.getActionByName = function (name, callback) {
    callback();
};


/**     @member/Function configureActions

*/
Gateway.prototype.configureActions = function (config, callback) {
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
