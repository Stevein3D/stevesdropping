/**
 * convert-pngs.mjs
 * Batch converts PNGs to JPEG using mozjpeg compression.
 *
 * Usage:
 *   node convert-pngs.mjs              # dry run (preview only)
 *   node convert-pngs.mjs --convert    # actually convert
 *
 * Requirements:
 *   npm install sharp
 */

import sharp from 'sharp';
import { readdirSync, mkdirSync, statSync } from 'fs';
import { join, parse } from 'path';

// ── Config ────────────────────────────────────────────────────────────────────
const INPUT_DIR     = './input';
const OUTPUT_DIR    = './output';
const QUALITY       = 85;          // mozjpeg quality (80–90 is the sweet spot)
const MIN_WIDTH     = 100;         // skip PNGs narrower than this (likely icons/logos)
const MIN_HEIGHT    = 100;         // skip PNGs shorter than this
// ─────────────────────────────────────────────────────────────────────────────

const isDryRun = !process.argv.includes('--convert');

if (isDryRun) {
  console.log('🔍 DRY RUN — no files will be written. Pass --convert to process.\n');
} else {
  mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`🚀 Converting PNGs → JPEG (quality: ${QUALITY}, mozjpeg: true)\n`);
}

const files = readdirSync(INPUT_DIR).filter(f => /\.png$/i.test(f));

if (files.length === 0) {
  console.log(`No PNG files found in ${INPUT_DIR}`);
  process.exit(0);
}

let processed = 0;
let skipped   = 0;
let totalOriginalBytes = 0;
let totalOutputBytes   = 0;

for (const file of files) {
  const inputPath  = join(INPUT_DIR, file);
  const { name }   = parse(file);
  const outputPath = join(OUTPUT_DIR, `${name}.jpg`);

  const originalSize = statSync(inputPath).size;

  // Read metadata to check dimensions
  const meta = await sharp(inputPath).metadata();
  const { width = 0, height = 0, hasAlpha } = meta;

  // Skip small images (likely icons/logos/graphics)
  if (width < MIN_WIDTH || height < MIN_HEIGHT) {
    console.log(`  ⏭  SKIP  ${file} — too small (${width}×${height}), likely not a photo`);
    skipped++;
    continue;
  }

  // Warn about transparency (won't error, but flag it)
  const alphaNote = hasAlpha ? ' ⚠️  has transparency (will fill white)' : '';

  if (isDryRun) {
    const sizeMB = (originalSize / 1024 / 1024).toFixed(2);
    console.log(`  📋 ${file} — ${width}×${height}, ${sizeMB} MB${alphaNote}`);
    processed++;
    totalOriginalBytes += originalSize;
    continue;
  }

  // Convert
  await sharp(inputPath)
    .flatten({ background: { r: 255, g: 255, b: 255 } }) // fill transparency with white
    .jpeg({ quality: QUALITY, mozjpeg: true })
    .toFile(outputPath);

  const outputSize = statSync(outputPath).size;
  const savings    = (((originalSize - outputSize) / originalSize) * 100).toFixed(1);
  const origKB     = (originalSize / 1024).toFixed(0);
  const outKB      = (outputSize / 1024).toFixed(0);

  console.log(`  ✓ ${file} → ${name}.jpg  (${origKB} KB → ${outKB} KB, ${savings}% smaller)${alphaNote}`);

  totalOriginalBytes += originalSize;
  totalOutputBytes   += outputSize;
  processed++;
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n──────────────────────────────────────');

if (isDryRun) {
  const totalMB = (totalOriginalBytes / 1024 / 1024).toFixed(2);
  console.log(`DRY RUN SUMMARY`);
  console.log(`  Files to convert : ${processed}`);
  console.log(`  Files to skip    : ${skipped}`);
  console.log(`  Total input size : ${totalMB} MB`);
  console.log(`\nRun with --convert to process these files.`);
} else {
  const origMB    = (totalOriginalBytes / 1024 / 1024).toFixed(2);
  const outMB     = (totalOutputBytes   / 1024 / 1024).toFixed(2);
  const savedMB   = ((totalOriginalBytes - totalOutputBytes) / 1024 / 1024).toFixed(2);
  const savedPct  = (((totalOriginalBytes - totalOutputBytes) / totalOriginalBytes) * 100).toFixed(1);

  console.log(`CONVERSION SUMMARY`);
  console.log(`  Converted : ${processed} files`);
  console.log(`  Skipped   : ${skipped} files`);
  console.log(`  Before    : ${origMB} MB`);
  console.log(`  After     : ${outMB} MB`);
  console.log(`  Saved     : ${savedMB} MB (${savedPct}%)`);
}
