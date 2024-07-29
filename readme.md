# Three.js Journey

## Setup
Download [Node.js](https://nodejs.org/en/download/).
Run this followed commands:

``` bash
# Install dependencies (only the first time)
npm install

# Run the local server at localhost:8080
npm run dev

# Build for production in the dist/ directory
npm run build
```

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