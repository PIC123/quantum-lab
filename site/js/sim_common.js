
function $() 
{
  var elements = new Array();
  for (var i = 0; i < arguments.length; i++) 
  {
    var element = arguments[i];
    if (typeof element == 'string'){
      element = document.getElementById(element);
//     if(element==null) return document.createTextNode('Error')
     if(element==null) return null;
    if (arguments.length == 1)
      return element;

    elements.push(element);
  }
 }
}


function _$(q) {
	return document.querySelector(q);
}

function _$$(q) {
	return document.querySelectorAll()(q);
}

function $$(obj, name) {
	return $(obj.id + '_' + name);
}

function trim(s) {
    return s.replace(/(^\s*)|(\s*$)/g, '');
}

PlusMinus.prototype.min = 0;
PlusMinus.prototype.max = 100;
PlusMinus.prototype.step = 10;
PlusMinus.prototype.dec_mode = 0;
PlusMinus.prototype.fract = 0;
PlusMinus.prototype.value = 50;
PlusMinus.prototype.tId = 0;

function PlusMinus(control, callback) {
	var obj = this;
	obj.plus_btn = $$(control, 'plus_btn');
	obj.minus_btn = $$(control, 'minus_btn');
	obj.input = $$(control, 'input');
	obj.callback = callback;
	obj.updateInput();
	
	obj.plus_btn.onmousedown = function(){obj.onPlusDown()};
	obj.plus_btn.onmouseup = function(){obj.onPlusUp()};
	obj.minus_btn.onmousedown = function(){obj.onMinusDown()};
	obj.minus_btn.onmouseup = function(){obj.onMinusUp()};
	obj.input.onkeypress = function(event){obj.onEnter(event)};
	obj.input.onblur = function(){obj.readValue()};
}

PlusMinus.prototype.updateInput = function() {
	var obj = this;
	var v = Number(obj.value);
	var s;
	switch(obj.dec_mode) {
		case 0 : s = v.toString(); break;
		case 1 : s = v.toFixed(obj.fract); break;
		case 2 : s = v.toPrecision(obj.fract); break;
		case 3 : s = v.toExponential(obj.fract); break;
	}
	obj.input.value = s;
}

PlusMinus.prototype.onPlusDown = function() {
	var obj = this;
	var v = obj.value + obj.step;
	obj.setValue(v);
	obj.tId = setTimeout(function(){obj.onPlusDown()}, 150);
}

PlusMinus.prototype.onPlusUp = function() {
	var obj = this;
	clearTimeout(obj.tId);
}

PlusMinus.prototype.onMinusDown = function() {
	var obj = this;
	var v = obj.value - obj.step;
	obj.setValue(v);
	obj.tId = setTimeout(function(){obj.onMinusDown()}, 150);
}

PlusMinus.prototype.onMinusUp = function() {
	var obj = this;
	clearTimeout(obj.tId);
}

PlusMinus.prototype.readValue = function() {
	var obj = this;
	var v = Number(obj.input.value);
	if(isNaN(v))
		v = obj.value;
	obj.setValue(v);
}

PlusMinus.prototype.onEnter = function(evt) {
	var obj = this;
	if(evt.keyCode == 13)
		obj.readValue();
}

PlusMinus.prototype.getValue = function() {
	var obj = this;
	return obj.value;
}

PlusMinus.prototype.setValue = function(v) {
	var obj = this;
	if(v < obj.min)
		v = obj.min;
	if(v > obj.max)
		v = obj.max;
	obj.value = v;
	obj.updateInput();
	if(obj.callback != null)
		obj.callback();
}

Radio.prototype.value = 0;

function Radio(btn_value, off_img, on_img, callback) {
	var obj = this;
	obj.btn_value = btn_value;
	obj.off_img = new Image();
	obj.off_img.src = off_img;
	obj.on_img = new Image();
	obj.on_img.src = on_img;
	obj.callback = callback;
	
	obj.updateState();
	
	for(var i in obj.btn_value) {
		var btn = obj.btn_value[i][0];
		var value = obj.btn_value[i][1];
		eval('btn.onclick = function() {obj.onBtnClick(obj.btn_value[' + i + '][1])};');
		if(obj.btn_value[i].length > 2) {
			var lbl = obj.btn_value[i][2];
			eval('lbl.onclick = function() {obj.onBtnClick(obj.btn_value[' + i + '][1])};');
		}
	};
}

Radio.prototype.getValue = function() {
	var obj = this;
	return obj.value;
}

Radio.prototype.setValue = function(v) {
	var obj = this;
	obj.value = v;
	obj.updateState();
	if(obj.callback != null)
		obj.callback();
}

Radio.prototype.onBtnClick = function(v) {
	var obj = this;
	obj.setValue(v);
}

Radio.prototype.updateState = function() {
	var obj = this;
	for(var i in obj.btn_value) {
		var btn = obj.btn_value[i][0];
		var value = obj.btn_value[i][1];
		btn.src = obj.value == value ? obj.on_img.src : obj.off_img.src;
	};
}

var mouse_down_lis = new Array();
var mouse_move_lis = new Array();
var mouse_up_lis = new Array();
var consumeEvent = false;

function addMouseDown(lis) {
	mouse_down_lis.push(lis);
}

function addMouseMove(lis) {
	mouse_move_lis.push(lis);
}

function addMouseUp(lis) {
	mouse_up_lis.push(lis);
}

document.onmousedown = onMouseDown;
document.onmousemove = onMouseMove;
document.onmouseup = onMouseUp;

function dispatch(evt, arr) {
	if(!evt)
		evt = event;
	for(var i in arr) {
		var lis = arr[i];
		consumeEvent = false;
		lis(evt);
		if(consumeEvent)
			break;
	}
}

function onMouseDown(evt) {
	dispatch(evt, mouse_down_lis);
}

function onMouseMove(evt) {
	dispatch(evt, mouse_move_lis);
}

function onMouseUp(evt) {
	dispatch(evt, mouse_up_lis);
}

var key_down_lis = new Array();
var key_up_lis = new Array();
document.onkeydown = onKeyDown;
document.onkeyup = onKeyUp;

function onKeyDown(evt) {
	dispatch(evt, key_down_lis);
}

function onKeyUp(evt) {
	dispatch(evt, key_up_lis);
}

function addKeyDown(lis) {
	key_down_lis.push(lis);
}

function addKeyUp(lis) {
	key_up_lis.push(lis);
}

function getRequest() {
    var request;
    if(window.ActiveXObject) {
        request = new ActiveXObject("Microsoft.XMLHTTP");
    } else
    if(window.XMLHttpRequest) {
        request = new XMLHttpRequest();
    };
    return request;
}

function getResponseXML(request) {
   var response;
   if (document.implementation && document.implementation.createDocument)
   {
	response = request.responseXML.documentElement;
	
	if(!response.querySelector)
		response = new DOMParser().parseFromString(request.responseText, "application/xml");
   }
   else
   {
     var doc = new ActiveXObject("MSXML2.DOMDocument");
     doc.loadXML(request.responseText);
     response = doc.documentElement;
   }
   return response;
}

function createBlankDocument() {
   if (document.implementation && document.implementation.createDocument)
   {
           return document.implementation.createDocument("", "", null);
   }
   else
   {
     return new ActiveXObject("MSXML2.DOMDocument");
   }
}

function xml2String(doc) {
   if (document.implementation && document.implementation.createDocument)
   {
       var serializer = new XMLSerializer();
       return serializer.serializeToString(doc);
   }
   else
   {
     return doc.xml;
   }
}

function string2xml(s) {
    try {
        var parser = new DOMParser();
        return parser.parseFromString(s, 'text/xml');
    } catch(e) {
        var xml = createBlankDocument();
        xml.async = 'false';
        xml.loadXML(s);
        return xml;
    };
}

function parseScripts(html) {
	var start = 0;
	while((start = html.indexOf('<script', start)) != -1) {
		start = html.indexOf('>', start + 1) + 1;
		var end = html.indexOf('</script>', start);
		var code = html.substring(start, end);
		var myscript = document.createElement('script');
		myscript.type = 'text/javascript';
		myscript.text = code;
		document.body.appendChild(myscript);
		start = end + 1;
	};
}

var _GET = new Array();
{
	var a = location.search.substr(1).split('&');
	for(var i in a) {
		var a2 = a[i].split('=');
		_GET[decodeURIComponent(a2[0])] = a2.length == 2 ? decodeURIComponent(a2[1]) : null;
	}
}
