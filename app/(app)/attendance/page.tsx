"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Alert,
  EmptyState,
  ErrorState,
  Spinner,
  TableLoading,
} from "@/components/ui/feedback";
import { Field, Input, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiRequest, apiRequestAll, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  ATTENDANCE_TONES,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import { useSubjectOptions } from "@/lib/lookups";
import { todayISO } from "@/lib/utils";
import type {
  Attendance,
  AttendanceStatus,
  Paginated,
  Student,
} from "@/types/api";

export default function AttendancePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [markerOpen, setMarkerOpen] = useState(false);
  const [editing, setEditing] = useState<Attendance | null>(null);
  const [deleting, setDeleting] = useState<Attendance | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const subjects = useSubjectOptions({ mine: !isAdmin });

  const query = useQuery(
    () =>
      apiRequest<Paginated<Attendance>>("/attendance", {
        params: {
          page,
          per_page: perPage,
          subject_id: subjectId || undefined,
          status: status || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          include_inactive: includeInactive ? true : undefined,
        },
      }),
    [
      page,
      perPage,
      subjectId,
      status,
      dateFrom,
      dateTo,
      includeInactive,
    ],
  );

  function resetFilters() {
    setSubjectId("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setIncludeInactive(false);
    setPage(1);
  }

  const hasFilters =
    Boolean(subjectId || status || dateFrom || dateTo) || includeInactive;

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/attendance/${deleting.id}`, {
        method: "DELETE",
      });
      toast("Attendance record removed", "success");
      setDeleting(null);
      query.refetch();
    } catch (error: unknown) {
      toast(toApiError(error).message, "error");
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Attendance"
        description={
          isAdmin
            ? "Daily attendance for every subject, with upserts so a register can be corrected at any time."
            : "Mark and correct attendance for the subjects you teach."
        }
        actions={
          <Button
            icon={<Icon name="checkCircle" size={16} />}
            onClick={() => setMarkerOpen(true)}
          >
            Mark attendance
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={subjectId}
              onChange={(event) => {
                setSubjectId(event.target.value);
                setPage(1);
              }}
              className="sm:w-56"
              aria-label="Filter by subject"
            >
              <option value="">All subjects</option>
              {subjects.data?.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.code} · {subject.name}
                </option>
              ))}
            </Select>
            <Select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="sm:w-40"
              aria-label="Filter by status"
            >
              <option value="">All statuses</option>
              {ATTENDANCE_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {ATTENDANCE_LABELS[value]}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="text-slate-500">From</span>
              <Input
                type="date"
                value={dateFrom}
                max={dateTo || todayISO()}
                onChange={(event) => {
                  setDateFrom(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-40"
                aria-label="From date"
              />
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <span className="text-slate-500">To</span>
              <Input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                max={todayISO()}
                onChange={(event) => {
                  setDateTo(event.target.value);
                  setPage(1);
                }}
                className="h-9 w-40"
                aria-label="To date"
              />
            </label>
            {hasFilters ? (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Reset
              </Button>
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => {
                setIncludeInactive(event.target.checked);
                setPage(1);
              }}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Include removed records
          </label>
        </div>

        {query.loading && !query.data ? (
          <TableLoading />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            icon="clipboard"
            title="No attendance records"
            description={
              hasFilters
                ? "No records match these filters. Try widening the date range."
                : "Mark attendance to start building the register."
            }
            action={
              <Button
                size="sm"
                icon={<Icon name="checkCircle" size={14} />}
                onClick={() => setMarkerOpen(true)}
              >
                Mark attendance
              </Button>
            }
          />
        ) : (
          <>
            <Table minWidth={880}>
              <THead>
                <TH>Student</TH>
                <TH>Subject</TH>
                <TH>Date</TH>
                <TH>Status</TH>
                <TH>Updated</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {query.data.items.map((record) => (
                  <TR key={record.id}>
                    <TD>
                      <div className="font-medium text-slate-900">
                        {record.student_first_name} {record.student_last_name}
                      </div>
                      <div className="font-mono text-xs text-slate-500">
                        {record.enrollment_no}
                      </div>
                    </TD>
                    <TD>
                      <div className="text-slate-700">{record.subject_name}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {record.subject_code}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {formatDate(record.attendance_date)}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={ATTENDANCE_TONES[record.status]}>
                          {ATTENDANCE_LABELS[record.status]}
                        </Badge>
                        {!record.is_active ? (
                          <Badge tone="slate">Removed</Badge>
                        ) : null}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateTime(record.updated_at)}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(record)}
                          aria-label={`Edit attendance for ${record.student_first_name} ${record.student_last_name}`}
                          title="Correct"
                        >
                          <Icon name="pencil" size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                          onClick={() => setDeleting(record)}
                          aria-label={`Delete attendance for ${record.student_first_name} ${record.student_last_name}`}
                          title="Delete"
                        >
                          <Icon name="trash" size={16} />
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination
              page={page}
              perPage={perPage}
              total={query.data.total}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPerPage(value);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      <AttendanceMarker
        open={markerOpen}
        subjects={subjects.data ?? []}
        onClose={() => setMarkerOpen(false)}
        onSaved={() => {
          setMarkerOpen(false);
          query.refetch();
        }}
      />

      <EditAttendanceModal
        record={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          query.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Delete attendance record?"
        description={
          <>
            The {deleting ? ATTENDANCE_LABELS[deleting.status].toLowerCase() : ""}{" "}
            record for{" "}
            <strong className="font-semibold text-slate-800">
              {deleting?.student_first_name} {deleting?.student_last_name}
            </strong>{" "}
            on{" "}
            {deleting ? formatDate(deleting.attendance_date) : ""} will be
            removed from reports.
          </>
        }
        confirmLabel="Delete record"
      />
    </>
  );
}

function EditAttendanceModal({
  record,
  onClose,
  onSaved,
}: {
  record: Attendance | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<AttendanceStatus>("PRESENT");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!record) return;
    setDate(record.attendance_date);
    setStatus(record.status);
    setActive(record.is_active);
    setError(null);
  }, [record]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!record) return;
    if (!date) return setError("Choose a date.");
    if (date > todayISO()) return setError("Attendance cannot be in the future.");
    setSaving(true);
    setError(null);
    try {
      await apiRequest<Attendance>(`/attendance/${record.id}`, {
        method: "PUT",
        body: { attendance_date: date, status, is_active: active },
      });
      toast("Attendance updated", "success");
      onSaved();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(record)}
      onClose={onClose}
      title="Correct attendance"
      description={
        record
          ? `${record.student_first_name} ${record.student_last_name} · ${record.subject_name}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="attendance-edit-form" loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form
        id="attendance-edit-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Date" htmlFor="attendance-edit-date" required>
          <Input
            id="attendance-edit-date"
            type="date"
            max={todayISO()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="Status" htmlFor="attendance-edit-status" required>
          <Select
            id="attendance-edit-status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as AttendanceStatus)
            }
          >
            {ATTENDANCE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {ATTENDANCE_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Record visibility" htmlFor="attendance-edit-active">
          <Select
            id="attendance-edit-active"
            value={active ? "active" : "inactive"}
            onChange={(event) => setActive(event.target.value === "active")}
          >
            <option value="active">Active</option>
            <option value="inactive">Removed</option>
          </Select>
        </Field>
      </form>
    </Modal>
  );
}

function AttendanceMarker({
  open,
  subjects,
  onClose,
  onSaved,
}: {
  open: boolean;
  subjects: { id: string; name: string; code: string; course_id: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subject = subjects.find((item) => item.id === subjectId);

  useEffect(() => {
    if (!open) return;
    setSubjectId(subjects[0]?.id ?? "");
    setDate(todayISO());
    setStatuses({});
    setError(null);
    // Only reset when the dialog opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const roster = useQuery(
    async () => {
      if (!subject) return { students: [], existing: new Map() };
      const [students, records] = await Promise.all([
        apiRequestAll<Student>("/students", {
          course_id: subject.course_id,
          semester: undefined,
        }),
        apiRequestAll<Attendance>("/attendance", {
          subject_id: subject.id,
          date_from: date,
          date_to: date,
        }),
      ]);
      const existing = new Map<string, AttendanceStatus>();
      for (const record of records) {
        existing.set(record.student_id, record.status);
      }
      return { students, existing };
    },
    [subject?.id, subject?.course_id, date],
    { enabled: open && Boolean(subject) && Boolean(date) },
  );

  useEffect(() => {
    if (!roster.data) return;
    const next: Record<string, AttendanceStatus> = {};
    for (const student of roster.data.students) {
      next[student.id] = roster.data.existing.get(student.id) ?? "PRESENT";
    }
    setStatuses(next);
  }, [roster.data]);

  const students = useMemo(
    () => roster.data?.students ?? [],
    [roster.data],
  );
  const alreadyMarked = roster.data?.existing.size ?? 0;

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    for (const student of students) {
      const value = statuses[student.id] ?? "PRESENT";
      tally[value] += 1;
    }
    return tally;
  }, [students, statuses]);

  function setAll(value: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    for (const student of students) next[student.id] = value;
    setStatuses(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!subject) return setError("Choose a subject.");
    if (!date) return setError("Choose a date.");
    if (date > todayISO()) return setError("Attendance cannot be in the future.");
    if (students.length === 0) {
      return setError("No students are enrolled in this subject's course.");
    }

    setSaving(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        students.map((student) =>
          apiRequest<Attendance>("/attendance", {
            method: "POST",
            body: {
              subject_id: subject.id,
              student_id: student.id,
              attendance_date: date,
              status: statuses[student.id] ?? "PRESENT",
            },
          }),
        ),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        const first = failed[0] as PromiseRejectedResult;
        toast(
          `${students.length - failed.length} of ${students.length} saved`,
          "info",
          toApiError(first.reason).message,
        );
      } else {
        toast(
          `Attendance saved for ${students.length} ${
            students.length === 1 ? "student" : "students"
          }`,
          "success",
        );
      }
      onSaved();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Mark attendance"
      description="Choose a subject and date. Existing entries are pre-filled and saving updates them."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="attendance-mark-form"
            loading={saving}
            disabled={roster.loading || students.length === 0}
          >
            Save register
          </Button>
        </>
      }
    >
      <form id="attendance-mark-form" onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Subject" htmlFor="marker-subject" required>
            <Select
              id="marker-subject"
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
            >
              <option value="">Select a subject</option>
              {subjects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code} · {item.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Date"
            htmlFor="marker-date"
            required
            hint="Today or earlier."
          >
            <Input
              id="marker-date"
              type="date"
              max={todayISO()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </Field>
        </div>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {!subject ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            Select a subject to load its student roster.
          </div>
        ) : roster.loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-12 text-sm text-slate-500">
            <Spinner /> Loading roster…
          </div>
        ) : roster.error ? (
          <ErrorState error={roster.error} onRetry={roster.refetch} />
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No students are enrolled in this course yet.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {alreadyMarked > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                    {alreadyMarked} already marked on this date
                  </span>
                ) : null}
                {ATTENDANCE_STATUSES.map((value) => (
                  <span
                    key={value}
                    className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600"
                  >
                    {ATTENDANCE_LABELS[value]}: {counts[value]}
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAll("PRESENT")}
                >
                  All present
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAll("ABSENT")}
                >
                  All absent
                </Button>
              </div>
            </div>

            <div className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="font-mono text-xs text-slate-500">
                      {student.enrollment_no} · Semester {student.current_semester}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ATTENDANCE_STATUSES.map((value) => {
                      const selected =
                        (statuses[student.id] ?? "PRESENT") === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setStatuses((current) => ({
                              ...current,
                              [student.id]: value,
                            }))
                          }
                          className={
                            selected
                              ? "rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white"
                              : "rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                          }
                          aria-pressed={selected}
                        >
                          {ATTENDANCE_LABELS[value]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
