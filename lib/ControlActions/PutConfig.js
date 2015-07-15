
var infosex = require ('infosex');
var Action = require ('substation').Action;

function PutConfig (station, agent, request, reply) {

}

var Layer;
module.exports = new Action ({
    route:          '^/config/(\d\w{'+infosex.uid.keyLength+'})$',
    method:         'PUT',
    querySchema:    {
        properties:     {
            apiKey:         {
                type:           'string',
                minLength:      32,
                maxLength:      128
            }
        }
    },
    bodySchema:     {
        properties:     {
            domain:         {
                type:           'string',
                maxLength:      128
            },
            actions:        {
                type:           'array',
                maxItems:       64,
                items:          {
                    properties:     {
                        route:          {
                            type:           'string',
                            maxLength:      '128'
                        },
                        forward:        {
                            properties:     {
                                host:           {
                                    type:           'string',
                                    maxLength:      128
                                },
                                path:           {
                                    type:           'string',
                                    maxLength:      128
                                }
                            }
                        },
                        querySchema:    { $ref:'http://json-schema.org/likeness' },
                        bodySchema:     { $ref:'http://json-schema.org/likeness' },
                        binaryStreams:  { type:'boolean' }
                    }
                }
            }
        }
    },
    setup:          function (layer, context, callback) {
        Layer = layer;
        callback();
    }
}, PutConfig);
