"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const STATUSES = [
  "UNDER_REVIEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "NEEDS_INFORMATION",
  "RESOLVED",
  "CLOSED",
  "REJECTED",
];

export function ComplaintActions({
  id,
  currentStatus,
  departments,
  employees,
  currentDepartmentId,
  currentEmployeeId,
}: {
  id: string;
  currentStatus: string;
  departments: { id: string; name: string }[];
  employees: { id: string; full_name: string }[];
  currentDepartmentId?: string | null;
  currentEmployeeId?: string | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [dept, setDept] = useState(currentDepartmentId ?? "");
  const [emp, setEmp] = useState(currentEmployeeId ?? "");
  const [internalNote, setInternalNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const updateStatus = async () => {
    setBusy("status");
    try {
      await fetch(`/api/employee/complaints/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note || undefined }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const assign = async () => {
    setBusy("assign");
    try {
      await fetch(`/api/employee/complaints/${id}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: dept || undefined,
          employeeId: emp || null,
        }),
      });
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  const addNote = async () => {
    if (!internalNote.trim()) return;
    setBusy("note");
    try {
      await fetch(`/api/employee/complaints/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: internalNote }),
      });
      setInternalNote("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Change status
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Optional note"
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        />
        <button className="btn-primary mt-2 w-full" disabled={busy === "status"} onClick={updateStatus}>
          {busy === "status" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update Status
        </button>
      </div>

      <div className="glass-card p-5">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Assign
        </div>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <select
          value={emp}
          onChange={(e) => setEmp(e.target.value)}
          className="mt-2 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        >
          <option value="">Unassigned</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.full_name}
            </option>
          ))}
        </select>
        <button className="btn-primary mt-2 w-full" disabled={busy === "assign"} onClick={assign}>
          {busy === "assign" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Assignment
        </button>
      </div>

      <div className="glass-card p-5">
        <div className="text-xs uppercase tracking-wider text-white/40">
          Internal note
        </div>
        <textarea
          value={internalNote}
          onChange={(e) => setInternalNote(e.target.value)}
          rows={3}
          placeholder="Visible only to staff"
          className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400/30"
        />
        <button className="btn-ghost mt-2 w-full" disabled={busy === "note"} onClick={addNote}>
          {busy === "note" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Add Note
        </button>
      </div>
    </div>
  );
}
