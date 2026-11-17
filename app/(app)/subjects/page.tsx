"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { ActiveBadge, Badge } from "@/components/ui/badge";
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
import { apiRequest, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useCourseOptions, useFacultyOptions } from "@/lib/lookups";
import type {
  Course,
  Paginated,
  Subject,
  SubjectFaculty,
} from "@/types/api";

export default function SubjectsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";
  const isMine = user?.role === "FACULTY" || user?.role === "STUDENT";

  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [semester, setSemester] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [assigning, setAssigning] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const courses = useCourseOptions(undefined, isAdmin);

  const query = useQuery(
    () =>
      apiRequest<Paginated<Subject>>(
        isMine ? "/subjects/mine" : "/subjects",
        {
          params: isMine
            ? {
                page,
                per_page: perPage,
                search: debouncedSearch || undefined,
              }
            : {
                page,
                per_page: perPage,
                search: debouncedSearch || undefined,
                course_id: courseId || undefined,
                semester: semester ? Number(semester) : undefined,
                include_inactive:
                  isAdmin && includeInactive ? true : undefined,
              },
        },
      ),
    [
      isMine,
      page,
      perPage,
      debouncedSearch,
      courseId,
      semester,
      includeInactive,
      isAdmin,
    ],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/subjects/${deleting.id}`, { method: "DELETE" });
      toast("Subject deactivated", "success");
      setDeleting(null);
      query.refetch();
    } catch (error: unknown) {
      toast(toApiError(error).message, "error");
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  const title = isMine ? "My subjects" : "Subjects";
  const description = isMine
    ? user?.role === "FACULTY"
      ? "Subjects assigned to you this term, with quick access to attendance and results."
      : "The subjects you are enrolled in for your current semester."
    : "The subjects taught within each course. Assign faculty to control who can mark attendance and record results.";

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          isAdmin ? (
            <Button
              icon={<Icon name="plus" size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New subject
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
              placeholder="Search subjects…"
            />
            {isAdmin ? (
              <>
                <Select
                  value={courseId}
                  onChange={(event) => {
                    setCourseId(event.target.value);
                    setPage(1);
                  }}
                  className="sm:w-56"
                  aria-label="Filter by course"
                >
                  <option value="">All courses</option>
                  {courses.data?.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={semester}
                  onChange={(event) => {
                    setSemester(event.target.value);
                    setPage(1);
                  }}
                  className="sm:w-40"
                  aria-label="Filter by semester"
                >
                  <option value="">All semesters</option>
                  {Array.from({ length: 12 }, (_, index) => index + 1).map(
                    (value) => (
                      <option key={value} value={value}>
                        Semester {value}
                      </option>
                    ),
                  )}
                </Select>
              </>
            ) : null}
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
            icon="layers"
            title={isMine ? "No subjects yet" : "No subjects found"}
            description={
              isMine
                ? "Subjects will appear here once they are assigned to you or your semester."
                : "Create a subject under a course to start scheduling attendance and exams."
            }
          />
        ) : (
          <>
            <Table minWidth={900}>
              <THead>
                <TH>Subject</TH>
                <TH>Course</TH>
                <TH>Department</TH>
                <TH>Semester</TH>
                <TH>Credits</TH>
                <TH>Status</TH>
                {isAdmin ? <TH className="text-right">Actions</TH> : null}
              </THead>
              <TBody>
                {query.data.items.map((subject) => (
                  <TR key={subject.id}>
                    <TD>
                      <div className="font-medium text-slate-900">
                        {subject.name}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-slate-400">
                        {subject.code}
                      </div>
                    </TD>
                    <TD className="text-slate-600">{subject.course_name}</TD>
                    <TD className="text-slate-600">{subject.department_name}</TD>
                    <TD>
                      <Badge tone="slate">Sem {subject.semester}</Badge>
                    </TD>
                    <TD className="tabular-nums">{subject.credits}</TD>
                    <TD>
                      <ActiveBadge active={subject.is_active} />
                    </TD>
                    {isAdmin ? (
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAssigning(subject)}
                            aria-label={`Assign faculty to ${subject.name}`}
                            title="Assign faculty"
                          >
                            <Icon name="usersRound" size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(subject);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${subject.name}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {subject.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(subject)}
                              aria-label={`Deactivate ${subject.name}`}
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

      <SubjectFormModal
        open={formOpen}
        initial={editing}
        courses={courses.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          query.refetch();
        }}
      />

      <FacultyAssignModal
        subject={assigning}
        onClose={() => setAssigning(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Deactivate subject?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.name}
            </strong>{" "}
            will be hidden from non-admin views. Attendance and results already
            recorded are kept.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function SubjectFormModal({
  open,
  initial,
  courses,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Subject | null;
  courses: Course[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [semester, setSemester] = useState("1");
  const [credits, setCredits] = useState("3");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCourseId(initial?.course_id ?? "");
    setName(initial?.name ?? "");
    setCode(initial?.code ?? "");
    setSemester(String(initial?.semester ?? 1));
    setCredits(String(initial?.credits ?? 3));
    setDescription(initial?.description ?? "");
    setError(null);
  }, [open, initial]);

  const selectedCourse = courses.find((course) => course.id === courseId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const semesterValue = Number(semester);
    const creditsValue = Number(credits);
    if (!courseId) return setError("Choose a course.");
    if (!name.trim() || !code.trim()) return setError("Name and code are required.");
    if (
      !Number.isFinite(semesterValue) ||
      semesterValue < 1 ||
      (selectedCourse && semesterValue > selectedCourse.duration_semesters)
    ) {
      return setError(
        selectedCourse
          ? `Semester must be between 1 and ${selectedCourse.duration_semesters}.`
          : "Enter a valid semester.",
      );
    }
    if (!Number.isFinite(creditsValue) || creditsValue < 1) {
      return setError("Credits must be a positive number.");
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        course_id: courseId,
        name: name.trim(),
        code: code.trim(),
        semester: semesterValue,
        credits: creditsValue,
        description: description.trim() || null,
      };
      if (initial) {
        await apiRequest<Subject>(`/subjects/${initial.id}`, {
          method: "PUT",
          body,
        });
        toast("Subject updated", "success");
      } else {
        await apiRequest<Subject>("/subjects", { method: "POST", body });
        toast("Subject created", "success");
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
      title={initial ? "Edit subject" : "New subject"}
      description="Subjects live under a course and a semester."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="subject-form" loading={saving}>
            {initial ? "Save changes" : "Create subject"}
          </Button>
        </>
      }
    >
      <form id="subject-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Course" htmlFor="subject-course" required>
          <Select
            id="subject-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name} · {course.department_name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Subject name" htmlFor="subject-name" required>
            <Input
              id="subject-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Data Structures"
            />
          </Field>
          <Field label="Code" htmlFor="subject-code" required>
            <Input
              id="subject-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="CSE301"
              className="font-mono"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Semester"
            htmlFor="subject-semester"
            required
            hint={
              selectedCourse
                ? `This course runs for ${selectedCourse.duration_semesters} semesters.`
                : undefined
            }
          >
            <Input
              id="subject-semester"
              type="number"
              min={1}
              max={selectedCourse?.duration_semesters ?? 12}
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            />
          </Field>
          <Field label="Credits" htmlFor="subject-credits" required>
            <Input
              id="subject-credits"
              type="number"
              min={1}
              value={credits}
              onChange={(event) => setCredits(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Description" htmlFor="subject-description">
          <Textarea
            id="subject-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional syllabus summary."
          />
        </Field>
      </form>
    </Modal>
  );
}

function FacultyAssignModal({
  subject,
  onClose,
}: {
  subject: Subject | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [facultyId, setFacultyId] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const faculty = useFacultyOptions(Boolean(subject));
  const assigned = useQuery(
    () =>
      apiRequest<SubjectFaculty[]>(
        subject ? `/subjects/${subject.id}/faculty` : "/subjects/none/faculty",
      ),
    [subject?.id],
    { enabled: Boolean(subject) },
  );

  useEffect(() => {
    setFacultyId("");
  }, [subject?.id]);

  async function handleAssign() {
    if (!subject || !facultyId) return;
    setAssigning(true);
    try {
      await apiRequest<SubjectFaculty>(`/subjects/${subject.id}/faculty`, {
        method: "POST",
        body: { faculty_id: facultyId },
      });
      toast("Faculty assigned", "success");
      setFacultyId("");
      assigned.refetch();
    } catch (error: unknown) {
      toast(toApiError(error).message, "error");
    } finally {
      setAssigning(false);
    }
  }

  async function handleRemove(facultyMember: SubjectFaculty) {
    if (!subject) return;
    setRemovingId(facultyMember.faculty_id);
    try {
      await apiRequest<null>(
        `/subjects/${subject.id}/faculty/${facultyMember.faculty_id}`,
        { method: "DELETE" },
      );
      toast("Faculty unassigned", "success");
      assigned.refetch();
    } catch (error: unknown) {
      toast(toApiError(error).message, "error");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Modal
      open={Boolean(subject)}
      onClose={onClose}
      size="lg"
      title="Assign faculty"
      description={
        subject
          ? `${subject.name} · ${subject.course_name} · Semester ${subject.semester}`
          : undefined
      }
      footer={
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      }
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Add a faculty member
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <Select
              value={facultyId}
              onChange={(event) => setFacultyId(event.target.value)}
              aria-label="Choose faculty"
            >
              <option value="">Select faculty</option>
              {faculty.data?.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} · {member.employee_id}
                </option>
              ))}
            </Select>
            <Button
              onClick={handleAssign}
              loading={assigning}
              disabled={!facultyId}
              className="sm:w-auto"
            >
              Assign
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assigned faculty
          </p>
          {assigned.loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
              <Spinner className="h-4 w-4" /> Loading…
            </div>
          ) : assigned.error ? (
            <Alert tone="error">{assigned.error.message}</Alert>
          ) : !assigned.data || assigned.data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No faculty assigned yet.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {assigned.data.map((member) => (
                <li
                  key={member.faculty_id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <Icon name="user" size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {member.first_name} {member.last_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {member.employee_id} · {member.email}
                    </p>
                  </div>
                  <span className="hidden text-xs text-slate-400 sm:block">
                    {formatDateTime(member.assigned_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                    onClick={() => handleRemove(member)}
                    loading={removingId === member.faculty_id}
                    aria-label={`Remove ${member.first_name} ${member.last_name}`}
                  >
                    <Icon name="trash" size={16} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
