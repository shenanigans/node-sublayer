
var async = require ('async');
var mailgun = require ('mailgun-js');
var Handlebars = require ('handlebars');
var Action = require ('substation').Action;
var session = require ('infosex').session.craft;

var template200 = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/recovery/POST/200.bars').toString()
);
var template404 = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/recovery/POST/404.bars').toString()
);

var UsernameCollection, Mailer;
var COOLDOWN = 1000 * 60 * 20; // twenty minutes
module.exports = new Action ({
    authentication: {
        isLoggedIn:     true
    },
    template:       {
        200:            template200,
        404:            template404
    },
    bodySchema:     {
        properties:     {
            email:          {
                type:           "string",
                format:         "email"
            }
        },
        required:       [ 'email' ]
    },
    setup:          function (station, config, callback) {
        UsernameCollection = station.UsernameCollection;
        RecoveryCollection = station.RecoveryCollection;
        Mailer = mailgun ({
            apiKey: station.config.mailgunKey,
            domain: station.config.mailgunDomain
        });
        callback();
    }
}, function (station, agent, request, reply) {
    var now = (new Date()).getTime();
    UsernameCollection.findAndModify (
        { email:request.body.email },
        { email:1 },
        { $push:{ recover:{ $each: [ now ], $slice:-5 } } },
        function (err, rec) {
            if (err)
                return reply.done (502);
            if (!rec)
                return reply.done (404);

            if (rec.recover && rec.recover[0] && now - rec.recover[0] < COOLDOWN) {
                reply.content ({
                    error:  "You're doing that too much! If you don't seem to be receiving the "
                              + "emails, check your spam folder. If you have identified a reason "
                              + "that you were not receiving emails and are really sure you need "
                              + "another recovery email sent, the server will be willing to do "
                              + "that for you in about twenty minutes."
                });
                reply.done (400);
                return;
            }

            function final (recoveryID) {
                Mailer.messages().send ({
                    from:       "no-reply@sublayer.io",
                    to:         request.body.email,
                    subject:    "Recover Account",
                    text:       "Somebody (hopefully you) is attempting to recover access to a "
                                  + "Sublayer.io account registered to this email address. If this was "
                                  + "you, you may proceed to recover you account by clicking this link "
                                  + "or pasting it into a browser: http://sublayer.io/static/"
                                  + "closeRecovery.html?id="
                                  + recoveryID
                }, function (err, body) {
                    if (err) {
                        station.logger.error (
                            { err:err, email:request.body.email },
                            'mail sending error'
                        );
                        return reply.done (502);
                    }

                    station.logger.info ({ email:request.body.email }, 'sent recovery email');

                    reply.content ({
                        email:      rec.email
                    });
                    reply.done();
                });
            }

            if (rec.currentRecovery)
                return final (rec.currentRecovery);

            session (function (recoveryID) {
                async.series ([
                    function (callback) {
                        RecoveryCollection.insert ({ _id:recoveryID, used:false }, callback);
                    },
                    function (callback) {
                        UsernameCollection.update (
                            { _id:rec._id },
                            { $set:{ currentRecovery:recoveryID }},
                            callback
                        );
                    }
                ], function (err) {
                    if (err)
                        return reply.done (502);
                    final (recoveryID);
                });
            });
        }
    );
});
