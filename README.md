# Smart Parking Management System - Frontend

A comprehensive Next.js web application for managing smart parking operations with real-time monitoring, AI-powered detection, and advanced analytics.

## Features

### 🎥 Live Monitoring
- Real-time camera feeds with AI detection overlays
- License plate recognition with confidence scores
- Parking slot occupancy detection with color-coded status
- Fullscreen mode for dedicated monitoring
- Connection status indicators with frame rate and latency metrics
- Automatic reconnection with exponential backoff

### 📱 Mobile Camera Streaming
- Use mobile devices as temporary camera sources
- WebRTC-based video streaming to Python backend
- Real-time detection overlay on mobile preview
- Works on iOS and Android browsers
- Adaptive video quality based on network conditions

### 📊 Advanced Dashboard
- Interactive map view with parking lot locations
- Real-time occupancy statistics with trend indicators
- Activity feed grouped by time periods
- System health monitoring (database, backend, connections)
- Contractor performance rankings
- Auto-refresh every 30 seconds
- Responsive design for desktop, tablet, and mobile

### 📈 Analytics & Reports
- Comprehensive analytics with multiple chart types
- Occupancy trends and peak hours analysis
- Contractor performance metrics
- Report generation in multiple formats (CSV, Excel, PDF)
- Customizable date ranges and filters
- Downloadable reports for stakeholders

### ⚙️ Settings & Configuration
- System-wide configuration management
- Alert threshold customization
- Python backend URL configuration
- Camera frame skip settings
- User role management (Admin only)
- Real-time settings updates

### 🎨 Professional UI/UX
- Fully responsive design (mobile, tablet, desktop)
- Skeleton loaders and loading states
- Toast notifications for user feedback
- Empty states with helpful actions
- Smooth transitions and animations
- Consistent design system with theme
- Touch-friendly mobile interface

### ♿ Accessibility
- WCAG AA compliant color contrast
- Keyboard navigation support
- Screen reader optimized
- ARIA labels and live regions
- Skip navigation links
- Keyboard shortcuts for common actions

### 🔄 Error Recovery
- Automatic API retry with exponential backoff
- WebSocket auto-reconnection
- Offline detection and queuing
- Form input preservation on errors
- Error boundaries with fallback UI
- Stale data indicators

### ⚡ Performance
- Code splitting and lazy loading
- API response caching
- Optimistic UI updates
- Virtual scrolling for large lists
- Debounced search inputs
- Resource preloading

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- MongoDB instance (local or cloud)
- Python backend running (see `../python-work`)
- Google OAuth credentials (for authentication)

### Installation

1. **Install dependencies:**
```bash
cd next.js-work
npm install
```

2. **Configure environment variables:**

Create a `.env.local` file in the `next.js-work` directory:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/smart-parking

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Python Backend
PYTHON_BACKEND_URL=http://localhost:8000
NEXT_PUBLIC_PYTHON_WS_URL=ws://localhost:8000
```

3. **Start the Python backend:**
```bash
cd ../python-work
python main.py
```

4. **Start the development server:**
```bash
npm run dev
```

5. **Open the application:**
```
http://localhost:3000
```

## Usage Guide

### Live Monitoring

1. Navigate to a parking lot detail page
2. Click "View Live Feed" button
3. Select camera type (Gate or Lot)
4. View real-time detections with overlays:
   - **Green boxes**: Empty parking slots
   - **Red boxes**: Occupied parking slots
   - **Blue boxes**: Detected license plates
5. Toggle fullscreen mode for dedicated monitoring
6. Monitor connection status, frame rate, and latency

### Mobile Camera Streaming

1. Open `/camera` page on your mobile device
2. Grant camera permissions when prompted
3. Click "Start Streaming" to begin
4. View real-time detections overlaid on your camera feed
5. Monitor connection status and frame rate
6. Click "Stop Streaming" when done

**Note:** No authentication required for camera streaming page.

### Report Generation

1. Navigate to the Analytics page
2. Click "Generate Report" button
3. Configure your report:
   - **Type**: Violations, Occupancy, or Contractor Performance
   - **Date Range**: Select start and end dates
   - **Format**: CSV, Excel, or PDF
4. Click "Generate" and wait for processing
5. Download the generated report

**Report Types:**
- **Violations Report**: Contractor violations with penalties
- **Occupancy Report**: Parking lot occupancy statistics
- **Contractor Performance**: Compliance rates and metrics

### Settings Configuration (Admin Only)

1. Navigate to Settings page (requires Admin role)
2. Configure system parameters:
   - **Alert Thresholds**: Capacity warning %, camera offline timeout
   - **Python Backend**: HTTP and WebSocket URLs
   - **Camera Settings**: Frame skip values for optimization
3. Manage user roles in User Management section
4. Click "Save Settings" to apply changes

**Note:** Changing user roles requires the affected user to re-authenticate.

## Project Structure

```
next.js-work/
├── src/
│   ├── app/                      # Next.js App Router pages
│   │   ├── api/                  # API routes
│   │   │   ├── alerts/           # Alert management
│   │   │   ├── analytics/        # Analytics endpoints
│   │   │   ├── auth/             # NextAuth configuration
│   │   │   ├── capacity/         # Capacity tracking
│   │   │   ├── contractors/      # Contractor management
│   │   │   ├── parking-lots/     # Parking lot CRUD
│   │   │   ├── records/          # Vehicle records
│   │   │   ├── reports/          # Report generation
│   │   │   ├── settings/         # System settings
│   │   │   ├── sse/              # Server-Sent Events
│   │   │   ├── users/            # User management
│   │   │   └── violations/       # Violation tracking
│   │   ├── dashboard/            # Main dashboard
│   │   ├── parking-lots/         # Parking lot pages
│   │   │   └── [id]/
│   │   │       └── live/         # Live monitoring page
│   │   ├── camera/               # Mobile camera streaming
│   │   ├── analytics/            # Analytics page
│   │   ├── settings/             # Settings page
│   │   ├── contractors/          # Contractor management
│   │   ├── records/              # Vehicle records
│   │   ├── violations/           # Violations page
│   │   └── alerts/               # Alerts page
│   ├── components/               # Reusable React components
│   │   ├── VideoCanvas.tsx       # Live video with overlays
│   │   ├── CameraPreview.tsx     # Mobile camera preview
│   │   ├── MapView.tsx           # Leaflet map integration
│   │   ├── ReportModal.tsx       # Report generation UI
│   │   ├── SettingsForm.tsx      # Settings configuration
│   │   ├── ResponsiveSidebar.tsx # Responsive navigation
│   │   └── ...                   # 40+ other components
│   ├── lib/                      # Utility libraries
│   │   ├── websocket-manager.ts  # WebSocket connection management
│   │   ├── webrtc-client.ts      # WebRTC for mobile streaming
│   │   ├── api-client.ts         # API client with retry logic
│   │   ├── report-generator.ts   # Report file generation
│   │   ├── offline-manager.ts    # Offline detection & queuing
│   │   ├── theme.ts              # Design system theme
│   │   └── ...                   # Other utilities
│   ├── models/                   # MongoDB Mongoose models
│   │   ├── ParkingLot.ts
│   │   ├── VehicleRecord.ts
│   │   ├── Contractor.ts
│   │   ├── Violation.ts
│   │   ├── Alert.ts
│   │   ├── Settings.ts
│   │   └── Report.ts
│   └── __tests__/                # Test suites
│       ├── unit/                 # Unit tests
│       ├── integration/          # Integration tests
│       ├── property/             # Property-based tests
│       ├── accessibility/        # Accessibility tests
│       └── performance/          # Performance tests
├── e2e/                          # Playwright E2E tests
├── public/                       # Static assets
└── docs/                         # Documentation
    └── USER_GUIDE.md             # Detailed user guide
```

## API Endpoints

### Parking Lots
- `GET /api/parking-lots` - List all parking lots
- `POST /api/parking-lots` - Create new parking lot
- `GET /api/parking-lots/[id]` - Get parking lot details
- `PUT /api/parking-lots/[id]` - Update parking lot
- `DELETE /api/parking-lots/[id]` - Delete parking lot
- `POST /api/parking-lots/[id]/initialize-slots` - Initialize parking slots

### Capacity
- `GET /api/capacity/current` - Get current capacity for all lots
- `GET /api/capacity/history` - Get capacity history
- `POST /api/capacity/update` - Update capacity (internal)

### Vehicle Records
- `GET /api/records` - List vehicle records with filters
- `POST /api/records/entry` - Record vehicle entry
- `POST /api/records/exit` - Record vehicle exit
- `GET /api/records/current` - Get currently parked vehicles
- `GET /api/records/[id]` - Get record details

### Contractors
- `GET /api/contractors` - List all contractors
- `POST /api/contractors` - Create new contractor
- `GET /api/contractors/[id]` - Get contractor details
- `PUT /api/contractors/[id]` - Update contractor
- `DELETE /api/contractors/[id]` - Delete contractor
- `GET /api/contractors/[id]/performance` - Get performance metrics

### Violations
- `GET /api/violations` - List violations with filters
- `POST /api/violations` - Create violation
- `GET /api/violations/[id]` - Get violation details
- `POST /api/violations/[id]/acknowledge` - Acknowledge violation
- `POST /api/violations/[id]/resolve` - Resolve violation
- `GET /api/violations/summary` - Get violation summary

### Alerts
- `GET /api/alerts` - List all alerts
- `GET /api/alerts/active` - Get active alerts
- `POST /api/alerts/[id]/acknowledge` - Acknowledge alert

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/occupancy-trends` - Occupancy trends
- `GET /api/analytics/peak-hours` - Peak hours analysis
- `GET /api/analytics/contractor-performance` - Contractor metrics

### Reports
- `POST /api/reports/generate` - Generate and download report

### Settings (Admin Only)
- `GET /api/settings` - Get system settings
- `PUT /api/settings` - Update system settings

### Users (Admin Only)
- `GET /api/users` - List all users
- `PUT /api/users/[id]/role` - Update user role

### Health
- `GET /api/health` - System health check

### SSE (Server-Sent Events)
- `GET /api/sse/dashboard` - Real-time dashboard updates

## WebSocket Endpoints (Python Backend)

- **Gate Monitor:** `ws://localhost:8000/ws/gate-monitor`
  - License plate detection with bounding boxes
  - Real-time frame streaming
  
- **Lot Monitor:** `ws://localhost:8000/ws/lot-monitor`
  - Parking slot occupancy detection
  - Slot status updates with coordinates

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Custom component library
- **State Management:** React hooks + Context API
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts
- **Maps:** Leaflet + React-Leaflet
- **Authentication:** NextAuth.js (Google OAuth)

### Backend
- **API Routes:** Next.js API Routes
- **Database:** MongoDB with Mongoose ODM
- **Real-time:** WebSocket + Server-Sent Events
- **File Generation:** ExcelJS, jsPDF, CSV

### Testing
- **Unit Tests:** Vitest + React Testing Library
- **Property Tests:** fast-check
- **Integration Tests:** Vitest
- **E2E Tests:** Playwright
- **Accessibility:** axe-core

### Development Tools
- **Linting:** ESLint
- **Formatting:** Prettier (via ESLint)
- **Type Checking:** TypeScript
- **Package Manager:** npm

## Testing

### Run All Tests
```bash
npm test
```

### Run Unit Tests
```bash
npm run test:unit
```

### Run Integration Tests
```bash
npm run test:integration
```

### Run Property Tests
```bash
npm run test:property
```

### Run E2E Tests
```bash
npm run test:e2e
```

### Run Accessibility Tests
```bash
npm run test:accessibility
```

## Building for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `NEXTAUTH_URL` | Application URL | Yes |
| `NEXTAUTH_SECRET` | NextAuth secret key | Yes |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Yes |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Yes |
| `PYTHON_BACKEND_URL` | Python backend HTTP URL | Yes |
| `NEXT_PUBLIC_PYTHON_WS_URL` | Python backend WebSocket URL | Yes |

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari 14+, Chrome Android 90+)

## Accessibility

This application is designed to be accessible to all users:
- WCAG 2.1 Level AA compliant
- Keyboard navigation support
- Screen reader optimized
- High contrast mode support
- Focus indicators on all interactive elements
- Skip navigation links
- Alternative text for images and icons

## Performance

- Initial page load: < 2 seconds
- Time to Interactive: < 3 seconds
- Lighthouse score: 90+ (Performance, Accessibility, Best Practices)
- Bundle size: Optimized with code splitting
- API response caching for improved performance

## Contributing

1. Follow the existing code style and conventions
2. Write tests for new features
3. Ensure all tests pass before submitting
4. Update documentation as needed
5. Use meaningful commit messages

## Troubleshooting

### WebSocket Connection Issues
- Ensure Python backend is running on the correct port
- Check firewall settings
- Verify WebSocket URL in settings

### Authentication Issues
- Verify Google OAuth credentials
- Check NEXTAUTH_URL matches your domain
- Ensure NEXTAUTH_SECRET is set

### Database Connection Issues
- Verify MongoDB is running
- Check MONGODB_URI connection string
- Ensure network connectivity to MongoDB

### Mobile Camera Not Working
- Grant camera permissions in browser
- Use HTTPS in production (required for camera access)
- Check browser compatibility

## License

Proprietary - MCD Smart Parking Management System

## Support

For issues and questions, please contact the development team or refer to the [User Guide](./docs/USER_GUIDE.md).

