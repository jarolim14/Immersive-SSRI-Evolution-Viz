---
description:
globs:
alwaysApply: true
---
# ThreeJS Academic Network Visualization Guidelines

## Project Scope
- Visualization of academic papers as a network graph
- Nodes represent individual papers
- Edges represent citations between papers
- Target scale: ~35,000 nodes and ~100,000 edges
- Important: Edges are bundled and most have many coordinate points, a total of 1.5 million segments
- Computational efficiency is a major concern
- important configurations should be in the config file.


## The visibility system should work as follows:
- All nodes and edges are visible at the start
- When year range changes:
- Nodes are filtered based on their year
- Edges are filtered based on their connected nodes' visibility
- When cluster selection changes:
- Nodes are filtered based on selected clusters
- Edges are filtered based on their connected nodes' visibility
- Edges are only shown when both their connected nodes are visible


