
var infosex = require ('infosex');
var Action = require ('substation').Action;

function GetConfig (station, agent, request, reply) {
    Layer.getDomain (request.query.domain, function (err, domain) {
        if (
            err
         || !domain
         || domain.apiKey != request.query.apiKey
        ) {
            reply.done ('403');
            return;
        }

        if (domain.config) {
            domain.config._id = domain._id;
            reply.content (domain.config);
        } else
            reply.content ({ _id:domain._id });
        reply.done();
    });
}

var Layer;
module.exports = new Action ({
    route:          '^/config(?:/([\w\d]{'+infosex.uid.keyLength+'}))?$',
    method:         'GET',
    querySchema:    {
        properties:     {
            apiKey:         {
                type:           'string',
                minLength:      32,
                maxLength:      128
            },
            domain:         {
                type:           'string',
                maxLength:      255
            }
        },
        required:   [ 'apiKey', 'domain' ]
    },
    rejectBody:     true,
    setup:          function (layer, context, callback) {
        Layer = layer;
        callback();
    }
}, GetConfig);
