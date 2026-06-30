"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Segmented,
  EmptyState,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList, fieldErrors } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";
import { presence, future, collect, hasErrors } from "@/lib/validate";

const typeTone = {
  meeting: "sky",
  social: "violet",
  maintenance: "amber",
  festival: "brand",
};
const typeIcon = {
  meeting: "users",
  social: "party-popper",
  maintenance: "wrench",
  festival: "sparkles",
};

const emptyForm = {
  title: "", date: "", time: "", location: "",
  type: "meeting", description: "",
};

export default function AdminEventsPage() {
  const { data: raw, reload } = useApi("/admin/events");
  const events = normalizeList(raw);
  const toast = useToast();
  // Split into what's still ahead vs. what's already happened. Events without a
  // date are treated as upcoming (unscheduled drafts).
  const [tab, setTab] = useState("upcoming");
  const todayKey = new Date().toISOString().slice(0, 10);
  const isUpcoming = (e) => (e.date ? String(e.date).slice(0, 10) >= todayKey : true);
  const upcoming = events.filter(isUpcoming);
  const past = events.filter((e) => !isUpcoming(e)).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const shown = tab === "upcoming" ? upcoming : past;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState({});

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setErrors({});
    setOpen(true);
  };
  const openEdit = (e) => {
    setEditing(e);
    setErrors({});
    setForm({
      title: e.title ?? "",
      // <input type="date"> needs YYYY-MM-DD
      date: e.date ? String(e.date).slice(0, 10) : "",
      time: e.time ?? "",
      location: e.location ?? "",
      type: e.type ?? "meeting",
      description: e.description ?? "",
    });
    setOpen(true);
  };

  const publish = async () => {
    const errs = collect({
      title: presence(form.title, "Title"),
      date: presence(form.date, "Date") || future(form.date, { label: "Date" }),
      type: presence(form.type, "Type"),
    });
    setErrors(errs);
    if (hasErrors(errs)) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        time: form.time || "10:00 AM",
        location: form.location.trim() || "Community Hall",
        type: form.type,
      };
      if (editing) {
        await api.put(`/admin/events/${editing.dbId}`, payload);
        toast("Event updated");
      } else {
        await api.post("/admin/events", payload);
        toast("Event published");
      }
      setForm(emptyForm);
      setEditing(null);
      setOpen(false);
      reload();
    } catch (e) {
      const fe = fieldErrors(e);
      if (hasErrors(fe)) setErrors(fe);
      else toast(e.message || "Could not save event", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/events/${confirmDelete.dbId}`);
      toast("Event deleted");
      setConfirmDelete(null);
      reload();
    } catch (e) {
      toast(e.message || "Could not delete event", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Events & Meetings"
        subtitle="Schedule community events and track RSVPs"
        actions={<Button icon="plus" onClick={openCreate}>New event</Button>}
      />

      <div className="mb-4">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "upcoming", label: "Upcoming", count: upcoming.length },
            { value: "past", label: "Past", count: past.length },
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon="calendar-days"
            title={tab === "upcoming" ? "No upcoming events" : "No past events"}
            subtitle={tab === "upcoming" ? "Schedule a community event to see it here." : "Events move here once their date has passed."}
          />
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {shown.map((e) => (
          <Card key={e.id} className={cn("overflow-hidden", tab === "past" && "opacity-80")}>
            <div className="flex">
              <div className={cn("flex w-20 shrink-0 flex-col items-center justify-center border-r border-slate-100 py-4", tab === "past" ? "bg-slate-50 text-slate-500" : "bg-brand-50 text-brand-700")}>
                <span className="text-2xl font-bold">
                  {new Date(e.date).getDate()}
                </span>
                <span className="text-xs uppercase">
                  {new Date(e.date).toLocaleDateString("en-IN", { month: "short" })}
                </span>
              </div>
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800">{e.title}</p>
                  <div className="flex items-center gap-1">
                    <Badge tone={typeTone[e.type]}>
                      <Icon name={typeIcon[e.type]} size={11} />
                      <span className="capitalize">{e.type}</span>
                    </Badge>
                    <button
                      onClick={() => openEdit(e)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                      title="Edit"
                    >
                      <Icon name="pencil" size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(e)}
                      className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Delete"
                    >
                      <Icon name="trash-2" size={14} />
                    </button>
                  </div>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  {e.description}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Icon name="clock" size={13} /> {e.time}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Icon name="map-pin" size={13} /> {e.location}
                  </span>
                  <span className="inline-flex items-center gap-1 text-brand-600">
                    <Icon name="user-check" size={13} /> {e.rsvpCount} attending
                  </span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit event" : "Create event"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={publish} loading={saving}>{editing ? "Save changes" : "Publish event"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Title" error={errors.title}>
              <input className={inputClass} placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Date" error={errors.date}>
            <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
          <Field label="Location">
            <input className={inputClass} placeholder="Community Hall" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Type" error={errors.type}>
            <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="meeting">meeting</option>
              <option value="social">social</option>
              <option value="maintenance">maintenance</option>
              <option value="festival">festival</option>
            </select>
          </Field>
          <div className="col-span-2">
            <Field label="Description">
              <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete event"
        message={`Delete "${confirmDelete?.title}"? RSVPs for this event will also be removed.`}
      />
    </div>
  );
}
