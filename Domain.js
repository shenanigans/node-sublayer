
require ('scum');
var substation = require ('substation');
var homebase = substation.getServer();

STATUS_CLASS = {
    locked:             'error',
    "not confirmed":    'notReady',
    offline:            'notReady',
    ready:              '',
    online:             ''
};

substation.on ('domainStatus', function (domain, status, bandwidth, actions, events) {
    if (domain != window.domain)
        return;

    var statusElem = document.getElementById ('Status');
    statusElem.setText (status);
    statusElem.setClass (STATUS_CLASS[status]);

    var ConfirmArea = document.getElementById ('ConfirmArea');
    if (ConfirmArea)
        ConfirmArea.dispose();
});

var document = window.document;
window.on ('load', function(){
    var ConfirmDomainForm = document.getElementById ('Confirm');
    if (ConfirmDomainForm)
        ConfirmDomainForm.on ('submit', function(){
            homebase.action (
                'PUT',
                window.location.pathname,
                { confirmed:true },
                function (err, status, body) {
                    console.log (err, status, body);
                }
            );
            return false;
        });


    var DangerScreen = document.getElementById ('DangerScreen');
    DangerScreen.on ('click', function(){
        var open = window.confirm (
            "Are you sure you want to unlock the Dangerous Options? They're really dangerous!"
        );
        if (!open)
            return;
        DangerScreen.dispose();
    });
});
