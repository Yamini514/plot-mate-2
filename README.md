# Plotmate — Plot Owners' Association Management

A modern, responsive community-management web app for a residential plot association
(**Green Aero View**, ~280 plots, Tukkuguda, Hyderabad). Built with **Next.js 16
(App Router) + JavaScript (JSX) + Tailwind CSS v4**. This is a **UI-only demo running
on mock data** — no backend or real payments.

It ships with two role-based experiences behind a single demo login:

- **Admin / Secretary** — full operational control of the association.
- **Member / Plot Owner** — self-service portal for dues, bookings and updates.

---

## Getting started

```bash
npm install
npm run dev
```

Open the printed URL (e.g. http://localhost:3000) and sign in.

```bash
npm run build && npm start   # production build
```

## Demo credentials

The login page has **one-click autofill** buttons for both roles.

| Role             | Email                       | Password    |
| ---------------- | --------------------------- | ----------- |
| Admin/Secretary  | `admin@greenaeroview.in`    | `admin123`  |
| Member/Owner     | `member@greenaeroview.in`   | `member123` |

The session is stored in `localStorage`; use the log-out button in the sidebar to switch roles.

---

## Modules

### Admin panel (`/admin`)
Dashboard · Plot Map (280-plot colour-coded grid) · Plot Owners (searchable registry,
detail drawer, import/export) · Treasury (expenses, charts, add-expense) · Reminders
(WhatsApp/SMS/email composer + scheduler) · Reports & Analytics · Complaints · Amenities
& Bookings · Events & Meetings · Polls · Visitor/Gate management · Staff & Vendors ·
Site Photos · Announcements · Documents · Settings.

### Member panel (`/member`)
My Plot · Dues & Pay (pay now, bank/UPI details, declare-payment) · Payment History ·
Treasury (read-only transparency) · Complaints (raise & track) · Amenities (book) ·
Events (RSVP) · Polls (vote) · Site Photos · Announcements · Documents · Contact Directory.

> Beyond the original reference UIs, this build adds **Complaints, Amenity Booking,
> Events, Polls, Visitor management, Staff/Vendors and Reports** as a "super-admin"-grade
> feature set.

---

## Project structure

```
src/
  app/
    login/            # demo login page
    admin/            # admin layout + 16 module pages
    member/           # member layout + 12 module pages
  components/
    AppShell.jsx      # sidebar + topbar + auth guard
    ui.jsx            # Card, Button, Table, Badge, Modal, StatCard, …
    charts.jsx        # Recharts wrappers
    Icon.jsx          # lucide dynamic icon wrapper
    Toast.jsx         # toast notifications (action feedback)
  lib/
    mock-data.js      # all seed data (280 plots generated deterministically)
    store.jsx         # in-session data store (add/update across modules)
    auth.jsx          # demo auth context (localStorage)
    nav.js            # sidebar navigation config
    utils.js          # cn(), formatINR(), formatDate(), …
```

## Tech

Next.js 16 · React 19 · JavaScript (JSX) · Tailwind CSS v4 · Recharts · lucide-react.

## Interactivity

Admin actions are wired to an in-session store (`src/lib/store.jsx`): adding owners,
expenses, announcements, events, polls, visitors and photos updates the tables live,
and approvals / status changes / reminders show toast feedback. State resets on reload
(no backend yet).

## Wiring a real backend later

The mock layer is isolated in `src/lib/mock-data.js`, `src/lib/store.jsx` and
`src/lib/auth.jsx`. To go live, replace those with API/database calls (e.g. Next.js
Server Actions + Prisma + PostgreSQL) and swap the demo auth for a real provider —
the UI components stay unchanged.
