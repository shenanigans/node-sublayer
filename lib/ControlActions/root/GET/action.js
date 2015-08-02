
var async = require ('async');
var Action = require ('substation').Action;
var Handlebars = require ('handlebars');
var template = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/root/GET/template.bars').toString()
);
Handlebars.registerHelper ('domainStatus', function (domain) {
    if (domain.locked || domain.delinquent)
        return 'locked';
    if (!domain.confirmed)
        return 'not confirmed';
    if (!domain.config)
        return 'ready';
    if (domain.offline)
        return 'offline';
    return 'online';
});
Handlebars.registerHelper ('domainStatusClass', function (domain) {
    if (domain.locked || domain.delinquent)
        return 'error';
    if (!domain.confirmed || domain.offline)
        return 'notReady';
    return '';
});

var DomainCollection, NotificationCollection, InvoiceCollection;
module.exports = new Action ({
    template:   template,
    setup:          function (station, config, callback) {
        DomainCollection = station.DomainCollection;
        NotificationCollection = station.NotificationCollection;
        InvoiceCollection = station.InvoiceCollection;
        callback();
    }
}, function (station, agent, request, reply) {
    if (!agent.isLoggedIn)
        return reply.done();

    var domains, notifications, invoices;
    async.parallel ([
        function (callback) {
            DomainCollection.find (
                { owner:agent.user },
                {},
                { limit:10, sort:{ requested:1 } },
                function (err, cursor) {
                    if (err)
                        return callback (err);
                    cursor.toArray (function (err, recs) {
                        if (err)
                            return callback (err);
                        domains = recs;
                        callback();
                    });
                }
            );
        },
        function (callback) {
            NotificationCollection.find (
                { target:agent.user },
                {},
                { limit:10, sort:{ sent:1 } },
                function (err, cursor) {
                    if (err)
                        return callback (err);
                    cursor.toArray (function (err, recs) {
                        if (err)
                            return callback (err);
                        notifications = recs;
                        callback();
                    });
                }
            );
        },
        function (callback) {
            InvoiceCollection.find (
                { target:agent.user },
                {},
                { limit:10, sort:{ date:1 } },
                function (err, cursor) {
                    if (err)
                        return callback (err);
                    cursor.toArray (function (err, recs) {
                        if (err)
                            return callback (err);
                        invoices = recs;
                        callback();
                    });
                }
            );
        }
    ], function (err) {
        if (err)
            return reply.done (502);
        console.log (domains.length);
        reply.content ({ domains:domains, notifications:notifications, invoices:invoices });
        reply.done();
    });
});
