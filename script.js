const characters = [
  { name: 'WARRIOR', hp: 100, attack: 15, sprite: '⚔️', color: '#ff6b6b' },
  { name: 'MAGE', hp: 80, attack: 20, sprite: '🔮', color: '#9b59b6' },
  { name: 'KNIGHT', hp: 120, attack: 12, sprite: '🛡️', color: '#3498db' },
  { name: 'ROGUE', hp: 90, attack: 18, sprite: '🗡️', color: '#e74c3c' },
  { name: 'PALADIN', hp: 110, attack: 14, sprite: '⚡', color: '#f39c12' },
  { name: 'NINJA', hp: 85, attack: 19, sprite: '🥷', color: '#34495e' }
];

let player1Character = null;
let player2Character = null;
let battleInterval = null;

const screens = {
  title: document.getElementById('title-screen'),
  nfc: document.getElementById('nfc-screen'),
  battle: document.getElementById('battle-screen')
};

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

document.getElementById('start-btn').addEventListener('click', () => {
  showScreen('nfc');
});

document.getElementById('nfc1').addEventListener('click', () => {
  scanCard(1);
});

document.getElementById('nfc2').addEventListener('click', () => {
  scanCard(2);
});

function scanCard(playerNum) {
  const randomChar = characters[Math.floor(Math.random() * characters.length)];
  const charData = {
    ...randomChar,
    maxHp: randomChar.hp,
    currentHp: randomChar.hp
  };

  if (playerNum === 1) {
    player1Character = charData;
  } else {
    player2Character = charData;
  }

  const nfcReader = document.getElementById(`nfc${playerNum}`);
  nfcReader.classList.add('scanned');
  nfcReader.innerHTML = `
    <div class="scan-icon">✅</div>
    <p>Card Scanned!</p>
  `;

  const charInfo = document.getElementById(`char${playerNum}-info`);
  charInfo.innerHTML = `
    <div class="char-name">${charData.name}</div>
    <div class="char-stats">
      ${charData.sprite} HP: ${charData.hp} | ATK: ${charData.attack}
    </div>
  `;

  if (player1Character && player2Character) {
    document.getElementById('battle-start-btn').disabled = false;
  }
}

document.getElementById('battle-start-btn').addEventListener('click', () => {
  showScreen('battle');
  initBattle();
});

function initBattle() {
  setupFighter(1, player1Character);
  setupFighter(2, player2Character);
  
  const battleLog = document.getElementById('battle-log');
  battleLog.innerHTML = '<div class="log-entry">FIGHT!</div>';
  
  document.getElementById('game-over').classList.add('hidden');
  
  let turnCount = 0;
  battleInterval = setInterval(() => {
    turnCount++;
    executeTurn();
    
    if (player1Character.currentHp <= 0 || player2Character.currentHp <= 0) {
      endBattle();
    }
  }, 2000);
}

function setupFighter(num, character) {
  const fighter = document.getElementById(`fighter${num}`);
  fighter.querySelector('.fighter-name').textContent = character.name;
  fighter.querySelector('.fighter-sprite').textContent = character.sprite;
  updateHealth(num, character);
}

function updateHealth(num, character) {
  const fighter = document.getElementById(`fighter${num}`);
  const healthFill = fighter.querySelector('.health-fill');
  const healthText = fighter.querySelector('.health-text');
  
  const healthPercent = (character.currentHp / character.maxHp) * 100;
  healthFill.style.width = `${Math.max(0, healthPercent)}%`;
  healthText.textContent = `${Math.max(0, character.currentHp)} / ${character.maxHp}`;
  
  healthFill.classList.remove('low', 'critical');
  if (healthPercent <= 30) {
    healthFill.classList.add('critical');
  } else if (healthPercent <= 50) {
    healthFill.classList.add('low');
  }
}

function executeTurn() {
  const attacker = Math.random() < 0.5 ? 1 : 2;
  const defender = attacker === 1 ? 2 : 1;
  
  const attackerChar = attacker === 1 ? player1Character : player2Character;
  const defenderChar = defender === 1 ? player1Character : player2Character;
  
  const blockChance = 0.25;
  const isBlocking = Math.random() < blockChance;
  
  const attackerFighter = document.getElementById(`fighter${attacker}`);
  const defenderFighter = document.getElementById(`fighter${defender}`);
  
  attackerFighter.classList.add('attacking');
  setTimeout(() => attackerFighter.classList.remove('attacking'), 500);
  
  if (isBlocking) {
    defenderFighter.classList.add('blocking');
    setTimeout(() => defenderFighter.classList.remove('blocking'), 500);
    
    const defenderStatus = defenderFighter.querySelector('.fighter-status');
    defenderStatus.textContent = 'BLOCKED!';
    defenderStatus.style.color = '#4ecdc4';
    setTimeout(() => defenderStatus.textContent = '', 1000);
    
    addLog(`${defenderChar.name} BLOCKED the attack!`, 'block');
    return;
  }
  
  const multiplier = Math.floor(Math.random() * 5) + 1;
  const damage = Math.floor(attackerChar.attack * multiplier);
  
  defenderChar.currentHp = Math.max(0, defenderChar.currentHp - damage);
  updateHealth(defender, defenderChar);
  
  const defenderStatus = defenderFighter.querySelector('.fighter-status');
  defenderStatus.textContent = `-${damage} HP`;
  defenderStatus.style.color = '#ff6b6b';
  setTimeout(() => defenderStatus.textContent = '', 1000);
  
  let logMessage = `${attackerChar.name} attacks ${defenderChar.name} for ${damage} damage!`;
  let logClass = 'attack';
  
  if (multiplier > 1) {
    logMessage += ` (${multiplier}x MULTIPLIER!)`;
    logClass = 'multiplier';
  }
  
  addLog(logMessage, logClass);
}

function addLog(message, className = '') {
  const battleLog = document.getElementById('battle-log');
  const entry = document.createElement('div');
  entry.className = `log-entry ${className}`;
  entry.textContent = message;
  battleLog.appendChild(entry);
  battleLog.scrollTop = battleLog.scrollHeight;
}

function endBattle() {
  clearInterval(battleInterval);
  
  const winner = player1Character.currentHp > 0 ? player1Character : player2Character;
  const winnerNum = player1Character.currentHp > 0 ? 1 : 2;
  
  addLog(`${winner.name} WINS!`, 'multiplier');
  
  const gameOver = document.getElementById('game-over');
  gameOver.classList.remove('hidden');
  gameOver.querySelector('.winner-text').textContent = `${winner.name} WINS!`;
}

document.getElementById('restart-btn').addEventListener('click', () => {
  player1Character = null;
  player2Character = null;
  
  document.getElementById('nfc1').classList.remove('scanned');
  document.getElementById('nfc1').innerHTML = `
    <div class="scan-icon">📡</div>
    <p>Click to Scan Card</p>
  `;
  document.getElementById('char1-info').innerHTML = '';
  
  document.getElementById('nfc2').classList.remove('scanned');
  document.getElementById('nfc2').innerHTML = `
    <div class="scan-icon">📡</div>
    <p>Click to Scan Card</p>
  `;
  document.getElementById('char2-info').innerHTML = '';
  
  document.getElementById('battle-start-btn').disabled = true;
  
  showScreen('nfc');
});
