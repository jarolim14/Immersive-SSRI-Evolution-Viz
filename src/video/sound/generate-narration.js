/**
 * Script to generate narration audio files using Microsoft Azure's Text-to-Speech service
 *
 * Prerequisites:
 * 1. Create a Microsoft Azure account at portal.azure.com
 * 2. Create a Speech Service resource in Azure
 * 3. Get your subscription key and region
 * 4. Install required dependencies:
 *    npm install microsoft-cognitiveservices-speech-sdk fs path dotenv
 *
 * Usage:
 * 1. Create a .env file with your Azure credentials:
 *    AZURE_SPEECH_KEY=your_key_here
 *    AZURE_SPEECH_REGION=your_region_here
 * 2. Run this script:
 *    node generate-narration.js
 *
 * The script will generate MP3 files in the output directory for each narration text
 */

// This is a Node.js script, not browser code
require("dotenv").config();
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const fs = require("fs");
const path = require("path");
const { NARRATION_CONFIG, AUDIO_CONFIG } = require("./narrationConfig");

// Check for environment variables
if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) {
  console.error("Error: Missing Azure credentials!");
  console.error(
    "Please create a .env file with AZURE_SPEECH_KEY and AZURE_SPEECH_REGION"
  );
  process.exit(1);
}

// Azure configuration
const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);

// Set output format and voice
speechConfig.speechSynthesisOutputFormat =
  sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

// Allow voice to be configured via environment variable
const voiceName = process.env.AZURE_VOICE_NAME || "en-US-JennyNeural"; // Default to Jenny if not specified
speechConfig.speechSynthesisVoiceName = voiceName;
console.log(`Using voice: ${voiceName}`);

// Create output directory (relative to project root)
// Use paths from config or fall back to defaults if not defined
const publicOutputDir = path.join(
  __dirname,
  "../../../",
  AUDIO_CONFIG.outputPaths?.public || "public/assets/audio"
);
const localOutputDir = path.join(
  __dirname,
  AUDIO_CONFIG.outputPaths?.local || "./audio_files"
);

// Log the output directories being used
console.log(`Public output directory: ${publicOutputDir}`);
console.log(`Local output directory: ${localOutputDir}`);

// Ensure both directories exist
[publicOutputDir, localOutputDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    console.log(`Creating output directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Copy a file using streams with verification and retry logic
 * @param {string} sourcePath - Path to the source file
 * @param {string} destinationPath - Path to destination
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise} Promise that resolves when copy completes successfully
 */
async function copyFileWithVerification(
  sourcePath,
  destinationPath,
  maxRetries = 3
) {
  return new Promise((resolve, reject) => {
    let retryCount = 0;

    const attemptCopy = () => {
      console.log(
        `Copying file from ${sourcePath} to ${destinationPath}${
          retryCount > 0 ? ` (attempt ${retryCount + 1})` : ""
        }`
      );

      const readStream = fs.createReadStream(sourcePath);
      const writeStream = fs.createWriteStream(destinationPath);

      // Handle stream errors
      readStream.on("error", (err) => {
        console.error(`× Error reading source file: ${err}`);
        writeStream.end();
        handleError(err);
      });

      writeStream.on("error", (err) => {
        console.error(`× Error writing to destination: ${err}`);
        readStream.destroy();
        handleError(err);
      });

      // Handle successful completion
      writeStream.on("finish", () => {
        // Verify file sizes match
        try {
          const srcFileSize = fs.statSync(sourcePath).size;
          const destFileSize = fs.statSync(destinationPath).size;

          if (srcFileSize === destFileSize) {
            console.log(`✓ File copy successful (${srcFileSize} bytes)`);
            resolve();
          } else {
            console.error(
              `× File size mismatch: source ${srcFileSize} bytes, destination ${destFileSize} bytes`
            );
            handleError(new Error("File size mismatch"));
          }
        } catch (err) {
          console.error(`× Error verifying file sizes: ${err}`);
          handleError(err);
        }
      });

      // Pipe the streams
      readStream.pipe(writeStream);
    };

    const handleError = (err) => {
      // Clean up incomplete file
      try {
        if (fs.existsSync(destinationPath)) {
          fs.unlinkSync(destinationPath);
          console.log(`× Removed incomplete file: ${destinationPath}`);
        }
      } catch (cleanupErr) {
        console.error(`× Error cleaning up incomplete file: ${cleanupErr}`);
      }

      // Retry logic
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying copy operation (${retryCount}/${maxRetries})...`);
        setTimeout(attemptCopy, 1000); // Wait 1 second before retry
      } else {
        console.error(`× Failed to copy file after ${maxRetries} attempts`);
        reject(err);
      }
    };

    // Start the copy process
    attemptCopy();
  });
}

// Process each narration text
async function generateNarrationAudio() {
  const narrationTexts = NARRATION_CONFIG.texts;

  if (!narrationTexts || Object.keys(narrationTexts).length === 0) {
    console.error("No narration texts found in NARRATION_CONFIG");
    process.exit(1);
  }

  console.log(
    `Found ${Object.keys(narrationTexts).length} narration texts to process`
  );

  for (const [id, text] of Object.entries(narrationTexts)) {
    // Convert ID to filename format (replace spaces with underscores, lowercase)
    const filename = id.toLowerCase().replace(/\s+/g, "_");

    // Get the target output path based on the new narration config format
    // This ensures we're generating files to the exact location expected in the config
    const targetPath = getTargetPath(id, filename);

    // Get versioned file paths
    const { publicOutputPath, localOutputPath, version } =
      getVersionedFilePaths(
        filename,
        targetPath,
        publicOutputDir,
        localOutputDir
      );

    console.log(`\nGenerating audio for: ${id}`);
    console.log(`Text: "${text}"`);
    console.log(
      `Output: ${publicOutputPath}${version > 0 ? ` (version ${version})` : ""}`
    );

    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(publicOutputPath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);

    try {
      // Synthesize the text to the file
      await new Promise((resolve, reject) => {
        synthesizer.speakTextAsync(
          text,
          (result) => {
            if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
              console.log(`✓ Audio file created: ${publicOutputPath}`);
              synthesizer.close();
              resolve();
            } else {
              const cancelDetails = sdk.CancellationDetails.fromResult(result);
              console.error(`× Synthesis canceled: ${cancelDetails.reason}`);
              console.error(`× Error details: ${cancelDetails.errorDetails}`);
              synthesizer.close();
              reject(new Error(cancelDetails.errorDetails));
            }
          },
          (error) => {
            console.error(`× Error synthesizing audio: ${error}`);
            synthesizer.close();
            reject(error);
          }
        );
      });

      // Copy the file to the local audio directory using the robust copy function
      await copyFileWithVerification(publicOutputPath, localOutputPath);
      console.log(`✓ Copied to local directory: ${localOutputPath}`);
    } catch (error) {
      console.error(`Failed to generate audio for ${id}:`, error);
      // Continue with next file
    }
  }

  console.log("\nAudio generation complete!");
}

/**
 * Determine the target path from AUDIO_CONFIG
 * @param {string} id - The narration ID
 * @param {string} defaultFilename - The default filename to use if config doesn't specify
 * @returns {string} The target filename without extension
 */
function getTargetPath(id, defaultFilename) {
  // Get the path from AUDIO_CONFIG if it exists
  const configPath = AUDIO_CONFIG?.sequences?.[id];

  if (configPath) {
    console.log(`Found target path in config: ${configPath}`);
    // Remove extension if present
    return configPath.split(".")[0];
  }

  // Fallback to default
  return defaultFilename;
}

/**
 * Create versioned file paths to avoid overwriting existing files
 * @param {string} baseFilename - The base filename without extension
 * @param {string} targetFilename - The target filename from the config
 * @param {string} publicDir - The public directory path
 * @param {string} localDir - The local directory path
 * @returns {Object} Object containing the versioned paths and version number
 */
function getVersionedFilePaths(
  baseFilename,
  targetFilename,
  publicDir,
  localDir
) {
  // Use the target filename if provided, otherwise use the base filename
  const filename = targetFilename || baseFilename;

  let version = 0;
  let publicPath = path.join(publicDir, `${filename}.mp3`);
  let localPath = path.join(localDir, `${filename}.mp3`);

  // Check if the files already exist
  const publicExists = fs.existsSync(publicPath);
  const publicVersions = [];
  const localVersions = [];

  // If the base file exists, look for versioned files
  if (publicExists) {
    console.log(`File already exists: ${publicPath}`);
    console.log(`Checking for existing versions...`);

    // Look for existing versioned files
    const publicFiles = fs.readdirSync(publicDir);
    const localFiles = fs.existsSync(localDir) ? fs.readdirSync(localDir) : [];

    // Get all existing versions for this filename
    const versionRegex = new RegExp(`^${filename}_(\\d+)\\.mp3$`);

    publicFiles.forEach((file) => {
      const match = file.match(versionRegex);
      if (match) {
        publicVersions.push(parseInt(match[1]));
      }
    });

    localFiles.forEach((file) => {
      const match = file.match(versionRegex);
      if (match) {
        localVersions.push(parseInt(match[1]));
      }
    });

    // Find the highest version number
    if (publicVersions.length > 0 || localVersions.length > 0) {
      const allVersions = [...publicVersions, ...localVersions];
      version = Math.max(...allVersions) + 1;
    } else {
      // No versioned files yet, start with version 1
      version = 1;
    }

    // Create new paths with version number
    publicPath = path.join(publicDir, `${filename}_${version}.mp3`);
    localPath = path.join(localDir, `${filename}_${version}.mp3`);

    console.log(`Creating new version ${version}: ${publicPath}`);
  }

  return {
    publicOutputPath: publicPath,
    localOutputPath: localPath,
    version: version,
  };
}

// Run the function
generateNarrationAudio().catch((error) => {
  console.error("Error in audio generation:", error);
  process.exit(1);
});
