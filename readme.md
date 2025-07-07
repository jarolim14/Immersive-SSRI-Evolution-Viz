# Immersive 3D SSRI Evolution

A Three.js-based interactive network visualization tool for academic papers that allows users to explore and analyze citation networks in 3D space. This project provides a modern, responsive interface for visualizing large-scale academic networks with features like time-based filtering, cluster analysis, and interactive exploration.

This repository contains the code for the data visualization of the manuscript:

**_The Evolution of SSRI Research: Trajectories of Knowledge Domains Across Four Decades_**

> The visualization is based on the data analysis that can be found here: [SSRI-Evolution Analysis Repo](https://github.com/jarolim14/SSRI-Evolution)


## Features

- Interactive 3D network visualization using Three.js
- Large-scale data handling with optimized performance
- Time-based filtering with year range slider
- Cluster-based node grouping and filtering
- Time travel functionality to visualize cluster evolution
- Real-time search for papers by title or DOI
- Custom node textures and styling
- Optimized edge bundling
- Legend system for data interpretation
- Responsive design with modern UI
- Level of Detail (LOD) system for performance optimization
- Spatial partitioning for efficient node management
- Topic tree visualization
- Interactive instructions and credits modal

## Project Structure

```
src/
├── config.js               # Configuration settings
├── config.production.js    # Production configuration
├── dataUtils.js           # Data processing utilities
├── edgeCreation.js        # Edge rendering logic
├── edgesLoader.js         # Edge data loading
├── eventListeners.js      # Event handling
├── legend.js             # Legend component
├── lodSystem.js          # Level of Detail system
├── main.js               # Main application entry
├── nodesCreation.js      # Node rendering logic
├── nodesLoader.js        # Node data loading
├── orbitControls.js      # Camera controls
├── renderer.js           # Three.js renderer setup
├── sceneCreation.js      # Scene initialization
├── searchFunctionality.js # Search implementation
├── shaders.js            # Custom shaders
├── singleNodeSelection.js # Node selection logic
├── spatialPartitioning.js # Spatial optimization
├── timeTravel.js         # Time evolution functionality
├── topicTree.js          # Topic tree visualization
├── visibilityManager.js   # Visibility control
├── yearSlider.js         # Year range slider
├── instructionsModal.js   # User instructions
├── creditsModal.js       # Credits information
├── style.css             # Styling
└── index.html            # Main HTML file
```

## Data Structure

The project uses a comprehensive data structure stored in the `src/data` directory:

```
src/data/
├── nodes_[timestamp].json      # Node data (papers)
├── edges_[timestamp].json      # Edge data (citations)
├── cluster_color_map.json      # Cluster color mappings
├── cluster_label_map.json      # Cluster label mappings
├── cluster_label_tag_map.json  # Cluster tag mappings
└── legend.json                 # Legend configuration
```

### Data Files Description:
- **Node Data**: Contains information about academic papers including:
  - Paper metadata (title, authors, year)
  - Cluster assignments
  - Centrality measures
  - Position coordinates

- **Edge Data**: Contains citation relationships between papers with:
  - Source and target paper IDs
  - Edge weights
  - Bundled edge coordinates
  - Temporal information

- **Cluster Data**: Contains mappings for:
  - Cluster colors
  - Cluster labels
  - Cluster hierarchy
  - Topic relationships

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Setup

1. Clone the repository:
```bash
git clone https://github.com/jarolim14/Immersive-SSRI-Evolution-Viz.git
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

For development build:
```bash
npm run build:dev
```

The built files will be available in the `dist/` directory.

## Key Technical Features

### Performance Optimizations
- WebGL2 optimized rendering
- Level of Detail (LOD) system
- Spatial partitioning for efficient node management
- Optimized edge bundling
- Efficient buffer geometry management
- Batch processing for large datasets

### Visualization Features
- Custom shader effects for nodes and edges
- Dynamic node sizing based on centrality
- Cluster-based color mapping
- Fog effects for depth perception
- Interactive node selection and highlighting
- Topic tree visualization
- Year-based filtering with slider

### Data Management
- Efficient node and edge data loading
- Visibility management system
- Time-based filtering
- Cluster-based filtering
- Real-time search functionality
- Spatial optimization

## Dependencies

- Three.js (^0.158.0) - 3D graphics library
- Vite (^5.3.5) - Build tool and development server
- noUiSlider (^15.8.1) - Range slider component
- D3 (^7.9.0) - Data visualization library
- csv-parser (^3.0.0) - CSV file parsing
- dotenv (^16.5.0) - Environment variable management

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
