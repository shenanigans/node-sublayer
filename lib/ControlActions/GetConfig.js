
var infosex = require ('infosex');
var Action = require ('substation').Action;

function GetConfig (station, agent, request, reply) {

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
                maxLength:      128
            }
        },
        required:   [ 'apiKey' ]
    },
    rejectBody:     true,
    setup:          function (layer, context, callback) {
        Layer = layer;
        callback();
    }
}, GetConfig);
