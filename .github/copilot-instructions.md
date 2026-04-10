# Copilot Instructions for Reach Ripple Platform

This guide provides architectural, workflow, and code convention instructions for AI agents working in the Reach Ripple codebase. Follow these rules to maximize productivity and maintain code quality.

---

## 1. Architecture Overview
- **Stack:** MERN (MongoDB, Express/TypeScript, React, Node.js)
- **Backend:** TypeScript, Express, Mongoose, JWT, Socket.IO, Redis, Docker Compose
- **Frontend:** React 18, Tailwind CSS, React Router v6, Axios, Playwright for E2E
- **Project Structure:**
  - `backend/`: API, models, controllers, middleware, services, scripts, tests
  - `frontend/`: React app, components, pages, context, API modules, E2E tests

---

## 2. Coding Conventions
- **Backend:**
  - Use TypeScript for all code.
  - Organize logic by feature: `controllers/`, `models/`, `routes/`, `services/`, `middleware/`, `validators/`.
  - Use Zod for validation schemas.
  - Prefer async/await for all database and network operations.
  - Use Mongoose for MongoDB models.
  - JWT for authentication (access + refresh tokens).
  - Use `src/` for admin-specific routes/controllers.
  - Write tests in `tests/` using Jest + Supertest.
- **Frontend:**
  - Use React functional components.
  - Use Tailwind CSS for styling.
  - Organize by feature: `components/`, `pages/`, `api/`, `context/`.
  - Use Axios for API calls.
  - Use Playwright for E2E tests.
  - Use context for auth, toast, and socket state.

---

## 3. Workflow Rules
- **Branching:**
  - Use feature branches for new features/bugfixes.
  - Merge via PR, require review for production changes.
- **Scripts:**
  - Use scripts in `backend/scripts/` for admin/user management and seeding.
  - Use `npm run dev` for backend, `npm start` for frontend.
- **Testing:**
  - All backend features must have Jest tests.
  - All frontend features must have Playwright E2E tests if UI is affected.
- **Docker:**
  - Use `docker-compose.yml` for local and production setup.
  - Services: backend, frontend, mongo, redis.

---

## 4. AI Agent Guidance
- **File Edits:**
  - Always use the correct patch/edit tool for file changes.
  - Never output code blocks or terminal commands unless explicitly requested.
- **Context Gathering:**
  - Use semantic and grep search to locate relevant files/functions.
  - Prefer reading larger file sections for context.
- **Code Generation:**
  - Follow existing patterns and conventions.
  - Reference README.md and docs for architectural decisions.
  - For new features, update tests and documentation as needed.
- **Error Handling:**
  - After edits, check for errors and fix if possible.
  - Validate changes with tests if relevant.

---

## 5. Common Patterns
- **Location Search:**
  - Backend: `/api/location/location-suggest` uses postcodes.io and Nominatim for UK area suggestions.
  - Format labels as `OUTCODE - Ward/District`.
- **Z-index Layering:**
  - Hero section: `z-40`, search bar: `z-[45]`, navbar: `z-50`.
- **Authentication:**
  - JWT, bcrypt, email verification, password reset.
- **Admin Panel:**
  - Separate routes/controllers in `src/`.

---

## 6. Documentation
- Reference `README.md` for quick start, scripts, and structure.
- See `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/API_REFERENCE.md` for detailed guidance.

---

## 7. License
- All rights reserved. Do not copy proprietary code outside this project.

---

## 8. Iteration
- If instructions are unclear or incomplete, request user feedback for improvement.

---

_End of instructions._
