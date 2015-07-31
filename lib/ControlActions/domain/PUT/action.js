
var dns = require ('dns');
var Action = require ('substation').Action;

var DomainCollection;
module.exports = new Action ({
    Authentication: {
        isLoggedIn:     true,
        isDomestic:     true
    },
    bodySchema:     {
        properties:     {
            confirmed:      {
                type:           'boolean',
                equals:         true
            }
        }
    },
    setup:          function (station, config, callback) {
        DomainCollection = station.DomainCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    // look up the current state of the Domain
    DomainCollection.findOne ({ _id:request.params[0] }, function (err, domainRec) {
        if (err)
            return reply.done (502);

        if (request.body.confirmed && !domainRec.confirmed)
            return dns.resolveTXT (domainRec.requested, function (err, records) {
                if (err) {
                    // could not resolve DNS

                }

                var fullStr = 'sublayer-id='+domainRec._id;
                var found = false;
                for (var i=0,j=records.length; i<j; i++)
                    if (records[i][0] == fullStr) {
                        found = true;
                        break;
                    }
                if (!found) {
                    // DNS confirm flag record not found
                    reply.content ({
                        error:  "Confirmation was not found in the domain's DNS configuration."
                                  + " It may take up to 24 hours for DNS updates to propagate."
                    });
                    reply.done (400);
                    return;
                }

                // mark domain as confirmed
                var update = { confirmed:true, domain:domainRec.requested };
                if (request.body.active)
                    update.active = true;
                DomainCollection.update ({ _id:request.params[0] }, update, function (err) {

                });
            });

        if (!domainRec.confirmed) {
            reply.content ({
                error:"You must confirm ownership of this domain before configuring it."
            });
            reply.done (403);
            return;
        }

        if (request.body.active && !domainRec.active)
            return DomainCollection.update (
                { _id:request.params[0] },
                { $set:{ active:true } },
                function (err) {
                    if (err)
                        return reply.done (502);
                    reply.done();
                }
            );
    });
});
