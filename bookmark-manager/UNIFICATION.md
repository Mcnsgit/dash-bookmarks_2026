# Architecture Unification

This document explains the removal of legacy systems and the reasoning behind the new architectural choices.

## Legacy Code Removal
As part of an intentional cleanup, the previous **FastAPI backend** and **Create React App (CRA) frontend** have been completely removed. 

- **Why remove FastAPI?** Consolidating on a Node.js ecosystem (Express.js backend, Vite/React frontend) allows for a unified JavaScript/TypeScript stack. This reduces context switching, simplifies the deployment pipeline, and allows the sharing of tools and linting configurations.
- **Why remove CRA?** Create React App is no longer actively maintained. We have migrated to a modern Vite setup, which offers significantly faster builds, native ESM support, and better developer experience.

## App Factory Pattern
The backend has been refactored to use the **App Factory pattern** (e.g., separating the app definition in `app.js` from the server initialization in `server.js`). 
This provides a solid architectural improvement, specifically for testing:
- It allows E2E and integration tests (using Supertest) to safely inject test-specific databases and configurations without starting the HTTP server on a real port.
- It provides cleaner encapsulation of route bindings and middleware.

## Dev Dependency Pinning
You may notice that development dependencies like `jest` and `supertest` in `backend/package.json` are using caret (`^`) ranges (e.g., `^29.7.0` and `^7.0.0`). 
This is intentional to allow minor and patch updates while preventing breaking major updates, ensuring compatibility with the current test suite.
