
var uid = require ('infosex').uid.craft;
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
                format:         'hostname'
            }
        },
        required:       [ 'domain' ]
    },
    setup:          function (station, config, callback) {
        DomainCollection = station.DomainCollection;
        callback();
    }
}, function (station, agent, request, reply) {
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
                    return;
                }

                // create the domain id
                uid (function (DID) {
                    var newDomain = {
                        _id:        DID,
                        requested:  request.body.domain
                    };

                    reply.content (newDomain);
                    reply.done (200);
                });
            });
        }
    );
});
