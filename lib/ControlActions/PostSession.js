
var Action = require ('substation').Action;

function PostSession (station, agent, request, reply) {
    Layer.getDomain (request.domain, function (err, domain) {
        if (
            err
         || !domain
         || domain.apiKey != request.query.apiKey
        ) {
            reply.done (403);
            return;
        }

        function cleanup (err) {
            if (err) {
                reply.done (403);
                return;
            }
            reply.done();
        }

        switch (request.query.status) {
            case "offline":
                agent.logout (cleanup)
                break;
            case "idle":
                agent.setIdle (request.query.user, request.query.client, cleanup);
                break;
            default: // "active"
                agent.setActive (request.query.user, request.query.client, cleanup);
                break;
        }
    });
}

var Layer;
module.exports = new Action ({
    route:          '^/session$',
    method:         'POST',
    querySchema:    {
        properties:     {
            apiKey:         {
                type:           'string',
                minLength:      32,
                maxLength:      128
            },
            user:           {
                type:           'string',
                maxLength:      64
            },
            client:         {
                type:           'string',
                maxLength:      64
            },
            status:         {
                type:           'string',
                oneOf:          [ 'offline', 'idle', 'active' ]
            }
        },
        required:   [ 'apiKey', 'user' ]
    },
    rejectBody:     true,
    setup:          function (layer, context, callback) {
        Layer = layer;
        callback();
    }
}, PostSession);
