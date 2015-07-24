
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

        reply.content (domain);
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
