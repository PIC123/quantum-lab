let slider1 
let output1 
let slider2 
let output2 
let graphic1 
console.log("DSfdsf")

let slider3 
let output3 
let slider4 
let output4
let graphic2 

let slider5 
let output5

function init2(){
  //update_pozition_zoom()
//window.onresize = update_pozition_zoom; 
 slider1 = document.querySelector("#panel1 #myRange1");
 output1 = document.querySelector("#panel1 #sliderValue1");
 slider2 = document.querySelector("#panel1 #myRange2");
 output2 = document.querySelector("#panel1 #sliderValue2");
 graphic1 = document.querySelector("#panel1 #graphic1 img");


 slider3 = document.querySelector("#panel2 #myRange1");
 output3 = document.querySelector("#panel2 #sliderValue1");
 slider4 = document.querySelector("#panel2 #myRange2");
 output4 = document.querySelector("#panel2 #sliderValue2");
 graphic2 = document.querySelector("#panel2 #graphic2 img");


 slider5 = document.querySelector("#panel3 #myRange1");
 output5 = document.querySelector("#panel3 #sliderValue3_1");


// Показываем начальное значение
output1.innerHTML = slider1.value;
output2.innerHTML = slider2.value;
output3.innerHTML = slider3.value;
output4.innerHTML = slider4.value;
output5.innerHTML = slider5.value;

update_graf()

create_graf_canvas()

// Обновляем значение при движении ползунка
slider1.oninput = function() {
                output1.innerHTML = this.value;
               update_graf()
               giperboloid()
}
slider2.oninput = function() {
                output2.innerHTML = this.value;
               update_graf()
               giperboloid()
  }

  slider3.oninput = function() {
    output3.innerHTML = this.value;
    update_graf()
    giperboloid()
}


slider4.oninput = function() {
    output4.innerHTML = this.value;
    update_graf()
    giperboloid()
}
slider5.oninput = function() {
    output5.innerHTML = this.value;
    create_graf_canvas()
}
}

function  update_graf()

{

    var valuex=1+((1/4)*(slider1.value-1))
    var valuey=0.3+(((1-0.3)/19)*(slider2.value-1))
    graphic1.style.transform="scale("+valuex+", "+valuey+")"


     valuex=1+((1/4)*(slider3.value-1))
     valuey=0.3+(((1-0.3)/19)*(slider4.value-1))
     
    graphic2.style.transform="scale("+valuex+", "+valuey+")"
}

function create_graf_canvas()

{
    const canvas = document.getElementById('parabolaCanvas');
    const ctx = canvas.getContext('2d');
    
    // Размеры canvas
    const width = canvas.width;  // 225 px
    const height = canvas.height; // 97 px

    ctx.clearRect(0, 0, width, height);
ctx.strokeStyle = '#ccc';
ctx.lineWidth = 1;
ctx.beginPath();
ctx.moveTo(0, height); // Ось X
ctx.lineTo(width, height);
ctx.moveTo(0, 0);    // Ось Y
ctx.lineTo(0, height);
ctx.stroke();

// Подписываем оси
/*ctx.fillStyle = '#333';
ctx.font = '10px Arial';
ctx.fillText('X', width - 15, height - 5);
ctx.fillText('Y', 5, 15);*/

// Строим ветвь параболы (только для x ≥ 0)
ctx.strokeStyle = '#76450a';
ctx.lineWidth = 2;
ctx.beginPath();

const steps = 100; // Количество точек для плавности
for (let i = 0; i <= steps; i++) {
  const x = xMin + (xMax - xMin) * i / steps;
  const y = parabola(x);
  const canvasX = toCanvasX(x);
  const canvasY = toCanvasY(y);

  if (i === 0) {
    ctx.moveTo(canvasX, canvasY);
  } else {
    ctx.lineTo(canvasX, canvasY);
  }
}

ctx.stroke();

const currentX = parseFloat(slider5.value);
  const currentY = parabola(currentX);

  // Отображаем координаты точки
  //valueDisplay.textContent = currentX.toFixed(2);

  // Рисуем точку на графике
  const pointX = toCanvasX(currentX);
  const pointY = toCanvasY(currentY);

  ctx.fillStyle = '#76450a';
  ctx.beginPath();
  ctx.arc(pointX, pointY, 6, 0, 2 * Math.PI); // Точка радиусом 4 px
  ctx.fill();

  // Подпись координат точки
  ctx.fillStyle = 'black';
  //ctx.font = '9px Arial';
  //ctx.fillText(`(${currentX.toFixed(2)}, ${currentY.toFixed(2)})`, pointX + 8, pointY - 8);



}


function parabola(x) {
    return Math.pow(x, 1/2)// x * x;
  }
  
  // Диапазон значений X для первого квадранта
  let xMin = 0;
  let xMax = 30; // Подбираем так, чтобы график поместился
  
  // Масштабирование: преобразуем математические координаты в пиксели
  function toCanvasX(x) {
    return (x - xMin) / (xMax - xMin) * 225;
  }
  
  function toCanvasY(y) {
    // Ось Y направлена вниз, поэтому инвертируем
    // yMax — максимальное значение функции на выбранном отрезке
    const yMax = parabola(xMax);
    return 97 - (y / yMax) * 97;
  }