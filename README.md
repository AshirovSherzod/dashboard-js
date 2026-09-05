# Dashly - Demo Dashboard

Dashly is a responsive frontend admin dashboard for managing a customer directory. It includes a demo login screen and a polished dashboard experience with search, CRUD actions, status changes, theme switching and responsive navigation.

> This is an educational frontend demo. It does not provide real authentication, payments or private data protection.

## Demo features

- Responsive admin layout with sidebar and mobile navigation.
- Customer directory powered by a REST API.
- Search by customer name and configurable row limits.
- Add and edit customers through a reusable modal form.
- Delete customers with an in-app confirmation dialog.
- Toggle Active/Inactive status.
- Loading skeletons, empty states and success/error toast feedback.
- Live summary cards for users, statuses and countries.
- Light/dark appearance mode persisted in `localStorage`.
- Notification and profile popovers for a complete demo feel.

## Demo login

```text
Email:    admin@gmail.com
Password: administhebest3467
```

These credentials are intentionally visible because this is a demo. They must not be used for real authentication.

## Run locally

The project uses JavaScript modules and `fetch`, so serve it through a local HTTP server instead of opening `index.html` directly.

### Python

```bash
git clone https://github.com/AshirovSherzod/dashboard-js.git
cd dashboard-js
python -m http.server 5500
```

Open <http://localhost:5500> in a browser.

### Node.js alternative

```bash
npx serve .
```

## Project structure

```text
dashboard-js/
├── assets/
│   └── images/
│       └── tab-icon.png
├── css/
│   ├── dashboard.css     # Dashboard layout, theme and responsive styles
│   └── style.css         # Login page styles
├── js/
│   ├── api.js             # REST API client
│   ├── dashboard.js       # Dashboard state and UI interactions
│   └── script.js          # Login page interactions
├── pages/
│   └── dashboard.html     # Dashboard page
├── index.html              # Demo login entry point
├── .gitignore
└── README.md
```

## API

The demo uses a MockAPI endpoint defined in `js/api.js`. The API client supports:

- `GET` - load and search users;
- `POST` - create a user;
- `PUT` - update a user;
- `PUT` - update customer details and status. The demo uses `PUT` for status changes because the public MockAPI endpoint does not allow browser `PATCH` requests through CORS;
- `DELETE` - remove a user.

The public endpoint is suitable for learning and demonstrations only. For a real product, replace it with a secured backend and database.

## Optional deployment

The project is static and can be published with GitHub Pages, Netlify or Vercel. The entry point is `index.html`, and no build step is required.

Before sharing a deployed demo:

1. Confirm that the MockAPI endpoint is available.
2. Test the login preview, search, add, edit, status and delete flows.
3. Test the dashboard at desktop and mobile widths.
4. Add the final deployment URL to this README.

## Production roadmap

This repository is intended as a learning project, not as a production system. If it is ever extended into a real product, it would need:

1. Backend authentication and server-side authorization.
2. Database validation, migrations and backups.
3. Secure server-managed sessions or tokens.
4. Rate limiting, CORS policy, audit logs and security headers.
5. Automated tests, linting, CI/CD and error monitoring.
6. Environment-based configuration and HTTPS.

## Current status

The project is intentionally dependency-light and demo-focused. No license has been added yet.
