const characters = [
  { name: 'WARRIOR', hp: 100, attack: 15, speed: 50, sprite: '⚔️', imageURL: null, uuid: 'default-warrior' },
  { name: 'MAGE', hp: 80, attack: 20, speed: 60, sprite: '🔮', imageURL: null, uuid: 'default-mage' },
  { name: 'KNIGHT', hp: 120, attack: 12, speed: 40, sprite: '🛡️', imageURL: null, uuid: 'default-knight' },
  { name: 'ROGUE', hp: 90, attack: 18, speed: 70, sprite: '🗡️', imageURL: null, uuid: 'default-rogue' },
  { name: 'PALADIN', hp: 110, attack: 14, speed: 45, sprite: '⚡', imageURL: null, uuid: 'default-paladin' },
  { name: 'NINJA', hp: 85, attack: 19, speed: 80, sprite: '🥷', imageURL: null, uuid: 'default-ninja' }
];

let player1Character = null;
let player2Character = null;
let battleInterval = null;
let nfcSupported = false;
let nfcReaders = { 1: null, 2: null };
let characterUpgrades = {};
let playerPoints = { 1: 0, 2: 0 };

const screens = {
  title: document.getElementById('title-screen'),
  nfc: document.getElementById('nfc-screen'),
  battle: document.getElementById('battle-screen'),
  upgrade: document.getElementById('upgrade-screen')
};

async function loadCharacterUpgrades() {
  try {
    const saved = localStorage.getItem('characterUpgrades');
    if (saved) {
      characterUpgrades = JSON.parse(saved);
      console.log('Loaded character upgrades from localStorage');
    } else {
      const response = await fetch('character_upgrades.json');
      if (response.ok) {
        characterUpgrades = await response.json();
        console.log('Loaded character upgrades from JSON file');
      }
    }
  } catch (e) {
    console.log('Error loading upgrades:', e);
    characterUpgrades = {};
  }
}

async function saveCharacterUpgrades() {
  try {
    localStorage.setItem('characterUpgrades', JSON.stringify(characterUpgrades));
    console.log('Character upgrades saved to localStorage');
  } catch (e) {
    console.error('Error saving upgrades:', e);
  }
}

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

window.addEventListener('DOMContentLoaded', async () => {
  await loadCharacterUpgrades();
});

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
  console.log('Parsing NFC data:', text);
  
  const trimmedText = text.trim();
  
  if (!trimmedText.includes('\n') && trimmedText.split(':').length >= 6) {
    console.log('Detected single-line colon-delimited format');
    
    const allParts = trimmedText.split(':');
    
    if (allParts.length >= 6) {
      const uuid = allParts[allParts.length - 1].trim();
      const speed = allParts[allParts.length - 2].trim();
      const atk = allParts[allParts.length - 3].trim();
      const hp = allParts[allParts.length - 4].trim();
      const name = allParts[allParts.length - 5].trim();
      const imageURL = allParts.slice(0, allParts.length - 5).join(':').trim();
      
      const data = {
        imageURL: imageURL && imageURL.length > 0 ? imageURL : null,
        name: name || 'UNKNOWN',
        hp: parseInt(hp) || 100,
        attack: parseInt(atk) || 10,
        speed: parseInt(speed) || 50,
        uuid: uuid || `nfc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };
      
      console.log('Parsed single-line NFC data:', data);
      return data;
    }
  }
  
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const data = {};
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.substring(0, colonIndex).trim().toLowerCase().replace(/[^\w]/g, '');
    const value = line.substring(colonIndex + 1).trim();
    
    if (key === 'imageurl') data.imageURL = value;
    else if (key === 'name') data.name = value;
    else if (key === 'hp') data.hp = parseInt(value);
    else if (key === 'atk' || key === 'attack') data.attack = parseInt(value);
    else if (key === 'spd' || key === 'speed') data.speed = parseInt(value);
    else if (key === 'uuid') data.uuid = value;
  }
  
  console.log('Parsed multi-line NFC data:', data);
  
  if (data.name && (data.hp || data.attack)) {
    if (!data.speed) data.speed = 50;
    if (!data.hp) data.hp = 100;
    if (!data.attack) data.attack = 10;
    if (!data.uuid) data.uuid = `nfc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('Valid multi-line NFC character data found:', data);
    return data;
  }
  
  try {
    const jsonData = JSON.parse(text);
    if (jsonData.name && jsonData.hp && jsonData.attack) {
      console.log('Valid JSON character data found:', jsonData);
      return jsonData;
    }
  } catch (e) {}
  
  const charName = text.toUpperCase().trim();
  const foundChar = characters.find(c => c.name === charName);
  if (foundChar) {
    console.log('Found character by name:', foundChar);
    return foundChar;
  }
  
  console.log('No valid character data found in NFC tag');
  return null;
}

function assignCharacter(playerNum, characterData) {
  const sanitizedName = String(characterData.name || 'UNKNOWN').substring(0, 50);
  const baseHp = Math.max(1, Math.min(999, parseInt(characterData.hp) || 100));
  const baseAttack = Math.max(1, Math.min(99, parseInt(characterData.attack) || 10));
  const baseSpeed = Math.max(1, Math.min(99, parseInt(characterData.speed) || 50));
  const sanitizedUuid = String(characterData.uuid || `random-${Date.now()}`).substring(0, 100);
  
  let imageURL = null;
  if (characterData.imageURL && typeof characterData.imageURL === 'string') {
    imageURL = characterData.imageURL.substring(0, 500);
  }
  
  const sprite = characterData.sprite || '⚔️';
  
  if (!characterUpgrades[sanitizedUuid]) {
    characterUpgrades[sanitizedUuid] = {
      hpBonus: 0,
      attackBonus: 0,
      speedBonus: 0,
      points: 0
    };
  }
  
  const upgrades = characterUpgrades[sanitizedUuid];
  
  const charData = {
    name: sanitizedName,
    baseHp: baseHp,
    baseAttack: baseAttack,
    baseSpeed: baseSpeed,
    hp: baseHp + upgrades.hpBonus,
    attack: baseAttack + upgrades.attackBonus,
    speed: baseSpeed + upgrades.speedBonus,
    sprite: sprite,
    imageURL: imageURL,
    uuid: sanitizedUuid,
    maxHp: baseHp + upgrades.hpBonus,
    currentHp: baseHp + upgrades.hpBonus
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
  charStatsDiv.textContent = `${charData.sprite} HP: ${charData.hp} | ATK: ${charData.attack} | SPD: ${charData.speed}`;
  
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
  
  const spriteElement = fighter.querySelector('.fighter-sprite');
  
  if (character.imageURL) {
    spriteElement.innerHTML = '';
    const img = document.createElement('img');
    img.src = character.imageURL;
    img.alt = character.name;
    img.className = 'character-image';
    img.onerror = () => {
      spriteElement.textContent = character.sprite;
    };
    spriteElement.appendChild(img);
  } else {
    spriteElement.textContent = character.sprite;
  }
  
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
  const speedDiff = player1Character.speed - player2Character.speed;
  const speedBonus = Math.abs(speedDiff) * 0.02;
  
  let attacker, defender;
  if (speedDiff > 0) {
    attacker = Math.random() < (0.5 + speedBonus) ? 1 : 2;
  } else if (speedDiff < 0) {
    attacker = Math.random() < (0.5 - speedBonus) ? 1 : 2;
  } else {
    attacker = Math.random() < 0.5 ? 1 : 2;
  }
  
  defender = attacker === 1 ? 2 : 1;
  
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
  
  let winner, loser, winnerNum, loserNum;
  
  if (player1Character.currentHp > player2Character.currentHp) {
    winner = player1Character;
    loser = player2Character;
    winnerNum = 1;
    loserNum = 2;
  } else {
    winner = player2Character;
    loser = player1Character;
    winnerNum = 2;
    loserNum = 1;
  }
  
  characterUpgrades[winner.uuid].points += 10;
  characterUpgrades[loser.uuid].points += 5;
  playerPoints[winnerNum] = characterUpgrades[winner.uuid].points;
  playerPoints[loserNum] = characterUpgrades[loser.uuid].points;
  
  saveCharacterUpgrades();
  
  addLog(`${winner.name} WINS!`, 'multiplier');
  addLog(`${winner.name} earned 10 points! (Total: ${characterUpgrades[winner.uuid].points})`, 'multiplier');
  addLog(`${loser.name} earned 5 points! (Total: ${characterUpgrades[loser.uuid].points})`, 'block');
  
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

document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
  await loadCharacterUpgrades();
  showScreen('upgrade');
  showUpgradeMenu();
});

document.getElementById('back-to-title')?.addEventListener('click', () => {
  currentUpgradeCharacter = null;
  document.getElementById('upgrade-scan-status').textContent = '';
  document.getElementById('scan-for-upgrade-btn').disabled = false;
  showScreen('title');
});

let currentUpgradeCharacter = null;

document.getElementById('scan-for-upgrade-btn')?.addEventListener('click', async () => {
  scanForUpgrade();
});

async function scanForUpgrade() {
  const statusElement = document.getElementById('upgrade-scan-status');
  const scanBtn = document.getElementById('scan-for-upgrade-btn');
  
  scanBtn.disabled = true;
  statusElement.textContent = '📡 Scanning for card...';
  statusElement.style.color = '#ffaa00';
  
  if (nfcSupported && 'NDEFReader' in window) {
    try {
      const ndef = new NDEFReader();
      await ndef.scan();
      
      const readingHandler = ({ message, serialNumber }) => {
        console.log(`NFC tag detected for upgrade! Serial: ${serialNumber}`);
        
        let characterData = null;
        
        for (const record of message.records) {
          if (record.recordType === "text") {
            const textDecoder = new TextDecoder(record.encoding);
            const text = textDecoder.decode(record.data);
            characterData = parseNFCData(text);
            break;
          }
        }
        
        if (!characterData) {
          const hash = serialNumber.split(':').reduce((acc, val) => acc + parseInt(val, 16), 0);
          const charIndex = hash % characters.length;
          characterData = characters[charIndex];
        }
        
        loadCharacterForUpgrade(characterData);
        ndef.removeEventListener("reading", readingHandler);
      };
      
      ndef.addEventListener("reading", readingHandler);
      
      setTimeout(() => {
        ndef.removeEventListener("reading", readingHandler);
        if (!currentUpgradeCharacter) {
          statusElement.textContent = '❌ Scan timeout - please try again';
          statusElement.style.color = '#ff4500';
          scanBtn.disabled = false;
        }
      }, 5000);
      
    } catch (error) {
      console.log('NFC scan error:', error);
      statusElement.textContent = '❌ NFC scan failed - please try again';
      statusElement.style.color = '#ff4500';
      scanBtn.disabled = false;
    }
  } else {
    const randomChar = characters[Math.floor(Math.random() * characters.length)];
    loadCharacterForUpgrade(randomChar);
  }
}

function loadCharacterForUpgrade(characterData) {
  const sanitizedUuid = String(characterData.uuid || `random-${Date.now()}`).substring(0, 100);
  
  if (!characterUpgrades[sanitizedUuid]) {
    characterUpgrades[sanitizedUuid] = {
      hpBonus: 0,
      attackBonus: 0,
      speedBonus: 0,
      points: 0
    };
  }
  
  currentUpgradeCharacter = {
    uuid: sanitizedUuid,
    name: String(characterData.name || 'UNKNOWN').substring(0, 50),
    data: characterUpgrades[sanitizedUuid]
  };
  
  const statusElement = document.getElementById('upgrade-scan-status');
  statusElement.textContent = `✅ ${currentUpgradeCharacter.name} loaded!`;
  statusElement.style.color = '#00ff00';
  
  showUpgradeMenu();
}

function showUpgradeMenu() {
  const upgradeList = document.getElementById('upgrade-list');
  upgradeList.innerHTML = '';
  
  if (!currentUpgradeCharacter) {
    upgradeList.innerHTML = '<div class="no-upgrades">Scan a card to upgrade your character!</div>';
    return;
  }
  
  const uuid = currentUpgradeCharacter.uuid;
  const data = currentUpgradeCharacter.data;
  const charName = currentUpgradeCharacter.name;
    
    const card = document.createElement('div');
  card.className = 'upgrade-card';
  
  const charNameDiv = document.createElement('div');
  charNameDiv.className = 'upgrade-char-name';
  charNameDiv.textContent = charName;
  
  const points = document.createElement('div');
  points.className = 'upgrade-points';
  points.textContent = `Points: ${data.points}`;
  
  const stats = document.createElement('div');
  stats.className = 'upgrade-stats';
  stats.innerHTML = `
    <div>HP Bonus: +${data.hpBonus}</div>
    <div>ATK Bonus: +${data.attackBonus}</div>
    <div>SPD Bonus: +${data.speedBonus}</div>
  `;
  
  const controls = document.createElement('div');
  controls.className = 'upgrade-controls';
  
  ['hp', 'attack', 'speed'].forEach(stat => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-stat-btn';
    btn.textContent = `+1 ${stat.toUpperCase()}`;
    btn.disabled = data.points < 1;
    btn.addEventListener('click', () => upgradeStat(uuid, stat));
    controls.appendChild(btn);
  });
  
  card.appendChild(charNameDiv);
  card.appendChild(points);
  card.appendChild(stats);
  card.appendChild(controls);
  upgradeList.appendChild(card);
}

function upgradeStat(uuid, stat) {
  const data = characterUpgrades[uuid];
  if (data.points < 1) return;
  
  data.points -= 1;
  
  if (stat === 'hp') data.hpBonus += 1;
  else if (stat === 'attack') data.attackBonus += 1;
  else if (stat === 'speed') data.speedBonus += 1;
  
  saveCharacterUpgrades();
  showUpgradeMenu();
}
