
var mongodb = require ('mongodb');
var Action = require ('substation').Action;
var infosex = require ('infosex');
var uid = infosex.uid.craft;
var session = infosex.session.craft;

var UserCollection;
module.exports = new Action ({
    hideSchema:     true,
    bodySchema:     {
        properties:     {
            email:          {
                type:           'string',
                format:         'email'
            },
            password:       {
                minLength:      8,
                maxLength:      128
            }
        }
    },
    setup:          function (station, config, callback) {
        UserCollection = station.UserCollection
        UsernameCollection = station.UsernameCollection
        callback();
    }
}, function (station, agent, request, reply) {
    if (agent.isLoggedIn) {
        reply.content ({ error:"you are already logged in" });
        return reply.done (403);
    }

    var userID, confirmID;
    async.parallel ([
        function (callback) {
            uid (function (newID) {
                UserCollection.insert ({
                    _id:        newID,
                    email:      request.query.email
                }, callback);
            });
        }, function (callback) {
            session (function (newID) {
                ConfirmCollection.insert ({ _id:newID }, callback);
            });
        }
    ], function (err) {
        if (err)
            return reply.done (502);

        // respond early
        reply.done (200);

        // send dat email

    });
});
