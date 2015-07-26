
var Action = require ('substation').Action;
var Handlebars = require ('handlebars');
var template = Handlebars.compile (
    fs.readFileSync ('lib/ControlActions/root/template.bars').toString()
);

function action (station, agent, request, reply) {
    // if (!agent.isLoggedIn)
        return reply.done();
}

module.exports = new Action ({
    template:   template
}, action);
