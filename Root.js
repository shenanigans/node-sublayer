
require ('scum');

var HELLO = [
    'hallo',
    'salve',
    'p&#xEB;rsh&#xEB;ndetje', // 'përshëndetje',
    '&#x645;&#x631;&#x62D;&#x628;&#x627;', // 'مرحبا',
    'kaixo',
    '&#x9B9;&#x9CD;&#x9AF;&#x9BE;&#x9B2;&#x9CB;', // 'হ্যালো',
    '&#x1019;&#x1004;&#x103A;&#x1039;&#x1002;&#x101C;&#x102C;&#x1015;&#x102B;', // 'မင်္ဂလာပါ',
    '&#x60A8;&#x597D;', // '您好',
    '&#x3A7;&#x3B1;&#x3AF;&#x3C1;&#x3B5;&#x3C4;&#x3B5;', // 'Χαίρετε',
    'bonjour',
    '&#xE2A;&#xE27;&#xE31;&#xE2A;&#xE14;&#xE35;', // 'สวัสดี',
    '&#x417;&#x434;&#x440;&#x430;&#x432;&#x441;&#x442;&#x432;&#x443;&#x439;&#x442;&#x435;', // 'Здравствуйте',
    'sannu',
    'alo',
    'ol&#xE1;', // 'olá',
    'ahoj',
    '&#x3053;&#x3093;&#x306B;&#x3061;&#x306F;', // 'こんにちは',
    'dia duit',
    'sveiki',
    '&#xA38;&#xA24; &#xA38;&#xA4D;&#xA30;&#xA40; &#xA05;&#xA15;&#xA3E;&#xA32;', // 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ',
    '&#xC548;&#xB155;&#xD558;&#xC138;&#xC694;', // '안녕하세요',
    '&#x939;&#x945;&#x932;&#x94B;' // 'हॅलो'
];
var LAST = [ 3, 7 ];
function getNextText(){
    var next;
    while (LAST.indexOf (next = Math.floor (HELLO.length * Math.random())) >= 0);
    LAST.push (next);
    LAST.shift();
    return HELLO[next] + (Math.random() > 0.5 ? '?' : '!');
}

window.on ('load', function(){
    var BubbleField = window.document.getElementById ('BubbleField');
    var BubbleSides = window.document.getElementById ('BubbleSides');

    var width = BubbleField.clientWidth;
    var sides = width - window.document.body.clientWidth;
    var sideHalf = sides / 2;
    var sidesHeight = BubbleSides.clientHeight;

    var fieldTotal = width * BubbleField.clientHeight;
    var pixelCount = fieldTotal + (sides * sidesHeight);

    function drawNextBubble(){
        var rand = Math.random();
        var delay = Math.max (300, Math.min (1500, 1500 * rand * rand));
        setTimeout (function(){
            var nextBubble = window.document.createElement ('div');
            nextBubble.className = 'bubble';
            nextBubble.innerHTML = getNextText();

            setTimeout (function(){
                nextBubble.addClass ('visible');
                var disappearDelay = Math.max (750, Math.min (1500, 2000 * rand * rand));
                setTimeout (function(){
                    nextBubble.dropClass ('visible');
                    setTimeout (function(){ nextBubble.dispose(); }, 1000);
                }, disappearDelay);
            });

            // position the bubble
            var pixel = Math.floor (pixelCount * Math.random());
            if (pixel < fieldTotal) {
                var left = pixel % width;
                var top = Math.floor (pixel / width);
                nextBubble.setAttribute ('style', 'top:'+top+'px;left:'+left+'px;');
                BubbleField.appendChild (nextBubble);
                return drawNextBubble();
            }

            pixel -= fieldTotal;
            var left = pixel % sides;
            var top = Math.floor (pixel / sides);
            var styleStr = 'top:'+top+'px;';
            if (left > sideHalf)
                styleStr += 'right:' + (left - sideHalf) + 'px;';
            else
                styleStr += 'left:' + left + 'px;';

            nextBubble.setAttribute ('style', 'top:'+top+'px;left:'+left+'px;');
            BubbleSides.appendChild (nextBubble);
            drawNextBubble();
        }, delay);
    }

    drawNextBubble();
});
