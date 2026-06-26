"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, Button, inputClass } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { api } from "@/lib/api";
import { useToast } from "@/components/Toast";

// Family members, emergency contacts and nominees — editable owner contacts
// stored on the user profile (migration 0063). Saved via PUT /me/profile.
const LISTS = [
  { key: "familyMembers", title: "Family members", icon: "users", share: false },
  { key: "emergencyContacts", title: "Emergency contacts", icon: "phone-call", share: false },
  { key: "nominees", title: "Nominees", icon: "user-check", share: true },
];

const blankRow = (share) => (share ? { name: "", relation: "", phone: "", share: "" } : { name: "", relation: "", phone: "" });

export function ContactListsCard({ me, onSaved }) {
  const toast = useToast();
  const [data, setData] = useState({ familyMembers: [], emergencyContacts: [], nominees: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from /me/info
    setData({
      familyMembers: Array.isArray(me?.familyMembers) ? me.familyMembers : [],
      emergencyContacts: Array.isArray(me?.emergencyContacts) ? me.emergencyContacts : [],
      nominees: Array.isArray(me?.nominees) ? me.nominees : [],
    });
  }, [me]);

  const addRow = (key, share) => setData((d) => ({ ...d, [key]: [...d[key], blankRow(share)] }));
  const setRow = (key, i, field, val) => setData((d) => ({ ...d, [key]: d[key].map((r, j) => (j === i ? { ...r, [field]: val } : r)) }));
  const delRow = (key, i) => setData((d) => ({ ...d, [key]: d[key].filter((_, j) => j !== i) }));

  const save = async () => {
    // Drop fully-empty rows before saving.
    const clean = Object.fromEntries(LISTS.map((l) => [l.key, data[l.key].filter((r) => (r.name || "").trim())]));
    setSaving(true);
    try {
      await api.put("/me/profile", clean);
      toast("Contacts saved");
      onSaved?.();
    } catch (e) {
      toast(e.message || "Could not save contacts", "error");
    } finally { setSaving(false); }
  };

  return (
    <Card>
      <CardHeader title="Family & contacts" subtitle="Family members, emergency contacts and nominees" icon="users" />
      <div className="space-y-6 p-5">
        {LISTS.map((l) => (
          <div key={l.key}>
            <div className="mb-2 flex items-center justify-between">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Icon name={l.icon} size={15} className="text-slate-400" /> {l.title}
              </h4>
              <Button size="sm" variant="ghost" icon="plus" onClick={() => addRow(l.key, l.share)}>Add</Button>
            </div>
            {data[l.key].length === 0 ? (
              <p className="text-xs text-slate-400">None added.</p>
            ) : (
              <div className="space-y-2">
                {data[l.key].map((row, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <input className={`${inputClass} flex-1`} placeholder="Name" value={row.name || ""} onChange={(e) => setRow(l.key, i, "name", e.target.value)} />
                    <input className={`${inputClass} w-28`} placeholder="Relation" value={row.relation || ""} onChange={(e) => setRow(l.key, i, "relation", e.target.value)} />
                    <input className={`${inputClass} w-32`} placeholder="Phone" maxLength={10} value={row.phone || ""} onChange={(e) => setRow(l.key, i, "phone", e.target.value.replace(/\D/g, ""))} />
                    {l.share && <input className={`${inputClass} w-20`} placeholder="Share" value={row.share || ""} onChange={(e) => setRow(l.key, i, "share", e.target.value)} />}
                    <button onClick={() => delRow(l.key, i)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Icon name="trash-2" size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="flex justify-end">
          <Button icon="save" loading={saving} onClick={save}>Save contacts</Button>
        </div>
      </div>
    </Card>
  );
}
