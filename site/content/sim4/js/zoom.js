//window.onresize=update_pozition_zoom;
var w =0 
window.onload=function ()
{
w= window.innerWidth;
update_pozition_zoom()

window.onresize = update_pozition_zoom; 
}
var 	scale=1;
function update_pozition_zoom()
{

	var w=910 // ������ ����
	var h=860 //������ ����

 width=document.body.clientWidth; // ������  
 height=document.body.clientHeight; // ������  

scale_w=parseInt(width)/parseInt(w)
scale_h=parseInt(height)/parseInt(h)

if(scale_w>scale_h)
scale=scale_h
else scale=scale_w

scale_div("main",scale)
}
function scale_div(name,number)
{	
	document.getElementById(name).style.margin=0

var marg=(document.body.clientWidth-(910*scale))/2

var obj = document.getElementById(name)
cssT="transform-origin:0px 0px;-ms-transform-origin:0px 0px;"

cssT+="-ms-transform:scale("+number+");";
cssT+="-webkit-transform:scale("+number+");";
cssT+="-o-transform:scale("+number+");";
cssT+="transform:scale("+number+");";
cssT+="left:"+marg+"px;"
//alert(cssT)
obj.style.cssText=cssT
}
