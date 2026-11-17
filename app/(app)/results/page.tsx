"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/chart";
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
import {
  DEFAULT_PAGE_SIZE,
  EXAM_TYPE_LABELS,
  EXAM_TYPE_TONES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import {
  useExamOptions,
  useSubjectOptions,
} from "@/lib/lookups";
import type { Exam, Paginated, Result, Student } from "@/types/api";

function percentOf(marks: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((marks / max) * 100);
}

export default function ResultsPage() {
  const { toast } = useToast();

  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [markerOpen, setMarkerOpen] = useState(false);
  const [editing, setEditing] = useState<Result | null>(null);
  const [deleting, setDeleting] = useState<Result | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const exams = useExamOptions();
  const subjects = useSubjectOptions();

  const query = useQuery(
    () =>
      apiRequest<Paginated<Result>>("/results", {
        params: {
          page,
          per_page: perPage,
          exam_id: examId || undefined,
          subject_id: subjectId || undefined,
          include_inactive: includeInactive ? true : undefined,
        },
      }),
    [page, perPage, examId, subjectId, includeInactive],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/results/${deleting.id}`, { method: "DELETE" });
      toast("Result removed", "success");
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
        title="Results"
        description="Marks recorded against exams. Re-recording the same exam and student updates the existing result."
        actions={
          <Button
            icon={<Icon name="award" size={16} />}
            onClick={() => setMarkerOpen(true)}
          >
            Record results
          </Button>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Select
              value={examId}
              onChange={(event) => {
                setExamId(event.target.value);
                setPage(1);
              }}
              className="sm:w-64"
              aria-label="Filter by exam"
            >
              <option value="">All exams</option>
              {exams.data?.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.name} · {exam.subject_code}
                </option>
              ))}
            </Select>
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
            Include removed results
          </label>
        </div>

        {query.loading && !query.data ? (
          <TableLoading />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            icon="award"
            title="No results recorded"
            description="Record marks for an exam to build the result sheet."
            action={
              <Button
                size="sm"
                icon={<Icon name="award" size={14} />}
                onClick={() => setMarkerOpen(true)}
              >
                Record results
              </Button>
            }
          />
        ) : (
          <>
            <Table minWidth={960}>
              <THead>
                <TH>Student</TH>
                <TH>Exam</TH>
                <TH>Subject</TH>
                <TH>Marks</TH>
                <TH>Grade</TH>
                <TH>Recorded</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {query.data.items.map((result) => {
                  const pct = percentOf(result.marks_obtained, result.max_marks);
                  return (
                    <TR key={result.id}>
                      <TD>
                        <div className="font-medium text-slate-900">
                          {result.student_first_name}{" "}
                          {result.student_last_name}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {result.enrollment_no}
                        </div>
                      </TD>
                      <TD>
                        <div className="text-slate-700">{result.exam_name}</div>
                        <Badge tone={EXAM_TYPE_TONES[result.exam_type]}>
                          {EXAM_TYPE_LABELS[result.exam_type]}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="text-slate-700">
                          {result.subject_name}
                        </div>
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <span className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-900">
                            {result.marks_obtained}
                            <span className="text-slate-400">
                              /{result.max_marks}
                            </span>
                          </span>
                          <ProgressBar
                            value={pct}
                            tone={
                              pct >= 75
                                ? "emerald"
                                : pct >= 40
                                  ? "amber"
                                  : "rose"
                            }
                            size="sm"
                            className="w-14"
                          />
                        </div>
                      </TD>
                      <TD>
                        {result.grade ? (
                          <Badge tone="indigo">{result.grade}</Badge>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TD>
                      <TD className="whitespace-nowrap text-xs">
                        <div>{formatDateTime(result.created_at)}</div>
                        {!result.is_active ? (
                          <span className="text-rose-500">Removed</span>
                        ) : null}
                      </TD>
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditing(result)}
                            aria-label={`Edit result for ${result.student_first_name} ${result.student_last_name}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {result.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(result)}
                              aria-label={`Remove result for ${result.student_first_name} ${result.student_last_name}`}
                              title="Remove"
                            >
                              <Icon name="trash" size={16} />
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
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

      <RecordResultsModal
        open={markerOpen}
        exams={exams.data ?? []}
        onClose={() => setMarkerOpen(false)}
        onSaved={() => {
          setMarkerOpen(false);
          query.refetch();
        }}
      />

      <EditResultModal
        result={editing}
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
        title="Remove result?"
        description={
          <>
            The{" "}
            <strong className="font-semibold text-slate-800">
              {deleting?.exam_name}
            </strong>{" "}
            result for{" "}
            {deleting?.student_first_name} {deleting?.student_last_name} will be
            soft-deleted and hidden from reports.
          </>
        }
        confirmLabel="Remove result"
      />
    </>
  );
}

interface ResultDraft {
  marks: string;
  grade: string;
}

function RecordResultsModal({
  open,
  exams,
  onClose,
  onSaved,
}: {
  open: boolean;
  exams: Exam[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [examId, setExamId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ResultDraft>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exam = exams.find((item) => item.id === examId);

  useEffect(() => {
    if (!open) return;
    setExamId(exams[0]?.id ?? "");
    setDrafts({});
    setError(null);
    // Reset only when opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const roster = useQuery(
    async () => {
      if (!exam) return { students: [], existing: new Map<string, Result>() };
      const [students, results] = await Promise.all([
        apiRequestAll<Student>("/students", { course_id: exam.course_id }),
        apiRequestAll<Result>("/results", { exam_id: exam.id }),
      ]);
      const existing = new Map<string, Result>();
      for (const result of results) existing.set(result.student_id, result);
      return { students, existing };
    },
    [exam?.id, exam?.course_id],
    { enabled: open && Boolean(exam) },
  );

  useEffect(() => {
    if (!roster.data) return;
    const next: Record<string, ResultDraft> = {};
    for (const student of roster.data.students) {
      const existing = roster.data.existing.get(student.id);
      next[student.id] = {
        marks: existing ? String(existing.marks_obtained) : "",
        grade: existing?.grade ?? "",
      };
    }
    setDrafts(next);
  }, [roster.data]);

  const students = useMemo(
    () => roster.data?.students ?? [],
    [roster.data],
  );
  const entered = useMemo(
    () =>
      students.filter((student) => (drafts[student.id]?.marks ?? "").trim() !== ""),
    [students, drafts],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!exam) return setError("Choose an exam.");
    if (entered.length === 0) {
      return setError("Enter marks for at least one student.");
    }
    for (const student of entered) {
      const marks = Number(drafts[student.id]?.marks);
      if (
        !Number.isFinite(marks) ||
        marks < 0 ||
        marks > exam.max_marks
      ) {
        return setError(
          `Marks for ${student.first_name} ${student.last_name} must be between 0 and ${exam.max_marks}.`,
        );
      }
    }

    setSaving(true);
    setError(null);
    try {
      const results = await Promise.allSettled(
        entered.map((student) =>
          apiRequest<Result>("/results", {
            method: "POST",
            body: {
              exam_id: exam.id,
              student_id: student.id,
              marks_obtained: Number(drafts[student.id]?.marks),
              grade: drafts[student.id]?.grade.trim() || null,
            },
          }),
        ),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        toast(
          `${entered.length - failed.length} of ${entered.length} saved`,
          "info",
          toApiError((failed[0] as PromiseRejectedResult).reason).message,
        );
      } else {
        toast(
          `Results saved for ${entered.length} ${
            entered.length === 1 ? "student" : "students"
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
      title="Record results"
      description="Choose an exam, then enter marks. Existing entries are pre-filled and saving updates them."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="results-record-form"
            loading={saving}
            disabled={roster.loading || students.length === 0}
          >
            Save {entered.length > 0 ? `${entered.length} results` : "results"}
          </Button>
        </>
      }
    >
      <form id="results-record-form" onSubmit={handleSubmit} className="space-y-4">
        <Field label="Exam" htmlFor="results-exam" required>
          <Select
            id="results-exam"
            value={examId}
            onChange={(event) => setExamId(event.target.value)}
          >
            <option value="">Select an exam</option>
            {exams.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.subject_code} ({item.course_name})
              </option>
            ))}
          </Select>
        </Field>

        {error ? <Alert tone="error">{error}</Alert> : null}

        {!exam ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            Select an exam to load its course roster.
          </div>
        ) : roster.loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-12 text-sm text-slate-500">
            <Spinner /> Loading roster…
          </div>
        ) : roster.error ? (
          <ErrorState error={roster.error} onRetry={roster.refetch} />
        ) : students.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No students are enrolled in the course for this exam.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span>
                Maximum marks:{" "}
                <strong className="font-semibold text-slate-700">
                  {exam.max_marks}
                </strong>{" "}
                · {roster.data?.existing.size ?? 0} already recorded
              </span>
              <span>
                {entered.length} of {students.length} entered
              </span>
            </div>
            <div className="max-h-[380px] divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 sm:w-1/2">
                    <div className="truncate text-sm font-medium text-slate-900">
                      {student.first_name} {student.last_name}
                    </div>
                    <div className="font-mono text-xs text-slate-500">
                      {student.enrollment_no}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:w-1/2 sm:justify-end">
                    <Input
                      type="number"
                      min={0}
                      max={exam.max_marks}
                      step="0.01"
                      value={drafts[student.id]?.marks ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [student.id]: {
                            marks: event.target.value,
                            grade: current[student.id]?.grade ?? "",
                          },
                        }))
                      }
                      placeholder="Marks"
                      className="h-9 w-24"
                      aria-label={`Marks for ${student.first_name} ${student.last_name}`}
                    />
                    <Input
                      value={drafts[student.id]?.grade ?? ""}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [student.id]: {
                            marks: current[student.id]?.marks ?? "",
                            grade: event.target.value.toUpperCase(),
                          },
                        }))
                      }
                      placeholder="Grade"
                      maxLength={4}
                      className="h-9 w-20 uppercase"
                      aria-label={`Grade for ${student.first_name} ${student.last_name}`}
                    />
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

function EditResultModal({
  result,
  onClose,
  onSaved,
}: {
  result: Result | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [marks, setMarks] = useState("");
  const [grade, setGrade] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!result) return;
    setMarks(String(result.marks_obtained));
    setGrade(result.grade ?? "");
    setActive(result.is_active);
    setError(null);
  }, [result]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result) return;
    const value = Number(marks);
    if (!Number.isFinite(value) || value < 0 || value > result.max_marks) {
      return setError(`Marks must be between 0 and ${result.max_marks}.`);
    }
    setSaving(true);
    setError(null);
    try {
      await apiRequest<Result>(`/results/${result.id}`, {
        method: "PUT",
        body: {
          marks_obtained: value,
          grade: grade.trim() || null,
          is_active: active,
        },
      });
      toast("Result updated", "success");
      onSaved();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(result)}
      onClose={onClose}
      title="Edit result"
      description={
        result
          ? `${result.student_first_name} ${result.student_last_name} · ${result.exam_name}`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="result-edit-form" loading={saving}>
            Save changes
          </Button>
        </>
      }
    >
      <form id="result-edit-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field
          label="Marks obtained"
          htmlFor="result-marks"
          required
          hint={result ? `Out of ${result.max_marks}.` : undefined}
        >
          <Input
            id="result-marks"
            type="number"
            min={0}
            max={result?.max_marks ?? 1000}
            step="0.01"
            value={marks}
            onChange={(event) => setMarks(event.target.value)}
          />
        </Field>
        <Field label="Grade" htmlFor="result-grade" hint="Optional, e.g. A+, B.">
          <Input
            id="result-grade"
            value={grade}
            onChange={(event) => setGrade(event.target.value.toUpperCase())}
            maxLength={4}
            className="uppercase"
          />
        </Field>
        <Field label="Status" htmlFor="result-active">
          <Select
            id="result-active"
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
