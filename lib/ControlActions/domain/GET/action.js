
var Action = require ('substation').Action;
var Handlebars = require ('handlebars');
var template_200 = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/domain/GET/200.bars').toString()
);
Handlebars.registerHelper ('dnsRecordBlock', function (domain) {
    var subdomain = domain.requested.split ('.').slice (0, -2).join ('.');
    var str = 'name';
    for (var i=0,j=Math.max (2, subdomain.length-2); i<j; i++)
        str += ' ';
    str +=   'rr   text\n';
    str += subdomain;
    if (subdomain.length < 4)
        for (var i=0,j=4-subdomain.length; i<j; i++)
            str += ' ';
    str += '  TXT  sublayer.io=';
    str += domain._id;
    return str;
});

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
