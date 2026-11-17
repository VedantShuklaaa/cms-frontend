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
import {
  Field,
  Input,
  SearchInput,
  Select,
  Textarea,
} from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiRequest, apiRequestAll, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useSubjectOptions } from "@/lib/lookups";
import { isPastDate, todayISO } from "@/lib/utils";
import type {
  Assignment,
  Paginated,
  Role,
  SubjectFaculty,
  Submission,
} from "@/types/api";

export default function AssignmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const role: Role = user?.role ?? "STUDENT";
  const isStaff = role === "ADMIN" || role === "FACULTY";
  const isAdmin = role === "ADMIN";

  const [search, setSearch] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState<Assignment | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [submitting, setSubmitting] = useState<Assignment | null>(null);
  const [viewingSubmissions, setViewingSubmissions] =
    useState<Assignment | null>(null);

  const debouncedSearch = useDebouncedValue(search);
  const subjects = useSubjectOptions({ mine: role !== "ADMIN" });

  const query = useQuery(
    () =>
      apiRequest<Paginated<Assignment>>("/assignments", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          subject_id: subjectId || undefined,
          include_inactive:
            isStaff && includeInactive ? true : undefined,
        },
      }),
    [page, perPage, debouncedSearch, subjectId, includeInactive, isStaff],
  );

  const mySubmissions = useQuery(
    () =>
      role === "STUDENT"
        ? apiRequestAll<Submission>("/submissions/me")
        : Promise.resolve([] as Submission[]),
    [role],
    { enabled: role === "STUDENT" },
  );

  const submissionByAssignment = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const submission of mySubmissions.data ?? []) {
      if (!map.has(submission.assignment_id)) {
        map.set(submission.assignment_id, submission);
      }
    }
    return map;
  }, [mySubmissions.data]);

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/assignments/${deleting.id}`, {
        method: "DELETE",
      });
      toast("Assignment removed", "success");
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
        title="Assignments"
        description={
          role === "STUDENT"
            ? "Assignments for your course. Submit before the due date; resubmitting replaces your previous answer."
            : isAdmin
              ? "Assignments across all subjects, including submissions and grading."
              : "Assignments for the subjects you teach, with submission grading."
        }
        actions={
          isStaff ? (
            <Button
              icon={<Icon name="plus" size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New assignment
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search assignments…"
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
          </div>
          {isStaff ? (
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
            icon="clipboardList"
            title="No assignments"
            description={
              isStaff
                ? "Create an assignment for one of your subjects."
                : "There are no assignments for your course yet."
            }
            action={
              isStaff ? (
                <Button
                  size="sm"
                  icon={<Icon name="plus" size={14} />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  New assignment
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table minWidth={980}>
              <THead>
                <TH>Assignment</TH>
                <TH>Subject</TH>
                <TH>Faculty</TH>
                <TH>Due date</TH>
                <TH>Max marks</TH>
                {role === "STUDENT" ? <TH>My submission</TH> : null}
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {query.data.items.map((assignment) => {
                  const overdue = isPastDate(assignment.due_date);
                  const submission = submissionByAssignment.get(assignment.id);
                  return (
                    <TR key={assignment.id}>
                      <TD>
                        <div className="font-medium text-slate-900">
                          {assignment.title}
                        </div>
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                          {assignment.description}
                        </p>
                        {!assignment.is_active ? (
                          <Badge tone="slate">Inactive</Badge>
                        ) : null}
                      </TD>
                      <TD>
                        <div className="text-slate-700">
                          {assignment.subject_name}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {assignment.subject_code}
                        </div>
                      </TD>
                      <TD className="text-slate-600">
                        {assignment.faculty_first_name}{" "}
                        {assignment.faculty_last_name}
                      </TD>
                      <TD className="whitespace-nowrap">
                        <div>{formatDate(assignment.due_date)}</div>
                        {overdue ? (
                          <span className="text-xs font-medium text-rose-500">
                            Closed
                          </span>
                        ) : null}
                      </TD>
                      <TD className="tabular-nums">
                        {assignment.max_marks ?? "—"}
                      </TD>
                      {role === "STUDENT" ? (
                        <TD>
                          {submission ? (
                            <div className="space-y-1">
                              {submission.marks_obtained !== null ? (
                                <Badge tone="emerald">
                                  {submission.marks_obtained}
                                  {assignment.max_marks
                                    ? ` / ${assignment.max_marks}`
                                    : ""}
                                </Badge>
                              ) : (
                                <Badge tone="amber">Awaiting grade</Badge>
                              )}
                              <div className="text-xs text-slate-500">
                                {formatDateTime(submission.submitted_at)}
                              </div>
                            </div>
                          ) : (
                            <Badge tone="slate">Not submitted</Badge>
                          )}
                        </TD>
                      ) : null}
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          {role === "STUDENT" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSubmitting(assignment)}
                            >
                              {submission ? "View submission" : "Submit"}
                            </Button>
                          ) : (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingSubmissions(assignment)}
                              >
                                Submissions
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setEditing(assignment);
                                  setFormOpen(true);
                                }}
                                aria-label={`Edit ${assignment.title}`}
                                title="Edit"
                              >
                                <Icon name="pencil" size={16} />
                              </Button>
                              {assignment.is_active ? (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                                  onClick={() => setDeleting(assignment)}
                                  aria-label={`Remove ${assignment.title}`}
                                  title="Remove"
                                >
                                  <Icon name="trash" size={16} />
                                </Button>
                              ) : null}
                            </>
                          )}
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

      <AssignmentFormModal
        open={formOpen}
        initial={editing}
        role={role}
        subjects={subjects.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          query.refetch();
        }}
      />

      <StudentSubmissionModal
        assignment={submitting}
        submission={
          submitting ? submissionByAssignment.get(submitting.id) ?? null : null
        }
        onClose={() => setSubmitting(null)}
        onSaved={() => {
          setSubmitting(null);
          mySubmissions.refetch();
        }}
      />

      <SubmissionsModal
        assignment={viewingSubmissions}
        onClose={() => setViewingSubmissions(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Remove assignment?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.title}
            </strong>{" "}
            will be hidden from students. Existing submissions are retained.
          </>
        }
        confirmLabel="Remove assignment"
      />
    </>
  );
}

function AssignmentFormModal({
  open,
  initial,
  role,
  subjects,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Assignment | null;
  role: Role;
  subjects: { id: string; name: string; code: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const isAdmin = role === "ADMIN";
  const [subjectId, setSubjectId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [maxMarks, setMaxMarks] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSubjectId(initial?.subject_id ?? "");
    setFacultyId(initial?.faculty_id ?? "");
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setDueDate(initial?.due_date ?? todayISO());
    setMaxMarks(
      initial?.max_marks === null || initial?.max_marks === undefined
        ? ""
        : String(initial.max_marks),
    );
    setActive(initial?.is_active ?? true);
    setError(null);
  }, [open, initial]);

  const assignedFaculty = useQuery(
    () =>
      subjectId
        ? apiRequest<SubjectFaculty[]>(`/subjects/${subjectId}/faculty`)
        : Promise.resolve([] as SubjectFaculty[]),
    [subjectId],
    { enabled: open && isAdmin && !initial && Boolean(subjectId) },
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!initial && !subjectId) return setError("Choose a subject.");
    if (isAdmin && !initial && !facultyId) {
      return setError("Choose the faculty member who owns this assignment.");
    }
    if (!title.trim()) return setError("Title is required.");
    if (!description.trim()) return setError("Description is required.");
    if (!dueDate) return setError("Due date is required.");
    const marks = maxMarks.trim() === "" ? null : Number(maxMarks);
    if (
      marks !== null &&
      (!Number.isFinite(marks) || marks < 1 || marks > 1000)
    ) {
      return setError("Maximum marks must be between 1 and 1000.");
    }

    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await apiRequest<Assignment>(`/assignments/${initial.id}`, {
          method: "PUT",
          body: {
            title: title.trim(),
            description: description.trim(),
            due_date: dueDate,
            max_marks: marks,
            is_active: active,
          },
        });
        toast("Assignment updated", "success");
      } else {
        await apiRequest<Assignment>("/assignments", {
          method: "POST",
          body: {
            subject_id: subjectId,
            ...(isAdmin ? { faculty_id: facultyId } : {}),
            title: title.trim(),
            description: description.trim(),
            due_date: dueDate,
            max_marks: marks,
          },
        });
        toast("Assignment created", "success");
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
      title={initial ? "Edit assignment" : "New assignment"}
      description={
        initial
          ? "Maximum marks cannot drop below a submission that has already been graded."
          : isAdmin
            ? "Admins create assignments on behalf of a faculty member assigned to the subject."
            : "The assignment is created under your faculty profile."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="assignment-form" loading={saving}>
            {initial ? "Save changes" : "Create assignment"}
          </Button>
        </>
      }
    >
      <form
        id="assignment-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {error ? <Alert tone="error">{error}</Alert> : null}

        {initial ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            Subject:{" "}
            <span className="font-medium text-slate-700">
              {initial.subject_name} ({initial.subject_code})
            </span>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Subject" htmlFor="assignment-subject" required>
              <Select
                id="assignment-subject"
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setFacultyId("");
                }}
              >
                <option value="">Select a subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.code} · {subject.name}
                  </option>
                ))}
              </Select>
            </Field>
            {isAdmin ? (
              <Field
                label="Faculty owner"
                htmlFor="assignment-faculty"
                required
                hint={
                  !subjectId
                    ? "Choose a subject first."
                    : assignedFaculty.loading
                      ? "Loading assigned faculty…"
                      : undefined
                }
              >
                <Select
                  id="assignment-faculty"
                  value={facultyId}
                  onChange={(event) => setFacultyId(event.target.value)}
                  disabled={!subjectId || assignedFaculty.loading}
                >
                  <option value="">
                    {!subjectId
                      ? "Select a subject first"
                      : assignedFaculty.data?.length === 0
                        ? "No faculty assigned"
                        : "Select faculty"}
                  </option>
                  {assignedFaculty.data?.map((member) => (
                    <option key={member.faculty_id} value={member.faculty_id}>
                      {member.first_name} {member.last_name} ·{" "}
                      {member.employee_id}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
        )}

        {isAdmin && !initial && subjectId && assignedFaculty.data?.length === 0 ? (
          <Alert tone="warning">
            No faculty are assigned to this subject. Assign faculty on the
            Subjects page first.
          </Alert>
        ) : null}

        <Field label="Title" htmlFor="assignment-title" required>
          <Input
            id="assignment-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Data structures lab report"
          />
        </Field>
        <Field label="Description" htmlFor="assignment-description" required>
          <Textarea
            id="assignment-description"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Instructions for students…"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date" htmlFor="assignment-due" required>
            <Input
              id="assignment-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
          <Field
            label="Maximum marks"
            htmlFor="assignment-max"
            hint="Optional. Leave empty if ungraded."
          >
            <Input
              id="assignment-max"
              type="number"
              min={1}
              max={1000}
              value={maxMarks}
              onChange={(event) => setMaxMarks(event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        {initial ? (
          <Field label="Status" htmlFor="assignment-active">
            <Select
              id="assignment-active"
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

function StudentSubmissionModal({
  assignment,
  submission,
  onClose,
  onSaved,
}: {
  assignment: Assignment | null;
  submission: Submission | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assignment) return;
    setContent(submission?.content ?? "");
    setError(null);
  }, [assignment, submission]);

  const closed = assignment ? isPastDate(assignment.due_date) : false;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!assignment) return;
    if (!content.trim()) return setError("Write your submission first.");
    setSaving(true);
    setError(null);
    try {
      await apiRequest<Submission>(`/assignments/${assignment.id}/submissions`, {
        method: "POST",
        body: { content: content.trim() },
      });
      toast(submission ? "Submission replaced" : "Assignment submitted", "success");
      onSaved();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(assignment)}
      onClose={onClose}
      size="lg"
      title={assignment?.title ?? "Submit assignment"}
      description={
        assignment
          ? `${assignment.subject_name} · Due ${formatDate(assignment.due_date)}${
              assignment.max_marks ? ` · ${assignment.max_marks} marks` : ""
            }`
          : undefined
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Close
          </Button>
          {closed ? null : (
            <Button type="submit" form="submission-form" loading={saving}>
              {submission ? "Replace submission" : "Submit"}
            </Button>
          )}
        </>
      }
    >
      <form id="submission-form" onSubmit={handleSubmit} className="space-y-4">
        {closed ? (
          <Alert tone="warning">
            The due date has passed, so this assignment is closed for new
            submissions.
          </Alert>
        ) : null}
        {error ? <Alert tone="error">{error}</Alert> : null}

        {submission ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Submitted {formatDateTime(submission.submitted_at)} ·{" "}
            {submission.marks_obtained !== null
              ? `Graded ${submission.marks_obtained}${
                  assignment?.max_marks ? ` / ${assignment.max_marks}` : ""
                }`
              : "Awaiting grade"}
            {submission.graded_at
              ? ` on ${formatDateTime(submission.graded_at)}`
              : ""}
          </div>
        ) : null}

        <Field
          label="Your answer"
          htmlFor="submission-content"
          required
          hint={
            submission && !closed
              ? "Submitting again replaces your answer and clears the grade."
              : undefined
          }
        >
          <Textarea
            id="submission-content"
            rows={10}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Write your answer here…"
            disabled={closed}
          />
        </Field>
      </form>
    </Modal>
  );
}

function SubmissionsModal({
  assignment,
  onClose,
}: {
  assignment: Assignment | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [includeInactive, setIncludeInactive] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Submission | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const query = useQuery(
    () =>
      assignment
        ? apiRequest<Paginated<Submission>>(
            `/assignments/${assignment.id}/submissions`,
            {
              params: {
                per_page: 100,
                include_inactive: includeInactive ? true : undefined,
              },
            },
          )
        : Promise.resolve({ items: [], page: 1, per_page: 100, total: 0 }),
    [assignment?.id, includeInactive],
    { enabled: Boolean(assignment) },
  );

  useEffect(() => {
    if (!query.data) return;
    const next: Record<string, string> = {};
    for (const submission of query.data.items) {
      next[submission.id] =
        submission.marks_obtained === null
          ? ""
          : String(submission.marks_obtained);
    }
    setDrafts(next);
  }, [query.data]);

  useEffect(() => {
    if (!assignment) return;
    setIncludeInactive(false);
    setDrafts({});
  }, [assignment]);

  async function saveGrade(submission: Submission) {
    if (!assignment) return;
    const raw = drafts[submission.id] ?? "";
    if (raw.trim() === "" && assignment.max_marks !== null) {
      toast("Enter marks before saving", "info");
      return;
    }
    if (assignment.max_marks === null) {
      toast(
        "Set maximum marks on the assignment before grading.",
        "info",
      );
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > assignment.max_marks) {
      toast(
        `Marks must be between 0 and ${assignment.max_marks}`,
        "error",
      );
      return;
    }
    setSavingId(submission.id);
    try {
      await apiRequest<Submission>(
        `/assignments/${assignment.id}/submissions/${submission.id}`,
        {
          method: "PUT",
          body: { marks_obtained: value, is_active: true },
        },
      );
      toast("Grade saved", "success");
      query.refetch();
    } catch (err: unknown) {
      toast(toApiError(err).message, "error");
    } finally {
      setSavingId(null);
    }
  }

  async function handleDelete() {
    if (!assignment || !deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(
        `/assignments/${assignment.id}/submissions/${deleting.id}`,
        { method: "DELETE" },
      );
      toast("Submission removed", "success");
      setDeleting(null);
      query.refetch();
    } catch (err: unknown) {
      toast(toApiError(err).message, "error");
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <Modal
      open={Boolean(assignment)}
      onClose={onClose}
      size="xl"
      title={assignment ? `Submissions · ${assignment.title}` : "Submissions"}
      description={
        assignment
          ? `${assignment.subject_name} · ${assignment.max_marks ?? "Ungraded"} ${
              assignment.max_marks ? "marks" : ""
            }`
          : undefined
      }
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Include removed submissions
          </label>
          <span className="text-xs text-slate-500">
            {query.data?.total ?? 0}{" "}
            {(query.data?.total ?? 0) === 1 ? "submission" : "submissions"}
          </span>
        </div>

        {assignment?.max_marks === null ? (
          <Alert tone="info">
            This assignment has no maximum marks, so submissions cannot be
            graded. Edit the assignment to set a maximum.
          </Alert>
        ) : null}

        {query.loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-12 text-sm text-slate-500">
            <Spinner /> Loading submissions…
          </div>
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data || query.data.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
            No submissions yet.
          </div>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {query.data.items.map((submission) => (
              <div
                key={submission.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {submission.student_first_name}{" "}
                      {submission.student_last_name}
                    </div>
                    <div className="font-mono text-xs text-slate-500">
                      {submission.enrollment_no} · Submitted{" "}
                      {formatDateTime(submission.submitted_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!submission.is_active ? (
                      <Badge tone="slate">Removed</Badge>
                    ) : submission.marks_obtained !== null ? (
                      <Badge tone="emerald">Graded</Badge>
                    ) : (
                      <Badge tone="amber">Ungraded</Badge>
                    )}
                    {submission.is_active ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                        onClick={() => setDeleting(submission)}
                        aria-label={`Remove submission by ${submission.student_first_name} ${submission.student_last_name}`}
                        title="Remove submission"
                      >
                        <Icon name="trash" size={16} />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 max-h-24 overflow-y-auto whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                  {submission.content}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={assignment?.max_marks ?? undefined}
                    step="0.01"
                    value={drafts[submission.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [submission.id]: event.target.value,
                      }))
                    }
                    placeholder="Marks"
                    className="h-9 w-28"
                    disabled={assignment?.max_marks === null}
                    aria-label={`Marks for ${submission.student_first_name} ${submission.student_last_name}`}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    loading={savingId === submission.id}
                    disabled={assignment?.max_marks === null}
                    onClick={() => saveGrade(submission)}
                  >
                    Save grade
                  </Button>
                  {submission.graded_at ? (
                    <span className="text-xs text-slate-400">
                      Graded {formatDateTime(submission.graded_at)}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Remove submission?"
        description={
          <>
            The submission by{" "}
            {deleting?.student_first_name} {deleting?.student_last_name} will be
            soft-deleted.
          </>
        }
        confirmLabel="Remove submission"
      />
    </Modal>
  );
}
