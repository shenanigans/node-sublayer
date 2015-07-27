
var crypto = require ('crypto');
var async = require ('async');
var mongodb = require ('mongodb');
var mailgun = require ('mailgun-js');
var Action = require ('substation').Action;
var infosex = require ('infosex');
var uid = infosex.uid.craft;
var session = infosex.session.craft;

var UsernameCollection, ConfirmationCollection, Mailer;
module.exports = new Action ({
    hideSchema:     true,
    bodySchema:     {
        properties:     {
            email:          {
                type:           'string',
                format:         'email'
            },
            username:       {
                type:           'string',
                minLength:      3,
                maxLength:      32
            },
            password:       {
                minLength:      8,
                maxLength:      128
            },
            confirm:        {
                minLength:      8,
                maxLength:      128
            },
            homepage:       {
                invalid:        true
            },
            wasps:          {
                type:           'string',
                equals:         'on'
            }
        },
        required:       [ 'email', 'username', 'password', 'wasps' ]
    },
    setup:          function (station, config, callback) {
        UsernameCollection = station.UsernameCollection;
        ConfirmationCollection = station.ConfirmationCollection;
        Mailer = mailgun ({
            apiKey: station.config.mailgunKey,
            domain: station.config.mailgunDomain
        });
        callback();
    }
}, function (station, agent, request, reply) {
    if (agent.isLoggedIn) {
        reply.content ({ error:"you are already logged in" });
        return reply.done (403);
    }

    var passHash; // calculated synchronously after the call to system random begins
    var userID, confirmID;
    async.parallel ([
        function (callback) {
            console.log ('getting uid');
            uid (function (newID) {
                userID = newID;
                callback();
            });
        },
        function (callback) {
            console.log ('getting confirm id');
            session (function (newID) {
                confirmID = newID;
                callback();
            });
        }
    ], function(){
        console.log ('updating username');
        var now = (new Date()).getTime();
        UsernameCollection.findAndModify ({
            name:       request.body.username,
            email:      request.body.email,
            pass:       passHash
        }, { name:1 }, {
            $setOnInsert:   {
                _id:            userID,
                confirm:        confirmID
            },
            $push:          {
                sent:           { $each:[ now ], $slice:-4 }
            }
        }, {
            upsert:     true
        }, function (err, oldRecord) {
            console.log ('old username', err, oldRecord);
            if (err)
                return reply.done (502);

            var useThisTarget = oldRecord ? oldRecord._id : userID;

            // new username created - we can wait for email confirmation to create the User record
            ConfirmationCollection.insert ({ _id:confirmID, target:useThisTarget }, function (err) {
                console.log ('new confirmation', err);
                if (err)
                    return reply.done (502);

                // respond early
                reply.done (200);

                // send the email
                Mailer.messages().send ({
                    from:       "no-reply@sublayer.io",
                    to:         request.body.email,
                    subject:    "Confirm Email Address",
                    text:       "Somebody (hopefully you) registered this email address as a user"
                      + " account at sublayer.io. If it was you, confirm that you control this inbox"
                      + " by clicking this link (or pasting it into a browser):"
                      + " http://sublayer.io/confirm/"
                      + confirmID
                }, function (err, body) {
                    if (err)
                        station.logger.error (
                            { err:err, email:request.body.email },
                            'mail sending error'
                        );
                    else
                        station.logger.info ({ email:request.body.email }, 'sent confirmation email');
                });
            });
        });
    });

    var hasher = crypto.createHash ('sha256');
    hasher.update (request.body.password);
    hasher.update ('sublayer.io');
    hasher.update (request.body.username);
    passHash = hasher.digest ('base64');
});
