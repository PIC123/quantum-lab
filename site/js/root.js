
let  nomer_exit=0
let name_menu_click=null
let number_frame=1
function menu_click(name)
    {
        var container = document.querySelector('#menu1'); // или другой селектор
        var divs = container.querySelectorAll('div');
            divs.forEach(div => {
            div.classList.remove('menu_active');
            });


        container = document.querySelector('#menu2'); // или другой селектор
        divs = container.querySelectorAll('a');
          divs.forEach(div => {
            div.classList.remove('menu_active');
            });

      // document.getElementById(name).classList.add('menu_active');
      // document.getElementById(name+2).classList.add('menu_active');
      //   document.querySelector('#block_selection').style.display="block"
        name_menu_click=name
                
        
        var fl= document.querySelector('#block_tabs').style.display=="none"?false:true
        if(fl)            open_block()
        else document.querySelector('#block_selection').style.display="block"
    }

function open_block()
  { console.log("open_block")
      switch (name_menu_click) {
          case "equipment":
            open_page("content/quantum_computer/index.htm")// код для значения1
            break;
          case "diagram":
            open_page("diagram.htm") // open_diagram()// код для значения1
          break;
          case "simulation":
            open_page("content/sim4/") // open_diagram()// код для значения1
          break;
          case "vlabs":
            open_page("labs/") // guided experiments module (see docs/AUDIT.md)
          break;
        }
  }

function select_block(ind)
{
      number_frame=ind
      open_block()
      document.querySelector('#block_selection').style.display="none"
  
}

function open_page(url)
{
var fl= document.querySelector('#block_tabs').style.display=="none"?false:true
   console.log(url)
    document.querySelector("#block"+number_frame+" .but4").classList.remove('no_active_dis'); 
    document.getElementById("frame"+number_frame).innerHTML="<iframe class='load_frame' src='"+url+ "' allow='fullscreen' loading='lazy' scrolling='no'></iframe>"
    
    block_nomer(true, number_frame)
    if(!fl)
      {  
      if( document.getElementById("block"+number_frame).style.display=="none")
        { document.getElementById("block"+number_frame).style.display="block"
            update_block()
        }
      } 
}

/*

function open_equipment()
{
var fl= document.querySelector('#block_tabs').style.display=="none"?false:true
   
    document.querySelector("#block"+number_frame+" .but4").classList.remove('no_active_dis'); 
    document.getElementById("frame"+number_frame).innerHTML="<iframe class='load_frame' src='https://atelearning.com/Testbed/quantum_computer/index.htm' allow='fullscreen' loading='lazy' scrolling='no'></iframe>"
    
    block_nomer(true, number_frame)
    if(!fl)
      {  
      if( document.getElementById("block"+number_frame).style.display=="none")
        { document.getElementById("block"+number_frame).style.display="block"
            update_block()
        }
      } 
}
*/

function open_diagram()
{
var fl= document.querySelector('#block_tabs').style.display=="none"?false:true
   
    document.querySelector("#block"+number_frame+" .but4").classList.remove('no_active_dis'); 
    document.getElementById("frame"+number_frame).innerHTML="<iframe class='load_frame' src='diagram.htm' allow='fullscreen' loading='lazy' scrolling='no'></iframe>"
    
    block_nomer(true, number_frame)
    if(!fl)
      {  
      if( document.getElementById("block"+number_frame).style.display=="none")
        { document.getElementById("block"+number_frame).style.display="block"
            update_block()
        }
      } 
}



function init()
{
    jQuery("#line1").draggable({drag: handleDrag, stop: function(event) { stop_drag(event)}, containment: 'parent', axis: "x"});
    jQuery("#line3").draggable({ drag: handleDrag, stop: function(event) { stop_drag(event)}, containment: 'parent', axis: "x"});
    jQuery("#line2").draggable({ drag: handleDrag_y,containment: 'parent', axis: "y"});
    document.querySelectorAll('#block_frame .but4' ).forEach(function(e) { e.classList.add('no_active_dis'); });
}


function handleDrag_y( event, ui ) {
	ui.position.top=ui.position.top;
  var el=event.target
      for(i=1;i<=3;i++)
      {el=el.nextElementSibling
        el.style.top=	ui.position.top+4
        el.style.height =parseFloat(jQuery("#block_frame").css('height'))-ui.position.top-4
      }

  var el=event.target
      for(i=1;i<=3;i++)
      {el=el.previousElementSibling
        el.style.height =ui.position.top
      }

}

 function handleDrag( event, ui ) {
	ui.position.left=ui.position.left;
  ui.position.top=parseInt(event.target.style.top)

  var w_b=parseFloat(jQuery("#block_frame").css('width'))
  var lin_poz=ui.position.left

  var proch=((lin_poz/w_b)*100)
  var el=event.target
  el.style.left="calc("+proch+"% - 3px)"
  el.previousElementSibling.style.width="calc("+proch+"%)"
  el.nextElementSibling.style.left="calc("+proch+"% + 6px)"
  el.nextElementSibling.style.width ="calc("+(100-proch)+"% - 3px)"
}

//var startDrag
function stop_drag(event,ui)
{
    var el=event.target
    event.target.style.left=el.previousElementSibling.style.width
}




var obx_zom= new Object
function zoom_block(el)
{
      obj=el.parentNode.parentNode 
      obj.setAttribute("zoom",obj.getAttribute("zoom")=="false"?"true":"false")
      if(obj.getAttribute("zoom")=="true")
        {
          el.setAttribute("src","images/but2_2.png")
        obx_zom.width=obj.style.width
        obx_zom.height=obj.style.height
        obx_zom.top=obj.style.top
        obx_zom.left=obj.style.left
        obj.style.zIndex="20"
        obj.style.width="100%"
        obj.style.height="100%"
        obj.style.top="0px"
        obj.style.left="0px"
      }

      else
      {   obj.style.zIndex="1"
        el.setAttribute("src","images/but2_1.png")
        obj.style.width=obx_zom.width
        obj.style.height=obx_zom.height
        obj.style.top=obx_zom.top
        obj.style.left=obx_zom.left
      }
}

function close_block(obj,ind)
{       nomer_exit=ind

    document.querySelector('#frame'+nomer_exit).innerHTML=""
    // document.querySelectorAll("#rad_pan .rad")[nomer_exit-1].classList.remove('no_active');
   //  document.querySelectorAll("#block_selection .cl_block")[nomer_exit-1].classList.remove('no_active');
     block_nomer(false, nomer_exit)




 obj.parentNode.parentNode.style.display='none'
  update_block()
}

function  update_block()
{
  
  fl1=document.querySelector('#block1').style.display=="block"?true:false
  fl2=document.querySelector('#block2').style.display=="block"?true:false
  fl3=document.querySelector('#block3').style.display=="block"?true:false
  fl4=document.querySelector('#block4').style.display=="block"?true:false 
  bl1= document.querySelector('#block1')
  bl2= document.querySelector('#block2')
  bl3= document.querySelector('#block3')
  bl4= document.querySelector('#block4')
console.log(fl1+"  "+fl2+"  "+fl3+"  "+fl4)
  document.querySelector('#line1').style.left="calc(50% - 3px)"
  document.querySelector('#line1').style.display=fl1==fl2 && fl1==true? "block":"none"
  document.querySelector('#block1').style.width=fl1==fl2 && fl1==true?"calc(50% - 3px)":jQuery("#block_frame").css('width')
  document.querySelector('#block1').style.height=fl3==fl4 && fl3==false?jQuery("#block_frame").css('height'):"calc(50% - 3px)"
  document.querySelector('#block2').style.width=fl1==fl2 && fl1==true?"calc(50% - 3px)":jQuery("#block_frame").css('width')
  document.querySelector('#block2').style.left=fl1==fl2 && fl1==true?"calc(50% + 3px)" :"0px"
  document.querySelector('#block2').style.height=fl3==fl4 && fl3==false?jQuery("#block_frame").css('height'):"calc(50% - 3px)"
  document.querySelector('#line1').style.height=fl3==fl4 && fl3==false?jQuery("#block_frame").css('height'):"calc(50% - 3px)"
  document.querySelector('#line3').style.height=fl1==fl2 && fl1==false?jQuery("#block_frame").css('height'):"calc(50% - 3px)"
  document.querySelector('#line3').style.top=fl1==fl2 && fl1==false?"0px":"calc(50% + 3px)"
  document.querySelector('#line3').style.display=fl3==fl4 && fl3==true? "block":"none"
  document.querySelector('#line3').style.left="calc(50% - 3px)"
  document.querySelector('#block3').style.height=fl1==fl2 && fl1==false?jQuery("#block_frame").css('height'):"calc(50% - 3px)"
  document.querySelector('#block3').style.width=fl3==fl4 && fl3==true?"calc(50% - 3px)":jQuery("#block_frame").css('width')
  document.querySelector('#block3').style.top=fl1==fl2 && fl1==false?"0px" :"calc(50%  + 3px)"
  document.querySelector('#block4').style.height=fl1==fl2 && fl1==false?jQuery("#block_frame").css('height'):"calc(50% - 3px)"
  document.querySelector('#block4').style.width=fl3==fl4 && fl3==true?"calc(50% - 3px)":jQuery("#block_frame").css('width')
  document.querySelector('#block4').style.left=fl3==fl4 && fl3==true?"calc(50% + 3px)" :"0px"
  document.querySelector('#block4').style.top=fl1==fl2 && fl1==false?"0px" :"calc(50%  + 3px)"

   if( (fl1==true || fl2==true) && (fl3==true || fl4==true)  )
   {
    document.querySelector('#line2').style.top="calc(50%  - 3px)"
    document.querySelector('#line2').style.display="block" 
   }
  else document.querySelector('#line2').style.display="none" 
}




function block_nomer(fl, numer)
{

  if(fl)
  {
     document.querySelectorAll("#block_selection .cl_block")[numer-1].classList.add('no_active1');
  }
  else
  {
      document.querySelectorAll("#block_selection .cl_block")[numer-1].classList.remove('no_active1');
  }
}





function exit_click(nomer)
{  
    document.getElementById("frame"+nomer).innerHTML=""
    document.querySelector('#block'+nomer+" .but4").classList.add('no_active_dis'); 
    block_nomer(false, nomer)
   
}


function panel()
{       document.querySelector('#block_selection').style.display="none"
 var fl=document.querySelector('#block_tabs').style.display=="none"?true:false


   document.querySelector('#block_tabs').style.display=fl?"block":"none"
   document.querySelector('#line1').style.display =fl?"none":"block"
   document.querySelector('#line2').style.display =fl?"none":"block"
   document.querySelector('#line3').style.display =fl?"none":"block"
   document.querySelector('#tabs_table').setAttribute("src",fl?"images/table_icon.png":"images/tabs_icon.png")
   //document.querySelector('#rad_pan').style.display =fl?"none":"block"
   
   for(var i=1; i<=4;i++)
          {  //document.querySelector('#block'+i+" .but1").style.display=fl?"none":"block" 
             document.querySelector('#block'+i+" .but3").style.display=fl?"none":"flex" 
             document.querySelector('#block'+i+" .but2").style.display=fl?"none":"flex" 
           //  document.querySelector('#block'+i+" .but4").style.left=fl?"100px":"35px"  
            }
   
    if(fl) 
        {
                      for(var i=1; i<=4;i++)
                        {
                          document.querySelector('#block'+i).style.left =0;
                          document.querySelector('#block'+i).style.top =0;
                          document.querySelector('#block'+i).style.width ="100%";
                          document.querySelector('#block'+i).style.height ="100%";
                        }
                    /*document.querySelectorAll('#block_frame iframe' ).forEach(function(e) {
                      e.style.width="100%"
                      e.style.margin="0px"
                              }    );*/
                 tab_click(1)
        }
        else
        {
                document.querySelector('#block1').style.display ="block";
                document.querySelector('#block2').style.display ="block";
                document.querySelector('#block3').style.display ="block";
                document.querySelector('#block4').style.display ="block";
                      
                document.querySelector('#block_frame #frame1' ).style.width="98%"  
                document.querySelector('#block_frame #frame2' ).style.width="98%"  
                document.querySelector('#block_frame #frame3' ).style.width="98%"  
                document.querySelector('#block_frame #frame4' ).style.width="98%"  

                document.querySelector('#block1 #frame1').style.margin="0 10px 10px 0px "
                document.querySelector('#block2 #frame2').style.margin="0 0px 0px 5px "
                document.querySelector('#block3 #frame3').style.margin="5 0px 0px 0px "
                document.querySelector('#block4 #frame4').style.margin="5 0px 0px 5px"
                update_block()
         }
  
}



function tab_click(ind)
{
            number_frame=ind
            document.querySelector('#tab1').className =ind==1?"active": '';
            document.querySelector('#tab2').className =ind==2?"active": '';
            document.querySelector('#tab3').className =ind==3?"active": '';
            document.querySelector('#tab4').className =ind==4?"active": '';
            document.querySelector('#block1').style.display =ind==1?"block": 'none';
            document.querySelector('#block2').style.display =ind==2?"block": 'none';
            document.querySelector('#block3').style.display =ind==3?"block": 'none';
            document.querySelector('#block4').style.display =ind==4?"block": 'none';

  
}