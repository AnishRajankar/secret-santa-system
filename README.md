# 🎅 Secret Santa Backend

A production-ready REST API for running a Secret Santa gift exchange. Built with **Node.js + Express + MongoDB (Mongoose)** and secured with **JWT authentication**.

---

## 🌐 Live Deployment & Quick Test

The API is deployed and live on Render:
- **Base URL**: `https://secret-santa-api-jpfb.onrender.com`
- **Health Check**: [`https://secret-santa-api-jpfb.onrender.com/health`](https://secret-santa-api-jpfb.onrender.com/health)

### Primary API Endpoints

| Action | Method | Live Endpoint | Auth Required |
|---|---|---|---|
| **Health Check** | `GET` | `https://secret-santa-api-jpfb.onrender.com/health` | No |
| **Register (Signup)** | `POST` | `https://secret-santa-api-jpfb.onrender.com/auth/signup` | No |
| **Login** | `POST` | `https://secret-santa-api-jpfb.onrender.com/auth/login` | No |
| **Get Participants** | `GET` | `https://secret-santa-api-jpfb.onrender.com/participants` | Bearer Token / Cookie |
| **Run Draw (Admin)** | `POST` | `https://secret-santa-api-jpfb.onrender.com/draw/run` | Admin Bearer Token |
| **My Assignment** | `GET` | `https://secret-santa-api-jpfb.onrender.com/participants/my-giftee` | Bearer Token / Cookie |

---

## ✨ Features

| Feature | Details |
|---|---|
| **Auth** | Signup / Login / Logout with JWT (Bearer header + httpOnly cookie) |
| **Admin** | First registered user auto-promoted to admin |
| **Draw Algorithm** | Sattolo's derangement — no self-assignments, no mutual pairs (A→B and B→A) |
| **Private Reveal** | `/participants/my-giftee` returns only your own assignment |
| **Wishlist** | Per-user wishlist, visible only to your assigned gifter |
| **Draw Locking** | Admin can lock registrations or run the draw; both block new signups |
| **Security** | Helmet, CORS, rate limiting, input validation, bcrypt password hashing |
| **Atomicity** | Draw assignments written in a MongoDB transaction (bulk write) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB >= 5 (local or Atlas)

### Installation

```bash
git clone <your-repo-url>
cd secret-santa-backend
npm install
```

### Configuration

```bash
cp .env.example .env
# Edit .env and set your MONGODB_URI and JWT_SECRET
```

### Run

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

The API will be available at `http://localhost:3000`.

---

## API Reference

### Base URL
- **Production (Live)**: `https://secret-santa-api-jpfb.onrender.com`
- **Local Development**: `http://localhost:3000`

### Auth

#### POST /auth/signup
Register as a participant. First user becomes admin automatically.
Blocked once the draw is locked or run.

Request Body:
```json
{
  "name": "Alice",
  "email": "alice@example.com",
  "password": "secret123"
}
```

Response 201:
```json
{
  "success": true,
  "message": "Signed up as admin!",
  "token": "<jwt>",
  "user": { "id": "...", "name": "Alice", "email": "...", "isAdmin": true }
}
```

---

#### POST /auth/login
Authenticate and receive a JWT.

Request Body:
```json
{ "email": "alice@example.com", "password": "secret123" }
```

---

#### POST /auth/logout
Clears the auth cookie. Requires Authorization: Bearer token.

---

### Participants

All participant routes require: Authorization: Bearer token

#### GET /participants
Returns public participant list (names + join date only — no emails, no assignments).

#### GET /participants/:id
Returns your own profile only. Returns 403 if you request someone else's profile.

#### PATCH /participants/:id/wishlist
Update your own wishlist. Visible only to your assigned gifter.

Request Body:
```json
{ "wishlist": "A new keyboard, some tea, a cozy blanket" }
```

#### DELETE /participants/:id
Admin only. Delete a participant before the draw runs.

#### GET /participants/my-giftee
Returns only your assignment — who you need to buy a gift for, and their wishlist.

```json
{
  "success": true,
  "giftee": {
    "id": "...",
    "name": "Bob",
    "wishlist": "A new keyboard, some tea, a cozy blanket"
  }
}
```

#### GET /participants/my-wishlist-giver
Reverse view — which person is assigned to give you a gift (name only).

```json
{
  "success": true,
  "gifter": {
    "name": "Charlie",
    "message": "Charlie is getting you a gift!"
  }
}
```

---

### Draw

Status is auth-only. Lock and Run are admin-only.

#### GET /draw/status
Check draw state and participant count.

```json
{
  "success": true,
  "draw": {
    "status": "open",
    "participantCount": 4,
    "minParticipants": 3,
    "canRunDraw": true,
    "runAt": null,
    "lockedAt": null
  }
}
```

Draw status values:
- open: accepting new signups
- locked: closed to new signups, draw not yet run
- done: draw has been run; assignments are set

#### POST /draw/lock
Admin only. Manually close registrations.

#### POST /draw/run
Admin only. Generate Secret Santa assignments.

---

## Security

- Passwords hashed with bcrypt (cost factor 12)
- JWTs signed with HS256; expire after 7 days (configurable)
- Rate limiting: 200 req/15 min globally; 20 req/15 min on auth routes
- Helmet sets secure HTTP headers
- Input validation via express-validator on all write endpoints
- Ownership enforcement: users can only read/write their own data

---

## Draw Algorithm

The draw uses Sattolo's algorithm — a variant of Fisher-Yates that always produces a derangement (no element in its original position):

1. Sattolo's shuffle generates a random derangement
2. The result is checked for mutual pairs (A to B AND B to A)
3. If mutual pairs exist, a targeted swap pass attempts to fix them
4. The algorithm retries up to 500 times (virtually instant for typical group sizes)

---

## Project Structure

```
secret-santa-backend/
├── src/
│   ├── app.js
│   ├── server.js
│   ├── config/db.js
│   ├── models/
│   │   ├── user.model.js
│   │   └── draw.model.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── participant.controller.js
│   │   └── draw.controller.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── participant.routes.js
│   │   └── draw.routes.js
│   ├── middleware/
│   │   ├── auth.middleware.js
│   │   └── error.middleware.js
│   ├── validators/
│   │   └── auth.validators.js
│   └── utils/
│       ├── jwt.utils.js
│       └── draw.utils.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| PORT | 3000 | HTTP server port |
| MONGODB_URI | — | MongoDB connection string |
| JWT_SECRET | — | Secret for signing JWTs |
| JWT_EXPIRES_IN | 7d | JWT expiry duration |
| COOKIE_HTTP_ONLY | true | httpOnly flag on auth cookie |
| COOKIE_SECURE | false | Set true for HTTPS/production |
| MIN_PARTICIPANTS | 3 | Minimum participants before draw can run |

---

## Quick Postman Workflow

1. POST /auth/signup — register yourself (you become admin)
2. POST /auth/signup — register 3+ more participants
3. GET /draw/status — confirm enough participants joined
4. POST /draw/run — (as admin) run the draw
5. GET /participants/my-giftee — (as any participant) see your assignment + their wishlist
6. PATCH /participants/:id/wishlist — update your wishlist

---

## License

MIT
