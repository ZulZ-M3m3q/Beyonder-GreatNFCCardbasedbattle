# Arcade Battle Arena

## Overview

Arcade Battle Arena is a browser-based fighting game with a retro arcade aesthetic. The game simulates an NFC card-scanning mechanic where players select characters by "scanning" cards, then engage in automated turn-based battles. The project is built entirely with vanilla JavaScript, HTML, and CSS, creating a nostalgic arcade experience with modern web technologies.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Single-Page Application (SPA) Pattern**
- The application uses a screen-based navigation system with three main screens: title screen, NFC scanning screen, and battle screen
- Screen transitions are managed through CSS class toggling (`active` class) rather than traditional routing
- This approach was chosen for simplicity and to maintain the arcade-like instant transitions without page reloads
- Pros: Simple to implement, fast transitions, no dependencies
- Cons: Limited scalability for additional screens, all code loads upfront

**Vanilla JavaScript Architecture**
- No frameworks or build tools are used; pure HTML/CSS/JS implementation
- DOM manipulation is handled directly through `document.getElementById()` and event listeners
- Character data is stored in a simple JavaScript array of objects
- Rationale: Keeps the project lightweight, reduces complexity, and aligns with the retro arcade theme
- Pros: Zero dependencies, fast load times, easy to understand
- Cons: Manual DOM management, no reactivity patterns, harder to maintain as complexity grows

**Character Data Structure**
- Characters are defined with properties: name, HP, attack, defence, sprite (emoji), imageURL, uuid, maxHP, and currentHP
- Six pre-defined character types provide variety in gameplay (Warrior, Mage, Knight, Rogue, Paladin, Ninja)
- Each character has unique base stats balancing HP, attack power, and defensive capabilities
- Damage calculation uses real attack stats from NFC cards (November 20, 2025)
- NFC card scanning (or simulated scanning) loads character data with persistent upgrades
- Each player can scan up to 2 cards per battle (November 20, 2025)
- The structure supports multi-fighter team battles with tactical fighter selection

**Animation and Visual Effects**
- CSS animations create the arcade aesthetic (neon text effects, scanlines, fade-ins)
- Gradient backgrounds and retro styling establish the arcade theme
- Overlay scanline effect using CSS `::before` pseudo-element for CRT monitor simulation
- Design choice: CSS-only effects rather than canvas/WebGL for maximum compatibility and simplicity

### Game Logic Architecture

**Multi-Fighter Battle System (November 20, 2025)**
- Each player can bring up to 2 fighters to battle (minimum 1 required)
- Battles use a roulette mechanic where players press STOP buttons to lock in random numbers (1-5)
- When a player wins the roulette:
  - They choose which of their fighters attacks (if they have 2)
  - They choose which opponent fighter to target (if opponent has 2)
- Fighter selection UI appears with clickable buttons showing fighter names and current HP
- Damage calculation: ATK × multiplier (no defense reduction, uses real stats from cards)
- 25% chance for defender to block, reducing damage to 50% of original
- Battle continues until all fighters on one side are defeated
- All fighters on winning team gain 50 EXP, losing team gains 25 EXP
- Replaced single-fighter system for more strategic team-based gameplay (November 17, 2025 → November 20, 2025)

**State Management**
- Global variables (`player1Fighters`, `player2Fighters`, `battleInterval`, `pendingAttacker`, `pendingMultiplier`) track game state
- Fighter arrays store up to 2 fighters per player
- No formal state management library; state is managed imperatively
- Screen visibility serves as the primary state indicator
- Pros: Straightforward implementation for small scope
- Cons: Potential for state inconsistencies, harder to debug in larger applications

**Event-Driven Interactions**
- Click event listeners handle all user interactions (start game, scan cards, start battle)
- NFC scanning screen now supports 4 scanners (2 per player): slots 1-1, 1-2, 2-1, 2-2
- The "Start Battle" button is disabled until both players have scanned at least 1 fighter
- Fighter selection during battle uses dynamically generated buttons based on available fighters
- Simulated NFC scanning is instant click-based selection with random character assignment

**Upgrade and Progression System (November 17, 2025)**
- Characters gain experience points from battles (25 EXP for win, 50 for perfect win)
- Leveling system: Each level requires 100 more EXP than the previous (Level 1→2 = 100 EXP, Level 2→3 = 200 EXP, etc.)
- Level multipliers apply to all character stats (HP, Attack, Defence)
- Upgrade points can be spent to permanently boost character stats
- Upgrade multiplier: 1 point = +100 stat increase (e.g., 20 points in attack = +2000 attack)
- Three upgradeable stats: HP Bonus, Attack Bonus, Defence Bonus
- Character progress saved to localStorage with automatic migration for legacy data
- Legacy save data migration: Old "speed" stat automatically converted to "defence" while preserving upgrade values

## External Dependencies

**No External Dependencies**
- The project has zero external libraries, frameworks, or package dependencies
- All functionality is implemented with native browser APIs
- No build process, bundler, or transpilation required

**Browser APIs Used**
- DOM API for element manipulation and event handling
- CSS3 for animations, gradients, and visual effects
- JavaScript ES6+ features (array methods, spread operator, template literals)

**Potential Future Integrations**
- Web NFC API: Could integrate actual NFC card reading on supported devices
- Web Storage API: For saving character unlocks, battle history, or high scores
- Web Audio API: For retro sound effects and background music
- Canvas API: For more advanced battle animations or particle effects

## Deployment

**Vercel Integration (November 17, 2025)**
- Vercel configuration added for production deployment
- `vercel.json` - Configuration file for Vercel deployment
- `deploy.sh` - Automated deployment script using Vercel CLI
- VERCEL_TOKEN stored in Replit Secrets for secure authentication
- To deploy: Run `./deploy.sh` from the terminal

**Deployment Files**
- `.gitignore` - Excludes Vercel cache and build files from version control
- Static site deployment - All HTML/CSS/JS files deployed as-is
- No build step required (vanilla JavaScript project)