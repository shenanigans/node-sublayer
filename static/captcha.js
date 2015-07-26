
function createCheckbox(){
    var labelElem = window.document.createElement ('label');
    labelElem.setAttribute ('for', 'RobotCheck');
    labelElem.appendChild (window.document.createTextNode ('I am not a robot'));
    var inputElem = window.document.createElement ('input');
    inputElem.setAttribute ('id', 'RobotCheck');
    inputElem.setAttribute ('type', 'checkbox');

    var frag = window.document.createDocumentFragment();
    frag.appendChild (labelElem);
    frag.appendChild (inputElem);
    frag.appendChild (window.document.createElement ('br'));
    window.document.getElementById ('CAPTCHA').appendChild (frag);
}
