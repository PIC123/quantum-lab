
const scene = new THREE.Scene();
var renderer
var camera 
var canvas
var cameraFar = 8;
var theModel;
var controls 
const MODEL_PATH =  "model/quantum.glb";
const BACKGROUND_COLOR = 0xc8c8c8;
var krishka
const _$ = (q, elm) => (elm ? elm : document).querySelector(q);
const _$$ = (q, elm) => (elm ? elm : document).querySelectorAll(q);
window._$ = _$;
window._$$ = _$$;
  
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();


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
  



        camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
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
      //renderer.setSize( 1200, 800 );
      renderer.setSize(window.innerWidth, window.innerHeight );
      renderer.outputEncoding = THREE.sRGBEncoding;
      renderer.physicallyCorrectLights = true;

      renderer.shadowMap.enabled = true
      window.addEventListener( 'resize', onWindowResize );
      document.body.appendChild(renderer.domElement);
      scene.background = new THREE.Color(BACKGROUND_COLOR );
    
       
        var loader = new THREE.GLTFLoader();
        loader.load(MODEL_PATH, function( gltf ){
                        theModel = gltf.scene;
                        // Установить начальный масштаб отображения модели    
                        theModel.scale.set( 15 , 15 , 15 );
                        // немного сдвинем положение модели вдоль оси y
                       // theModel.position.y = -40 ;
                     //  theModel.position.z = -10 ;
                     //  theModel.scale.set(2,2,2);
                      //  theModel.rotation.y = Math.PI;
                        // Добавить модель в сцену
                        scene.add(theModel);
                        krishka=scene.getObjectByName('крышка')
                        scene.getObjectByName('Вариант2').visible=false
                      // window.addEventListener('click', onMouseClick, false);
                      theModel.getObjectByName('Resonator').visible=false
                      theModel.getObjectByName('Ion_pump').visible=false
                      theModel.getObjectByName('cam2').visible=false
                      theModel.getObjectByName('cam1').visible=false
                      theModel.getObjectByName('optical1').visible=false
                      theModel.getObjectByName('optical2').visible=false
                      theModel.getObjectByName('Text').visible=false
                      theModel.getObjectByName('Line').visible=false
                        init_material()
                        init_view()
                        animate();

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
                 controls.listenToKeyEvents( window );
                 console.log(controls)
        
       
     

       // drawing()
       add_click(_$('#label_btn'), show_label); 
        
}
var sten1=true
var korob1=true

function init_view()

{

  const radios = document.querySelectorAll('input[name="view"]');


  radios.forEach(radio => {
    radio.addEventListener('change', function() {
      //console.log('Выбрано:', this.value);
      scene.getObjectByName('Вариант1').visible= this.value==1?true:false
      scene.getObjectByName('Вариант2').visible= this.value==2?true:false
      if(show){show_label()}
      // Здесь можно добавить логику для реакции на выбор
    });
  });                   

}
var  show=false
function show_label()
{
 show=!show

document.querySelector("#label_btn").innerHTML=show?"Hide labels":"Show labels"

theModel.getObjectByName('Line').visible=(show &&  scene.getObjectByName('Вариант2').visible==true)?true:false
theModel.getObjectByName('Resonator').visible=show
theModel.getObjectByName('Ion_pump').visible=show
theModel.getObjectByName('cam1').visible=(show &&  scene.getObjectByName('Вариант1').visible==true)?true:false
theModel.getObjectByName('cam2').visible=(show &&  scene.getObjectByName('Вариант2').visible==true)?true:false
theModel.getObjectByName('optical1').visible=(show &&  scene.getObjectByName('Вариант1').visible==true)?true:false
theModel.getObjectByName('optical2').visible=(show &&  scene.getObjectByName('Вариант2').visible==true)?true:false
theModel.getObjectByName('Text').visible=show



}

function open_krichka()
    {
      krishka.visible=!krishka.visible
      document.getElementById("btn1").innerHTML= krishka.visible?"Open":"Close"
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

var steklo=scene.getObjectByName('стекло')
//steklo.visible=false
console.log(steklo)
const glassMaterial = new THREE.MeshPhysicalMaterial({
  metalness: 0,        // не металл
  roughness: 0.1,       // идеально гладкая поверхность
  attenuationDistance: 10, // расстояние затухания цвета внутри стекла
  attenuationColor: 0xddeeff, // лёгкий голубой оттенок (как в толстом стекле)
  transmission: 0.8, // полная прозрачность (0–1)
  clearcoat: 0.2,     // дополнительный «лаковый» слой (усиливает блики)
  clearcoatRoughness: 0.02, // шероховатость лакового слоя
  //thickness: 0.1,    // толщина стекла (влияет на преломление)
  color: 0xffffff,    // базовый цвет (обычно белый/бесцветный)
  transparent: true,   // явно включаем прозрачность
});

steklo.material=glassMaterial

       const material_metal = new THREE.MeshStandardMaterial({
              color: 0xb1b1b1,
              metalness: 0.5,
              roughness: 0.7
            });
            
    //   scene.getObjectByName('Cylinder2').material = material_metal;


    var amlight =new THREE.AmbientLight( 0xffffff,1.5)
    scene.add( amlight );

    const lightParams = {
      color: '#ffffff', // HEX-строка
      intensity: amlight.intensity
    };
// Материал
const material = new THREE.MeshStandardMaterial({
  color: 0xAAAAAA,          // базовый цвет металла (серый, серебристый)
  metalness: 1.0,       // 1.0 = полностью металлический
  roughness: 0.1,       // 0.0–0.2 = гладкая/полированная поверхность
  envMap: cubemap,   // карта окружения (обязательно для реалистичного блеска)
  envMapIntensity:0.1, // интенсивность отражения окружения
 
});

      var osnov_material=scene.getObjectByName('цилиндр_крышки').material
   /*    const gui = new dat.GUI();
       const materialFolder = gui.addFolder('Material Settings 1');

      // Цвет
      materialFolder.addColor({ color: osnov_material.color.getHex() }, 'color').onChange(value => osnov_material.color.set(value));
      // Metalness (0..1)
      materialFolder.add(osnov_material, 'metalness', 0, 1).step(0.01).name('Metalness');
      // Roughness (0..1)
      materialFolder.add(osnov_material, 'roughness', 0, 1).step(0.01).name('Roughness');
      materialFolder.open();

      var bolt_material=scene.getObjectByName('болты_крышка').material
      const materialFolder2 = gui.addFolder('Material Settings 2');

    // Цвет
    //materialFolder.addColor(material, 'color').name('color');
    materialFolder2.addColor({ color: bolt_material.color.getHex() }, 'color').onChange(value => bolt_material.color.set(value));
    // Metalness (0..1)
    materialFolder2.add(bolt_material, 'metalness', 0, 1).step(0.01).name('Metalness');
    // Roughness (0..1)
    materialFolder2.add(bolt_material, 'roughness', 0, 1).step(0.01).name('Roughness');
    // Завершаем папку
    materialFolder2.open();
    const lightFolder = gui.addFolder('Ambient Light');
    // Настройка цвета
    lightFolder.addColor(lightParams, 'color').name('Color').onChange((hex) => {  amlight.color.set(hex); });
    // Настройка интенсивности
    lightFolder.add(amlight, 'intensity', 0, 5).step(0.01).name('Intensity');
*/

    const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
    directionalLight.position.set(0, 14, 50);
    //directionalLight.target.position.set(0, 0, 0); // точка, куда направлен свет

    camera.add(directionalLight);
    camera.add(directionalLight.target);

    //const helper = new THREE.DirectionalLightHelper(directionalLight);
    //scene.add(helper);
    // GUI
 /* const lightParams2 = {
      color: '#ffffff', // HEX-строка
      intensity: 1
    };

    const lightFolder2 = gui.addFolder('Light Control');
    lightFolder2.add(directionalLight, 'intensity', 0, 10).step(0.1).name('Intensity');
    lightFolder2.addColor(lightParams2, 'color').name('Color').onChange((hex) => {    directionalLight.color.set(hex);   });

    // 4. Управление позицией (угол падения)
    const positionFolder = lightFolder2.addFolder('Position');
    positionFolder.add(directionalLight.position, 'x', -50, 50).step(0.1).name('X');
    positionFolder.add(directionalLight.position, 'y', -50, 50).step(0.1).name('Y');
    positionFolder.add(directionalLight.position, 'z', -50, 50).step(0.1).name('Z');

    // 5. Управление целью (куда направлен свет)
    const targetFolder = lightFolder2.addFolder('Target');
    targetFolder.add(directionalLight.target.position, 'x', -50, 150).step(0.1).name('X');
    targetFolder.add(directionalLight.target.position, 'y', -50, 150).step(0.1).name('Y');
    targetFolder.add(directionalLight.target.position, 'z', -50, 150).step(0.1).name('Z');
*/

}


function drawing()
{
        
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight);

}

function animate() {
       theModel.getObjectByName('Resonator').lookAt(camera.position)
       theModel.getObjectByName('Ion_pump').lookAt(camera.position)
       theModel.getObjectByName('cam2').lookAt(camera.position)
       theModel.getObjectByName('cam1').lookAt(camera.position)
       theModel.getObjectByName('optical1').lookAt(camera.position)
       theModel.getObjectByName('optical2').lookAt(camera.position)
       theModel.getObjectByName('Text').lookAt(camera.position)


        renderer.render(scene, camera);
        requestAnimationFrame(animate);
        
        if (resizeRendererToDisplaySize(renderer)) {
          const canvas = renderer.domElement;
          camera.aspect = canvas.clientWidth / canvas.clientHeight;
          camera.updateProjectionMatrix();
        }
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