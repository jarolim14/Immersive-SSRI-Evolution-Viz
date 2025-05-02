#!/usr/bin/env node

/**
 * Frame to Video Converter
 *
 * This is a utility script to convert the frames captured by the fallback
 * method in the network visualization to a video file using ffmpeg.
 *
 * Requirements:
 * - Node.js
 * - FFmpeg (must be installed and available in PATH)
 *
 * Usage:
 * 1. Extract the frames zip file
 * 2. Run: node convert-frames.js [options]
 *
 * Options:
 *   --input-dir, -i     Directory containing frame images (default: "./frames")
 *   --output-file, -o   Output video file path (default: "./visualization.mp4")
 *   --framerate, -r     Frames per second (default: 30)
 *   --quality, -q       Quality level (0-51, lower is better, default: 23)
 *   --help, -h          Show help
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let inputDir = './frames';
let outputFile = './visualization.mp4';
let framerate = 30;
let quality = 23;

// Process arguments
for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--input-dir' || arg === '-i') {
    inputDir = args[++i];
  } else if (arg === '--output-file' || arg === '-o') {
    outputFile = args[++i];
  } else if (arg === '--framerate' || arg === '-r') {
    framerate = parseInt(args[++i], 10);
  } else if (arg === '--quality' || arg === '-q') {
    quality = parseInt(args[++i], 10);
  } else if (arg === '--help' || arg === '-h') {
    showHelp();
    process.exit(0);
  }
}

// Show help message
function showHelp() {
  console.log(`
Frame to Video Converter

This utility converts frame images to a video file using FFmpeg.

Options:
  --input-dir, -i     Directory containing frame images (default: "./frames")
  --output-file, -o   Output video file path (default: "./visualization.mp4")
  --framerate, -r     Frames per second (default: 30)
  --quality, -q       Quality level (0-51, lower is better, default: 23)
  --help, -h          Show help

Example:
  node convert-frames.js -i ./my-frames -o ./my-video.mp4 -r 60 -q 18
  `);
}

// Check if FFmpeg is installed
function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    console.error('Error: FFmpeg is not installed or not in PATH');
    console.log('\nPlease install FFmpeg:');
    console.log('  - Windows: https://ffmpeg.org/download.html');
    console.log('  - macOS: brew install ffmpeg');
    console.log('  - Linux: apt install ffmpeg or similar');
    return false;
  }
}

// Check if input directory exists and contains frame images
function checkInputDirectory() {
  if (!fs.existsSync(inputDir)) {
    console.error(`Error: Input directory "${inputDir}" does not exist`);
    return false;
  }

  const files = fs.readdirSync(inputDir)
    .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

  if (files.length === 0) {
    console.error(`Error: No image files found in "${inputDir}"`);
    return false;
  }

  console.log(`Found ${files.length} image files in "${inputDir}"`);
  return true;
}

// Convert frames to video
function convertFramesToVideo() {
  console.log('Starting conversion...');

  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Use consistent frame naming pattern
    const ffmpegCommand = `ffmpeg -y -framerate ${framerate} -pattern_type glob -i "${path.join(inputDir, 'frame_*.jpg')}" -c:v libx264 -crf ${quality} -pix_fmt yuv420p "${outputFile}"`;

    console.log(`Executing: ${ffmpegCommand}`);
    execSync(ffmpegCommand, { stdio: 'inherit' });

    console.log(`\nSuccess! Video saved to: ${outputFile}`);
    return true;
  } catch (error) {
    console.error('Error during conversion:', error.message);
    return false;
  }
}

// Main function
function main() {
  console.log('Frame to Video Converter');
  console.log('========================');

  if (!checkFfmpeg()) return;
  if (!checkInputDirectory()) return;

  console.log(`\nUsing parameters:`);
  console.log(`- Input directory: ${inputDir}`);
  console.log(`- Output file: ${outputFile}`);
  console.log(`- Framerate: ${framerate} fps`);
  console.log(`- Quality level: ${quality} (lower is better)`);

  convertFramesToVideo();
}

main();