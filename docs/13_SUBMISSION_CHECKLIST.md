# 13 — Submission Checklist

Deadline: coding ends **10:00 AM, 25 Oct 2026**. Target submission: **by 9:00 AM**.

## GitHub repo
- [ ] Public repo, clear name, description, topics (`smart-city`, `flood`, `nextjs`)
- [ ] Commit history shows work done during the event
- [ ] Root README includes: problem, solution, screenshots/GIF, features, architecture (mermaid), tech stack, setup, env vars, how to run tests, **honesty/limits**, credits (Open-Meteo, OpenStreetMap, OSRM, libraries)
- [ ] `.env.example` present, no secrets committed
- [ ] LICENSE file (MIT)

## Deployed link
- [ ] Vercel production URL opens without login
- [ ] Tested on phone and in incognito
- [ ] Link added to repo "About" and README

## Video (explanation by you)
- [ ] 2–3 minutes, follows `12_DEMO_SCRIPT.md`
- [ ] Clear audio, readable screen, shows the live URL
- [ ] Uploaded to LinkedIn natively (not just a link)

## LinkedIn post
- [ ] Tag **IEEE SIT SB** and **IEEE CS** (use the exact links the organizers share)
- [ ] Include repo + live link, hashtags: `#SmartCity #UrbanInnovation #Hackathon #IEEE`
- [ ] Copy of the post URL saved for the form

### Caption draft
```
We built DrainGuard for the Smart City and Urban Innovation hackathon, organized by IEEE SIT SB and IEEE CS.

Problem: in heavy rain, people discover flooded streets too late, and city teams react to complaints instead of risk.

DrainGuard gives:
- street-level risk with an explainable score
- a safer route suggestion
- AI-assisted blocked-drain reports from photos
- a ranked inspection queue for municipal teams

Built in 16 hours. Demo data is simulated; the model is rule-based and designed to be calibrated with real drainage and rainfall data.

Live: <link>
Code: <link>

@IEEE SIT SB @IEEE Computer Society #SmartCity #UrbanInnovation #Hackathon
```

## Submission form
- [ ] GitHub URL, deployed URL, video/LinkedIn URL, team details, anything else requested
- [ ] Screenshot of the submission confirmation
- [ ] Submit at least 60 minutes before the deadline

## Final sanity (8:00 AM)
- [ ] Open every link from a logged-out browser
- [ ] Fresh clone → `npm install && npm run build` works
- [ ] Feature freeze respected; no last-minute risky changes
