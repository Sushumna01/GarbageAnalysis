# Backend API

Express and MongoDB API for authentication, image classification, and per-user history.

## Start

```bash
npm install
```

Copy `.env.example` to `.env`, set a private MongoDB connection string and a long random `JWT_SECRET`, then start the API:

```bash
npm run dev
```

The ML service must also be running. Configure its base URL with `ML_API_URL`; it defaults to `http://127.0.0.1:8000`. The API listens on port `5000` by default. `GET /health` reports whether MongoDB is connected.

## Endpoints

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| GET | `/` | None | API status |
| GET | `/health` | None | API and database readiness |
| GET | `/api/categories` | None | Supported categories and segregation guidance |
| POST | `/api/auth/register` | None | Register with `name`, `email`, and a password of at least 8 characters |
| POST | `/api/auth/login` | None | Sign in and receive a 7-day JWT |
| GET | `/api/auth/me` | Bearer JWT | Read the signed-in user's profile |
| POST | `/api/classifications` | Bearer JWT | Classify an uploaded image; use multipart field `image` |
| GET | `/api/classifications?page=1&limit=20` | Bearer JWT | Read the signed-in user's paginated history |
| GET | `/api/classifications/summary` | Bearer JWT | Read total and per-category counts and latest result |
| DELETE | `/api/classifications/:id` | Bearer JWT | Delete one of the signed-in user's results |

Supported image MIME types are JPEG, PNG, WebP, and GIF. Uploads are limited to 10 MB by default. Override with `MAX_IMAGE_SIZE_BYTES`. Set `CLIENT_ORIGIN` to a comma-separated allowlist of frontend origins; if unset, CORS allows all origins.

Authenticated requests must send `Authorization: Bearer <token>`. Classification records contain the predicted category, confidence, original filename, user, timestamp, and matching segregation guidance. Image bytes are sent to the ML service for prediction and are not stored in MongoDB. The API accepts `other` (and maps `general` to `other`) when returned by the ML service. The current bundled model has six classes; add and train an `other` class in the ML model and dataset before expecting it to identify general waste.
