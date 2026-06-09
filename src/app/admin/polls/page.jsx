"use client";

import { useState } from "react";
import {
  PageHeader,
  Card,
  CardHeader,
  Button,
  Badge,
  Progress,
  Modal,
  Field,
  inputClass,
} from "@/components/ui";
import { useStore, newId } from "@/lib/store";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";

const emptyForm = { question: "", description: "", options: "Yes\nNo\nNeed more details", closesAt: "" };

export default function AdminPollsPage() {
  const { polls, addPoll, closePoll } = useStore();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const launch = () => {
    const opts = form.options
      .split("\n")
      .map((o) => o.trim())
      .filter(Boolean);
    if (!form.question.trim() || opts.length < 2) {
      toast("Add a question and at least 2 options", "error");
      return;
    }
    addPoll({
      id: newId("PL"),
      question: form.question.trim(),
      description: form.description.trim(),
      options: opts.map((label, i) => ({ id: String.fromCharCode(97 + i), label, votes: 0 })),
      status: "active",
      createdAt: "2025-06-09",
      closesAt: form.closesAt || "2025-06-30",
      totalVoters: 0,
    });
    toast("Poll launched");
    setForm(emptyForm);
    setOpen(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Polls & Voting"
        subtitle="Run community decisions transparently"
        actions={<Button icon="plus" onClick={() => setOpen(true)}>Create poll</Button>}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {polls.map((p) => {
          const total = p.options.reduce((s, o) => s + o.votes, 0);
          const leading = Math.max(...p.options.map((o) => o.votes));
          return (
            <Card key={p.id}>
              <CardHeader
                title={p.question}
                subtitle={`${p.totalVoters} voters · closes ${formatDate(p.closesAt)}`}
                icon="vote"
                action={
                  <Badge tone={p.status === "active" ? "green" : "slate"}>
                    {p.status}
                  </Badge>
                }
              />
              <div className="space-y-3 p-5">
                <p className="text-xs leading-relaxed text-slate-500">{p.description}</p>
                {p.options.map((o) => {
                  const pct = total ? Math.round((o.votes / total) * 100) : 0;
                  return (
                    <div key={o.id}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span
                          className={
                            o.votes === leading
                              ? "font-semibold text-slate-800"
                              : "text-slate-600"
                          }
                        >
                          {o.label}
                        </span>
                        <span className="text-slate-500">
                          {pct}% · {o.votes}
                        </span>
                      </div>
                      <Progress value={pct} tone={o.votes === leading ? "brand" : "amber"} />
                    </div>
                  );
                })}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                  <Button size="sm" variant="secondary" icon="bar-chart-3" onClick={() => toast(`${total} votes · "${p.options.reduce((a, b) => (a.votes >= b.votes ? a : b)).label}" leading`, "info")}>
                    Results
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon="square"
                    disabled={p.status === "closed"}
                    onClick={() => { closePoll(p.id); toast("Poll closed"); }}
                  >
                    {p.status === "closed" ? "Closed" : "Close poll"}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create poll"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={launch}>Launch poll</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Question">
            <input className={inputClass} placeholder="What do you want to ask?" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} />
          </Field>
          <Field label="Description">
            <textarea rows={2} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <Field label="Options" hint="One per line">
            <textarea rows={4} className={inputClass} value={form.options} onChange={(e) => setForm({ ...form, options: e.target.value })} />
          </Field>
          <Field label="Closes on">
            <input type="date" className={inputClass} value={form.closesAt} onChange={(e) => setForm({ ...form, closesAt: e.target.value })} />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
