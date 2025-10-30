// -------------------------
// p5.js interactive TERRORIFIC with true additive overlap transitions (responsive)
// -------------------------
let letters = [];
let nextLetters = [];
let lines = [];
let linesOpposing = [];
let linesNext = [];
let linesOpposingNext = [];

let words = ["FONTFLICTED","TYPENETIC","GLYPHSCAPE","SERIFFIC","TYPOBLIVION","LIGATURIST","SANSATION","KERNDRIFT","PHONOTYPE"];
let currentWordIndex = 0;
let txt = words[currentWordIndex];
let fontSize = 120;
const canvasWidth = 1200;
const canvasHeight = 800;

let exitStateActive = false;
let entryStartTime = 0;
const ENTRY_DELAY = 5;
let resetScheduled = false;
let resetStartTime = 0;
const RESET_DELAY = 900;
let transitionStarted = false;

// Inter Medium font
let interFont;

// -------------------------
// Kerning pairs
// -------------------------
const kerningPairs = {
  global: {'TY':5,'AV':-3,'LT':-2,'LI':-1},
  LIGATURIST: {'AT':-8},
  SANSATION: {'AT':-8},
  GLYPHSCAPE: {'LY':-6}
};

// -------------------------
// Responsive scaling factor
// -------------------------
let scaleFactor = 1;

function preload() {
  interFont = loadFont('Inter_24pt-Medium.ttf');
}

function setup() {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.parent(document.body);
  textFont(interFont);
  textSize(fontSize);
  pixelDensity(1);

  letters = setupLetters(txt);
  setupLines();

  entryStartTime = millis();

  resizeSketch();
  window.addEventListener("resize", resizeSketch);
}

function resizeSketch() {
  scaleFactor = Math.min(window.innerWidth / canvasWidth, window.innerHeight / canvasHeight);
  let canvasElem = document.querySelector("canvas");
  canvasElem.style.width = canvasWidth * scaleFactor + "px";
  canvasElem.style.height = canvasHeight * scaleFactor + "px";

  cursorCurrentSize = cursorBaseSize * scaleFactor;
  cursorHoverSize = 16 * scaleFactor;
  cursorPressSize = 23 * scaleFactor;
}

// -------------------------
// Letter setup
// -------------------------
function setupLetters(word = txt) {
  let newLetters = [];
  let totalWidth = textWidth(word);
  let currentX = canvasWidth / 2 - totalWidth / 2;
  let textHeight = fontSize;

  for (let i = 0; i < word.length; i++) {
    const ch = word.charAt(i);
    const nextCh = word.charAt(i + 1);
    const w = textWidth(ch);

    newLetters.push(new Letter(ch, currentX + w / 2, canvasHeight / 2 - textHeight / 2 + 15));

    let pair = ch + nextCh;
    let adjustment = 0;
    if (kerningPairs[word] && kerningPairs[word][pair] !== undefined) adjustment = kerningPairs[word][pair];
    else if (kerningPairs.global[pair] !== undefined) adjustment = kerningPairs.global[pair];

    currentX += w + adjustment;
  }

  return newLetters;
}

// -------------------------
// Lines setup
// -------------------------
function setupLines(keepExisting = false) {
  if (!keepExisting) {
    lines = [];
    linesOpposing = [];
    for (let i = 0; i < 300; i++) {
      lines.push(new Line(45));
      linesOpposing.push(new Line(225));
    }
  } else {
    for (let l of lines) { l.active = true; l.isFadingIn = true; l.localAlpha = Math.max(l.localAlpha, 0); }
    for (let l of linesOpposing) { l.active = true; l.isFadingIn = true; l.localAlpha = Math.max(l.localAlpha, 0); }
  }
}

function setupLinesNext() {
  linesNext = [];
  linesOpposingNext = [];
  for (let i = 0; i < 300; i++) {
    linesNext.push(new Line(45));
    linesOpposingNext.push(new Line(225));
  }
  for (let l of linesNext) { l.localAlpha = 0; l.isFadingIn = true; }
  for (let l of linesOpposingNext) { l.localAlpha = 0; l.isFadingIn = true; }
}

// -------------------------
// Main draw
// -------------------------
function draw() {
  background(255);

  for (let ln of lines) { ln.update(); ln.display(); }
  for (let ln of linesOpposing) { ln.update(); ln.display(); }
  for (let ln of linesNext) { ln.update(); ln.display(); }
  for (let ln of linesOpposingNext) { ln.update(); ln.display(); }

  for (let l of letters) { l.update(); l.display(); }

  if (transitionStarted && nextLetters.length > 0) {
    for (let l of nextLetters) { l.update(); l.display(); }
  }

  if (exitStateActive) {
    if (!resetScheduled) { resetScheduled = true; resetStartTime = millis(); }
    if (!transitionStarted) { startNextWordImmediate(); }
  }

  if (resetScheduled && millis() - resetStartTime > RESET_DELAY) {
    currentWordIndex = (currentWordIndex + 1) % words.length;
    txt = words[currentWordIndex];

    lines = lines.concat(linesNext);
    linesOpposing = linesOpposing.concat(linesOpposingNext);
    linesNext = [];
    linesOpposingNext = [];

    letters = nextLetters.length ? nextLetters : setupLetters(txt);
    nextLetters = [];

    exitStateActive = false;
    resetScheduled = false;
    transitionStarted = false;
    entryStartTime = millis();
  }

  drawCursor();
}

// -------------------------
// Mouse/touch input
// -------------------------
function mousePressed() {
  const wordRevealed = letters.every(l => l.isRevealed());
  if (wordRevealed && !exitStateActive) {
    exitStateActive = true;
    letters.forEach(l => l.startExit());
  }
}

// -------------------------
// Start next word
// -------------------------
function startNextWordImmediate() {
  transitionStarted = true;
  const nextWord = words[(currentWordIndex + 1) % words.length];
  nextLetters = setupLetters(nextWord);
  setupLinesNext();
}

// -------------------------
// Letter class
// -------------------------
class Letter {
  constructor(char, x, y) {
    this.char = char;
    this.x = x;
    this.y = y;
    this.slices = [];
    this.staggerDelay = random(0,200);
    this.createdAt = millis();
    this.createSlices();
  }

  createSlices() {
    const bufferSize = 200;
    const charGraphics = createGraphics(bufferSize, bufferSize);
    charGraphics.pixelDensity(1);
    charGraphics.textFont(interFont);
    charGraphics.textSize(fontSize);
    charGraphics.textAlign(CENTER, CENTER);
    charGraphics.fill(0);
    charGraphics.noStroke();
    charGraphics.text(this.char, bufferSize/2, bufferSize/2);

    const charWidth = charGraphics.textWidth(this.char);
    const diagonal = sqrt(charWidth*charWidth + fontSize*fontSize);
    let offset = -diagonal/2;
    let overlap = 0.5;

    while (offset < diagonal/2) {
      let sliceWidth = random(4,25);
      if (offset + sliceWidth > diagonal/2) sliceWidth = diagonal/2 - offset + overlap;

      const sliceGraphics = createGraphics(bufferSize, bufferSize);
      sliceGraphics.pixelDensity(1);
      sliceGraphics.textFont(interFont);
      sliceGraphics.textSize(fontSize);
      sliceGraphics.textAlign(CENTER,CENTER);
      sliceGraphics.fill(0);
      sliceGraphics.noStroke();

      sliceGraphics.push();
      sliceGraphics.translate(bufferSize/2, bufferSize/2);
      sliceGraphics.rotate(radians(45));
      sliceGraphics.drawingContext.beginPath();
      sliceGraphics.drawingContext.rect(-bufferSize/2, offset-overlap/2, bufferSize, sliceWidth+overlap);
      sliceGraphics.drawingContext.clip();
      sliceGraphics.rotate(radians(-45));
      sliceGraphics.image(charGraphics,-bufferSize/2,-bufferSize/2);
      sliceGraphics.pop();

      const baseAngle = radians(45);
      const angleOffset = radians(random(-10,10));
      const finalAngle = baseAngle + angleOffset;
      const dirSign = random()<0.5?1:-1;
      const dirX = cos(finalAngle)*dirSign;
      const dirY = sin(finalAngle)*dirSign;
      const spawnDist = canvasWidth+canvasHeight;

      const initialOffsetX = -dirX*spawnDist;
      const initialOffsetY = -dirY*spawnDist;

      this.slices.push({
        img: sliceGraphics,
        offsetX: initialOffsetX,
        offsetY: initialOffsetY,
        targetOffsetX: random(-60,60),
        targetOffsetY: random(-60,60),
        dirX: dirX,
        dirY: dirY,
        state:'entry',
        entryDelay: floor(random(6,12)),
        exitSpeed:0,
        delay:0
      });

      offset += sliceWidth - overlap;
    }
  }

  update() {
    for (let s of this.slices) {
      if(s.state==='entry'){
        if(millis()-this.createdAt<ENTRY_DELAY+this.staggerDelay) continue;
        if(s.entryDelay>0) s.entryDelay--;
        else { s.offsetX+=(s.targetOffsetX-s.offsetX)*0.09; s.offsetY+=(s.targetOffsetY-s.offsetY)*0.09; }
        if(dist(mouseX,mouseY,this.x,this.y)<100) s.state='revealing';
      } else if(s.state==='revealing'){
        s.offsetX+=(0-s.offsetX)*0.12; s.offsetY+=(0-s.offsetY)*0.12;
        if(dist(s.offsetX,s.offsetY,0,0)<0.5) s.state='revealed';
      } else if(s.state==='revealed'){
        s.offsetX=0; s.offsetY=0;
      } else if(s.state==='exit'){
        if(s.delay>0) s.delay--;
        else { s.offsetX+=s.dirX*s.exitSpeed; s.offsetY+=s.dirY*s.exitSpeed; }
      }
    }
  }

  display() {
    for(let s of this.slices){
      push();
      translate(this.x-100+s.offsetX, this.y-100+s.offsetY);
      image(s.img,0,0);
      pop();
    }
  }

  isRevealed(){ return this.slices.every(s=>s.state==='revealed'); }

  startExit(){
    for(let s of this.slices){
      const baseAngle=radians(45);
      const angleOffset=radians(random(-10,10));
      const finalAngle=baseAngle+angleOffset;
      const dirSign=random()<0.5?1:-1;
      s.dirX=cos(finalAngle)*dirSign;
      s.dirY=sin(finalAngle)*dirSign;
      s.exitSpeed=30+random(5,20);
      s.state='exit';
      s.delay=floor(random(0,20));
    }
  }
}

// -------------------------
// Line class
// -------------------------
class Line {
  constructor(baseAngle){
    this.baseAngle=baseAngle;
    this.active=true;
    this.reset();
  }

  reset(){
    this.angle=radians(this.baseAngle);
    this.direction=random()<0.75?1:-1;

    const wordLeft=canvasWidth/2-textWidth(txt)/2-50;
    const wordRight=canvasWidth/2+textWidth(txt)/2+50;
    const horizontalShift=590;
    const shiftedLeft=wordLeft+horizontalShift;
    const shiftedRight=wordRight+horizontalShift;

    const spawnType=random();
    if(spawnType<0.65){
      this.x=random(shiftedLeft,shiftedRight);
      this.y=canvasHeight+50+random(0,200);
      this.direction=random()<0.35?1:-1;
    } else {
      this.x=random(-400,canvasWidth-700);
      this.y=-50-random(0,200);
    }

    this.speed=random(10,25);
    this.strokeW=random()<0.15?random(1.5,2):random(0.1,0.6);
    this.length=random(50,300);
    this.localAlpha=0;
    this.fadeRate=random(20,35);
    this.fadeInRate=random(25,40);
    this.isFadingIn=true;
  }

  update(){
    if(!this.active) return;

    this.x+=cos(this.angle)*this.speed*this.direction;
    this.y+=sin(this.angle)*this.speed*this.direction;

    if(this.isFadingIn){
      this.localAlpha+=this.fadeInRate;
      if(this.localAlpha>=255){ this.localAlpha=255; this.isFadingIn=false; }
    }

    const allSlices=letters.flatMap(l=>l.slices);
    const revealedSlices=allSlices.filter(s=>s.state==='revealed').length;
    const fractionRevealed=allSlices.length?revealedSlices/allSlices.length:0;

    let nearRevealed=letters.some(l=>l.isRevealed()&&dist(this.x,this.y,l.x,l.y)<200);
    let allLettersRevealed=letters.every(l=>l.isRevealed());
    let wordNearComplete=fractionRevealed>=0.9;

    if(!exitStateActive && !resetScheduled && !this.isFadingIn && (nearRevealed||allLettersRevealed||wordNearComplete)){
      this.localAlpha-=this.fadeRate;
      if(this.localAlpha<=0) this.active=false;
    }

    if(this.x<-canvasWidth*0.6 || this.x>canvasWidth*1.6 || this.y<-canvasHeight*0.6 || this.y>canvasHeight*1.6){
      this.reset();
    }
  }

  display(){
    if(!this.active) return;
    stroke(0,this.localAlpha);
    strokeWeight(this.strokeW);
    const dx=cos(this.angle)*this.length*this.direction;
    const dy=sin(this.angle)*this.length*this.direction;
    line(this.x,this.y,this.x+dx,this.y+dy);
  }
}

// -------------------------
// Smooth orange dot cursor (desktop + mobile)
// -------------------------
let cursorBaseSize = 15;
let cursorHoverSize = 15;
let cursorPressSize = 23;
let cursorCurrentSize = cursorBaseSize;
let cursorTargetSize = cursorBaseSize;

function drawCursor() {
  noCursor();
  noStroke();
  fill(255, 120, 40);

  // Use touch if available
  let cursorX = touches.length > 0 ? touches[0].x / scaleFactor : mouseX;
  let cursorY = touches.length > 0 ? touches[0].y / scaleFactor : mouseY;

  const isHovering = cursorX >= 0 && cursorX <= canvasWidth && cursorY >= 0 && cursorY <= canvasHeight;

  cursorTargetSize = (isHovering ? (mouseIsPressed || touches.length > 0 ? cursorPressSize : cursorHoverSize) : cursorBaseSize);

  cursorCurrentSize = lerp(cursorCurrentSize, cursorTargetSize, 0.15);
  circle(cursorX, cursorY, cursorCurrentSize);
}
