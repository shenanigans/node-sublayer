
var Action = require ('substation').Action;

var InvoiceCollection;
module.exports = new Action ({
    setup:          function (station, config, callback) {
        InvoiceCollection = station.InvoiceCollection;
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

    InvoiceCollection.find (
        { target:agent.user },
        {},
        { limit:10, skip:10 * pageNum, sort:{ date:1 } },
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
