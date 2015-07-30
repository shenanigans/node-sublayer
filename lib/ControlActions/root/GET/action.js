
var Action = require ('substation').Action;
var Handlebars = require ('handlebars');
var template = Handlebars.compile (
    require ('fs').readFileSync ('lib/ControlActions/root/GET/template.bars').toString()
);

function action (station, agent, request, reply) {
    console.log ('agent', agent.isLoggedIn);
    reply.done();
}

module.exports = new Action ({
    template:   template
}, action);
