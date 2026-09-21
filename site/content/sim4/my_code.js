
const scene = new THREE.Scene();
var renderer
var camera 
var canvas
var cameraFar = 8;
var theModel;
var controls 
const MODEL_PATH =  "model/anim2.glb";
const BACKGROUND_COLOR = 0xe0f1ab;
var krishka
const _$ = (q, elm) => (elm ? elm : document).querySelector(q);
const _$$ = (q, elm) => (elm ? elm : document).querySelectorAll(q);
window._$ = _$;
window._$$ = _$$;
let slider6 
let output6  
let prevTime = Date.now();
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let anims;
let action_1
let Sharanim1
let Sharanim2
let Sharanim3
let animationsMap = {}
let hyperbolicParaboloid
let rotationSpeed = 0.02;
function init()
{

  let details = navigator.userAgent; 
  
  /* Creating a regular expression  
  containing some mobile devices keywords  
  to search it in details string*/
  let regexp = /android|iphone|kindle|ipad/i; 
    
  /* Using test() method to search regexp in details 
  it returns boolean value*/
  let isMobileDevice = regexp.test(details); 
    
  if (isMobileDevice) { 
      console.log("You are using a Mobile Device"); 
    var btn1 = document.getElementById("btn1"); // B1: element is commented out in the HTML
    if (btn1) btn1.style.fontSize="30px"
   
  } else { 
      console.log("You are using Desktop"); 
  }
  
  update_pozition_zoom()
window.onresize = update_pozition_zoom; 
  slider6 = document.querySelector("#panel4 #myRange1");
  output6 = document.querySelector("#panel4 #sliderValue3");
  output6.innerHTML = slider6.value;



        camera = new THREE.PerspectiveCamera(50, 570 /400, 0.1, 1000);
        camera.position.z = cameraFar;
        camera.position.x = 0;
        canvas = document.querySelector('#scene');
        // Инициализируем рендер
      //  renderer = new THREE.WebGLRenderer({canvas, antialias: true});
      const path = 'images/cube/';
      const format = '.jpg';
      const urls = [
        path + 'posx' + format, path + 'negx' + format,
        path + 'posy' + format, path + 'negy' + format,
        path + 'posz' + format, path + 'negz' + format
      ];
      cubemap = new THREE.CubeTextureLoader().load( urls );


        const gl_opt = { //Значения по умолчания в WebGLRenderer
          alpha: true,
          depth: true,
          stencil: true,
          antialias: true,
          premultipliedAlpha: true,
          preserveDrawingBuffer: false,
          powerPreference: 'default',
          failIfMajorPerformanceCaveat: false
        };
      gl_opt.alpha = true;
      gl_opt.antialias = true;
       
      gl = canvas.getContext("webgl2", gl_opt);
      
      const render_opt = 	gl_opt;
      render_opt.canvas = canvas;
      render_opt.context = gl;
      render_opt.precision = "highp";
    
      renderer = new THREE.WebGLRenderer(render_opt);
      renderer.setClearColor(new THREE.Color('lightgrey'), 0);
      renderer.setSize( 570, 400 );
      //renderer.setSize(window.innerWidth, window.innerHeight );
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.physicallyCorrectLights = true;

      renderer.shadowMap.enabled = true
     // window.addEventListener( 'resize', onWindowResize );
      //document.body.appendChild(renderer.domElement);
      scene.background = new THREE.Color(BACKGROUND_COLOR );
    
       
        var loader = new THREE.GLTFLoader();
        loader.load(MODEL_PATH, function( gltf ){
                        theModel = gltf.scene;
                        // Установить начальный масштаб отображения модели    
                        theModel.scale.set( 20 , 20 , 20 );
                        // немного сдвинем положение модели вдоль оси y
                       // theModel.position.y = -40 ;
                     //  theModel.position.z = -10 ;
                     //  theModel.scale.set(2,2,2);
                      //  theModel.rotation.y = Math.PI;
                        // Добавить модель в сцену
                        scene.add(theModel);
                     
                        mixer = new THREE.AnimationMixer(theModel);
                       // Сохраняем все анимации в словарь
                        gltf.animations.forEach((clip, index) => {
                          animationsMap[clip.name] = mixer.clipAction(clip);
                        });
                        anims=gltf.animations
                        anim1= anims.find(el => el['name'] == "седло_anim");

                        theModel.getObjectByName('Sphere1').visible=false
                        theModel.getObjectByName('Sphere2').visible=false
                        theModel.getObjectByName('Sphere3').visible=false

//action_1 = mixer.clipAction(anims.find(el => el['name'] == "седло_anim"))
Sharanim1 = mixer.clipAction(anims.find(el => el['name'] == "SharAnim1"))
Sharanim2 = mixer.clipAction(anims.find(el => el['name'] == "SharAnim2"))
Sharanim1.setLoop(THREE.LoopOnce)
Sharanim1.clampWhenFinished = true;

Sharanim3 = mixer.clipAction(anims.find(el => el['name'] == "SharAnim3"))
Sharanim3.setLoop(THREE.LoopOnce)
Sharanim3.clampWhenFinished = true;


add_click(_$('#start_anim'), start_anim); 
add_click(_$('#add_ball'), add_ball); 


slider6.oninput = function() {
  output6.innerHTML = this.value;
 
  update_speed()
}
                           
                        init_material()
                        animate();
                        giperboloid()
                       _$(' .loader').style.visibility = 'hidden';
                        }, function ( xhr ) {
                          const p = Math.round(xhr.loaded / xhr.total * 100) + '%';
                          _$(' .ldr_bar').style.width = p;
                          _$(' .ldr_txt').innerHTML = p;
                          console.log( p + ' loaded' );
                        }, function( error ){
                        console .error(error)
                        });

                                     
                 camera.position.set(45,40,100)
                 scene.add(camera)
                 controls = new THREE.OrbitControls( camera, renderer.domElement );
                 controls.maxPolarAngle = Math.PI/2 ;
                 controls.enablePan= false
                 controls.listenToKeyEvents( window );
                 console.log(controls)
        
 }
var sedlo_play=false
var ball_scene=false

function add_ball()
{  ball_scene=true
  theModel.getObjectByName('Sphere1').visible=false
  theModel.getObjectByName('Sphere2').visible=false
  theModel.getObjectByName('Sphere3').visible=false
 // theModel.getObjectByName('Sphere1').visible=true
  console.log(slider6.value)
  if(slider6.value<1.5)
    {    theModel.getObjectByName('Sphere1').visible=true ;Sharanim1.reset();   Sharanim1.play();}
  if(slider6.value>=1.5 &&  slider6.value<4)
    {   
      theModel.getObjectByName('Sphere2').visible=true ;  Sharanim2.play();}

      if(slider6.value>=4)
        {  
          theModel.getObjectByName('Sphere3').visible=true ;  Sharanim3.reset(); Sharanim3.play();
        }

}

function  update_speed()
{
 if(sedlo_play) {
  
    if( theModel.getObjectByName('Sphere2').visible==true && slider6.value>=4)  
      {
        theModel.getObjectByName('Sphere2').visible=false
        theModel.getObjectByName('Sphere3').visible=true ;  Sharanim3.reset(); Sharanim3.play();
      }

      if( theModel.getObjectByName('Sphere2').visible==true && slider6.value<2)  
        {
          theModel.getObjectByName('Sphere2').visible=false
          theModel.getObjectByName('Sphere1').visible=true ; Sharanim1.reset();   Sharanim1.play();
        }
  }
}

function start_anim()
{  sedlo_play=!sedlo_play
  document.getElementById("start_anim").innerHTML=sedlo_play?"Stop":"Start"
  if(sedlo_play)
        {    document.getElementById("add_ball").classList.remove('no_active');
              /*if(action_1.timeScale<3) {Sharanim1.reset();   Sharanim1.play();}
               else {Sharanim2.reset();  Sharanim2.play()}*/

      }
      else
      {
        Sharanim1.stop()
        Sharanim2.stop()
        theModel.getObjectByName('Sphere1').visible=false
        theModel.getObjectByName('Sphere2').visible=false
        ball_scene=false
        document.getElementById("add_ball").classList.add('no_active');
      }

}






function giperboloid()
{
  scene.remove(hyperbolicParaboloid);
  //console.log("giperboloid()")
// Параметры гиперболического параболоида
const a = slider1.value//3//slider1.value;
const b =  slider3.value//slider2.value;
const sizex = slider2.value // slider3.value;;
const sizey = slider4.value //slider4.value;;;
const segments = 50;

// Создаём геометрию
const geometry = new THREE.BufferGeometry();
const vertices = [];
const indices = [];
const colors = [];

// Заполняем вершины и цвета
for (let i = 0; i <= segments; i++) {
  for (let j = 0; j <= segments; j++) {
    const u = i / segments;
    const v = j / segments;
    const x = (u - 0.5) * 2 * sizex;
    const y = (v - 0.5) * 2 * sizey;
    const z = (x * x) / (a * a) - (y * y) / (b * b);

    vertices.push(x, y, z);

    // Нормализуем z для градиента (от -1 до 1)
    const normalizedZ = THREE.MathUtils.clamp(z / 10, -1, 1);
    const colorValue = (normalizedZ + 1) / 2; // в диапазон [0, 1]

    // Градиент: синий (низ) → зелёный → красный (верх)
    const r = colorValue;
    const g = Math.sin(colorValue * Math.PI); // плавный переход зелёного
    const bColor = 1 - colorValue; // переименовали, чтобы не путать с параметром b

    colors.push(bColor, g,  r);
  }
}

// Создаём индексы для треугольников
for (let i = 0; i < segments; i++) {
  for (let j = 0; j < segments; j++) {
    const aIndex = i * (segments + 1) + j;
    const bIndex = aIndex + 1;
    const cIndex = aIndex + (segments + 1);
    const dIndex = cIndex + 1;

    indices.push(aIndex, bIndex, dIndex);
    indices.push(aIndex, dIndex, cIndex);
  }
}

geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
geometry.setIndex(indices);
geometry.computeVertexNormals();

// Материал с поддержкой vertex colors
const material = new THREE.MeshPhongMaterial({
  vertexColors: true,
  shininess: 60,
  wireframe: false,
  side: THREE.DoubleSide
});

// Создаём 
hyperbolicParaboloid = new THREE.Mesh(geometry, material);
hyperbolicParaboloid.rotation.x = Math.PI / 2;
hyperbolicParaboloid.position.y=0
hyperbolicParaboloid.scale.set(2, 2, 2);
scene.add(hyperbolicParaboloid);


}


    function onMouseClick(event) {
      console.log()
      // Преобразуем координаты мыши в нормализованные (-1…1)
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      console.log(mouse.x)
    
      // Задаём луч от камеры через точку на экране
     // raycaster.setFromCamera(mouse, camera);
      var mouse3D = new THREE.Vector3(  mouse.x, mouse.y,  camera.near );
      raycaster.setFromCamera(mouse3D, camera);
      const intersects = raycaster.intersectObjects(theModel.children, true)


    //console.log(raycaster)
      // Проверяем пересечения с объектами сцены
    //  const intersects = raycaster.intersectObjects();
      console.log(intersects)

  
      if (intersects.length > 0) {
              for (let i = 0; i < intersects.length; i += 1) 
                {
                      if(intersects[i].object.name=="цилиндр_крышки") open_krichka()
                  console.log(intersects[i].object.name)
                }
     
          }
  
  
  }

function init_material()
  {
      var amlight =new THREE.AmbientLight( 0xffffff,1.5)
      scene.add( amlight );
      const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
      directionalLight.position.set(0, 14, 50);
      camera.add(directionalLight);
      camera.add(directionalLight.target);
  }


function drawing()
{
        
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight);

}
const clock = new THREE.Clock();


function animate() {

  /*if ( mixer ) {

    const time = Date.now();

    mixer.update( ( time - prevTime ) * 0.0002 );

    prevTime = time;

  }*/
    if (mixer) {
      const delta = clock.getDelta();
      mixer.update(delta);
    }
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        if (sedlo_play) {
          hyperbolicParaboloid.rotation.z += rotationSpeed*slider6.value;
          //theModel.getObjectByName('Sphere1').rotation.z += rotationSpeed*slider6.value;
 

              }
       /* if (resizeRendererToDisplaySize(renderer)) {
          const canvas = renderer.domElement;
          camera.aspect = canvas.clientWidth / canvas.clientHeight;
          camera.updateProjectionMatrix();
        }*/
        controls.update();
      }
  
  function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement;
        var width = window.innerWidth;
        var height = window.innerHeight;
        var canvasPixelWidth = canvas.width / window.devicePixelRatio;
        var canvasPixelHeight = canvas.height / window.devicePixelRatio;
        const needResize = canvasPixelWidth !== width || canvasPixelHeight !== height;
        if (needResize) {
          
          renderer.setSize(width, height, false);
        }
        return needResize;
      }



function add_click(elm, cb, disable = true) {
        const cl = evt => {
         let t = evt.target;
         while(t && t.nodeName != 'A')
           t = t.parentNode;
         if(t)
           evt.preventDefault();
         cb(evt);
       };
       elm.addEventListener('click', cl);
}