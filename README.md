# MediFind Rwanda 🇷🇼
### Real-Time Medication Stock Tracker
*African Leadership University — School of Software Engineering*
*Prepared by: TETA SARO Cindy*

---

## Project Structure

```
MediFind-Rwanda/
├── frontend/                  # React frontend
│   └── src/
│       └── pages/
│           ├── PatientSearch.jsx        # Patient drug search page
│           ├── PatientAccount.jsx       # Patient account & watch list
│           ├── FacilityDashboard.jsx    # Staff inventory dashboard
│           ├── FacilityRegistration.jsx # Facility onboarding form
│           └── AdminPanel.jsx           # System admin panel
│
└── backend/                   # Node.js + Express API
    ├── src/
    │   ├── index.js                     # Server entry point
    │   ├── config/
    │   │   └── db.js                    # PostgreSQL connection
    │   ├── middleware/
    │   │   └── auth.js                  # JWT verification & role guards
    │   ├── routes/
    │   │   ├── auth.js                  # Auth endpoints
    │   │   └── drugs.js                 # Drug search endpoints
    │   └── services/
    │       ├── authService.js           # Auth business logic
    │       └── drugService.js           # Drug search business logic
    ├── migrations/
    │   ├── 001_schema.sql               # Full database schema (9 tables)
    │   └── run.js                       # Migration runner
    ├── seeds/
    │   ├── 001_seed.sql                 # Rwanda Essential Medicines + test data
    │   └── run.js                       # Seed runner
    ├── .env.example                     # Environment variables template
    └── package.json                     # Dependencies
```

---

## Getting Started

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env       # Fill in your real values
npm run migrate            # Create all database tables
npm run seed               # Insert medicines + test data
npm run dev                # Start dev server on port 5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start                  # Start React dev server on port 3000
```

### 3. Database Setup (PostgreSQL)

```sql
CREATE DATABASE medifind_rwanda;
CREATE USER medifind_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE medifind_rwanda TO medifind_user;
```

Also install PostgreSQL extensions:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

---

## API Endpoints Built So Far

### Auth (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/patient/register` | Register new patient |
| POST | `/patient/login` | Patient login |
| POST | `/staff/login` | Facility staff login |
| POST | `/admin/login` | Admin login |
| POST | `/otp/send` | Send OTP via SMS |
| POST | `/otp/verify` | Verify OTP code |
| POST | `/password/reset` | Reset password |
| GET  | `/me` | Get current user profile |

### Drugs (`/api/drugs`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Full master drug list |
| GET | `/search?q=amox` | Autocomplete search (EN + KIN) |
| GET | `/:id/facilities?lat=&lng=` | Nearby facilities with stock |
| GET | `/:id/summary` | Availability summary |

### Coming Next
- `POST /api/inventory` — Inventory Management API
- `POST /api/notifications` — Notifications API
- `POST /api/admin` — Admin API

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `users` | Patients and admins |
| `facilities` | Registered pharmacies, clinics, hospitals |
| `facility_staff` | Staff accounts per facility |
| `drugs` | Master medicines list (EN + Kinyarwanda) |
| `inventory` | Drug stock per facility — core table |
| `inventory_audit_log` | Every stock change (NFR 15 compliance) |
| `watch_list` | Patients watching out-of-stock drugs |
| `notifications` | SMS/push notification history |
| `otp_codes` | Phone verification codes |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React.js (PWA) |
| Backend | Node.js + Express |
| Database | PostgreSQL + PostGIS |
| Auth | JWT + bcrypt |
| SMS | MTN Rwanda / Airtel Rwanda API |
| Maps | Google Maps / OpenStreetMap |
| Hosting | Cloud — East Africa region |
