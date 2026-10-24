# Local Development & Engineering Setup Guide

## 1. Prerequisites
- **Node.js**: v18.17.0 or later (v20+ recommended).
- **Package Manager**: `npm` (v9+).
- **Git**: v2.30+.
- **Operating System**: macOS, Linux, or Windows (PowerShell / Command Prompt).

---

## 2. Installation & Quickstart

```bash
# 1. Clone the repository
git clone https://github.com/saugat2737/DrainGuard.git
cd DrainGuard

# 2. Checkout current working branch
git checkout re-style

# 3. Install dependencies
npm install

# 4. Start local development server
npm run dev
```

The application will be accessible at **`http://localhost:3000`**.

---

## 3. Environment Variables Configuration

Create a `.env.local` file in the project root:

```env
# Optional: Google Gemini API Key for multimodal photo scan of drain blockages.
# If omitted or empty, DrainGuard automatically operates in zero-downtime heuristic fallback mode.
GEMINI_API_KEY=""

# Optional: Map Center Overrides (Defaults to Tumakuru, Karnataka)
NEXT_PUBLIC_MAP_CENTER_LAT=13.3392
NEXT_PUBLIC_MAP_CENTER_LNG=77.1140

# Production Data Policy Flag:
# Set to "true" only if you want synthetic demo seed reports loaded in development.
# In production (NODE_ENV=production), this defaults to completely clean state.
ENABLE_DEMO_REPORTS="false"
```

---

## 4. Quality Gates & Verification Scripts

```bash
# Run complete automated test suite (78 tests)
npm test

# Run TypeScript strict typecheck
npm run typecheck

# Run ESLint static analysis
npm run lint

# Run Next.js production bundle build
npm run build

# Start production server
npm start
```
