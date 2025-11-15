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
let nfcSupported = false;
let nfcReaders = { 1: null, 2: null };

const screens = {
  title: document.getElementById('title-screen'),
  nfc: document.getElementById('nfc-screen'),
  battle: document.getElementById('battle-screen')
};

async function checkNFCSupport() {
  if ('NDEFReader' in window) {
    try {
      const permissionStatus = await navigator.permissions.query({ name: "nfc" });
      nfcSupported = permissionStatus.state === "granted" || permissionStatus.state === "prompt";
      console.log('NFC API is supported!', permissionStatus.state);
      return true;
    } catch (error) {
      console.log('NFC permission check failed:', error);
      nfcSupported = false;
      return false;
    }
  } else {
    console.log('NFC API not supported in this browser');
    nfcSupported = false;
    return false;
  }
}

function showScreen(screenName) {
  Object.values(screens).forEach(screen => screen.classList.remove('active'));
  screens[screenName].classList.add('active');
}

document.getElementById('start-btn').addEventListener('click', async () => {
  await checkNFCSupport();
  showScreen('nfc');
  updateNFCReaderUI();
});

function updateNFCReaderUI() {
  const nfc1 = document.getElementById('nfc1');
  const nfc2 = document.getElementById('nfc2');
  
  if (nfcSupported) {
    nfc1.querySelector('p').textContent = 'Tap NFC Card or Click';
    nfc2.querySelector('p').textContent = 'Tap NFC Card or Click';
  } else {
    nfc1.querySelector('p').textContent = 'Click to Scan Card';
    nfc2.querySelector('p').textContent = 'Click to Scan Card';
  }
}

document.getElementById('nfc1').addEventListener('click', () => {
  initiateNFCScan(1);
});

document.getElementById('nfc2').addEventListener('click', () => {
  initiateNFCScan(2);
});

async function initiateNFCScan(playerNum) {
  const nfcReader = document.getElementById(`nfc${playerNum}`);
  
  if (nfcSupported && 'NDEFReader' in window) {
    try {
      nfcReader.innerHTML = `
        <div class="scan-icon scanning">📡</div>
        <p>Reading NFC Tag...</p>
        <p class="scan-hint">Hold card near device</p>
      `;
      
      if (!nfcReaders[playerNum]) {
        nfcReaders[playerNum] = new NDEFReader();
      }
      
      await nfcReaders[playerNum].scan();
      console.log(`NFC scan started for Player ${playerNum}`);
      
      nfcReaders[playerNum].addEventListener("reading", ({ message, serialNumber }) => {
        console.log(`NFC tag detected! Serial: ${serialNumber}`);
        
        let characterData = null;
        
        for (const record of message.records) {
          if (record.recordType === "text") {
            const textDecoder = new TextDecoder(record.encoding);
            const text = textDecoder.decode(record.data);
            console.log('NFC Text data:', text);
            
            characterData = parseNFCData(text);
            break;
          }
        }
        
        if (!characterData) {
          const hash = serialNumber.split(':').reduce((acc, val) => acc + parseInt(val, 16), 0);
          const charIndex = hash % characters.length;
          characterData = characters[charIndex];
        }
        
        assignCharacter(playerNum, characterData);
      }, { once: true });
      
      nfcReaders[playerNum].addEventListener("readingerror", () => {
        console.log('NFC read error, falling back to random selection');
        const randomChar = characters[Math.floor(Math.random() * characters.length)];
        assignCharacter(playerNum, randomChar);
      }, { once: true });
      
      setTimeout(() => {
        if (playerNum === 1 ? !player1Character : !player2Character) {
          console.log('NFC timeout, using random character');
          const randomChar = characters[Math.floor(Math.random() * characters.length)];
          assignCharacter(playerNum, randomChar);
        }
      }, 5000);
      
    } catch (error) {
      console.log('NFC scan error:', error);
      const randomChar = characters[Math.floor(Math.random() * characters.length)];
      assignCharacter(playerNum, randomChar);
    }
  } else {
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    assignCharacter(playerNum, randomChar);
  }
}

function parseNFCData(text) {
  try {
    const data = JSON.parse(text);
    if (data.name && data.hp && data.attack && data.sprite) {
      return data;
    }
  } catch (e) {
    const charName = text.toUpperCase().trim();
    const foundChar = characters.find(c => c.name === charName);
    if (foundChar) {
      return foundChar;
    }
  }
  return null;
}

function assignCharacter(playerNum, characterData) {
  const sanitizedName = String(characterData.name).substring(0, 50);
  const sanitizedHp = Math.max(1, Math.min(999, parseInt(characterData.hp) || 100));
  const sanitizedAttack = Math.max(1, Math.min(99, parseInt(characterData.attack) || 10));
  const sanitizedSprite = String(characterData.sprite).substring(0, 10);
  
  const charData = {
    name: sanitizedName,
    hp: sanitizedHp,
    attack: sanitizedAttack,
    sprite: sanitizedSprite,
    maxHp: sanitizedHp,
    currentHp: sanitizedHp
  };

  if (playerNum === 1) {
    player1Character = charData;
  } else {
    player2Character = charData;
  }

  const nfcReader = document.getElementById(`nfc${playerNum}`);
  nfcReader.classList.add('scanned');
  nfcReader.innerHTML = '';
  
  const scanIcon = document.createElement('div');
  scanIcon.className = 'scan-icon';
  scanIcon.textContent = '✅';
  
  const scanText = document.createElement('p');
  scanText.textContent = 'Card Scanned!';
  
  nfcReader.appendChild(scanIcon);
  nfcReader.appendChild(scanText);

  const charInfo = document.getElementById(`char${playerNum}-info`);
  charInfo.innerHTML = '';
  
  const charNameDiv = document.createElement('div');
  charNameDiv.className = 'char-name';
  charNameDiv.textContent = charData.name;
  
  const charStatsDiv = document.createElement('div');
  charStatsDiv.className = 'char-stats';
  charStatsDiv.textContent = `${charData.sprite} HP: ${charData.hp} | ATK: ${charData.attack}`;
  
  charInfo.appendChild(charNameDiv);
  charInfo.appendChild(charStatsDiv);

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
    defenderStatus.style.color = '#ffaa00';
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
  defenderStatus.style.color = '#ff4500';
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
  updateNFCReaderUI();
});
