Debug.prototype.debug_on = location.href.indexOf('http://localhost') != -1;

Debug.prototype.dbg_undermouse_elm = null;
Debug.prototype.dbg_high_elm = null;

Debug.prototype.dbg_move_elms = new Array();
Debug.prototype.dbg_move_high = true;
Debug.prototype.draft_sheets = new Array();
Debug.prototype.sheetmd5s = new Array();

function utf8_encode ( str_data ) {	// Encodes an ISO-8859-1 string to UTF-8
	// 
	// +   original by: Webtoolkit.info (http://www.webtoolkit.info/)

	str_data = str_data.replace(/\r\n/g,"\n");
	var utftext = "";

	for (var n = 0; n < str_data.length; n++) {
		var c = str_data.charCodeAt(n);
		if (c < 128) {
			utftext += String.fromCharCode(c);
		} else if((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		} else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}
	}

	return utftext;
}

function md5 ( str ) {	// Calculate the md5 hash of a string
	// 
	// +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
	// + namespaced by: Michael White (http://crestidg.com)

	var RotateLeft = function(lValue, iShiftBits) {
			return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits));
		};

	var AddUnsigned = function(lX,lY) {
			var lX4,lY4,lX8,lY8,lResult;
			lX8 = (lX & 0x80000000);
			lY8 = (lY & 0x80000000);
			lX4 = (lX & 0x40000000);
			lY4 = (lY & 0x40000000);
			lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
			if (lX4 & lY4) {
				return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
			}
			if (lX4 | lY4) {
				if (lResult & 0x40000000) {
					return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
				} else {
					return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
				}
			} else {
				return (lResult ^ lX8 ^ lY8);
			}
		};

	var F = function(x,y,z) { return (x & y) | ((~x) & z); };
	var G = function(x,y,z) { return (x & z) | (y & (~z)); };
	var H = function(x,y,z) { return (x ^ y ^ z); };
	var I = function(x,y,z) { return (y ^ (x | (~z))); };

	var FF = function(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

	var GG = function(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

	var HH = function(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

	var II = function(a,b,c,d,x,s,ac) {
			a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
			return AddUnsigned(RotateLeft(a, s), b);
		};

	var ConvertToWordArray = function(str) {
			var lWordCount;
			var lMessageLength = str.length;
			var lNumberOfWords_temp1=lMessageLength + 8;
			var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
			var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
			var lWordArray=Array(lNumberOfWords-1);
			var lBytePosition = 0;
			var lByteCount = 0;
			while ( lByteCount < lMessageLength ) {
				lWordCount = (lByteCount-(lByteCount % 4))/4;
				lBytePosition = (lByteCount % 4)*8;
				lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount)<<lBytePosition));
				lByteCount++;
			}
			lWordCount = (lByteCount-(lByteCount % 4))/4;
			lBytePosition = (lByteCount % 4)*8;
			lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
			lWordArray[lNumberOfWords-2] = lMessageLength<<3;
			lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
			return lWordArray;
		};

	var WordToHex = function(lValue) {
			var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
			for (lCount = 0;lCount<=3;lCount++) {
				lByte = (lValue>>>(lCount*8)) & 255;
				WordToHexValue_temp = "0" + lByte.toString(16);
				WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
			}
			return WordToHexValue;
		};

	var x=Array();
	var k,AA,BB,CC,DD,a,b,c,d;
	var S11=7, S12=12, S13=17, S14=22;
	var S21=5, S22=9 , S23=14, S24=20;
	var S31=4, S32=11, S33=16, S34=23;
	var S41=6, S42=10, S43=15, S44=21;

	str = this.utf8_encode(str);
	x = ConvertToWordArray(str);
	a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;

	for (k=0;k<x.length;k+=16) {
		AA=a; BB=b; CC=c; DD=d;
		a=FF(a,b,c,d,x[k+0], S11,0xD76AA478);
		d=FF(d,a,b,c,x[k+1], S12,0xE8C7B756);
		c=FF(c,d,a,b,x[k+2], S13,0x242070DB);
		b=FF(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
		a=FF(a,b,c,d,x[k+4], S11,0xF57C0FAF);
		d=FF(d,a,b,c,x[k+5], S12,0x4787C62A);
		c=FF(c,d,a,b,x[k+6], S13,0xA8304613);
		b=FF(b,c,d,a,x[k+7], S14,0xFD469501);
		a=FF(a,b,c,d,x[k+8], S11,0x698098D8);
		d=FF(d,a,b,c,x[k+9], S12,0x8B44F7AF);
		c=FF(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
		b=FF(b,c,d,a,x[k+11],S14,0x895CD7BE);
		a=FF(a,b,c,d,x[k+12],S11,0x6B901122);
		d=FF(d,a,b,c,x[k+13],S12,0xFD987193);
		c=FF(c,d,a,b,x[k+14],S13,0xA679438E);
		b=FF(b,c,d,a,x[k+15],S14,0x49B40821);
		a=GG(a,b,c,d,x[k+1], S21,0xF61E2562);
		d=GG(d,a,b,c,x[k+6], S22,0xC040B340);
		c=GG(c,d,a,b,x[k+11],S23,0x265E5A51);
		b=GG(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
		a=GG(a,b,c,d,x[k+5], S21,0xD62F105D);
		d=GG(d,a,b,c,x[k+10],S22,0x2441453);
		c=GG(c,d,a,b,x[k+15],S23,0xD8A1E681);
		b=GG(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
		a=GG(a,b,c,d,x[k+9], S21,0x21E1CDE6);
		d=GG(d,a,b,c,x[k+14],S22,0xC33707D6);
		c=GG(c,d,a,b,x[k+3], S23,0xF4D50D87);
		b=GG(b,c,d,a,x[k+8], S24,0x455A14ED);
		a=GG(a,b,c,d,x[k+13],S21,0xA9E3E905);
		d=GG(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
		c=GG(c,d,a,b,x[k+7], S23,0x676F02D9);
		b=GG(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
		a=HH(a,b,c,d,x[k+5], S31,0xFFFA3942);
		d=HH(d,a,b,c,x[k+8], S32,0x8771F681);
		c=HH(c,d,a,b,x[k+11],S33,0x6D9D6122);
		b=HH(b,c,d,a,x[k+14],S34,0xFDE5380C);
		a=HH(a,b,c,d,x[k+1], S31,0xA4BEEA44);
		d=HH(d,a,b,c,x[k+4], S32,0x4BDECFA9);
		c=HH(c,d,a,b,x[k+7], S33,0xF6BB4B60);
		b=HH(b,c,d,a,x[k+10],S34,0xBEBFBC70);
		a=HH(a,b,c,d,x[k+13],S31,0x289B7EC6);
		d=HH(d,a,b,c,x[k+0], S32,0xEAA127FA);
		c=HH(c,d,a,b,x[k+3], S33,0xD4EF3085);
		b=HH(b,c,d,a,x[k+6], S34,0x4881D05);
		a=HH(a,b,c,d,x[k+9], S31,0xD9D4D039);
		d=HH(d,a,b,c,x[k+12],S32,0xE6DB99E5);
		c=HH(c,d,a,b,x[k+15],S33,0x1FA27CF8);
		b=HH(b,c,d,a,x[k+2], S34,0xC4AC5665);
		a=II(a,b,c,d,x[k+0], S41,0xF4292244);
		d=II(d,a,b,c,x[k+7], S42,0x432AFF97);
		c=II(c,d,a,b,x[k+14],S43,0xAB9423A7);
		b=II(b,c,d,a,x[k+5], S44,0xFC93A039);
		a=II(a,b,c,d,x[k+12],S41,0x655B59C3);
		d=II(d,a,b,c,x[k+3], S42,0x8F0CCC92);
		c=II(c,d,a,b,x[k+10],S43,0xFFEFF47D);
		b=II(b,c,d,a,x[k+1], S44,0x85845DD1);
		a=II(a,b,c,d,x[k+8], S41,0x6FA87E4F);
		d=II(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
		c=II(c,d,a,b,x[k+6], S43,0xA3014314);
		b=II(b,c,d,a,x[k+13],S44,0x4E0811A1);
		a=II(a,b,c,d,x[k+4], S41,0xF7537E82);
		d=II(d,a,b,c,x[k+11],S42,0xBD3AF235);
		c=II(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
		b=II(b,c,d,a,x[k+9], S44,0xEB86D391);
		a=AddUnsigned(a,AA);
		b=AddUnsigned(b,BB);
		c=AddUnsigned(c,CC);
		d=AddUnsigned(d,DD);
	}

	var temp = WordToHex(a)+WordToHex(b)+WordToHex(c)+WordToHex(d);

	return temp.toLowerCase();
}

function Debug() {};

Debug.prototype.init = function() {
	document.addEventListener('mousemove', this.dbg_mouse_move.bind(this), false);
	document.addEventListener('mousedown', this.dbg_mouse_down.bind(this), false);
	document.addEventListener('keydown', this.dbg_key_down.bind(this), false);
	document.addEventListener('keyup', this.dbg_key_up.bind(this), false);
	window.addEventListener('load', this.onload.bind(this), false);
}

Debug.prototype.onload = function() {
	with(this) {
		for(var m = 0; m < document.styleSheets.length; m++) {
			var sh = document.styleSheets[m];
			if(sh.href != null) {
				var txt = '';
				rules = sh[document.all ? 'rules' : 'cssRules'];
				for(var i = 0; i < rules.length; i++)
					txt += rules[i].cssText + '\n';
				sheetmd5s[sh.href] = md5(txt);
			}
		}	
	}
}

Debug.prototype.get_css = function(selectorText){
	with(this) {
	  var CSSstyle = null, rules;
	  var m = 0;
	  for(;m < document.styleSheets.length && CSSstyle == null; m++) {
		rules = document.styleSheets[m][document.all ? 'rules' : 'cssRules'];
		for(var n = 0; n < rules.length && CSSstyle == null; n++) {
			if(rules[n].selectorText == selectorText)
				CSSstyle = rules[n].style;
		}
	  };
	  m--;
	  if(CSSstyle == null) {
		  document.styleSheets[m].insertRule(selectorText + ' {position:absolute;left:0px;top:0px}', rules.length);
		  CSSstyle = rules[rules.length - 1];
	  }
	  var i = 0;
	  for(; i < draft_sheets.length && draft_sheets[i] != document.styleSheets[m]; i++);
	  if(i == draft_sheets.length)
		draft_sheets.push(document.styleSheets[m]);
	  
	  if(CSSstyle['position'] != 'absolute')
		  CSSstyle['position'] = 'absolute';
	  if(CSSstyle['left'] == '')
		  CSSstyle['left'] = '0px';
	  if(CSSstyle['top'] == '')
		  CSSstyle['top'] = '0px';
	  return CSSstyle;
	}
}

Debug.prototype.dbg_mouse_move = function(evt) {
	with(this) {
		if(!debug_on)
			return;
		
		if(evt.ctrlKey) {
	//		var src = evt.srcElement ? evt.srcElement : evt.target;
			var src = document.elementFromPoint(evt.clientX, evt.clientY);
			dbg_undermouse_elm = src;
			dbg_highlight_elm(src);
		} else if(dbg_undermouse_elm != null) {
			dbg_undermouse_elm = null;
			dbg_highlight_elm(null);
		}
	}
}

Debug.prototype.dbg_mouse_down = function(evt) {
	with(this) {
		if(!debug_on)
			return;
		if(evt.ctrlKey && !evt.shiftKey) { //Add
			var i = 0;
			for(; i < dbg_move_elms.length && dbg_move_elms[i][0] != dbg_high_elm[0]; i++);
			if(i == dbg_move_elms.length) {
				dbg_move_elms.push([dbg_high_elm[0], dbg_high_elm[1]]);
				dbg_update_move_elms();
			}
			evt.preventDefault();
		} else if(evt.ctrlKey && evt.shiftKey){ //Remove
			var i = 0;
			for(; i < dbg_move_elms.length && dbg_move_elms[i][0] != dbg_high_elm[0]; i++);
			if(i < dbg_move_elms.length) {
				dbg_high_elm[1] = dbg_move_elms[i][1];
				dbg_move_elms.splice(i, 1);
				dbg_update_move_elms();
			}
			evt.preventDefault();
		}
	}
}
	
Debug.prototype.dbg_highlight_elm = function(elm) {
	with(this) {
		if(dbg_high_elm != null) {
			var i = 0;
			for(; i < dbg_move_elms.length && dbg_move_elms[i][0] != dbg_high_elm[0]; i++);
			dbg_high_elm[0].style.boxShadow = i < dbg_move_elms.length && dbg_move_high ? '0 0 2px 2px red' : dbg_high_elm[1];
		};
		if(elm != null) {
			var i = 0;
			for(; i < dbg_move_elms.length && dbg_move_elms[i][0] != elm; i++);
			dbg_high_elm = [elm, i < dbg_move_elms.length ? dbg_move_elms[i][1] : elm.style.boxShadow];
			elm.style.boxShadow = '0 0 2px 2px blue';
			console.log(elm);
		} else
			dbg_high_elm = null;
	}
}

Debug.prototype.dbg_key_up = function(evt) {
	with(this) {
		if(!debug_on)
			return;
		if(evt.keyCode == 17) { //Ctrl
			dbg_highlight_elm(null);
		}
	}
}

Debug.prototype.dbg_key_down = function(evt) {
	with(this) {
		if(!debug_on)
			return;

		var kc = evt.keyCode;
		if(kc == 13 && evt.ctrlKey) { //Enter (the same as Mouse click)
			var i = 0;
			for(; i < dbg_move_elms.length && dbg_move_elms[i][0] != dbg_high_elm[0]; i++);
			if(i == dbg_move_elms.length) {
				dbg_move_elms.push([dbg_high_elm[0], dbg_high_elm[1]]);
				dbg_update_move_elms();
			}
			evt.preventDefault();
		}
		if(kc == 45) { //Ins
			if(dbg_undermouse_elm != null) {
				var par = dbg_high_elm[0].parentNode;
				if(par.nodeName != 'HTML')
					dbg_highlight_elm(par);
				evt.preventDefault();
			}
		}
		if(kc == 46) { //Del
			if(dbg_undermouse_elm != null) {
				if(dbg_high_elm[0] != dbg_undermouse_elm) {
					var elm = dbg_undermouse_elm;
					while(elm.parentNode != dbg_high_elm[0] && elm.nodeName != 'HTML')
						elm = elm.parentNode;
					dbg_highlight_elm(elm);
				};
				evt.preventDefault();
			}
		}
		if(kc == 112) { //F1
			if(dbg_undermouse_elm != null) {
				var nxt = dbg_high_elm[0];
				while((nxt = nxt.nextSibling) != null && nxt.nodeType != 1);
				if(nxt != null)
					dbg_highlight_elm(nxt);
				evt.preventDefault();
			}
		}
		if(kc == 113) { //F2
			if(dbg_undermouse_elm != null) {
				var nxt = dbg_high_elm[0];
				while((nxt = nxt.previousSibling) != null && nxt.nodeType != 1);
				if(nxt != null)
					dbg_highlight_elm(nxt);
				evt.preventDefault();
			}
		}
		if(kc == 106) { //Asterisk
			dbg_move_high = !dbg_move_high;
			dbg_update_move_elms();
			evt.preventDefault();
		}
		if(kc >= 37 && kc <= 40) { //Arrows
			var dx = kc == 37 ? -1 : (kc == 39 ? 1 : 0);
			var dy = kc == 38 ? -1 : (kc == 40 ? 1 : 0);
			if(evt.shiftKey) {
				dx *= 10;
				dy *= 10;
			};
			for(var i in dbg_move_elms) {
				var elm = dbg_move_elms[i][0];
				var css_r = get_css('#' + elm.id);
				if(!evt.altKey) {
					css_r['left'] = (parseInt(css_r['left']) + dx) + 'px';
					css_r['top'] = (parseInt(css_r['top']) + dy) + 'px';
				} else {
					if(css_r['width'] == '')
						css_r['width'] = '0px';
					if(css_r['height'] == '')
						css_r['height'] = '0px';
					css_r['width'] = (parseInt(css_r['width']) + dx) + 'px';
					css_r['height'] = (parseInt(css_r['height']) + dy) + 'px';
				}
			}
			evt.preventDefault();
		}
		if(kc == 111) { // Slash /
			for(var i in dbg_move_elms) {
				var elm = dbg_move_elms[i];
				elm[0].style.boxShadow = elm[1];
			}
			dbg_move_elms = new Array();
			dbg_move_high = true;
			dbg_undermouse_elm = null;
			dbg_highlight_elm(null);
			evt.preventDefault();
		}
		if(kc == 83 && evt.altKey) { //S
			if(evt.ctrlKey)
				save_all_sheets();
			else
				save_all_draft_sheets();
		}
		if(kc == 67 && evt.altKey) { //C
			if(dbg_move_elms.length > 0)
				copyHTMLCSS(0);
		}
		if(kc == 88 && evt.altKey) { //X
			if(dbg_move_elms.length > 0)
				copyHTMLCSS(1);
		}
		if(kc == 86 && evt.altKey) { //V
			if(dbg_move_elms.length > 0)
				copyHTMLCSS(2);
		}
	}
}

Debug.prototype.dbg_update_move_elms = function() {
	with(this) {
		for(var i in dbg_move_elms) {
			var elm = dbg_move_elms[i];
			elm[0].style.boxShadow = dbg_move_high ? '0 0 2px 2px red' : elm[1];
		}
	}
}

Debug.prototype.save_all_sheets = function() {
	with(this) {
		for(var m = 0; m < document.styleSheets.length; m++)
			save_sheet(document.styleSheets[m]);
		draft_sheets = new Array();
	}
}

Debug.prototype.save_all_draft_sheets = function() {
	with(this) {
/*		for(var i = 0; i < draft_sheets.length; i++)
			save_sheet(draft_sheets[i]);
		draft_sheets = new Array();*/
		for(var m = 0; m < document.styleSheets.length; m++) {
			var sh = document.styleSheets[m];
			if(sh.href != null) {
				var txt = '';
				rules = sh[document.all ? 'rules' : 'cssRules'];
				for(var i = 0; i < rules.length; i++)
					txt += rules[i].cssText + '\n';
				if(sheetmd5s[sh.href] != md5(txt))
					save_sheet(sh);
			}
		}	
	}
}

Debug.prototype.save_sheet = function(sh) {
	with(this) {
		var txt = '';
		rules = sh[document.all ? 'rules' : 'cssRules'];
		for(var i = 0; i < rules.length; i++)
			txt += rules[i].cssText + '\n';
		
		var f = sh.href.replace(/^.+localhost\//, '');
		var params = 'file=' + encodeURIComponent(f) + '&';
		params += 'content=' + encodeURIComponent(txt) + '&';
		var req = getRequest();
		req.onreadystatechange = function() {onSaveSheet(req, f, sh, md5(txt))};
		req.open('post', '/debug_file.php', true);
		req.setRequestHeader('If-Modified-Since', 'Sat, 01 Jan 2000 00:00:00 GMT');
		req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
		req.send(params);
	}
}

Debug.prototype.onSaveSheet = function(request, f, sh, h) {
	with(this) {
		if(request.readyState == 4)
			if(request.status == 200) {
				sheetmd5s[sh.href] = h;
				alert('Save file: ' + f);
			} else
				alert('Save failed!');
	}
}

Debug.prototype.genId = function() {
	with(this) {
		var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var s = 'e';
		for(var i = 0; i < 20; i++)
			s += chars.charAt(Math.round(Math.random() * chars.length) - 1);
		return s;
	}
}

Debug.prototype.copyHTMLCSS = function(mode) {
	with(this) {
		var baseURL = location.href.substr(0, location.href.lastIndexOf('/') + 1);
		baseURL = baseURL.replace(/(\/|\.)/g, '\\$1');
		var s1 = '', s2 = '';
		var n_elms = [];
		
		for(var i in dbg_move_elms) {
			var node = dbg_move_elms[i][0];
			var html = node.outerHTML;
			html = html.replace(new RegExp(baseURL, 'g'), '');
			html = html.replace(/box-shadow: 0px 0px 2px 2px red;/g, '');
			html = html.replace(/ style=""/g, '');

			var rules = [];
			findRules(node, rules);
			for(var i = 0; i < rules.length; i++) {
				var css = rules[i][1].cssText;
				var id, nId;
				if(mode > 0) {
					id = rules[i][0];
					nId = genId();
					html = html.replace(new RegExp(id, 'g'), nId);
					css = css.replace(new RegExp(id, 'g'), nId);
				};
				if(mode == 2) {
					var sh = rules[i][1].parentStyleSheet;
					var rs = sh[document.all ? 'rules' : 'cssRules'];
					sh.insertRule(css, rs.length);
				}
				s2 += css + "\n";
			};
			s1 += html + "\n";
			if(mode == 2) {
				var n = document.createElement('div');
				node.parentNode.insertBefore(n, node.nextSibling);
				n.outerHTML = html;
				n_elms.push(node.nextSibling);
			};
		}

	
		if(mode == 2) {
			for(var i in dbg_move_elms) {
				var elm = dbg_move_elms[i];
				elm[0].style.boxShadow = elm[1];
			}
			dbg_move_elms = new Array();
			dbg_move_high = true;
			dbg_undermouse_elm = null;
			dbg_highlight_elm(null);
			
			for(var i in n_elms) {
				var elm = n_elms[i];
				dbg_move_elms.push([elm, elm.style.boxShadow]);
			};
			dbg_update_move_elms();
		}
		
		var div = document.createElement('div');
		div.setAttribute('id', 'debug_alert');
		div.style = 'position:absolute;left:100px;top:50px;border:1px solid black;background:white;text-align:center;z-index:1000;padding:10px';
		document.body.appendChild(div);
		var h = '<textarea id="debug_text1" cols="30" rows="10">' + s1 + '</textarea><br/>';
		if(mode < 2)
			h += '<textarea id="debug_text2" cols="30" rows="10">' + s2 + '</textarea><br/>';
		h += '<input type="button" value="OK" onclick="debug_module.close_alert()"/>';
		div.innerHTML = h;
		if(mode < 2)
			document.querySelector('#debug_text2').select();
		document.querySelector('#debug_text1').select();
	}
}

Debug.prototype.close_alert = function() {
	with(this) {
		document.body.removeChild(document.querySelector('#debug_alert'));
	}
}

Debug.prototype.findRules = function(node, r) {
	with(this) {
		var id = node.getAttribute('id');
		if(id != null) {
			var rule = findRule(id);
			if(rule != null)
				r.push([id, rule]);
		};
		for(var i = 0; i < node.childNodes.length; i++)
			if(node.childNodes[i].nodeType == Node.ELEMENT_NODE)
				findRules(node.childNodes[i], r);
	}
}

Debug.prototype.findRule = function(id) {
	with(this) {
		var r = null;
	    for(var m = 0; m < document.styleSheets.length && r == null; m++) {
			var rules = document.styleSheets[m][document.all ? 'rules' : 'cssRules'];
			for(var n = 0; n < rules.length && r == null; n++) {
				if(rules[n].selectorText == '#' + id)
					r = rules[n];
			}
		};
		return r;
	}
}

Debug.prototype.sel_from_inspector = function(elm) {
	with(this) {
		var i = 0;
		for(; i < dbg_move_elms.length && dbg_move_elms[i][0] != elm; i++);
		if(i == dbg_move_elms.length) {
			dbg_move_elms.push([elm, elm.style.boxShadow]);
			dbg_update_move_elms();
		}
	}
}

var debug_module = new Debug();
debug_module.init();
