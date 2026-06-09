"use client";

import { createContext, useContext, useState } from "react";
import * as seed from "./mock-data";

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [owners, setOwners] = useState(seed.owners);
  const [expenses, setExpenses] = useState(seed.expenses);
  const [announcements, setAnnouncements] = useState(seed.announcements);
  const [complaints, setComplaints] = useState(seed.complaints);
  const [bookings, setBookings] = useState(seed.bookings);
  const [events, setEvents] = useState(seed.events);
  const [polls, setPolls] = useState(seed.polls);
  const [visitors, setVisitors] = useState(seed.visitors);
  const [photos, setPhotos] = useState(seed.sitePhotos);
  const [documents, setDocuments] = useState(seed.documents);
  const [staff, setStaff] = useState(seed.staff);

  const value = {
    owners,
    addOwner: (o) => setOwners((prev) => [o, ...prev]),

    expenses,
    addExpense: (e) => setExpenses((prev) => [e, ...prev]),

    announcements,
    addAnnouncement: (a) => setAnnouncements((prev) => [a, ...prev]),
    deleteAnnouncement: (id) =>
      setAnnouncements((prev) => prev.filter((a) => a.id !== id)),

    complaints,
    updateComplaint: (id, patch) =>
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      ),

    bookings,
    setBookingStatus: (id, status) =>
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b)),
      ),

    events,
    addEvent: (e) => setEvents((prev) => [e, ...prev]),

    polls,
    addPoll: (p) => setPolls((prev) => [p, ...prev]),
    closePoll: (id) =>
      setPolls((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "closed" } : p)),
      ),

    visitors,
    addVisitor: (v) => setVisitors((prev) => [v, ...prev]),
    checkOutVisitor: (id) =>
      setVisitors((prev) =>
        prev.map((v) =>
          v.id === id
            ? { ...v, status: "left", checkOut: new Date().toISOString() }
            : v,
        ),
      ),

    photos,
    addPhoto: (p) => setPhotos((prev) => [p, ...prev]),

    documents,
    addDocument: (d) => setDocuments((prev) => [d, ...prev]),

    staff,
    addStaff: (s) => setStaff((prev) => [s, ...prev]),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** Generate a short unique id for new records (safe in event handlers). */
export function newId(prefix) {
  return `${prefix}-${Date.now().toString().slice(-6)}`;
}
