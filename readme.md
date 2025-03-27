# 2D SSR Network Visualization

A Three.js-based interactive network visualization tool that allows users to explore and analyze network data in 3D space. This project provides a modern, responsive interface for visualizing network structures with features like node selection, edge visualization, and interactive controls.

## Features

- Interactive 3D network visualization using Three.js
- Node and edge-based network representation
- Custom node textures and styling
- Orbit controls for navigation
- Node selection and highlighting
- Edge creation and management
- Legend system for data interpretation
- Responsive design with modern UI

## Project Structure

```
src/
├── config.js           # Configuration settings
├── dataUtils.js        # Data processing utilities
├── edgeCreation.js     # Edge rendering logic
├── edgesLoader.js      # Edge data loading
├── eventListeners.js   # Event handling
├── legend.js          # Legend component
├── main.js            # Main application entry
├── nodeCreation.js    # Node rendering logic
├── nodesLoader.js     # Node data loading
├── orbitControls.js   # Camera controls
├── renderer.js        # Three.js renderer setup
├── sceneCreation.js   # Scene initialization
├── shaders.js         # Custom shaders
├── singleNodeSelection.js  # Node selection logic
└── updateNodeVisibility.js # Node visibility management
```

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd 2d_ssrinetworkviz
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## Building for Production

To create a production build:

```bash
npm run build
```

The built files will be available in the `dist/` directory.

## Dependencies

- Three.js (^0.158.0) - 3D graphics library
- Vite (^5.3.5) - Build tool and development server
- noUiSlider (^15.8.1) - Range slider component
- csv-parser (^3.0.0) - CSV file parsing

## Development

The project uses Vite as the build tool and development server. The source code is organized in modular components for better maintainability and scalability.

## License

MIT License

Copyright (c) 2024 3D Network Visualization

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```
2d_ssrinetworkviz

│  │  ├─ info
│  │  └─ pack
│  └─ refs
│     ├─ heads
│     │  ├─ main
│     │  └─ modularized
│     ├─ remotes
│     │  └─ origin
│     │     ├─ main
│     │     └─ modularized
│     └─ tags
├─ .gitignore
├─ package-lock.json
├─ package.json
├─ readme.md
├─ setup_tips.txt
├─ src
│  ├─ config.js
│  ├─ dataUtils.js
│  ├─ edgeCreation.js
│  ├─ edgesLoader.js
│  ├─ eventListeners.js
│  ├─ fonts
│  │  └─ Centauri.otf
│  ├─ index.html
│  ├─ legend.js
│  ├─ main.js
│  ├─ nodeCreation.js
│  ├─ nodesLoader.js
│  ├─ orbitControls.js
│  ├─ renderer.js
│  ├─ sceneCreation.js
│  ├─ shaders.js
│  ├─ singleNodeSelection.js
│  ├─ style.css
│  ├─ textures
│  │  ├─ alternatives
│  │  │  ├─ spotlight1.jpg
│  │  │  ├─ spotlight3.png
│  │  │  └─ standard_node.png
│  │  ├─ nodeTexture.png
│  │  └─ spotlightTexture.png
│  └─ updateNodeVisibility.js
├─ static
│  └─ .gitkeep
└─ vite.config.js

```