# MediFind Rwanda 🇷🇼
### Real-Time Medication Stock Tracker
*African Leadership University | Prepared by: TETA SARO Cindy*

---

## Quick Start

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env     # Fill in your values
npm run migrate          # Create all 9 database tables
npm run seed             # Insert 30 medicines + test facilities
npm run dev              # Start API on port 5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start                # Open React app on port 3000
```

### 3. Database (PostgreSQL + PostGIS required)
```sql
CREATE DATABASE medifind_rwanda;
CREATE USER medifind_user WITH PASSWORD 'yourpassword';
GRANT ALL PRIVILEGES ON DATABASE medifind_rwanda TO medifind_user;
\c medifind_rwanda
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
```

---

## MTN SMS Sandbox Setup
1. Go to https://developers.mtn.com
2. Sign up → My Apps → Create New App → Subscribe to SMS API
3. Copy your API Key, API Secret, Subscription Key
4. Add to your .env file:
   MTN_API_KEY=your_key
   MTN_API_SECRET=your_secret
   MTN_SUBSCRIPTION_KEY=your_subscription_key
5. Change NODE_ENV=production in .env to enable real SMS sending
   (In development mode, SMS messages are logged to the console only)

---

## All API Endpoints

### Auth (/api/auth)
| POST | /patient/register    | Register patient         |
| POST | /patient/login       | Patient login            |
| POST | /staff/login         | Staff login              |
| POST | /admin/login         | Admin login              |
| POST | /facility/register   | Register new facility    |
| POST | /otp/send            | Send OTP via SMS         |
| POST | /otp/verify          | Verify OTP               |
| POST | /password/reset      | Reset password           |
| GET  | /me                  | Get current profile      |

### Drugs (/api/drugs)
| GET  | /                    | All drugs                |
| GET  | /search?q=           | Autocomplete search      |
| GET  | /:id/facilities      | Nearby facilities        |
| GET  | /:id/summary         | Availability summary     |

### Inventory (/api/inventory) — Staff only
| GET  | /                    | Facility inventory       |
| POST | /                    | Add drug to inventory    |
| PATCH| /:id                 | Update stock             |
| PATCH| /:id/out-of-stock    | Mark out of stock        |
| GET  | /audit               | Audit log                |

### Notifications (/api/notifications)
| POST  | /watch              | Watch a drug             |
| DELETE| /watch/:drugId      | Unwatch a drug           |
| GET   | /watch              | Patient watch list       |
| GET   | /                   | Patient notifications    |
| GET   | /facility           | Facility alerts          |

### Admin (/api/admin) — Admin only
| GET  | /facilities          | All facilities           |
| PATCH| /facilities/:id/approve | Approve facility      |
| PATCH| /facilities/:id/reject  | Reject facility       |
| PATCH| /facilities/:id/status  | Enable/disable        |
| GET  | /analytics           | System analytics         |
| POST | /drugs               | Add drug to master list  |
| PATCH| /drugs/:id           | Edit drug                |
| PATCH| /drugs/:id/status    | Activate/deactivate drug |

---

## SMS Triggers
| Event                        | Recipient  | Message                              |
|------------------------------|------------|--------------------------------------|
| Patient registers            | Patient    | Welcome SMS                          |
| OTP request                  | Any user   | 6-digit code, valid 10 mins          |
| Stock drops to threshold     | Facility   | Low stock alert with quantity        |
| Stock hits zero              | Facility   | Out of stock alert                   |
| Drug back in stock           | Patients   | Availability alert with distance     |
| Facility approved            | Staff      | Approval confirmation                |
| Facility rejected            | Staff      | Rejection notice                     |
