/* ---------- dom refs ---------- */
const bootEl = document.getElementById('boot');
const gameEl = document.getElementById('game');
const loseEl = document.getElementById('loseOverlay');
const stacksEl = document.getElementById('stacks');
const opRowEl = document.getElementById('opRow');
const logEl = document.getElementById('log');
const hScore = document.getElementById('hScore');
const hLevel = document.getElementById('hLevel');
const hBest = document.getElementById('hBest');
const hTarget = document.getElementById('hTarget');
const hRegister = document.getElementById('hRegister');
const combineBtn = document.getElementById('combineBtn');
const combineCount = document.getElementById('combineCount');

const MAX_HEIGHT = 7;
const STACK_COUNT = 3;

/* ---------- state ---------- */
let stacks = [];
let register = null;
let target = 0;
let score = 0, matches = 0, level = 1;
let best = parseInt(localStorage.getItem('stacktrace_best') || '0', 10);
let combinesLeft = 1;
let combineMode = false;
let selected = [];
let pendingOp = null;
let gameOver = false;

function log(msg){ logEl.textContent = '> ' + msg; }

/* ---------- helpers ---------- */
function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }

function newTileValue(){
  const max = Math.min(9 + Math.floor(level / 2), 15);
  return randInt(1, max);
}

function newTarget(){
  const range = 8 + level * 3;
  let t;
  do { t = randInt(4, range); } while (t === target);
  target = t;
  hTarget.textContent = target;
}

function newRegister(){
  register = newTileValue();
  combinesLeft = 1;
  hRegister.textContent = register;
  updateCombineBtn();
}

function computeOp(op, a, b){
  let v;
  if (op === '+') v = a + b;
  else if (op === '-') v = Math.abs(a - b);
  else if (op === '*') v = a * b;
  else v = a ^ b;
  return Math.max(1, Math.min(99, v));
}

/* ---------- core actions ---------- */
function pushToStack(idx){
  if (gameOver || combineMode) return;
  if (register === null) return;
  if (stacks[idx].length >= MAX_HEIGHT){
    log('that stack is full — try another or combine first');
    checkStuck();
    return;
  }
  stacks[idx].push(register);
  register = null;
  hRegister.textContent = '--';
  render();
  checkMatch(idx);
  setTimeout(() => {
    if (gameOver) return;
    newRegister();
    render();
  }, 300);
}

function toggleCombineMode(){
  if (combinesLeft <= 0 || gameOver) return;
  combineMode = !combineMode;
  if (!combineMode){ selected = []; pendingOp = null; opRowEl.hidden = true; }
  render();
}

function selectStack(idx){
  if (!combineMode || pendingOp) return;
  if (stacks[idx].length === 0) return;
  if (selected.includes(idx)){
    selected = selected.filter(s => s !== idx);
    render();
    return;
  }
  if (selected.length >= 2) return;
  selected.push(idx);
  render();
  if (selected.length === 2) opRowEl.hidden = false;
}

function chooseOp(op){
  pendingOp = op;
  opRowEl.hidden = true;
  log('now tap a stack to push the result onto');
  render();
}

function cancelCombine(){
  selected = [];
  pendingOp = null;
  opRowEl.hidden = true;
  render();
}

function chooseDestination(idx){
  const [i, j] = selected;
  const a = stacks[i][stacks[i].length - 1];
  const b = stacks[j][stacks[j].length - 1];
  let destHeight = stacks[idx].length;
  if (idx === i || idx === j) destHeight -= 1;
  if (destHeight >= MAX_HEIGHT){
    log('destination would overflow — pick another');
    return;
  }
  stacks[i].pop();
  stacks[j].pop();
  const result = computeOp(pendingOp, a, b);
  stacks[idx].push(result);
  selected = [];
  pendingOp = null;
  combinesLeft--;
  combineMode = false;
  updateCombineBtn();
  log(`combined into ${result}`);
  render();
  checkMatch(idx);
  checkStuck();
}

function checkMatch(idx){
  const s = stacks[idx];
  if (s.length && s[s.length - 1] === target){
    s.pop();
    score += 10 * level;
    matches++;
    if (matches % 5 === 0) level++;
    log(`MATCH — target ${target} cleared`);
    hScore.textContent = score;
    hLevel.textContent = level;
    flashStack(idx);
    newTarget();
    render();
  }
}

function checkStuck(){
  if (combinesLeft <= 0 && stacks.every(s => s.length >= MAX_HEIGHT)){
    triggerGameOver();
  }
}

function updateCombineBtn(){
  combineBtn.disabled = combinesLeft <= 0;
  combineCount.textContent = `(${combinesLeft})`;
  combineBtn.classList.toggle('active', combineMode);
}

/* ---------- render ---------- */
function flashStack(idx){
  const col = stacksEl.children[idx];
  if (!col) return;
  const top = col.querySelector('.tile.top');
  if (top) top.classList.add('matchFlash');
}

function render(){
  stacksEl.innerHTML = '';
  stacks.forEach((s, idx) => {
    const col = document.createElement('div');
    col.className = 'stackCol';
    if (s.length >= MAX_HEIGHT) col.classList.add('full');
    if (combineMode && !pendingOp) col.classList.add('selectable');
    if (selected.includes(idx)) col.classList.add('selected');

    s.forEach((val, i) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (i === s.length - 1) tile.classList.add('top');
      tile.textContent = val;
      col.appendChild(tile);
    });

    col.addEventListener('click', () => {
      if (combineMode && !pendingOp) selectStack(idx);
      else if (combineMode && pendingOp) chooseDestination(idx);
      else pushToStack(idx);
    });

    stacksEl.appendChild(col);
  });
  updateCombineBtn();
}

/* ---------- game over ---------- */
function triggerGameOver(){
  gameOver = true;
  if (score > best){
    best = score;
    localStorage.setItem('stacktrace_best', String(best));
    document.getElementById('newBest').hidden = false;
  } else {
    document.getElementById('newBest').hidden = true;
  }
  setTimeout(() => {
    gameEl.hidden = true;
    loseEl.hidden = false;
    document.getElementById('lScore').textContent = score;
    document.getElementById('lMatches').textContent = matches;
    document.getElementById('lLevel').textContent = level;
    hBest.textContent = best;
  }, 200);
}

function resetGame(){
  stacks = Array.from({ length: STACK_COUNT }, () => []);
  score = 0; matches = 0; level = 1; gameOver = false;
  combineMode = false; selected = []; pendingOp = null;
  hScore.textContent = 0;
  hLevel.textContent = 1;
  hBest.textContent = best;
  opRowEl.hidden = true;
  newTarget();
  newRegister();
  render();
}

/* ---------- wiring ---------- */
document.getElementById('startBtn').addEventListener('click', () => {
  bootEl.hidden = true;
  gameEl.hidden = false;
  resetGame();
});
document.getElementById('retryBtn').addEventListener('click', () => {
  loseEl.hidden = true;
  gameEl.hidden = false;
  resetGame();
});
combineBtn.addEventListener('click', toggleCombineMode);
document.getElementById('cancelCombine').addEventListener('click', cancelCombine);
document.querySelectorAll('.op[data-op]').forEach(btn => {
  btn.addEventListener('click', () => chooseOp(btn.dataset.op));
});
