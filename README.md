# Blood Donation Management System (BDMS)

A secure, scalable, and intelligent digital platform for blood donation, inventory management, and transfusion workflows.

## Quick Start

**Option 1: Double-click `start.bat`** to launch both servers automatically.

**Option 2: Manual Start:**

```powershell
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

**Then open:** http://localhost:5173

---

## Features

### Core Modules (MVP - P0)
- **Donor Registration & Profile Management** - Sign-up, demographics, eligibility validation
- **Appointment Scheduling** - View slots, book/reschedule, reminders
- **Blood Inventory Management** - Record collection, unique bag IDs, expiry tracking
- **Blood Request Workflow** - Create requests, reserve units, status tracking
- **Notifications & Alerts** - Low inventory, expiry, emergency alerts
- **Admin Portal & RBAC** - Role-based access control, audit logs, user management

## Tech Stack

| Layer       | Technology                    |
|-------------|-------------------------------|
| Frontend    | React.js (Vite)              |
| Backend     | Node.js + Express.js         |
| Database    | SQLite (Prisma ORM)          |
| Auth        | JWT + bcrypt                 |

**No external API keys or database server required** — everything runs locally with SQLite.

## Project Structure

```
Project_Web_Tech/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── context/       # Auth context
│   │   └── services/      # API calls
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/        # API routes
│   │   ├── middleware/    # Auth, RBAC
│   │   ├── utils/         # Helpers
│   │   └── index.js       # Entry point
│   ├── prisma/
│   │   └── schema.prisma  # Database schema
│   └── package.json
├── start.bat              # Quick launcher
├── README.md
└── LICENSE
```

## Getting Started

### Prerequisites
- Node.js 18+

### Installation (First Time)

```powershell
cd server
npm install
cd ..\client
npm install
```

### Database Setup

The SQLite database is pre-seeded with demo data (`server/prisma/dev.db`).

**Demo accounts** (all use password `password123`):
| Email                | Role            |
|----------------------|-----------------|
| admin@bdms.com       | SUPER_ADMIN     |
| bankadmin@bdms.com   | BLOOD_BANK_ADMIN|
| hospital@bdms.com    | HOSPITAL_STAFF  |
| lab@bdms.com         | LAB_TECHNICIAN  |
| john@example.com     | DONOR           |
| jane@example.com     | DONOR           |
| bob@example.com      | DONOR           |

To reset the database with fresh demo data:
```powershell
cd server
npx prisma db push --force-reset
npm run seed
```

## Roles & Permissions

| Role                | Description                                 |
|---------------------|---------------------------------------------|
| SUPER_ADMIN         | Full system access                         |
| BLOOD_BANK_ADMIN    | Inventory, appointments, donors management |
| HOSPITAL_STAFF      | Create requests, view inventory            |
| LAB_TECHNICIAN      | Blood collection, testing, inventory       |
| DONOR               | Own profile, appointments, donation history|
| COORDINATOR         | Regional monitoring                        |

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Donors
- `GET /api/donors` - List all donors (admin)
- `GET /api/donors/:id` - Get donor details
- `POST /api/donors` - Create donor profile
- `PUT /api/donors/:id` - Update donor
- `GET /api/donors/:id/eligibility` - Check eligibility

### Appointments
- `GET /api/appointments/slots` - Available slots
- `POST /api/appointments` - Book appointment
- `GET /api/appointments` - List appointments
- `PUT /api/appointments/:id` - Reschedule
- `DELETE /api/appointments/:id` - Cancel

### Inventory
- `GET /api/inventory` - List inventory
- `POST /api/inventory` - Add blood unit
- `PUT /api/inventory/:id` - Update status
- `GET /api/inventory/search` - Search compatible units
- `GET /api/inventory/summary/dashboard` - Dashboard stats

### Blood Requests
- `GET /api/requests` - List requests
- `POST /api/requests` - Create request
- `PUT /api/requests/:id` - Update status
- `PUT /api/requests/:id/fulfill` - Fulfill request
- `DELETE /api/requests/:id` - Cancel request

### Notifications
- `GET /api/notifications` - User notifications
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/read-all` - Mark all as read

### Admin
- `GET /api/admin/users` - List users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id/role` - Update role
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/audit-logs` - View audit logs
- `GET /api/admin/stats` - System statistics

## Blood Compatibility Matrix

| Recipient | Compatible Donors |
|-----------|------------------|
| O-        | O-               |
| O+        | O+, O-           |
| A-        | A-, A+, O-, O+   |
| A+        | A+, O+           |
| B-        | B-, B+, O-, O+   |
| B+        | B+, O+           |
| AB-       | All types        |
| AB+       | All types        |

## Environment Variables

Default values are configured - no changes needed for local development.

| Variable          | Default                        | Description           |
|------------------|-------------------------------|-----------------------|
| DATABASE_URL     | file:./dev.db                 | SQLite database path  |
| JWT_SECRET       | (dev key included)            | JWT signing secret    |
| JWT_REFRESH_SECRET| (dev key included)            | Refresh token secret  |
| PORT             | 3001                          | Server port           |

## License

MIT