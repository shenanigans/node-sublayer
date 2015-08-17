
var WELCOME_MSG = require ('fs').readFileSync ('./lib/ControlActions/confirm/GET/welcome.md');
var async = require ('async');
var Action = require ('substation').Action;
var infosex = require ('infosex');
var uid = infosex.uid.craft;

var UserCollection, ClientCollection, UsernameCollection, ConfirmationCollection;
module.exports = new Action ({
    setup:      function (station, config, callback) {
        UserCollection = station.UserCollection;
        ClientCollection = station.ClientCollection;
        UsernameCollection = station.UsernameCollection;
        ConfirmationCollection = station.ConfirmationCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    ConfirmationCollection.findOne (
        { _id:request.params[0] },
        function (err, confirm) {
            if (err)
                return reply.done (502);
            if (!confirm)
                return reply.done (403);
            if (confirm.used) {
                reply.redirect ('/static/login.html?confirmed=true');
                reply.done();
                return;
            }

            // send the welcome notification
            // nobody really cares when this finishes
            uid (function (noticeID) {
                NotificationCollection.insert (
                    {
                        _id:    noticeID,
                        target: agent.user,
                        title:  'Welcome to Sublayer.io!',
                        sender: 'Sublayer.io Greeter',
                        time:   (new Date()).getTime(),
                        body:   WELCOME_MSG
                    },
                    { w:0 }
                );
            });
            UsernameCollection.findAndModify (
                { _id:confirm.target },
                { _id:1 },
                { $set:{ enabled:true } },
                function (err, nameRec) {
                    if (err) {
                        console.log (err);
                        return reply.done (502);
                    }

                    var clientID;
                    async.parallel ([
                        function (callback) {
                            UserCollection.insert ({
                                _id:        confirm.target,
                                name:       nameRec.name,
                                email:      nameRec.email,
                                enabled:    true
                            }, callback);
                        },
                        function (callback) {
                            uid (function (newID) {
                                var clientID = newID;
                                ClientCollection.insert (
                                    { _id:clientID, user:nameRec.user, ua:agent.useragent },
                                    callback
                                );
                            });
                        }
                    ], function (err) {
                        if (err) {
                            console.log (err);
                            return reply.done (502);
                        }
                        async.parallel ([
                            function (callback) {
                                agent.setIdle ('sublayer.io', nameRec._id, clientID, callback);
                            },
                            function (callback) {
                                ConfirmationCollection.update (
                                    { _id:confirm._id },
                                    { $set:{ used:true } },
                                    callback
                                );
                            }
                        ], function (err) {
                            if (err) {
                                console.log (err);
                                return reply.done (502);
                            }
                            reply.redirect ('/static/login.html?confirmed=true');
                            reply.done();
                        });
                    });
                }
            );
        }
    );
});
