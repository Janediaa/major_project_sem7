# Healthcare Navigator – Frontend

Production-ready React 18 + Vite single-page application with role-based authentication, interactive appointment booking, medical knowledge assistant, and insurance policy navigation.

## Scripts

```bash
npm install     # Install dependencies
npm run dev     # Start local development server (http://localhost:5173)
npm run build   # Production build to dist/
npm run preview # Preview production build locally
```

## Features

- **Authentication & RBAC:** AuthContext with Patient, Doctor, and Admin roles and 1-click evaluation login cards.
- **Routing:** React Router v6 with `ProtectedRoute` guards and automatic redirection to `/login`.
- **API Services:** Configurable `VITE_API_BASE_URL` with resilient fallbacks for serverless environments.
- **Theme:** Medical UI design system with tokens, responsive sidebar drawer, topbar search, and user profile controls.
