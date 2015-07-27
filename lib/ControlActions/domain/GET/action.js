
var Action = require ('substation').Action;

module.exports = new Action ({
    Authentication: {
        isLoggedIn:     true,
        isDomestic:     true
    }
}, function (station, agent, request, reply) {

});
