# OutLaunch — Autonomous Outbound Infrastructure

OutLaunch is an autonomous outbound sales orchestration platform designed for B2B revenue and growth teams. It combines account discovery, deep prospect research dossiers, synchronized cold email and LinkedIn touchpoints, and a human-in-the-loop review workflow.

---

## Architecture & Core Modules

1. **Autonomous Lead Discovery (`/` and `/outreach`)**:
   - Filter across 250M+ verified global business profiles by exact ICP criteria.
   - Real-time SMTP verification, zero-bounce defense, and title hierarchy matching.
2. **Global B2B Directory (`/database`)**:
   - 105M+ company profiles with firmographics, verified tech stacks, and executive registries across 238 countries.
3. **Global Places & Commercial Venues (`/gm` and `/google-maps`)**:
   - 200M+ commercial venues, geocoordinates, operating hours, and location attributes.
4. **Data Explorer (`/explorer`)**:
   - Interactive company cluster and industry classification navigation.
5. **REST API & Developer Hub (`/api`)**:
   - Programmatic endpoints for company enrichment, prospect discovery, and agent runs.
6. **Workspace Dashboard & CRM (`/dashboard`)**:
   - Integrated lead management, campaign tracking, sequence scheduling, and sales call intelligence.

---

## Design System: OutLaunch Editorial

The frontend utilizes the original **OutLaunch Editorial** design system:
- **Warm Cream Canvas**: `#f7f5f0`
- **Obsidian Typography**: `#0d1c15`
- **Emerald Accent**: `#00e599`
- **Deep Forest Emerald**: `#0d9467`
- **Surfaces**: Crisp `#ffffff` cards with restrained `rgba(13, 28, 21, 0.08)` borders and subtle drop shadows.
- **Typography**: Inter paired with tabular Monospace labels for verified technical data.

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Local Development Server

```bash
# Frontend (Vite) on http://localhost:3000
npm run dev

# Backend API server on http://localhost:3001
npm run server
```

### 3. Run Verification Tests

```bash
node --test tests/*.test.mjs
```

### 4. Build for Production

```bash
npm run build
```

---

## License & Attribution

Third-party dependencies and open-source licenses are documented in [THIRD_PARTY_NOTICES.md](file:///Users/saidaksh/Desktop/Explee/THIRD_PARTY_NOTICES.md).
