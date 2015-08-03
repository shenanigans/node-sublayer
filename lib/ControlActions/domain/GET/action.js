
var Action = require ('substation').Action;
var Handlebars = require ('handlebars');
var template_200 = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/domain/GET/200.bars').toString()
);

var DomainCollection;
module.exports = new Action ({
    Authentication: {
        isLoggedIn:     true
    },
    setup:          function (station, config, callback) {
        DomainCollection = station.DomainCollection;
        callback();
    },
    template:       {
        200:            template_200
    }
}, function (station, agent, request, reply) {
    DomainCollection.findOne (
        { _id:request.params[0] },
        function (err, rec) {
            if (err)
                return reply.done ('502');
            if (!rec)
                return reply.done ('404');
            reply.content (rec);
            reply.done();
        }
    );
});
