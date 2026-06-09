"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  StatusBadge,
  StatCard,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
  Avatar,
} from "@/components/ui";
import { staff } from "@/lib/mock-data";
import { useToast } from "@/components/Toast";
import { formatINR, formatDate } from "@/lib/utils";

export default function StaffPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const filtered = staff.filter((s) => filter === "all" || s.type === filter);
  const payroll = staff.reduce((s, x) => s + x.monthlySalary, 0);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Staff & Vendors"
        subtitle="Manage employees, agencies and monthly payroll"
        actions={<Button icon="user-plus" onClick={() => toast("Add staff/vendor form is not available in this demo", "info")}>Add</Button>}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total staff" value={`${staff.filter((s) => s.type === "staff").length}`} icon="users" tone="brand" />
        <StatCard label="Vendors" value={`${staff.filter((s) => s.type === "vendor").length}`} icon="truck" tone="violet" />
        <StatCard label="Monthly payroll" value={formatINR(payroll)} icon="banknote" tone="amber" />
        <StatCard label="On leave" value={`${staff.filter((s) => s.status === "on_leave").length}`} icon="plane" tone="sky" />
      </div>

      <Card className="mt-6">
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: staff.length },
              { value: "staff", label: "Staff", count: staff.filter((s) => s.type === "staff").length },
              { value: "vendor", label: "Vendors", count: staff.filter((s) => s.type === "vendor").length },
            ]}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Role</Th>
              <Th>Phone</Th>
              <Th>Joined</Th>
              <Th className="text-right">Monthly</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <Tr key={s.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <Avatar name={s.name} size={32} />
                    <span className="font-medium text-slate-800">{s.name}</span>
                  </div>
                </Td>
                <Td className="text-slate-600">
                  {s.role}
                  {s.type === "vendor" && (
                    <Badge tone="violet" className="ml-2">
                      Vendor
                    </Badge>
                  )}
                </Td>
                <Td className="text-slate-500">{s.phone}</Td>
                <Td className="text-slate-500">{formatDate(s.joinedOn)}</Td>
                <Td className="text-right font-medium">{formatINR(s.monthlySalary)}</Td>
                <Td>
                  <StatusBadge status={s.status} />
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
