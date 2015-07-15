
var Action = require ('substation').Action;

function PostEvent (station, agent, request, reply) {
    Layer.getDomain (request.domain, function (err, domain) {
        if (
            err
         || !domain
         || domain.apiKey != request.query.apiKey
        ) {
            reply.done ('403');
            return;
        }

        station.sendEvent (request.body, function (err, didReceive) {
            if (err) {
                reply.done ('403');
                return;
            }
            reply.content ({ didReceive:Boolean (didReceive) });
            reply.done();
        });
    });
}

var Layer;
module.exports = new Action ({
    route:          '^/event',
    method:         'POST',
    querySchema:    {
        properties: {
            apiKey:     {
                type:       'string',
                minLength:  32,
                maxLength:  128
            },
            user:       {
                type:       'string',
                maxLength:  128
            },
            client:     {
                type:       'string',
                maxLength:  128
            }
        },
        required:   [ 'apiKey', 'user' ]
    },
    bodySchema:     {
        type:       'array',
        minItems:   1,
        maxItems:   32,
        items:      [ { type:'string' } ],
        additionalItems: true
    },
    setup:          function (layer, context, callback) {
        Layer = layer;
        callback();
    }
}, PostEvent);
