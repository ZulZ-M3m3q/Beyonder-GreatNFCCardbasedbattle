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
- Characters are defined with properties: name, HP, attack, sprite (emoji), color, maxHP, and currentHP
- Six pre-defined character types provide variety in gameplay
- Random selection simulates the "card scanning" mechanic
- The structure supports turn-based battle calculations with HP tracking

**Animation and Visual Effects**
- CSS animations create the arcade aesthetic (neon text effects, scanlines, fade-ins)
- Gradient backgrounds and retro styling establish the arcade theme
- Overlay scanline effect using CSS `::before` pseudo-element for CRT monitor simulation
- Design choice: CSS-only effects rather than canvas/WebGL for maximum compatibility and simplicity

### Game Logic Architecture

**Turn-Based Battle System**
- Battles are automated using `setInterval` for turn execution
- Each turn, both characters attack simultaneously and HP is reduced
- Battle continues until one or both characters reach 0 HP
- This automated approach creates spectacle rather than requiring player input during battles
- Alternative considered: Manual turn-by-turn button clicking (rejected for pacing reasons)

**State Management**
- Global variables (`player1Character`, `player2Character`, `battleInterval`) track game state
- No formal state management library; state is managed imperatively
- Screen visibility serves as the primary state indicator
- Pros: Straightforward implementation for small scope
- Cons: Potential for state inconsistencies, harder to debug in larger applications

**Event-Driven Interactions**
- Click event listeners handle all user interactions (start game, scan cards, start battle)
- The "Start Battle" button is disabled until both players have scanned characters
- Simulated NFC scanning is instant click-based selection with random character assignment

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