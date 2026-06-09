"use client";

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
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { amenities } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";

export default function AdminAmenitiesPage() {
  const { bookings, setBookingStatus } = useStore();
  const toast = useToast();
  const revenue = bookings
    .filter((b) => b.status === "confirmed")
    .reduce((s, b) => s + b.amount, 0);
  const pending = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Amenities & Bookings"
        subtitle="Manage community facilities and booking requests"
        actions={<Button icon="plus" onClick={() => toast("Add-amenity form is not available in this demo", "info")}>Add amenity</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Amenities" value={`${amenities.length}`} icon="building-2" tone="violet" />
        <StatCard label="Bookings (month)" value={`${bookings.length}`} icon="calendar-check" tone="sky" />
        <StatCard label="Pending approval" value={`${pending}`} icon="clock" tone="amber" />
        <StatCard label="Booking revenue" value={formatINR(revenue)} icon="banknote" tone="brand" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {amenities.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <Icon name={a.icon} size={22} />
              </span>
              <StatusBadge status={a.status} />
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
        <CardHeader title="Booking requests" icon="calendar-check" />
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
            {bookings.map((b) => (
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
                      <Button size="sm" icon="check" onClick={() => { setBookingStatus(b.id, "confirmed"); toast(`${b.amenityName} booking confirmed`); }}>
                        Approve
                      </Button>
                      <Button size="sm" variant="secondary" icon="x" onClick={() => { setBookingStatus(b.id, "rejected"); toast(`${b.amenityName} booking rejected`, "info"); }} />
                    </div>
                  ) : (
                    <Icon name="check" size={16} className="text-slate-300" />
                  )}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
