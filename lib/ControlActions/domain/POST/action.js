
var crypto = require ('crypto');
var async = require ('async');
var infosex = require ('infosex');
var uid = infosex.uid.craft;
var session = infosex.session.craft;
var Action = require ('substation').Action;

var MAX_DOMAINS = 256;

var DomainCollection;
module.exports = new Action ({
    Authentication: {
        isLoggedIn:     true,
        isDomestic:     true
    },
    bodySchema:     {
        properties:     {
            domain:         {
                type:           'string',
                pattern:        '^[^\\.]+(?:\\.[^\\.]+)+',
                minLength:      6
            }
        },
        required:       [ 'domain' ]
    },
    setup:          function (station, config, callback) {
        DomainCollection = station.DomainCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    var domainName = request.body.domain;

    async.parallel ([
        function (callback) {
            DomainCollection.find (
                { owner:agent.user },
                function (err, cursor) {
                    if (err)
                        return reply.done (502);
                    cursor.count (function (err, numDomains) {
                        if (err)
                            return reply.done (502);
                        if (numDomains >= MAX_DOMAINS) {
                            reply.content ({ error:"Cannot create more than "+MAX_DOMAINS+" domains." });
                            reply.done (400);
                            return callback (true);
                        }
                        callback();
                    });
                }
            );
        },
        function (callback) {
            DomainCollection.findOne (
                { $or:[
                    { domain:domainName, confirmed:true },
                    { requested:domainName, owner:agent.user }
                ] },
                function (err, existing) {
                    if (err) {
                        reply.done (502);
                        return callback (true);
                    }
                    if (!existing)
                        return callback();

                    if (existing.owner == agent.user)
                        reply.content ({ error:"You have already registered this domain" });
                    else
                        reply.content ({ error:"That domain is already registered to another account" });
                    reply.done ('409');
                    callback (true);
                }
            );
        }
    ], function (err) {
        if (err)
            // reply already handled
            return;

        var domainID, apiKey;
        async.parallel ([
            function (callback) {
                uid (function (newID) {
                    domainID = newID;
                    callback();
                });
            },
            function (callback) {
                session (function (newID) {
                    apiKey = newID;
                    callback();
                });
            }
        ], function(){
            var hasher = crypto.createHash ('sha256');
            hasher.update (apiKey);
            hasher.update ('~substation~');
            hasher.update (domainName);
            var newDomain = {
                _id:        domainID,
                apiKey:     apiKey,
                apiHash:    hasher.digest ('base64'),
                owner:      agent.user,
                requested:  domainName,
                bandwidth:  0,
                actions:    0,
                events:     0
            };

            DomainCollection.insert (newDomain, function (err) {
                if (err)
                    return reply.done (502);
                reply.content (newDomain);
                reply.event ('domainStatus', domainName, 'not confirmed');
                reply.done (200);
            });
        });
    })
});
