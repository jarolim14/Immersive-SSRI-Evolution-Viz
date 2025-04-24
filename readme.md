# 2D SSR Network Visualization

A Three.js-based interactive network visualization tool for academic papers that allows users to explore and analyze citation networks in 3D space. This project provides a modern, responsive interface for visualizing large-scale academic networks with features like time-based filtering, cluster analysis, and interactive exploration.

## Features

- Interactive 3D network visualization using Three.js
- Large-scale data handling (~35,000 nodes, ~100,000 edges)
- Time-based filtering with year range slider
- Cluster-based node grouping and filtering
- Time travel functionality to visualize cluster evolution
- Real-time search for papers by title or DOI
- Custom node textures and styling
- Optimized edge bundling with 1.5 million segments
- Legend system for data interpretation
- Responsive design with modern UI
- Performance optimizations for large datasets
- Custom shader effects for enhanced visualization

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
├── timeTravel.js      # Time evolution functionality
├── searchFunctionality.js  # Search implementation
├── visibilityManager.js    # Visibility control
└── updateNodeVisibility.js # Node visibility management
```

## Data Structure

The project uses a comprehensive data structure stored in the `src/data` directory:

```
src/data/
├── nodes_2025-04-22-15-55-44scale2.json      # Node data (papers)
├── smaller_edges_2025-04-22-15-55-44scale2.json  # Edge data (citations)
├── cluster_color_map_2025.json               # Cluster color mappings
├── cluster_label_map_2025.json               # Cluster label mappings
├── cluster_label_tag_map_2025.json           # Cluster tag mappings
├── legend_2025.json                          # Legend configuration
├── topicTree/                                # Topic tree visualization data
└── ParamsExploring/                          # Parameter exploration data
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

The built files will be available in the `dist/` directory.

## Key Technical Features

### Performance Optimizations
- WebGL2 optimized rendering with instanced arrays
- Efficient buffer geometry management
- Batch processing for large datasets
- Level of Detail (LOD) system
- Optimized edge bundling

### Visualization Features
- Custom shader effects for nodes and edges
- Dynamic node sizing based on centrality
- Cluster-based color mapping
- Fog effects for depth perception
- Interactive node selection and highlighting

### Data Management
- Efficient node and edge data loading
- Visibility management system
- Time-based filtering
- Cluster-based filtering
- Real-time search functionality

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
