
var Action = require ('substation').Action;

function PostSession (station, agent, request, reply) {
    var rememberMe = request.query.rememberMe ?
        request.query.rememberMe == 'true' ?
            true
          : false
      : false
      ;
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
                agent.setIdle (
                    request.query.user,
                    request.query.client,
                    rememberMe,
                    cleanup
                );
                break;
            default: // "active"
                agent.setActive (
                    request.query.user,
                    request.query.client,
                    rememberMe,
                    cleanup
                );
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
            rememberMe:     {
                type:           'string',
                enum:           [ 'true', 'false' ]
            },
            status:         {
                type:           'string',
                enum:           [ 'offline', 'idle', 'active' ]
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
