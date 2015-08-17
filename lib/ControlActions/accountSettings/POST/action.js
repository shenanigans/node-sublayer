
var Action = require ('substation').Action;
var Handlebars = require ('handlebars');
var template200 = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/accountSettings/GET/200.bars').toString()
);
var template404 = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/accountSettings/GET/404.bars').toString()
);

var UserCollection;
module.exports = new Action ({
    authentication: {
        isLoggedIn:     true
    },
    template:       {
        200:            template200,
        404:            template404
    },
    setup:          function (station, config, callback) {
        UserCollection = station.UserCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    UserCollection.findOne ({ _id:agent.user }, function (err, rec) {
        if (err)
            return reply.done (502);
        reply.content ({
            email:      rec.email
        });
        reply.done();
    });
});
