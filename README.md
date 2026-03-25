# 🅿️ Smart Parking Management System — Next.js Frontend

Real-time parking management dashboard powered by **Next.js 15 App Router**, **MongoDB**, **Server-Sent Events**, and the **AI backend** (FastAPI) for vision and webhooks.

> **Just getting started?** → See **[QUICKSTART.md](./QUICKSTART.md)** for a step-by-step setup guide.

---

## Features

### 🎥 Live Monitoring

- Real-time camera feeds with AI detection overlays (slot occupancy, license plates)
- Color-coded slot grid: 🟢 empty · 🔴 occupied
- Connection status, frame rate, and latency indicators
- Automatic reconnection with exponential backoff

### � Dashboard

- Parking lot cards with **live occupancy** (updated via SSE — no refresh needed)
- Interactive Leaflet map with occupancy color coding
- Dashboard stats: total lots, capacity, current occupancy, active violations
- Activity feed grouped by time period
- System health panel (database, AI backend, SSE connections)

### 📱 Mobile Camera Streaming

- WebRTC streaming from mobile browsers to the AI backend
- Live detection overlay on camera preview
- Works on iOS Safari 14+ and Chrome Android 90+

### 📈 Analytics & Reports

- Occupancy trends and peak-hours analysis (Recharts)
- Contractor performance metrics and violation tracking
- Report export: CSV, Excel, PDF

### ⚙️ Settings (Admin)

- AI backend URL configuration
- Alert threshold customization (capacity warning %, offline timeouts)
- Camera frame-skip tuning
- User role management

### 🔄 Real-Time Architecture

- **AI backend → Webhook** → `POST /api/ai/webhook/capacity`
- **Webhook → DB** (`CapacityLog` + `ParkingLot.slots` update)
- **DB → SSE** (`/api/sse/dashboard` broadcasts `capacity_update` event)
- **SSE → UI** (all open pages patch state in-place, zero reload)

---

## Tech Stack

| Layer           | Technology                   |
| --------------- | ---------------------------- |
| Framework       | Next.js 15 (App Router)      |
| Language        | TypeScript                   |
| Styling         | Tailwind CSS                 |
| Database        | MongoDB + Mongoose           |
| Auth            | NextAuth.js (Google OAuth)   |
| Real-time       | Server-Sent Events (SSE)     |
| Charts          | Recharts                     |
| Maps            | Leaflet                      |
| Testing         | Vitest, Playwright, axe-core |
| Package manager | npm / pnpm                   |

---

## Project Structure

```
next.js-work/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ai/webhook/        # AI backend → Next.js webhook receivers
│   │   │   │   ├── capacity/      # Capacity updates from lot monitor
│   │   │   │   ├── entry/         # Vehicle entry from gate monitor
│   │   │   │   └── exit/          # Vehicle exit from gate monitor
│   │   │   ├── capacity/          # Capacity CRUD + /current + /history
│   │   │   ├── parking-lots/      # Parking lot CRUD
│   │   │   ├── analytics/         # Dashboard stats, trends, peak hours
│   │   │   ├── sse/dashboard/     # SSE endpoint (real-time push to clients)
│   │   │   ├── records/           # Vehicle entry/exit records
│   │   │   ├── alerts/            # Alert management
│   │   │   ├── violations/        # Violation tracking
│   │   │   ├── contractors/       # Contractor management
│   │   │   ├── reports/           # Report generation (CSV/Excel/PDF)
│   │   │   ├── settings/          # System settings
│   │   │   └── users/             # User role management (admin only)
│   │   ├── (authenticated)/
│   │   │   ├── dashboard/         # Main dashboard (SSE-connected)
│   │   │   ├── parking-lots/      # Lot list (SSE-connected)
│   │   │   │   └── [id]/          # Lot detail + live feed (SSE-connected)
│   │   │   ├── analytics/
│   │   │   ├── contractors/
│   │   │   ├── records/
│   │   │   ├── violations/
│   │   │   ├── alerts/
│   │   │   └── settings/
│   │   └── camera/                # Mobile camera streaming (no auth)
│   ├── components/                # 40+ reusable React components
│   ├── lib/
│   │   ├── sse-manager.ts         # SSE singleton (globalThis, survives HMR)
│   │   ├── mongodb.ts             # Mongoose connection helper
│   │   ├── auth.ts                # NextAuth helpers
│   │   ├── webhook-auth.ts        # AI webhook secret verification
│   │   └── ...
│   └── models/                    # Mongoose models
│       ├── ParkingLot.ts
│       ├── CapacityLog.ts
│       ├── VehicleRecord.ts
│       ├── Contractor.ts
│       ├── Violation.ts
│       ├── Alert.ts
│       └── ...
└── QUICKSTART.md                  # ← Setup guide
```

---

## API Reference

### Parking Lots

| Method   | Endpoint                 | Description                         |
| -------- | ------------------------ | ----------------------------------- |
| `GET`    | `/api/parking-lots`      | List all lots (with live occupancy) |
| `POST`   | `/api/parking-lots`      | Create lot (admin)                  |
| `GET`    | `/api/parking-lots/[id]` | Get lot detail + occupancy          |
| `PUT`    | `/api/parking-lots/[id]` | Update lot (admin)                  |
| `DELETE` | `/api/parking-lots/[id]` | Soft-delete lot (admin)             |

### Capacity

| Method | Endpoint                | Description                                       |
| ------ | ----------------------- | ------------------------------------------------- |
| `GET`  | `/api/capacity/current` | Latest occupancy for all/one lot                  |
| `GET`  | `/api/capacity/history` | Historical logs with date range                   |
| `POST` | `/api/capacity/update`  | Internal: process capacity update + SSE broadcast |

### AI backend webhooks (called by the Python service)

| Method | Endpoint                        | Description                            |
| ------ | ------------------------------- | -------------------------------------- |
| `POST` | `/api/ai/webhook/capacity` | Slot occupancy update from lot monitor |
| `POST` | `/api/ai/webhook/entry`    | Vehicle entry from gate monitor        |
| `POST` | `/api/ai/webhook/exit`     | Vehicle exit from gate monitor         |

### Real-time

| Method | Endpoint             | Description                                                                                 |
| ------ | -------------------- | ------------------------------------------------------------------------------------------- |
| `GET`  | `/api/sse/dashboard` | SSE stream — `capacity_update`, `alert`, `violation`, `record_entry`, `record_exit`, `ping` |

### Analytics

| Method | Endpoint                                | Description                                           |
| ------ | --------------------------------------- | ----------------------------------------------------- |
| `GET`  | `/api/analytics/dashboard`              | Summary stats (lots, capacity, occupancy, violations) |
| `GET`  | `/api/analytics/occupancy-trends`       | Occupancy over time                                   |
| `GET`  | `/api/analytics/peak-hours`             | Peak hours breakdown                                  |
| `GET`  | `/api/analytics/contractor-performance` | Contractor metrics                                    |

### Other

| Method | Endpoint                | Description                      |
| ------ | ----------------------- | -------------------------------- |
| `GET`  | `/api/health`           | System health (DB, backend, SSE) |
| `POST` | `/api/reports/generate` | Generate and download report     |
| `GET`  | `/api/settings`         | Get system settings              |
| `PUT`  | `/api/settings`         | Update settings (admin)          |

---

## Environment Variables

| Variable                            | Required | Description                                            |
| ----------------------------------- | -------- | ------------------------------------------------------ |
| `MONGODB_URI`                       | ✅       | MongoDB connection string                              |
| `NEXTAUTH_URL`                      | ✅       | App URL (e.g. `http://localhost:3000`)                 |
| `NEXTAUTH_SECRET`                   | ✅       | Random secret for NextAuth session encryption          |
| `NEXT_PUBLIC_APP_URL`               | ✅       | Same as NEXTAUTH_URL — used for server-side self-calls |
| `GOOGLE_CLIENT_ID`                  | ✅       | Google OAuth client ID                                 |
| `GOOGLE_CLIENT_SECRET`              | ✅       | Google OAuth client secret                             |
| `NEXT_PUBLIC_AI_BACKEND_URL`        | ✅       | AI backend HTTP URL |
| `NEXT_PUBLIC_AI_BACKEND_WS_URL`     | ✅       | AI backend WebSocket URL |
| `AI_WEBHOOK_SECRET`                 | ✅       | Shared secret for authenticating webhooks (header `X-AI-Secret`) |

---

## Testing

```bash
npm test                  # All tests
npm run test:unit         # Unit tests (Vitest)
npm run test:integration  # Integration tests
npm run test:e2e          # Playwright E2E
npm run test:accessibility # axe-core accessibility
```

---

## Browser Support

Chrome/Edge 90+, Firefox 88+, Safari 14+, iOS Safari 14+, Chrome Android 90+
