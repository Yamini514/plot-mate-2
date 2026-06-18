"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  StatCard,
  Table,
  Th,
  Td,
  Tr,
  Segmented,
  EmptyState,
  Modal,
  Field,
  inputClass,
  ConfirmDialog,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api, normalizeList } from "@/lib/api";
import { useApi } from "@/lib/useApi";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";

const ICON_OPTIONS = [
  "building-2", "dumbbell", "waves", "trees", "party-popper",
  "car", "volleyball", "baby", "book-open", "tent",
];
const emptyForm = {
  name: "", description: "", capacity: "", hourlyRate: "",
  icon: "building-2", status: "available",
};

export default function AdminAmenitiesPage() {
  const { data: rawAmenities, reload: reloadAmenities } = useApi("/admin/amenities");
  const amenities = normalizeList(rawAmenities);
  const { data: rawBookings, reload } = useApi("/admin/bookings", { page_size: 300 });
  const bookings = normalizeList(rawBookings);
  const toast = useToast();
  const revenue = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((s, b) => s + (b.amount || 0), 0);
  const pending = bookings.filter((b) => b.status === "pending").length;
  const [busyId, setBusyId] = useState(null);

  // Booking requests split into what's still scheduled vs. already past.
  const [bookingTab, setBookingTab] = useState("upcoming");
  const todayKey = new Date().toISOString().slice(0, 10);
  const isUpcomingBooking = (b) => (b.date ? String(b.date).slice(0, 10) >= todayKey : true);
  const upcomingBookings = bookings.filter(isUpcomingBooking);
  const pastBookings = bookings
    .filter((b) => !isUpcomingBooking(b))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const shownBookings = bookingTab === "upcoming" ? upcomingBookings : pastBookings;

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };
  const openEdit = (a) => {
    setEditing(a);
    setForm({
      name: a.name ?? "",
      description: a.description ?? "",
      capacity: a.capacity ?? "",
      hourlyRate: a.hourlyRate ?? "",
      icon: a.icon ?? "building-2",
      status: a.status ?? "available",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast("Amenity name is required", "error");
      return;
    }
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      capacity: form.capacity.toString().trim() || null,
      hourlyRate: Number(form.hourlyRate) || 0,
      icon: form.icon,
      status: form.status,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/amenities/${editing.dbId}`, payload);
        toast(`${payload.name} updated`);
      } else {
        await api.post("/admin/amenities", payload);
        toast(`${payload.name} added`);
      }
      setForm(emptyForm);
      setEditing(null);
      setOpen(false);
      reloadAmenities();
    } catch (e) {
      toast(e.message || "Could not save amenity", "error");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.del(`/admin/amenities/${confirmDelete.dbId}`);
      toast(`${confirmDelete.name} removed`);
      setConfirmDelete(null);
      reloadAmenities();
    } catch (e) {
      toast(e.message || "Could not delete amenity", "error");
    } finally {
      setDeleting(false);
    }
  };

  const setBookingStatus = async (b, status) => {
    setBusyId(b.id);
    try {
      await api.post(`/admin/bookings/${b.dbId}/status`, { status });
      toast(`${b.amenityName} booking ${status}`, status === "confirmed" ? "success" : "info");
      reload();
    } catch (e) {
      toast(e.message || "Could not update booking", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Amenities & Bookings"
        subtitle="Manage community facilities and booking requests"
        actions={<Button icon="plus" onClick={openCreate}>Add amenity</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Amenities" value={`${amenities.length}`} icon="building-2" tone="violet" />
        <StatCard label="Bookings (month)" value={`${bookings.length}`} icon="calendar-check" tone="sky" />
        <StatCard label="Pending approval" value={`${pending}`} icon="clock" tone="amber" />
        <StatCard label="Booking revenue" value={formatINR(revenue)} icon="banknote" tone="brand" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {amenities.map((a) => (
          <Card key={a.id} className="group p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={a.icon} size={22} />
              </span>
              <div className="flex items-center gap-1">
                <StatusBadge status={a.status} />
                <button
                  onClick={() => openEdit(a)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100"
                  title="Edit"
                >
                  <Icon name="pencil" size={15} />
                </button>
                <button
                  onClick={() => setConfirmDelete(a)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  title="Delete"
                >
                  <Icon name="trash-2" size={15} />
                </button>
              </div>
            </div>
            <p className="mt-3 font-semibold text-slate-800">{a.name}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">{a.description}</p>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">
                <Icon name="users" size={13} className="mr-1 inline" />
                {a.capacity}
              </span>
              <span className="font-semibold text-slate-800">
                {a.hourlyRate === 0 ? "Free" : `${formatINR(a.hourlyRate)}/hr`}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Booking requests"
          icon="calendar-check"
          action={
            <Segmented
              value={bookingTab}
              onChange={setBookingTab}
              options={[
                { value: "upcoming", label: "Upcoming", count: upcomingBookings.length },
                { value: "past", label: "Past", count: pastBookings.length },
              ]}
            />
          }
        />
        {shownBookings.length === 0 ? (
          <EmptyState
            icon="calendar-check"
            title={bookingTab === "upcoming" ? "No upcoming bookings" : "No past bookings"}
            subtitle={bookingTab === "upcoming" ? "New booking requests will appear here." : "Completed bookings are archived here."}
          />
        ) : (
        <Table>
          <thead>
            <tr>
              <Th>Amenity</Th>
              <Th>Booked by</Th>
              <Th>Date</Th>
              <Th>Slot</Th>
              <Th className="text-right">Amount</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {shownBookings.map((b) => (
              <Tr key={b.id}>
                <Td className="font-medium text-slate-800">{b.amenityName}</Td>
                <Td>
                  {b.bookedBy} · {b.plotNo}
                </Td>
                <Td className="text-slate-500">{formatDate(b.date)}</Td>
                <Td className="text-slate-500">{b.slot}</Td>
                <Td className="text-right font-medium">{formatINR(b.amount)}</Td>
                <Td>
                  <StatusBadge status={b.status} />
                </Td>
                <Td>
                  {b.status === "pending" ? (
                    <div className="flex gap-1">
                      <Button size="sm" icon="check" loading={busyId === b.id} onClick={() => setBookingStatus(b, "confirmed")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" icon="x" loading={busyId === b.id} onClick={() => setBookingStatus(b, "cancelled")} />
                    </div>
                  ) : (
                    <Icon name="check" size={16} className="text-slate-300" />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        )}
      </Card>

      {/* Create / edit amenity */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Edit · ${editing.name}` : "Add amenity"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button>
            <Button icon="check" loading={saving} onClick={save}>{editing ? "Save changes" : "Add amenity"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name">
              <input className={inputClass} placeholder="e.g. Clubhouse" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description">
              <textarea rows={2} className={inputClass} placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
          </div>
          <Field label="Capacity">
            <input className={inputClass} placeholder="e.g. 50 people" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
          </Field>
          <Field label="Hourly rate (₹)" hint="0 for free">
            <input type="number" min="0" className={inputClass} placeholder="0" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
          </Field>
          <Field label="Icon">
            <select className={inputClass} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })}>
              {ICON_OPTIONS.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="available">Available</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </Field>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={remove}
        loading={deleting}
        title="Delete amenity"
        message={`Remove "${confirmDelete?.name}"? Existing bookings are kept but the facility will no longer be listed.`}
      />
    </div>
  );
}
