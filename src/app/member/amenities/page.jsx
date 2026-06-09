"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  StatusBadge,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { amenities, bookings, getMemberOwner } from "@/lib/mock-data";
import { formatINR, formatDate } from "@/lib/utils";

export default function MemberAmenitiesPage() {
  const me = getMemberOwner();
  const [booking, setBooking] = useState(null);
  const myBookings = bookings.filter((b) => b.plotNo === me.plotNo);
  const list = myBookings.length ? myBookings : bookings.slice(0, 2);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Amenities"
        subtitle="Book community facilities for your events"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {amenities.map((a) => (
          <Card key={a.id} className="flex flex-col p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={a.icon} size={24} />
              </span>
              <StatusBadge status={a.status} />
            </div>
            <p className="mt-3 font-semibold text-slate-800">{a.name}</p>
            <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-500">
              {a.description}
            </p>
            <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm">
              <span className="text-slate-500">
                <Icon name="users" size={13} className="mr-1 inline" />
                {a.capacity}
              </span>
              <span className="font-semibold text-slate-800">
                {a.hourlyRate === 0 ? "Free" : `${formatINR(a.hourlyRate)}/hr`}
              </span>
            </div>
            <Button
              className="mt-3 w-full"
              size="sm"
              disabled={a.status !== "available"}
              icon="calendar-plus"
              onClick={() => setBooking(a)}
            >
              {a.status === "available" ? "Book now" : "Unavailable"}
            </Button>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader title="My bookings" icon="calendar-check" />
        <div className="divide-y divide-slate-100">
          {list.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand-50 text-brand-600">
                <Icon name="calendar-check" size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">{b.amenityName}</p>
                <p className="text-xs text-slate-400">
                  {formatDate(b.date)} · {b.slot}
                </p>
              </div>
              <span className="font-medium text-slate-700">{formatINR(b.amount)}</span>
              <StatusBadge status={b.status} />
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={!!booking}
        onClose={() => setBooking(null)}
        title={`Book ${booking?.name ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBooking(null)}>Cancel</Button>
            <Button icon="check" onClick={() => setBooking(null)}>Request booking</Button>
          </>
        }
      >
        {booking && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
              <span className="text-sm text-slate-500">Rate</span>
              <span className="font-semibold text-slate-800">
                {booking.hourlyRate === 0 ? "Free" : `${formatINR(booking.hourlyRate)}/hr`}
              </span>
            </div>
            <Field label="Date">
              <input type="date" className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="From">
                <input type="time" className={inputClass} />
              </Field>
              <Field label="To">
                <input type="time" className={inputClass} />
              </Field>
            </div>
            <Field label="Purpose">
              <input className={inputClass} placeholder="e.g. Birthday function" />
            </Field>
            <p className="text-xs text-slate-400">
              Bookings are confirmed after admin approval.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
