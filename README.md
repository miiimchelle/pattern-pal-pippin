# Pattern Pal (Pippin)

A Figma plugin that scans your designs for repeated UI patterns, compares them across your team’s files, and cross-checks them against a design-system library. Built for Into Design Systems Hackathon 2026 by Team Pippin.

## What it does

Pattern Pal has two main workflows:

### 1) Check frame (single selected frame)
Select **one frame** in the current file, then run a scan to:

- Compute an **overall consistency score** (0–100)
- Compare the selected frame to **frames in other team files** (structural similarity)
- Find **closest matches in your design-system library** (structural similarity + name hints)
- Flag a basic rule violation:
  - **More than 1 Primary Button** on the same screen/container (heuristics based on variant props, fill styles, and naming)

### 2) Pattern discovery (Scan team files) 
Scans **all team files** (plus local frames) and clusters similar frames into “pattern groups” using structural similarity, then:

- Ranks clusters by cross-file coverage + consistency
- Shows library component usage / potential matches

### Optional: Push to Dashboard
There’s a “Push to Dashboard” UI action and a dashboard URL setting, intended for contribution tracking. In the current code, the push action is a stub (UI-only status changes) and does not POST the scan payload yet.

## Requirements

- Figma desktop app (to run a local development plugin)
- Node.js + npm
- A **Figma Personal Access Token** (for calling the Figma REST API)
- Your **Figma Team ID**
- (Optional) One or more **library file URLs** (design system files)

## Install (local development plugin)

1. Install dependencies:
   ```bash
   npm install