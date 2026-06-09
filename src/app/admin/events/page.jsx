"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { useStore, newId } from "@/lib/store";
import { useToast } from "@/components/Toast";

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
  const { events, addEvent } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const publish = () => {
    if (!form.title.trim() || !form.date) {
      toast("Title and date are required", "error");
      return;
    }
    addEvent({
      id: newId("EV"),
      title: form.title.trim(),
      description: form.description.trim(),
      date: form.date,
      time: form.time || "10:00 AM",
      location: form.location.trim() || "Community Hall",
      type: form.type,
      rsvpCount: 0,
    });
    toast("Event published");
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Events & Meetings"
        subtitle="Schedule community events and track RSVPs"
        actions={<Button icon="plus" onClick={() => setOpen(true)}>New event</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {events.map((e) => (
          <Card key={e.id} className="overflow-hidden">
            <div className="flex">
              <div className="flex w-20 shrink-0 flex-col items-center justify-center border-r border-slate-100 bg-brand-50 py-4 text-brand-700">
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
                  <Badge tone={typeTone[e.type]}>
                    <Icon name={typeIcon[e.type]} size={11} />
                    <span className="capitalize">{e.type}</span>
                  </Badge>
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create event"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={publish}>Publish event</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Field label="Title">
              <input className={inputClass} placeholder="Event title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
          </div>
          <Field label="Date">
            <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </Field>
          <Field label="Time">
            <input type="time" className={inputClass} value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </Field>
          <Field label="Location">
            <input className={inputClass} placeholder="Community Hall" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <Field label="Type">
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
    </div>
  );
}
