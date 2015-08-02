
require ('scum');
var marked = require ('marked');
var highlight = require ('highlight.js');
marked.setOptions ({
    gfm:        true,
    renderer:   markedRenderer,
    tables:     true,
    highlight:  function (code, lang) {
        if (lang)
            return highlight.highlightAuto (code, [ lang ]).value;
        return highlight.highlightAuto (code).value;
    }
});

var substation = require ('substation');
var homebase = substation.getServer();

window.on ('load', function(){
    var BodyNode = window.document.getElementById ('MessageBody').childNodes[0];
    BodyNode.innerHTML = marked (BodyNode.textContent);
});
