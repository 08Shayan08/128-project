# PulseReach Agency — CSIT128 Assignment 2

Group company profile website for PulseReach Agency, a fictional social media marketing agency.

## Team
| Name | Role |
|------|------|
| Shayan | Founder & CEO |
| Hazim | Co-Founder & Creative Director |
| Jeff | Co-Founder & Lead Developer |
| Jawhar | Co-Founder & Marketing Strategist |

## Tech Stack
- **Frontend:** HTML, CSS, Vanilla JS
- **Backend:** Node.js (raw `http` module, no Express)
- **Database:** MySQL

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure database credentials
Copy the example env file and fill in your MySQL password:
```bash
cp .env.example .env
```
Edit `.env`:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=your_mysql_password
```

### 3. Start the server
```bash
npm start
```

The server runs at **http://localhost:8080** and automatically creates the database, tables, and seed data on first run.

## Pages
| Page | URL |
|------|-----|
| Home | http://localhost:8080 |
| About | http://localhost:8080/about.html |
| Services | http://localhost:8080/services.html |
| Team | http://localhost:8080/team.html |
| Contact | http://localhost:8080/contact.html |
| Admin Login | http://localhost:8080/login.html |
| Admin Dashboard | http://localhost:8080/admin.html |

## Admin Access
Default credentials: `admin` / `admin123`

## Database Tables
`Services`, `Team`, `Testimonials`, `CompanyHistory`, `Awards`, `Comments`, `Subscribers`, `Admins`
