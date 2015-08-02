
var Action = require ('substation').Action;

var DomainCollection;
module.exports = new Action ({
    setup:          function (station, config, callback) {
        DomainCollection = station.DomainCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    try {
        var pageNum = Number (request.params[0]);
    } catch (err) {
        return reply.done ('400');
    }
    if (isNaN (pageNum) || pageNum < 0)
        return reply.done ('400');

    DomainCollection.find (
        { owner:agent.user },
        {},
        { limit:10, skip:10 * pageNum, sort:{ requested:1 } },
        function (err, cursor) {
            if (err)
                return reply.done ('502');
            cursor.toArray (function (err, recs) {
                if (err)
                    return reply.done ('502');
                reply.content ({ domains:recs });
                reply.done();
            });
        }
    );
});
