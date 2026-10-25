# DrainGuard — Vercel Deployment & Environment Configuration Guide

This document outlines the required and optional environment variables and settings for deploying DrainGuard to [Vercel](https://vercel.com).

---

## 1. Zero-Cost Free-Tier Deployment Matrix

DrainGuard requires **ZERO paid API keys or commercial subscriptions** to run in production.

| Provider / Subsystem | Required on Vercel? | Free-Tier Status | Fallback if Unconfigured |
| :--- | :--- | :--- | :--- |
| **Open-Meteo Weather** | ❌ None (No key) | 100% Free Open Access | In-memory cache & historical archive |
| **Project OSRM Routing** | ❌ None (No key) | Free OpenStreetMap Router | Bounded LRU cache + local straight-line corridor |
| **Photon / Nominatim Geocoding** | ❌ None (No key) | Free OpenStreetMap Search | Ground-truthed Tumakuru presets |
| **Google Gemini Vision API** | ⚙️ Optional | Free Developer Tier ($0) | Transparent deterministic heuristic classification |
| **Supabase PostgreSQL** | ⚙️ Optional | Free Tier PostgreSQL ($0) | In-memory storage (with \`ALLOW_IN_MEMORY_STORAGE=true\`) |

---

## 2. Vercel Environment Variables Configuration

In your Vercel Project Settings (`Settings -> Environment Variables`), add the following:

### Optional: Vision AI Service (Google Gemini 1.5 Flash)
- **`GEMINI_API_KEY`**: *(Optional)* Your Google Gemini Developer API key from [Google AI Studio](https://aistudio.google.com/).
  - *If omitted:* Citizen reports will use the built-in deterministic heuristic rule (`mode: "unconfigured_fallback"`), and the UI will clearly indicate this.
- **`GEMINI_MODEL`**: `gemini-1.5-flash` *(Default)*

### Optional: Cloud PostgreSQL Persistence (Supabase)
- **`NEXT_PUBLIC_SUPABASE_URL`**: *(Optional)* Your Supabase project URL (e.g., `https://xyzcompany.supabase.co`).
- **`SUPABASE_SERVICE_ROLE_KEY`**: *(Optional)* Your Supabase Service Role Secret Key (kept secure server-side).
- **`ALLOW_IN_MEMORY_STORAGE`**: Set to `"true"` if deploying to Vercel without a Supabase PostgreSQL database. This allows Vercel serverless functions to run without throwing HTTP 503 errors.

### Optional: Default Map Center Coordinates
- **`NEXT_PUBLIC_MAP_CENTER_LAT`**: `13.3392` *(Default: Tumakuru, Karnataka)*
- **`NEXT_PUBLIC_MAP_CENTER_LNG`**: `77.1140` *(Default: Tumakuru, Karnataka)*

---

## 3. One-Click Vercel Deployment Checklist

1. **Framework Preset**: Next.js
2. **Build Command**: `npm run build` (or Next.js default)
3. **Output Directory**: `.next` (Next.js default)
4. **Install Command**: `npm install`
5. **Node.js Version**: `20.x` or `18.x`

DrainGuard includes a production Progressive Web App (PWA) service worker (`/sw.js`) and web app manifest (`/site.webmanifest`) providing an installable, mobile-optimized experience on both iOS Safari and Android Chrome.
