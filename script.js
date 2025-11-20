let isMuted = true;
const bgMusic = document.getElementById('background-music');
const muteBtn = document.getElementById('mute-btn');

muteBtn.addEventListener('click', () => {
  if (isMuted) {
    bgMusic.play();
    muteBtn.textContent = '🔊';
    isMuted = false;
  } else {
    bgMusic.pause();
    muteBtn.textContent = '🔇';
    isMuted = true;
  }
});

document.getElementById('start-btn').addEventListener('click', async () => {
  if (isMuted && bgMusic.paused) {
    bgMusic.play();
    muteBtn.textContent = '🔊';
    isMuted = false;
  }
  await checkNFCSupport();
  showScreen('nfc');
  updateNFCReaderUI();
});


const characters = [
  { name: 'WARRIOR', hp: 100, attack: 15, defence: 10, sprite: '⚔️', imageURL: null, uuid: 'default-warrior' },
  { name: 'MAGE', hp: 80, attack: 20, defence: 5, sprite: '🔮', imageURL: null, uuid: 'default-mage' },
  { name: 'KNIGHT', hp: 120, attack: 12, defence: 20, sprite: '🛡️', imageURL: null, uuid: 'default-knight' },
  { name: 'ROGUE', hp: 90, attack: 18, defence: 8, sprite: '🗡️', imageURL: null, uuid: 'default-rogue' },
  { name: 'PALADIN', hp: 110, attack: 14, defence: 15, sprite: '⚡', imageURL: null, uuid: 'default-paladin' },
  { name: 'NINJA', hp: 85, attack: 19, defence: 6, sprite: '🥷', imageURL: null, uuid: 'default-ninja' }
];

let player1Fighters = [null, null];
let player2Fighters = [null, null];
let battleInterval = null;
let nfcSupported = false;
let nfcReaders = { '1-1': null, '1-2': null, '2-1': null, '2-2': null };
let nfcAbortControllers = { '1-1': null, '1-2': null, '2-1': null, '2-2': null };
let characterUpgrades = {};
let playerPoints = { 1: 0, 2: 0 };
let pendingAttacker = null;
let pendingMultiplier = null;

const screens = {
  title: document.getElementById('title-screen'),
  nfc: document.getElementById('nfc-screen'),
  battle: document.getElementById('battle-screen'),
  upgrade: document.getElementById('upgrade-screen'),
  'mobile-warning': document.getElementById('mobile-warning')
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
    
    // Migrate old speedBonus to defenceBonus
    let migrationOccurred = false;
    for (const uuid in characterUpgrades) {
      const data = characterUpgrades[uuid];
      if (data.speedBonus !== undefined && data.defenceBonus === undefined) {
        data.defenceBonus = Number(data.speedBonus) || 0; // Transfer old speedBonus value to defenceBonus
        delete data.speedBonus; // Remove old property
        migrationOccurred = true;
        console.log(`Migrated ${uuid}: transferred speedBonus ${data.defenceBonus} to defenceBonus`);
      }
      // Ensure defenceBonus exists
      if (data.defenceBonus === undefined) {
        data.defenceBonus = 0;
      }
    }
    // Save migrated data back to storage
    if (migrationOccurred) {
      saveCharacterUpgrades();
      console.log('Migration complete - saved updated character data');
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
  
  // Check if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallScreen = window.innerWidth < 768;
  
  if (isMobile || isSmallScreen) {
    showScreen('mobile-warning');
  }
});



function updateNFCReaderUI() {
  const scanners = ['1-1', '1-2', '2-1', '2-2'];
  scanners.forEach(id => {
    const nfcElement = document.getElementById(`nfc${id}`);
    if (nfcElement) {
      const p = nfcElement.querySelector('p');
      if (p && nfcSupported) {
        if (id.endsWith('-1')) {
          p.textContent = 'Fighter 1';
        } else {
          p.textContent = 'Fighter 2 (Optional)';
        }
      }
    }
  });
}

document.getElementById('nfc1-1').addEventListener('click', () => initiateNFCScan('1-1'));
document.getElementById('nfc1-2').addEventListener('click', () => initiateNFCScan('1-2'));
document.getElementById('nfc2-1').addEventListener('click', () => initiateNFCScan('2-1'));
document.getElementById('nfc2-2').addEventListener('click', () => initiateNFCScan('2-2'));

async function initiateNFCScan(playerNum) {
  const nfcReader = document.getElementById(`nfc${playerNum}`);

  // Abort any existing scan for this player
  if (nfcAbortControllers[playerNum]) {
    nfcAbortControllers[playerNum].abort();
    console.log(`Aborted previous NFC scan for Player ${playerNum}`);
  }

  if (nfcSupported && 'NDEFReader' in window) {
    try {
      nfcReader.innerHTML = `
        <div class="scan-icon scanning">📡</div>
        <p>Reading NFC Tag...</p>
        <p class="scan-hint">Hold card near device</p>
      `;

      // Create new abort controller for this scan
      nfcAbortControllers[playerNum] = new AbortController();

      // Create a fresh NFC reader
      nfcReaders[playerNum] = new NDEFReader();

      await nfcReaders[playerNum].scan({ signal: nfcAbortControllers[playerNum].signal });
      console.log(`NFC scan started for Player ${playerNum}`);

      const readingHandler = ({ message, serialNumber }) => {
        console.log(`NFC tag detected! Serial: ${serialNumber}`);

        // Cleanup the abort controller since we got a successful read
        if (nfcAbortControllers[playerNum]) {
          nfcAbortControllers[playerNum] = null;
        }

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
          // This shouldn't happen with real Beyonder cards
          const nfcReader = document.getElementById(`nfc${playerNum}`);
          nfcReader.innerHTML = `
            <div class="scan-icon" style="color: #ff4500;">❌</div>
            <p style="color: #ff4500;">No Character Data!</p>
            <p style="color: #ffaa00; font-size: 0.9rem;">Please scan a valid Beyonder card</p>
          `;

          setTimeout(() => {
            nfcReader.innerHTML = '';
            const resetIcon = document.createElement('div');
            resetIcon.className = 'scan-icon';
            resetIcon.textContent = '📡';
            const resetText = document.createElement('p');
            resetText.textContent = nfcSupported ? 'Tap NFC Card or Click' : 'Click to Scan Card';
            nfcReader.appendChild(resetIcon);
            nfcReader.appendChild(resetText);
          }, 3000);
          return;
        }

        assignCharacter(playerNum, characterData);
      };

      nfcReaders[playerNum].addEventListener("reading", readingHandler, { once: true });

      nfcReaders[playerNum].addEventListener("readingerror", () => {
        console.log('NFC read error');
        const nfcReader = document.getElementById(`nfc${playerNum}`);
        nfcReader.innerHTML = `
          <div class="scan-icon" style="color: #ff4500;">❌</div>
          <p style="color: #ff4500;">Read Error!</p>
          <p style="color: #ffaa00; font-size: 0.9rem;">Please try again</p>
        `;
      }, { once: true });

      setTimeout(() => {
        const [player, slot] = playerNum.split('-').map(Number);
        const fighters = player === 1 ? player1Fighters : player2Fighters;
        if (!fighters[slot - 1]) {
          console.log('NFC timeout');
          const nfcReader = document.getElementById(`nfc${playerNum}`);
          nfcReader.innerHTML = `
            <div class="scan-icon" style="color: #ffaa00;">⏱️</div>
            <p style="color: #ffaa00;">Scan Timeout</p>
            <p style="color: #ff8800; font-size: 0.9rem;">Click to try again</p>
          `;
        }
      }, 5000);

    } catch (error) {
      // Don't show error if it was just an abort from starting a new scan
      if (error.name === 'AbortError') {
        console.log('NFC scan aborted for Player', playerNum);
        return;
      }

      console.log('NFC scan error:', error);
      const nfcReader = document.getElementById(`nfc${playerNum}`);
      nfcReader.innerHTML = `
        <div class="scan-icon" style="color: #ff4500;">❌</div>
        <p style="color: #ff4500;">Scan Failed!</p>
        <p style="color: #ffaa00; font-size: 0.9rem;">Click to try again</p>
      `;

      // Clear abort controller on error
      nfcAbortControllers[playerNum] = null;
    }
  } else {
    const nfcReader = document.getElementById(`nfc${playerNum}`);
    nfcReader.innerHTML = `
      <div class="scan-icon" style="color: #ffaa00;">⚠️</div>
      <p style="color: #ffaa00;">NFC Not Supported</p>
      <p style="color: #ff8800; font-size: 0.9rem;">Please use a compatible device</p>
    `;
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
      const defence = allParts[allParts.length - 2].trim();
      const atk = allParts[allParts.length - 3].trim();
      const hp = allParts[allParts.length - 4].trim();
      const name = allParts[allParts.length - 5].trim();
      const imageURL = allParts.slice(0, allParts.length - 5).join(':').trim();

      const data = {
        imageURL: imageURL && imageURL.length > 0 ? imageURL : null,
        name: name || 'UNKNOWN',
        hp: parseInt(hp) || 100,
        attack: parseInt(atk) || 10,
        defence: parseInt(defence) || 10,
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
    else if (key === 'def' || key === 'defence' || key === 'defense') data.defence = parseInt(value);
    else if (key === 'uuid') data.uuid = value;
  }

  console.log('Parsed multi-line NFC data:', data);

  if (data.name && (data.hp || data.attack)) {
    if (!data.defence) data.defence = 10;
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

function assignCharacter(slotId, characterData) {
  const [player, slot] = slotId.split('-').map(Number);
  const sanitizedUuid = String(characterData.uuid || '').substring(0, 100);

  // Validate that this is a Beyonder card
  if (!sanitizedUuid || !sanitizedUuid.includes('beyonder')) {
    const nfcReader = document.getElementById(`nfc${slotId}`);
    nfcReader.classList.remove('scanned');
    nfcReader.innerHTML = '';

    const scanIcon = document.createElement('div');
    scanIcon.className = 'scan-icon';
    scanIcon.textContent = '❌';
    scanIcon.style.color = '#ff4500';

    const scanText = document.createElement('p');
    scanText.textContent = 'INVALID CARD!';
    scanText.style.color = '#ff4500';

    const errorText = document.createElement('p');
    errorText.textContent = 'Only Beyonder cards can be used';
    errorText.style.color = '#ffaa00';
    errorText.style.fontSize = '0.9rem';
    errorText.style.marginTop = '10px';

    nfcReader.appendChild(scanIcon);
    nfcReader.appendChild(scanText);
    nfcReader.appendChild(errorText);

    console.log(`Card rejected for slot ${slotId}: Not a Beyonder card (UUID: ${sanitizedUuid})`);

    // Reset the reader after 3 seconds
    setTimeout(() => {
      nfcReader.innerHTML = '';
      const resetIcon = document.createElement('div');
      resetIcon.className = 'scan-icon';
      resetIcon.textContent = '📡';
      const resetText = document.createElement('p');
      resetText.textContent = slot === 1 ? 'Fighter 1' : 'Fighter 2 (Optional)';
      nfcReader.appendChild(resetIcon);
      nfcReader.appendChild(resetText);
    }, 3000);

    return;
  }

  const sanitizedName = String(characterData.name || 'UNKNOWN').substring(0, 50);
  const baseHp = parseInt(characterData.hp) || 100;
  const baseAttack = parseInt(characterData.attack) || 10;
  const baseDefence = parseInt(characterData.defence) || 10;

  let imageURL = null;
  if (characterData.imageURL && typeof characterData.imageURL === 'string') {
    imageURL = characterData.imageURL.substring(0, 500);
  }

  const sprite = characterData.sprite || '⚔️';

  if (!characterUpgrades[sanitizedUuid]) {
    characterUpgrades[sanitizedUuid] = {
      hpBonus: 0,
      attackBonus: 0,
      defenceBonus: 0,
      points: 0,
      level: 1,
      exp: 0
    };
  }

  // Ensure level and exp exist for older save data
  if (!characterUpgrades[sanitizedUuid].level) {
    characterUpgrades[sanitizedUuid].level = 1;
  }
  if (!characterUpgrades[sanitizedUuid].exp) {
    characterUpgrades[sanitizedUuid].exp = 0;
  }
  // Ensure defenceBonus exists (for legacy save data migration)
  if (characterUpgrades[sanitizedUuid].defenceBonus === undefined) {
    characterUpgrades[sanitizedUuid].defenceBonus = 0;
  }
  // Ensure all bonuses have defaults
  if (characterUpgrades[sanitizedUuid].hpBonus === undefined) {
    characterUpgrades[sanitizedUuid].hpBonus = 0;
  }
  if (characterUpgrades[sanitizedUuid].attackBonus === undefined) {
    characterUpgrades[sanitizedUuid].attackBonus = 0;
  }

  const upgrades = characterUpgrades[sanitizedUuid];
  const levelMultiplier = upgrades.level;

  const hpBonus = Number(upgrades.hpBonus) || 0;
  const attackBonus = Number(upgrades.attackBonus) || 0;
  const defenceBonus = Number(upgrades.defenceBonus) || 0;

  const charData = {
    name: sanitizedName,
    baseHp: baseHp,
    baseAttack: baseAttack,
    baseDefence: baseDefence,
    hp: Math.floor((baseHp + (hpBonus * 100)) * levelMultiplier),
    attack: Math.floor((baseAttack + (attackBonus * 100)) * levelMultiplier),
    defence: Math.floor((baseDefence + (defenceBonus * 100)) * levelMultiplier),
    sprite: sprite,
    imageURL: imageURL,
    uuid: sanitizedUuid,
    maxHp: Math.floor((baseHp + (hpBonus * 100)) * levelMultiplier),
    currentHp: Math.floor((baseHp + (hpBonus * 100)) * levelMultiplier)
  };

  if (player === 1) {
    player1Fighters[slot - 1] = charData;
  } else {
    player2Fighters[slot - 1] = charData;
  }

  const nfcReader = document.getElementById(`nfc${slotId}`);
  nfcReader.classList.add('scanned');
  nfcReader.innerHTML = '';

  const scanIcon = document.createElement('div');
  scanIcon.className = 'scan-icon';
  scanIcon.textContent = '✅';

  const scanText = document.createElement('p');
  scanText.textContent = 'Card Scanned!';

  nfcReader.appendChild(scanIcon);
  nfcReader.appendChild(scanText);

  const charInfo = document.getElementById(`char${slotId}-info`);
  charInfo.innerHTML = '';

  const charNameDiv = document.createElement('div');
  charNameDiv.className = 'char-name';
  charNameDiv.textContent = charData.name;

  const charStatsDiv = document.createElement('div');
  charStatsDiv.className = 'char-stats';
  charStatsDiv.textContent = `${charData.sprite} HP: ${charData.hp} | ATK: ${charData.attack} | DEF: ${charData.defence}`;

  charInfo.appendChild(charNameDiv);
  charInfo.appendChild(charStatsDiv);

  if (player1Fighters[0] && player2Fighters[0]) {
    document.getElementById('battle-start-btn').disabled = false;
  }
}

document.getElementById('battle-start-btn').addEventListener('click', () => {
  showScreen('battle');
  initBattle();
});

let rouletteIntervals = { 1: null, 2: null };
let rouletteValues = { 1: 1, 2: 1 };
let rouletteStopped = { 1: false, 2: false };

function initBattle() {
  if (player1Fighters[0]) {
    setupFighter('1-1', player1Fighters[0]);
    document.getElementById('fighter1-1').style.display = 'flex';
  }
  if (player1Fighters[1]) {
    setupFighter('1-2', player1Fighters[1]);
    document.getElementById('fighter1-2').style.display = 'flex';
  }
  if (player2Fighters[0]) {
    setupFighter('2-1', player2Fighters[0]);
    document.getElementById('fighter2-1').style.display = 'flex';
  }
  if (player2Fighters[1]) {
    setupFighter('2-2', player2Fighters[1]);
    document.getElementById('fighter2-2').style.display = 'flex';
  }

  const battleLog = document.getElementById('battle-log');
  battleLog.innerHTML = '<div class="log-entry">FIGHT!</div>';

  document.getElementById('game-over').classList.add('hidden');
  document.getElementById('action-selection').classList.add('hidden');

  addLog('Press STOP to lock your number!', 'multiplier');

  // Start roulette turn
  startRouletteTurn();
}

function startRouletteTurn() {
  rouletteStopped = { 1: false, 2: false };
  rouletteValues = { 1: 1, 2: 1 };

  // Show roulette UI
  document.getElementById('roulette-container').classList.remove('hidden');

  // Start spinning for both players
  rouletteIntervals[1] = setInterval(() => {
    if (!rouletteStopped[1]) {
      rouletteValues[1] = Math.floor(Math.random() * 5) + 1;
      document.getElementById('roulette-number-1').textContent = rouletteValues[1];
    }
  }, 50);

  rouletteIntervals[2] = setInterval(() => {
    if (!rouletteStopped[2]) {
      rouletteValues[2] = Math.floor(Math.random() * 5) + 1;
      document.getElementById('roulette-number-2').textContent = rouletteValues[2];
    }
  }, 50);
}

function stopRoulette(playerNum) {
  if (rouletteStopped[playerNum]) return;

  rouletteStopped[playerNum] = true;
  document.getElementById(`roulette-stop-${playerNum}`).disabled = true;

  // Check if both players have stopped
  if (rouletteStopped[1] && rouletteStopped[2]) {
    clearInterval(rouletteIntervals[1]);
    clearInterval(rouletteIntervals[2]);

    setTimeout(() => {
      executeRouletteTurn();
    }, 500);
  }
}

function executeRouletteTurn() {
  const value1 = rouletteValues[1];
  const value2 = rouletteValues[2];

  addLog(`Player 1 rolled ${value1} | Player 2 rolled ${value2}`, 'multiplier');

  // Hide roulette UI
  document.getElementById('roulette-container').classList.add('hidden');
  document.getElementById('roulette-stop-1').disabled = false;
  document.getElementById('roulette-stop-2').disabled = false;

  if (value1 > value2) {
    addLog(`Player 1 wins! Choose your action! (${value1} > ${value2})`, 'attack');
    showFighterSelection(1, value1);
  } else if (value2 > value1) {
    addLog(`Player 2 wins! Choose your action! (${value2} > ${value1})`, 'attack');
    showFighterSelection(2, value2);
  } else {
    addLog('TIE! No one attacks this turn!', 'block');
    checkBattleEnd();
  }
}

function showFighterSelection(winnerPlayer, multiplier) {
  const actionSelection = document.getElementById('action-selection');
  const attackerSelection = document.getElementById('attacker-selection');
  const targetSelection = document.getElementById('target-selection');
  const attackerButtons = document.getElementById('attacker-buttons');
  
  pendingMultiplier = multiplier;
  
  actionSelection.classList.remove('hidden');
  attackerSelection.classList.remove('hidden');
  targetSelection.classList.add('hidden');
  attackerButtons.innerHTML = '';
  
  const fighters = winnerPlayer === 1 ? player1Fighters : player2Fighters;
  
  fighters.forEach((fighter, index) => {
    if (fighter && fighter.currentHp > 0) {
      const btn = document.createElement('button');
      btn.textContent = `${fighter.name} (HP: ${fighter.currentHp})`;
      btn.onclick = () => selectAttacker(winnerPlayer, index + 1);
      attackerButtons.appendChild(btn);
    }
  });
}

function selectAttacker(player, slot) {
  pendingAttacker = `${player}-${slot}`;
  
  const attackerSelection = document.getElementById('attacker-selection');
  const targetSelection = document.getElementById('target-selection');
  const targetButtons = document.getElementById('target-buttons');
  
  attackerSelection.classList.add('hidden');
  targetSelection.classList.remove('hidden');
  targetButtons.innerHTML = '';
  
  const opponentPlayer = player === 1 ? 2 : 1;
  const opponentFighters = opponentPlayer === 1 ? player1Fighters : player2Fighters;
  
  opponentFighters.forEach((fighter, index) => {
    if (fighter && fighter.currentHp > 0) {
      const btn = document.createElement('button');
      btn.textContent = `${fighter.name} (HP: ${fighter.currentHp})`;
      btn.onclick = () => selectTarget(`${opponentPlayer}-${index + 1}`);
      targetButtons.appendChild(btn);
    }
  });
}

function selectTarget(targetId) {
  document.getElementById('action-selection').classList.add('hidden');
  executeTurn(pendingAttacker, targetId, pendingMultiplier);
}

function checkBattleEnd() {
  const player1Alive = player1Fighters.some(f => f && f.currentHp > 0);
  const player2Alive = player2Fighters.some(f => f && f.currentHp > 0);
  
  if (!player1Alive || !player2Alive) {
    endBattle();
  } else {
    setTimeout(() => {
      startRouletteTurn();
    }, 2000);
  }
}

function setupFighter(fighterId, character) {
  const fighter = document.getElementById(`fighter${fighterId}`);
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

  updateHealth(fighterId, character);
  updateLevelDisplay(fighterId, character);
}

function updateHealth(fighterId, character) {
  const fighter = document.getElementById(`fighter${fighterId}`);
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

  if (character.currentHp <= 0) {
    fighter.classList.add('defeated');
  }
}

function updateLevelDisplay(fighterId, character) {
  const fighter = document.getElementById(`fighter${fighterId}`);
  let levelDisplay = fighter.querySelector('.level-display');

  if (!levelDisplay) {
    levelDisplay = document.createElement('div');
    levelDisplay.className = 'level-display';
    fighter.querySelector('.health-container').appendChild(levelDisplay);
  }

  const upgrades = characterUpgrades[character.uuid];
  const currentLevel = upgrades ? upgrades.level : 1;
  const currentExp = upgrades ? upgrades.exp : 0;
  const expNeeded = currentLevel * 100;

  levelDisplay.innerHTML = `
    <div class="level-text">Level ${currentLevel}</div>
    <div class="exp-bar-container">
      <div class="exp-bar-fill" style="width: ${(currentExp / expNeeded) * 100}%"></div>
    </div>
    <div class="exp-text">${currentExp} / ${expNeeded} EXP</div>
  `;
}

function executeTurn(attackerId, targetId, multiplier) {
  const [attackerPlayer, attackerSlot] = attackerId.split('-').map(Number);
  const [targetPlayer, targetSlot] = targetId.split('-').map(Number);

  const attackerFighters = attackerPlayer === 1 ? player1Fighters : player2Fighters;
  const targetFighters = targetPlayer === 1 ? player1Fighters : player2Fighters;

  const attackerChar = attackerFighters[attackerSlot - 1];
  const targetChar = targetFighters[targetSlot - 1];

  const attackerFighter = document.getElementById(`fighter${attackerId}`);
  const targetFighter = document.getElementById(`fighter${targetId}`);

  attackerFighter.classList.add('attacking');
  setTimeout(() => attackerFighter.classList.remove('attacking'), 500);

  // Get the actual attack and defence stats from the character objects
  const actualAttack = Number(attackerChar.attack) || 10;
  const actualDefence = Number(targetChar.defence) || 10;

  // Calculate damage: ATK × multiplier
  const blockChance = 0.25;
  const isBlocking = Math.random() < blockChance;

  // Use real stats: Attack × multiplier
  let damage = Math.floor(actualAttack * multiplier);

  if (isBlocking) {
    damage = Math.floor(damage * 0.5); // Block reduces damage to 50%
    damage = Math.max(1, damage); // Ensure at least 1 damage even when blocked
    targetFighter.classList.add('blocking');
    setTimeout(() => targetFighter.classList.remove('blocking'), 500);
  }

  targetChar.currentHp = Math.max(0, targetChar.currentHp - damage);
  updateHealth(targetId, targetChar);

  const targetStatus = targetFighter.querySelector('.fighter-status');
  targetStatus.textContent = `-${damage} HP`;
  targetStatus.style.color = isBlocking ? '#ffaa00' : '#ff4500';
  setTimeout(() => targetStatus.textContent = '', 1000);

  let logMessage = `${attackerChar.name} attacks ${targetChar.name} for ${damage} damage! (ATK:${actualAttack} vs DEF:${actualDefence}, x${multiplier})`;
  let logClass = 'attack';

  if (isBlocking) {
    logMessage += ` (BLOCKED! 50% damage reduction)`;
    logClass = 'block';
  }

  addLog(logMessage, logClass);
  
  // Check battle end after turn
  checkBattleEnd();
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
  clearInterval(rouletteIntervals[1]);
  clearInterval(rouletteIntervals[2]);
  document.getElementById('roulette-container').classList.add('hidden');
  document.getElementById('action-selection').classList.add('hidden');

  const player1Alive = player1Fighters.some(f => f && f.currentHp > 0);
  const player2Alive = player2Fighters.some(f => f && f.currentHp > 0);

  const winnerTeam = player1Alive ? 1 : 2;
  const loserTeam = player1Alive ? 2 : 1;
  const winnerFighters = player1Alive ? player1Fighters : player2Fighters;
  const loserFighters = player1Alive ? player2Fighters : player1Fighters;

  // Award experience to all fighters
  const expAward = 50;
  
  winnerFighters.forEach((fighter, index) => {
    if (fighter) {
      const upgrades = characterUpgrades[fighter.uuid];
      upgrades.exp += expAward;
      upgrades.points += 10;
      
      // Level up logic
      let requiredExp = upgrades.level * 100;
      while (upgrades.exp >= requiredExp) {
        upgrades.exp -= requiredExp;
        upgrades.level++;
        requiredExp = upgrades.level * 100;
      }
      
      addLog(`${fighter.name} gained ${expAward} EXP! (Level ${upgrades.level})`, 'multiplier');
    }
  });

  loserFighters.forEach((fighter, index) => {
    if (fighter) {
      const upgrades = characterUpgrades[fighter.uuid];
      const loserExp = Math.floor(expAward / 2);
      upgrades.exp += loserExp;
      upgrades.points += 5;
      
      // Level up logic
      let requiredExp = upgrades.level * 100;
      while (upgrades.exp >= requiredExp) {
        upgrades.exp -= requiredExp;
        upgrades.level++;
        requiredExp = upgrades.level * 100;
      }
      
      addLog(`${fighter.name} gained ${loserExp} EXP! (Level ${upgrades.level})`, 'block');
    }
  });

  saveCharacterUpgrades();

  addLog(`Player ${winnerTeam} WINS!`, 'multiplier');

  const gameOver = document.getElementById('game-over');
  gameOver.classList.remove('hidden');
  gameOver.querySelector('.winner-text').textContent = `PLAYER ${winnerTeam} WINS!`;
}

document.getElementById('restart-btn').addEventListener('click', () => {
  location.reload();
});

document.getElementById('upgrade-btn')?.addEventListener('click', async () => {
  await checkNFCSupport();
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
          statusElement.textContent = '❌ Invalid NFC card - no character data found';
          statusElement.style.color = '#ff4500';
          scanBtn.disabled = false;
          ndef.removeEventListener("reading", readingHandler);
          return;
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
      }, 10000);

    } catch (error) {
      console.log('NFC scan error:', error);
      statusElement.textContent = `❌ NFC scan failed: ${error.message}`;
      statusElement.style.color = '#ff4500';
      scanBtn.disabled = false;
    }
  } else {
    statusElement.textContent = '❌ NFC not supported on this device';
    statusElement.style.color = '#ff4500';
    scanBtn.disabled = false;
  }
}

function loadCharacterForUpgrade(characterData) {
  const sanitizedUuid = String(characterData.uuid || `random-${Date.now()}`).substring(0, 100);

  if (!characterUpgrades[sanitizedUuid]) {
    characterUpgrades[sanitizedUuid] = {
      hpBonus: 0,
      attackBonus: 0,
      defenceBonus: 0,
      points: 0,
      level: 1,
      exp: 0
    };
  }

  // Ensure level and exp exist for older save data
  if (!characterUpgrades[sanitizedUuid].level) {
    characterUpgrades[sanitizedUuid].level = 1;
  }
  if (!characterUpgrades[sanitizedUuid].exp) {
    characterUpgrades[sanitizedUuid].exp = 0;
  }
  // Ensure defenceBonus exists (for legacy save data migration)
  if (characterUpgrades[sanitizedUuid].defenceBonus === undefined) {
    characterUpgrades[sanitizedUuid].defenceBonus = 0;
  }
  // Ensure all bonuses have defaults
  if (characterUpgrades[sanitizedUuid].hpBonus === undefined) {
    characterUpgrades[sanitizedUuid].hpBonus = 0;
  }
  if (characterUpgrades[sanitizedUuid].attackBonus === undefined) {
    characterUpgrades[sanitizedUuid].attackBonus = 0;
  }

  currentUpgradeCharacter = {
    uuid: sanitizedUuid,
    name: String(characterData.name || 'UNKNOWN').substring(0, 50),
    data: characterUpgrades[sanitizedUuid],
    fullData: {
      baseHp: parseInt(characterData.hp) || 100,
      baseAttack: parseInt(characterData.attack) || 10,
      baseDefence: parseInt(characterData.defence) || 10,
      sprite: characterData.sprite || '⚔️',
      imageURL: characterData.imageURL || null
    }
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
  const charData = currentUpgradeCharacter.fullData;

  const card = document.createElement('div');
  card.className = 'upgrade-card';

  const charNameDiv = document.createElement('div');
  charNameDiv.className = 'upgrade-char-name';
  charNameDiv.textContent = charName;

  // Character Image
  if (charData && charData.imageURL) {
    const imageContainer = document.createElement('div');
    imageContainer.className = 'upgrade-char-image';
    const img = document.createElement('img');
    img.src = charData.imageURL;
    img.alt = charName;
    img.className = 'character-image';
    img.onerror = () => {
      imageContainer.innerHTML = `<div class="upgrade-sprite">${charData.sprite || '⚔️'}</div>`;
    };
    imageContainer.appendChild(img);
    card.appendChild(imageContainer);
  } else if (charData && charData.sprite) {
    const spriteDiv = document.createElement('div');
    spriteDiv.className = 'upgrade-sprite';
    spriteDiv.textContent = charData.sprite;
    card.appendChild(spriteDiv);
  }

  const points = document.createElement('div');
  points.className = 'upgrade-points';
  points.textContent = `Points: ${data.points}`;

  const levelInfo = document.createElement('div');
  levelInfo.className = 'upgrade-level';
  levelInfo.innerHTML = `
    <div>Level: ${data.level}</div>
    <div>EXP: ${data.exp} / ${data.level * 100}</div>
  `;

  // Calculate stats
  const levelMultiplier = data.level;
  const baseHp = charData ? charData.baseHp : 100;
  const baseAttack = charData ? charData.baseAttack : 10;
  const baseDefence = charData ? charData.baseDefence : 10;

  const currentHp = (baseHp + (data.hpBonus * 100)) * levelMultiplier;
  const currentAttack = (baseAttack + (data.attackBonus * 100)) * levelMultiplier;
  const currentDefence = (baseDefence + (data.defenceBonus * 100)) * levelMultiplier;

  const stats = document.createElement('div');
  stats.className = 'upgrade-stats';
  stats.innerHTML = `
    <div class="stat-row">
      <span class="stat-label">HP:</span>
      <span class="stat-origin">${baseHp}</span>
      <span class="stat-arrow">→</span>
      <span class="stat-current">${currentHp}</span>
      <span class="stat-bonus">(+${(data.hpBonus || 0) * 100})</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">ATK:</span>
      <span class="stat-origin">${baseAttack}</span>
      <span class="stat-arrow">→</span>
      <span class="stat-current">${currentAttack}</span>
      <span class="stat-bonus">(+${(data.attackBonus || 0) * 100})</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">DEF:</span>
      <span class="stat-origin">${baseDefence}</span>
      <span class="stat-arrow">→</span>
      <span class="stat-current">${currentDefence}</span>
      <span class="stat-bonus">(+${(data.defenceBonus || 0) * 100})</span>
    </div>
  `;

  const controls = document.createElement('div');
  controls.className = 'upgrade-controls';

  ['hp', 'attack', 'defence'].forEach(stat => {
    const btn = document.createElement('button');
    btn.className = 'upgrade-stat-btn';
    btn.textContent = `+1 ${stat.toUpperCase()} (+100)`;
    btn.disabled = data.points < 1;
    btn.addEventListener('click', () => upgradeStat(uuid, stat));
    controls.appendChild(btn);
  });

  card.appendChild(charNameDiv);
  card.appendChild(points);
  card.appendChild(levelInfo);
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
  else if (stat === 'defence') data.defenceBonus += 1;

  saveCharacterUpgrades();
  showUpgradeMenu();
}