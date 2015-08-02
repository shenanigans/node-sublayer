
require ('scum');
var substation = require ('substation');
var homebase = substation.getServer();

substation.on ('notification', function (notice) {

});

substation.on ('domainStatus', function (domain, status, bandwidth, actions, events) {
    var domainTableBody = document.getElementById ('DomainTable').children[1];
    var row, found = false;
    for (var i=1,j=domainTableBody.children.length; i<j; i++) {
        row = domainTableBody.children[i];
        if (row.children[0].textContent == domain) {
            found = true;
            break;
        }
    }
    if (!found) {
        console.log ('got status for unknown domain '+domain);
        return;
    }

    if (status)
        row.children[1].childNodes[0].textContent = status;

    if (bandwidth !== undefined)
        if (!bandwidth)
            row.children[2].childNodes[0].textContent = '0';
        else
            row.children[2].childNodes[0].textContent = String (
                Number (row.children[2].childNodes[0].textContent)
              + bandwidth
            );

    if (actions !== undefined)
        if (!actions)
            row.children[3].childNodes[0].textContent = '0';
        else
            row.children[3].childNodes[0].textContent = String (
                Number (row.children[3].childNodes[0].textContent)
              + actions
            );

    if (events !== undefined)
        if (!events)
            row.children[4].childNodes[0].textContent = '0';
        else
            row.children[4].childNodes[0].textContent = String (
                Number (row.children[4].childNodes[0].textContent)
              + events
            );
});

homebase.goLive();

var urlRegex = /[^\.]+(?:\.[^\.]+)+/;
var document = window.document;
window.on ('load', function(){
    var CreateDomainForm = document.getElementById ('CreateDomain');
    var CreateDomainText = document.getElementById ('CreateDomainText');
    var CreateDomainSubmit = document.getElementById ('CreateDomainSubmit');
    var CreateDomainError = document.getElementById ('CreateDomainError');

    var errorShowing;
    function checkCreateDomain(){
        if (urlRegex.test (CreateDomainText.value))
            CreateDomainSubmit.removeAttribute ('disabled');
        else
            CreateDomainSubmit.setAttribute ('disabled', 'true');

        if (errorShowing) {
            errorShowing = false;
            CreateDomainError.dropClass ('visible');
        }
    }
    CreateDomainText.on ('change', checkCreateDomain);
    CreateDomainText.on ('keyup', checkCreateDomain);

    CreateDomainForm.on ('submit', function(){
        var domainName = CreateDomainText.value;

        // we aren't already aware of a Domain by this name, are we?
        var domainTableBody = document.getElementById ('DomainTable').children[1];
        for (var i=1,j=domainTableBody.children.length; i<j; i++)
            if (domainTableBody.children[i].children[0].childNodes[0].textContent == domainName) {
                CreateDomainError.childNodes[0].textContent = 'domain name already registered';
                CreateDomainError.addClass ('visible');
                CreateDomainSubmit.setAttribute ('disabled', 'true');
                CreateDomainText.value = "";
                errorShowing = true;
                return false;
            }

        // create a new table row to represent the domain
        var newRow = document.createElement ('tr');
        var domainCell = document.createElement ('td');
        var domainLink = document.createElement ('a');
        domainLink.appendChild (document.createTextNode (domainName));
        domainCell.appendChild (domainLink);
        var statusCell = document.createElement ('td');
        statusCell.appendChild (document.createTextNode ('creating...'));
        var bandwidthCell = document.createElement ('td');
        bandwidthCell.setText ('0');
        var actionsCell = document.createElement ('td');
        actionsCell.setText ('0');
        var eventsCell = document.createElement ('td');
        eventsCell.setText ('0');

        newRow.appendChild (domainCell);
        newRow.appendChild (statusCell);
        newRow.appendChild (bandwidthCell);
        newRow.appendChild (actionsCell);
        newRow.appendChild (eventsCell);


        // place the new row alphabetically
        var inserted = false;
        for (var i=1,j=domainTableBody.children.length; i<j; i++) {
            var child = domainTableBody.children[i];
            if (child.children[0].textContent > domainName) {
                inserted = true;
                domainTableBody.insertBefore (newRow, child);
                break;
            }
        }
        if (!inserted)
            domainTableBody.appendChild (newRow);

        homebase.action ('POST', '/domain', CreateDomainForm, function (err, status, body) {
            if (err) {
                domainCell.setText ('network error during domain creation');
                domainCell.addClass ('error');
                return;
            }

            if (status != '200') {
                domainCell.setText (body.error);
                domainCell.addClass ('error');
                return;
            }

            domainLink.setAttribute ('href', '/domain/'+body._id);
        });

        CreateDomainText.value = "";
        CreateDomainSubmit.setAttribute ('disabled', 'true');
        return false;
    });
});
