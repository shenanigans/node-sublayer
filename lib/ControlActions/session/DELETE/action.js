
var Action = require ('substation').Action;

module.exports = new Action ({

}, function (station, agent, request, reply) {
    if (!agent.isLoggedIn) {
        console.log ('NOT logged in');
        reply.redirect ('/');
        reply.done();
        return;
    }

    agent.logout (function (err) {
        console.log ('called logout');
        if (err)
            return reply.done (502);
        reply.redirect ('/');
        reply.done();
    })
});
