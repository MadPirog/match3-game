# Match-3 Game

A match-3 puzzle game built with HTML/CSS/JavaScript for educational purposes.

## Features
- Classic match-3 gameplay with swapping mechanics
- Special tiles (bomb, line, color bomb) - planned
- Level progression with goals
- Score tracking and move limits
- Responsive design
- Local storage for saving progress

## Project Structure
```
match3-game/
├── index.html              # Main HTML file
├── css/                    # Stylesheets
│   ├── reset.css           # CSS reset
│   ├── style.css           # Main styles
│   └── themes.css          # Theme-specific styles
├── js/                     # JavaScript source
│   ├── main.js             # Entry point
│   ├── core/               # Core game logic
│   │   ├── Board.js        # Game board mechanics
│   │   └── GameState.js    # Game state management
│   ├── entities/           # Game entities
│   │   └── SpecialTile.js  # Special tile types
│   ├── systems/            # Game systems
│   │   ├── InputSystem.js  # Handles user input
│   │   └── RenderSystem.js # Handles rendering
│   └── scenes/             # Game scenes (for future expansion)
│       └── BootScene.js    # Initial loading scene
├── assets/                 # Game assets
│   ├── images/             # Tile images, backgrounds
│   ├── audio/              # Sound effects and music
│   └── fonts/              # Custom fonts
└── .gitignore              # Git ignore rules
```

## How to Run
1. Clone or download the repository
2. Open `index.html` in a web browser
3. Play the game!

## Development
This project uses vanilla JavaScript with ES6 modules. No build step is required for basic functionality.

To contribute:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
This project is for educational purposes only.