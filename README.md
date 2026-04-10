# SkyEstate API

Backend API for a real estate listing platform. Built with Node.js, TypeScript, Express, and MongoDB. Supports geo-based property search, direct messaging between users, a realtor onboarding system, Expo push notifications, and role-based access control.

---

## Tech Stack

|                    |                                                         |
| ------------------ | ------------------------------------------------------- |
| Runtime            | Node.js                                                 |
| Language           | TypeScript 5                                            |
| Framework          | Express 4                                               |
| Database           | MongoDB + Mongoose 8                                    |
| Auth               | JWT (access + refresh tokens) + signed cookies          |
| File uploads       | Cloudinary                                              |
| Push notifications | Expo Server SDK                                         |
| Input validation   | Joi                                                     |
| Email              | Nodemailer                                              |
| Security           | Helmet, HPP, express-mongo-sanitize, express-rate-limit |

---

## Project Structure

```
├── controller/          Route handler logic
├── middleware/          Auth, permissions, guest guard, error handling
├── models/              Mongoose schemas
├── routes/              Express routers
├── types/               AuthRequest interface and JWT types
├── typings/             Global Express req.user augmentation
├── @types/              Additional type declarations
├── utils/               Cloudinary, JWT, email, push notifications, query helpers
├── errors/              Custom error classes
├── db/                  MongoDB connection
└── index.ts             App entry point
```

---

## Getting Started

### Requirements

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account
- SMTP email account (for Nodemailer)

### Install

```bash
git clone <your-repo-url>
cd sky-housing-v2
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGO_URL=mongodb+srv://<user>:<password>@cluster.mongodb.net/skyestate

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_SECRET_REFRESH=your_refresh_secret_here
JWT_LIFETIME=1d

# Cloudinary
CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

# Nodemailer
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=your@email.com
EMAIL_PASS=yourpassword
EMAIL_FROM=noreply@skyestate.com

# Verification token range (crypto.randomInt)
CRYPTO_MIN=100000
CRYPTO_MAX=999999

# Guest user (pre-seeded read-only account)
GUEST_USERNAME=guest
GUEST_PASSWORD=guestpassword
GUEST_USER_ID=<mongodb_objectid>

# CORS — comma-separated origins, or * to allow all
ALLOWED_ORIGINS=http://localhost:3000,https://yourapp.com
```

### Run

```bash
# Development — ts-node + nodemon with hot reload
npm run dev

# Production build
npm run build
npm start
```

---

## Roles

All users register as `user`. Roles can be upgraded by admins or through the realtor application flow.

| Role          | Description                                                                       |
| ------------- | --------------------------------------------------------------------------------- |
| `super-admin` | Assigned to the very first registered account. Full system access.                |
| `admin`       | Can manage users, ban accounts, approve/reject realtor applications.              |
| `realtor`     | Approved property listers. Can create estate ads.                                 |
| `member`      | Elevated user — can create ads without going through the realtor flow.            |
| `user`        | Default role on registration. Can browse, message, and apply to become a realtor. |
| `assistant`   | Limited staff role.                                                               |

---

## API Reference

Base URL: `/api/v1`

---

### Authentication `/api/v1/auth`

> `POST /login`, `POST /register`, and `POST /forgot-password` are rate-limited to **5 requests per 15 minutes**.

| Method | Endpoint           | Auth required | Description                                                                                               |
| ------ | ------------------ | ------------- | --------------------------------------------------------------------------------------------------------- |
| POST   | `/register`        | No            | Register a new account. Sends a verification email. Accepts `multipart/form-data` with optional `avatar`. |
| POST   | `/verify-email`    | No            | Verify email address using the token from the registration email.                                         |
| POST   | `/resend-code`     | No            | Resend the verification email.                                                                            |
| POST   | `/login`           | No            | Login. Returns a JWT access token and sets a signed refresh cookie.                                       |
| POST   | `/forgot-password` | No            | Send a password reset code to the user's email.                                                           |
| POST   | `/reset-password`  | No            | Reset password using the emailed token.                                                                   |
| POST   | `/guest-login`     | No            | Login as the read-only guest account.                                                                     |
| DELETE | `/logout`          | Yes           | Logout, invalidate refresh token, clear cookies.                                                          |

---

### Users `/api/v1/user`

All routes require a valid JWT.

| Method | Endpoint           | Roles              | Description                                                                                        |
| ------ | ------------------ | ------------------ | -------------------------------------------------------------------------------------------------- |
| GET    | `/`                | Any                | List all verified users. Supports `?search=`, `?role=`, `?banned=`, `?sort=`, `?page=`, `?limit=`. |
| GET    | `/showMe`          | Any                | Get the current authenticated user's profile.                                                      |
| GET    | `/:id`             | Any                | Get a single user by ID.                                                                           |
| PUT    | `/update-user`     | Any                | Update own profile. Accepts `multipart/form-data` with optional `avatar`.                          |
| PATCH  | `/`                | Any                | Change own password. Body: `{ oldPassword, newPassword }`.                                         |
| PATCH  | `/location`        | Any                | Update live GPS location. Body: `{ latitude, longitude }`.                                         |
| PATCH  | `/manual-location` | Any                | Manually set location. Body: `{ latitude, longitude }`.                                            |
| PUT    | `/:id`             | admin, super-admin | Ban or change a user's role. Body: `{ ban?, role? }`.                                              |
| POST   | `/expo-token`      | Any                | Register an Expo push notification token.                                                          |

---

### Estates `/api/v1/estate`

All routes require a valid JWT. Geo search endpoints are rate-limited to **50 requests per 15 minutes**.

| Method | Endpoint         | Roles                                          | Description                                                                                                                                                                                                |
| ------ | ---------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/`              | realtor (approved), admin, super-admin, member | Create a listing. Accepts `multipart/form-data`, up to 6 images.                                                                                                                                           |
| GET    | `/`              | Any                                            | Get listings near the user's saved address. Supports `?search=`, `?category=`, `?sort=`, `?page=`.                                                                                                         |
| GET    | `/user-ads`      | Any                                            | Get the current user's own listings.                                                                                                                                                                       |
| GET    | `/nearby`        | Any                                            | Geo search for nearby listings. Supports `?distance=`, `?fetchMode=nearby\|all`, `?listingType=`, `?minPrice=`, `?maxPrice=`, `?bedrooms=`, `?bathrooms=`, `?furnished=`.                                  |
| GET    | `/rent`          | Any                                            | Get rental listings. Supports `?distance=`, `?minPrice=`, `?maxPrice=`, `?bedrooms=`, `?bathrooms=`, `?furnished=`.                                                                                        |
| GET    | `/search`        | Any                                            | Full filtered search. Supports `?listingType=`, `?minPrice=`, `?maxPrice=`, `?rentFrequency=`, `?isFurnished=`, `?availableFrom=`, `?bedrooms=`, `?bathrooms=`, `?latitude=`, `?longitude=`, `?distance=`. |
| GET    | `/:id`           | Any                                            | Get a single listing with reviews and owner info.                                                                                                                                                          |
| PUT    | `/update-ad/:id` | Owner                                          | Update a listing. Accepts `multipart/form-data`, up to 6 images.                                                                                                                                           |
| PATCH  | `/:id`           | Owner                                          | Toggle the listing's `taken` status.                                                                                                                                                                       |
| DELETE | `/:id`           | Owner                                          | Delete a listing.                                                                                                                                                                                          |
| POST   | `/ads/:id/view`  | Any                                            | Increment view count. Atomic — only counts once per user.                                                                                                                                                  |
| POST   | `/ads/:id/like`  | Any                                            | Toggle like on a listing. Atomic — no race conditions.                                                                                                                                                     |
| GET    | `/:id/reviews`   | Any                                            | Get paginated reviews for a listing.                                                                                                                                                                       |

---

### Realtor Applications `/api/v1/realtor`

All routes require a valid JWT.

| Method | Endpoint           | Roles              | Description                                                                                                                                                                                   |
| ------ | ------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/apply`           | user, member       | Submit a realtor application. Accepts `multipart/form-data` with up to 5 `documents`. Body: `{ licenseNumber (required), agencyName?, experience? }`. Blocked if already pending or approved. |
| GET    | `/status`          | Any                | Get own application status and submitted data.                                                                                                                                                |
| GET    | `/applications`    | admin, super-admin | List all applications. Filter with `?status=pending\|approved\|rejected\|none`. Supports `?page=`, `?limit=`.                                                                                 |
| PATCH  | `/:userId/approve` | admin, super-admin | Approve an application. Sets `role = realtor` and `realtorStatus = approved`.                                                                                                                 |
| PATCH  | `/:userId/reject`  | admin, super-admin | Reject an application. User keeps their current role and can reapply.                                                                                                                         |

---

### Reviews `/api/v1/review`

All routes require a valid JWT.

| Method | Endpoint | Roles     | Description                                                                                    |
| ------ | -------- | --------- | ---------------------------------------------------------------------------------------------- |
| GET    | `/`      | Any       | List all reviews. Supports `?page=`, `?limit=`.                                                |
| GET    | `/:id`   | Any       | Get a single review.                                                                           |
| POST   | `/`      | Non-guest | Create a review. Body: `{ estate, rating, comment, title? }`. One review per user per listing. |
| PUT    | `/:id`   | Owner     | Update a review. Body: `{ rating?, title?, comment? }`.                                        |
| DELETE | `/:id`   | Owner     | Delete a review.                                                                               |

---

### Rooms `/api/v1/room`

All routes require a valid JWT. Rooms represent one-to-one or group conversations.

| Method | Endpoint | Roles       | Description                                                                                                                                                                               |
| ------ | -------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`      | Any         | Get all conversation rooms the current user belongs to.                                                                                                                                   |
| GET    | `/:id`   | Participant | Get a single room with participant details and last message.                                                                                                                              |
| POST   | `/`      | Non-guest   | Create a new room. Body: `{ participantsArray: string[] }` — array of participant emails. Validates all emails exist. Returns existing room if one already exists for those participants. |
| PUT    | `/:id`   | Participant | Refresh participant data from the database.                                                                                                                                               |
| DELETE | `/:id`   | Participant | Delete a conversation.                                                                                                                                                                    |

---

### Messages `/api/v1/message`

All routes require a valid JWT. Only participants of a room can read or send messages in it.

| Method | Endpoint   | Roles         | Description                                                                                                                                                          |
| ------ | ---------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/:roomId` | Participant   | Get paginated messages for a room, newest first. Supports `?page=`, `?limit=` (max 100).                                                                             |
| POST   | `/`        | Non-guest     | Send a message. Accepts `multipart/form-data`. Use field `media` for images/audio/video (up to 6), `files` for documents/PDFs (up to 10). Body: `{ roomId, text? }`. |
| PUT    | `/:roomId` | Participant   | Mark all messages in the room as read (excluding own messages).                                                                                                      |
| DELETE | `/:id`     | Message owner | Delete own message only.                                                                                                                                             |

---

### Notifications `/api/v1/notify`

All routes require a valid JWT.

| Method | Endpoint | Roles     | Description                                                                                                                         |
| ------ | -------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/`      | Any       | Get own push notification history. Supports `?page=`, `?limit=`.                                                                    |
| POST   | `/`      | Non-guest | Send a push notification to a user via Expo. Body: `{ userId, message }`. Skipped gracefully if the target has no valid Expo token. |

---

## Authentication Flow

Mobile clients (Expo) send the JWT as a Bearer token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Web clients can use the signed `access_token` cookie set at login.

---

## Security

- **Helmet** — sets secure HTTP response headers
- **HPP** — prevents HTTP parameter pollution attacks
- **express-mongo-sanitize** — strips `$` operators from request bodies to block NoSQL injection
- **Rate limiting** — auth endpoints limited to 5 req/15min, geo search to 50 req/15min
- **Guest guard** — `testingUser` middleware blocks all write operations for the guest account
- **Role escalation prevention** — `role` cannot be set by the user themselves; only `admin` and `super-admin` can change roles via `PUT /api/v1/user/:id`
- **Ownership checks** — ads, messages, and reviews can only be edited or deleted by their owner
- **Participant checks** — messages and rooms are only accessible to verified participants

---

## License

ISC
