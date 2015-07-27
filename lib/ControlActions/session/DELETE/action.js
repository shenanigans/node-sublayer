
var Action = require ('substation').Action;

module.exports = new Action ({

}, function (station, agent, request, reply) {
    if (!agent.isLoggedIn) {
        reply.redirect ('/');
        reply.done();
        return;
    }

    agent.logout (function (err) {
        if (err)
            return reply.done (502);
        reply.redirect ('/');
        reply.done();
    })
});
