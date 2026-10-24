# 01 — Problem Statement

## Problem
During heavy rain, Indian cities like Tumakuru see waterlogging on specific streets, usually where drains are blocked by plastic and silt. Citizens find out only when they reach the flooded street. Municipal teams react to complaints in the order received, not in the order of actual risk.

## Who experiences it
- **Commuters, two-wheeler riders, school-run parents:** get stuck or take unsafe routes.
- **Municipal drain/maintenance teams:** limited crews, no ranked list of what to clear first.

## Why existing approaches fall short
- Weather apps give city-wide rainfall, not street-level risk.
- Complaint portals register issues but do not prioritize them by flood risk or link them to forecasts.
- Smart-city control centres exist, but there is a gap between city infrastructure and what a citizen sees on their phone. (Verify specifics against the official Tumakuru Smart City site before quoting anything in the pitch.)

## Our solution
1. Combine **rainfall forecast** + **citizen blockage reports** + **past flooding history** + **low-lying terrain** into an **explainable risk score** per street zone.
2. Show risk on a live map and suggest a **safer route** that avoids high-risk zones.
3. Auto-generate a **ranked inspection queue** for municipal teams.
4. Let citizens upload a **photo of a blocked drain**; AI classifies it and it feeds the score.

## Honest framing (use in pitch and README)
- Risk model is **rule-based and explainable**, not a trained flood-prediction model.
- Zone data and hotspots are **simulated demo data**, clearly labeled. Real deployment would need municipal drainage maps and rainfall gauges to calibrate.

## Success criteria for the hackathon
- A judge can understand the problem in 15 seconds.
- A complete user journey works on the public link: rain → risk → explanation → route → report → inspection queue.
- Every claim on screen is either real, or labeled simulated.
