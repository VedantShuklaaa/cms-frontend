"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Alert,
  EmptyState,
  ErrorState,
  TableLoading,
} from "@/components/ui/feedback";
import { Field, Input, SearchInput, Select } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiRequest, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  DEFAULT_PAGE_SIZE,
  EXAM_TYPE_LABELS,
  EXAM_TYPE_TONES,
  EXAM_TYPES,
} from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useSubjectOptions } from "@/lib/lookups";
import type { Exam, ExamType, Paginated } from "@/types/api";

export default function ExamsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [examType, setExamType] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState<Exam | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const subjects = useSubjectOptions();

  const query = useQuery(
    () =>
      apiRequest<Paginated<Exam>>("/exams", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          subject_id: subjectId || undefined,
          exam_type: examType || undefined,
          include_inactive: includeInactive ? true : undefined,
        },
      }),
    [page, perPage, debouncedSearch, subjectId, examType, includeInactive],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/exams/${deleting.id}`, { method: "DELETE" });
      toast("Exam deactivated", "success");
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
        title="Exams"
        description="Assessment schedule for each subject. Results are recorded against an exam's maximum marks."
        actions={
          isAdmin ? (
            <Button
              icon={<Icon name="plus" size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New exam
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search exams or subjects…"
            />
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
              value={examType}
              onChange={(event) => {
                setExamType(event.target.value);
                setPage(1);
              }}
              className="sm:w-40"
              aria-label="Filter by exam type"
            >
              <option value="">All types</option>
              {EXAM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EXAM_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </div>
          {isAdmin ? (
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
              Show inactive
            </label>
          ) : null}
        </div>

        {query.loading && !query.data ? (
          <TableLoading />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            icon="calendarDays"
            title="No exams scheduled"
            description={
              search || subjectId || examType
                ? "No exams match these filters."
                : "Create an exam to begin recording results."
            }
          />
        ) : (
          <>
            <Table minWidth={900}>
              <THead>
                <TH>Exam</TH>
                <TH>Subject</TH>
                <TH>Course</TH>
                <TH>Type</TH>
                <TH>Date</TH>
                <TH>Max marks</TH>
                {isAdmin ? <TH className="text-right">Actions</TH> : null}
              </THead>
              <TBody>
                {query.data.items.map((exam) => (
                  <TR key={exam.id}>
                    <TD>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {exam.name}
                        </span>
                        {!exam.is_active ? (
                          <Badge tone="slate">Inactive</Badge>
                        ) : null}
                      </div>
                    </TD>
                    <TD>
                      <div className="text-slate-700">{exam.subject_name}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {exam.subject_code}
                      </div>
                    </TD>
                    <TD className="text-slate-600">{exam.course_name}</TD>
                    <TD>
                      <Badge tone={EXAM_TYPE_TONES[exam.exam_type]}>
                        {EXAM_TYPE_LABELS[exam.exam_type]}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {formatDate(exam.exam_date)}
                    </TD>
                    <TD className="tabular-nums">{exam.max_marks}</TD>
                    {isAdmin ? (
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(exam);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${exam.name}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {exam.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(exam)}
                              aria-label={`Deactivate ${exam.name}`}
                              title="Deactivate"
                            >
                              <Icon name="trash" size={16} />
                            </Button>
                          ) : null}
                        </div>
                      </TD>
                    ) : null}
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

      <ExamFormModal
        open={formOpen}
        initial={editing}
        subjects={subjects.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          query.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Deactivate exam?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.name}
            </strong>{" "}
            will be hidden from lists. Existing results remain intact and
            readable.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function ExamFormModal({
  open,
  initial,
  subjects,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Exam | null;
  subjects: { id: string; name: string; code: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [subjectId, setSubjectId] = useState("");
  const [name, setName] = useState("");
  const [examType, setExamType] = useState<ExamType>("MIDTERM");
  const [examDate, setExamDate] = useState("");
  const [maxMarks, setMaxMarks] = useState("100");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubjectId(initial?.subject_id ?? "");
    setName(initial?.name ?? "");
    setExamType(initial?.exam_type ?? "MIDTERM");
    setExamDate(initial?.exam_date ?? "");
    setMaxMarks(String(initial?.max_marks ?? 100));
    setActive(initial?.is_active ?? true);
    setError(null);
  }, [open, initial]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const marks = Number(maxMarks);
    if (!subjectId) return setError("Choose a subject.");
    if (!name.trim()) return setError("Exam name is required.");
    if (!examDate) return setError("Exam date is required.");
    if (!Number.isFinite(marks) || marks < 1 || marks > 1000) {
      return setError("Maximum marks must be between 1 and 1000.");
    }

    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await apiRequest<Exam>(`/exams/${initial.id}`, {
          method: "PUT",
          body: {
            subject_id: subjectId,
            name: name.trim(),
            exam_type: examType,
            exam_date: examDate,
            max_marks: marks,
            is_active: active,
          },
        });
        toast("Exam updated", "success");
      } else {
        await apiRequest<Exam>("/exams", {
          method: "POST",
          body: {
            subject_id: subjectId,
            name: name.trim(),
            exam_type: examType,
            exam_date: examDate,
            max_marks: marks,
          },
        });
        toast("Exam created", "success");
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
      size="lg"
      title={initial ? "Edit exam" : "New exam"}
      description={
        initial
          ? "The subject cannot change once results have been recorded, and maximum marks cannot drop below an existing result."
          : "Schedule an assessment for a subject."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="exam-form" loading={saving}>
            {initial ? "Save changes" : "Create exam"}
          </Button>
        </>
      }
    >
      <form id="exam-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Subject" htmlFor="exam-subject" required>
          <Select
            id="exam-subject"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.code} · {subject.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Exam name" htmlFor="exam-name" required>
          <Input
            id="exam-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Mid-semester examination"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Exam type" htmlFor="exam-type" required>
            <Select
              id="exam-type"
              value={examType}
              onChange={(event) => setExamType(event.target.value as ExamType)}
            >
              {EXAM_TYPES.map((type) => (
                <option key={type} value={type}>
                  {EXAM_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Exam date" htmlFor="exam-date" required>
            <Input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(event) => setExamDate(event.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Maximum marks"
          htmlFor="exam-max"
          required
          hint="Between 1 and 1000."
        >
          <Input
            id="exam-max"
            type="number"
            min={1}
            max={1000}
            value={maxMarks}
            onChange={(event) => setMaxMarks(event.target.value)}
          />
        </Field>
        {initial ? (
          <Field label="Status" htmlFor="exam-active">
            <Select
              id="exam-active"
              value={active ? "active" : "inactive"}
              onChange={(event) => setActive(event.target.value === "active")}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </Field>
        ) : null}
      </form>
    </Modal>
  );
}
