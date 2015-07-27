
var crypto = require ('crypto');
var Action = require ('substation').Action;
var uid = require ('infosex').uid;

var UsernameCollection, ClientCollection;
module.exports = new Action ({
    bodySchema:     {
        properties:     {
            username:       {
                type:           'string',
                minLength:      3,
                maxLength:      32
            },
            password:       {
                minLength:      8,
                maxLength:      128
            }
        },
        required:       [ 'username', 'password' ]
    },
    setup:          function (station, config, callback) {
        UsernameCollection = station.UsernameCollection;
        ClientCollection = station.ClientCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    var hasher = crypto.createHash ('sha256');
    hasher.update (request.body.password);
    hasher.update ('sublayer.io');
    hasher.update (username);
    passHash = hasher.digest ('base64');

    UsernameCollection.findOne (
        { name:request.body.username, pass:passHash, enabled:true },
        function (err, nameRec) {
            if (err)
                return reply.done (502);
            if (!nameRec)
                return reply.done (403);

            if (agent.client)
                return agent.setActive (function (err) {
                    if (err)
                        return reply.done (502);
                    reply.redirect ('/');
                    reply.done();
                });

            uid (function (newClientID) {
                ClientCollection.insert (
                    { _id:newClientID, user:nameRec.user, ua:agent.useragent },
                    function (err) {
                        if (err)
                            return reply.done (502);
                        agent.setActive (nameRec.user, newClientID, function (err) {
                            if (err)
                                return reply.done (502);
                            reply.redirect ('/');
                            reply.done();
                        }
                    );
                });
            });
        }
    );
});
