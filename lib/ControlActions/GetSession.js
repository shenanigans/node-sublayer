
var Action = require ('substation').Action;

function GetSession (station, agent, request, reply) {
    Layer.getDomain (request.query.domain, function (err, domain) {
        if (
            err
         || !domain
         || domain.apiKey != request.query.apiKey
        ) {
            reply.done ('403');
            return;
        }

        station.isActive (
            request.query.domain,
            request.query.user,
            request.query.client,
            function (err, isActive) {
                if (err) {
                    reply.done ('403');
                    return;
                }
                reply.done (isActive ? '200' : '204');
            }
        );
    });
}

var Layer;
module.exports = new Action ({
    route:          '^/session$',
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
            },
            user:           {
                type:           'string',
                maxLength:      64
            },
            client:         {
                type:           'string',
                maxLength:      64
            }
        },
        required:   [ 'apiKey', 'user' ]
    },
    rejectBody:     true,
    setup:          function (layer, context, callback) {
        Layer = layer;
        callback();
    }
}, GetSession);
