
var safe = require ('safe-regex');
var Action = require ('substation').Action;

function PutConfig (station, agent, request, reply) {
    // validate configuration
    for (var i=0,j=request.body.actions.length; i<j; i++) {
        var action = request.body.actions[i];
        if (action.route) {
            var route = new RegExp (action.route);
            if (!safe (route)) {
                reply.content ({ ConfigError:{
                    action:     action,
                    error:      'unsafe regular expression'
                }});
                reply.done (400);
                return;
            }
        }
    }

    console.log ('API Key', request.query.apiKey);
    console.log (request.params[0]);
    DomainCollection.findAndModify (
        { _id:request.params[0], apiKey:request.query.apiKey },
        { _id:1 },
        { $set:{ config:request.body } },
        { fields:{ _id:true } },
        function (err, rec) {
            if (err) {
                reply.done (502);
                return;
            }
            if (!rec) {
                reply.done (403);
                return;
            }
            reply.done();
        }
    );
}

var DomainCollection;
module.exports = new Action ({
    route:          '^/config/(\d\w{32,64})$',
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
        error:          'full schema',
        properties:     {
            events:         {
                properties:     {
                    userOnline:     {},
                    userOffline:    {},
                    clientOnline:   {},
                    clientOffline:  {},
                    peerRequest:    {},
                    liveConnection: {}
                },
                forAll:         {
                    properties:     {
                        host:           {
                            error:          'forward host',
                            type:           'string',
                            maxLength:      128
                        },
                        path:           {
                            error:          'forward path',
                            type:           'string',
                            maxLength:      128
                        },
                        port:           {
                            error:          'forward port',
                            type:           'number'
                        }
                    },
                    required:       [ 'host' ]
                }
            },
            template:       {
                forAll:         {
                    properties:     {
                        host:           {
                            error:          'forward host',
                            type:           'string',
                            maxLength:      128
                        },
                        path:           {
                            error:          'forward path',
                            type:           'string',
                            maxLength:      128
                        },
                        port:           {
                            error:          'forward port',
                            type:           'number'
                        }
                    },
                    required:       [ 'host' ]
                },
                keyFormat:      {
                    type:           'string',
                    pattern:        /^(?:\d{3})?$/
                }
            },
            actions:        {
                error:          'actions',
                type:           'array',
                maxItems:       64,
                items:          {
                    properties:     {
                        route:          {
                            error:          'route',
                            type:           'string',
                            maxLength:      128
                        },
                        method:         {
                            error:          'method',
                            type:           'string',
                            maxLength:      15
                        },
                        forward:        {
                            error:          'forward',
                            type:           'object',
                            properties:     {
                                host:           {
                                    error:          'forward host',
                                    type:           'string',
                                    maxLength:      128
                                },
                                path:           {
                                    error:          'forward path',
                                    type:           'string',
                                    maxLength:      128
                                },
                                port:           {
                                    error:          'forward port',
                                    type:           'number'
                                }
                            },
                            required:       [ 'host' ]
                        },
                        // querySchema:    { $ref:'http://json-schema.org/likeness' },
                        // bodySchema:     { $ref:'http://json-schema.org/likeness' },
                        querySchema:    { },
                        bodySchema:     { },
                        binaryStreams:  {
                            error:          'binary streams',
                            type:           'boolean'
                        },
                        required:       [ 'forward' ]
                    }
                }
            }
        },
        required:      [ 'actions' ]
    },
    setup:          function (layer, config, callback) {
        DomainCollection = layer.DomainCollection;
        callback();
    }
}, PutConfig);
