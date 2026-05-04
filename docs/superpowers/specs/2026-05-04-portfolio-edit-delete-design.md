# Portfolio Edit & Delete Design

**Goal:** Allow users to edit portfolio name/description and delete a portfolio from the Portfolios list page.

**Architecture:** Add Edit and Delete actions to each row in the portfolios table. Edit opens a dialog pre-filled with current data. Delete uses `window.confirm`. Both call existing backend endpoints.

**Tech Stack:** Next.js App Router, React, Fire UI components, existing `portfolioApi`

---

## UI

- Portfolios table gets a new rightmost column (no header label)
- Each row shows two ghost buttons: **Edit** and **Delete**
- Clicking the row still navigates to portfolio detail (click target is the row cells, not the action buttons)

## Edit

- Reuse `CreatePortfolioDialog` structure as a new `EditPortfolioDialog` component (`src/components/fire/edit-portfolio-dialog.tsx`)
- Fields: Name (required), Description (optional)
- Currency field is read-only / not shown (locked after creation)
- On submit: `PUT /api/portfolios/:id` via `portfolioApi.update(id, { name, description })`
- On success: update the portfolio in local state, close dialog

## Delete

- `window.confirm('Delete "{name}"? This cannot be undone.')` 
- On confirm: `DELETE /api/portfolios/:id` via `portfolioApi.delete(id)`
- On success: remove portfolio from local state
- Delete button shows red color on hover

## API

Backend `PUT` and `DELETE` endpoints already exist. Frontend `portfolioApi` needs `update` and `delete` methods added if missing.
