"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  Button,
  Badge,
  Segmented,
  Table,
  Th,
  Td,
  Tr,
} from "@/components/ui";
import { Icon } from "@/components/Icon";
import { documents } from "@/lib/mock-data";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const catIcon = {
  Legal: "scale",
  Financial: "indian-rupee",
  "Meeting Minutes": "file-text",
  Layout: "map",
  Other: "file",
};

export default function AdminDocumentsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const cats = ["all", ...Array.from(new Set(documents.map((d) => d.category)))];
  const filtered = documents.filter((d) => filter === "all" || d.category === filter);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Documents"
        subtitle="Legal, financial and association records"
        actions={<Button icon="upload" onClick={() => toast("Document upload is not available in this demo", "info")}>Upload document</Button>}
      />

      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            value={filter}
            onChange={setFilter}
            options={cats.map((c) => ({ value: c, label: c === "all" ? "All" : c }))}
          />
        </div>
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Size</Th>
              <Th>Uploaded by</Th>
              <Th>Date</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <Tr key={d.id}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500">
                      <Icon name={catIcon[d.category] ?? "file"} size={15} />
                    </span>
                    <span className="font-medium text-slate-800">{d.name}</span>
                  </div>
                </Td>
                <Td>
                  <Badge tone="slate">{d.category}</Badge>
                </Td>
                <Td className="text-slate-500">{d.size}</Td>
                <Td className="text-slate-500">{d.uploadedBy}</Td>
                <Td className="text-slate-500">{formatDate(d.date)}</Td>
                <Td>
                  <div className="flex gap-1">
                    <button onClick={() => toast(`Downloading ${d.name}`)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                      <Icon name="download" size={15} />
                    </button>
                    <button onClick={() => toast(`Opening ${d.name}`, "info")} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100">
                      <Icon name="eye" size={15} />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </div>
  );
}
