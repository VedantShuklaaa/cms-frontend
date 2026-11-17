"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { ActiveBadge } from "@/components/ui/badge";
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
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useCourseOptions, useDepartmentOptions } from "@/lib/lookups";
import { initials } from "@/lib/utils";
import type { Paginated, Student } from "@/types/api";

export default function StudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [semester, setSemester] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const departments = useDepartmentOptions();
  const courses = useCourseOptions(undefined, isAdmin);

  const filteredCourses = useMemo(() => {
    const all = courses.data ?? [];
    if (!departmentId) return all;
    return all.filter((course) => course.department_id === departmentId);
  }, [courses.data, departmentId]);

  const query = useQuery(
    () =>
      apiRequest<Paginated<Student>>("/students", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          department_id: departmentId || undefined,
          course_id: courseId || undefined,
          semester: semester || undefined,
          include_inactive:
            isAdmin && includeInactive ? true : undefined,
        },
      }),
    [
      page,
      perPage,
      debouncedSearch,
      departmentId,
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
      await apiRequest<null>(`/students/${deleting.id}`, { method: "DELETE" });
      toast("Student deactivated", "success");
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
        title="Students"
        description={
          isAdmin
            ? "Student records, enrolment and account status across all courses."
            : "Students enrolled in the courses you teach."
        }
        actions={
          isAdmin ? (
            <Button
              icon={<Icon name="plus" size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Add student
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search name, email or enrolment…"
            />
            <Select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setCourseId("");
                setPage(1);
              }}
              className="sm:w-48"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
            <Select
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setPage(1);
              }}
              className="sm:w-48"
              aria-label="Filter by course"
            >
              <option value="">All courses</option>
              {filteredCourses.map((course) => (
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
              className="sm:w-36"
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
            icon="graduation"
            title="No students found"
            description="Adjust the filters or add a student record to get started."
          />
        ) : (
          <>
            <Table minWidth={960}>
              <THead>
                <TH>Student</TH>
                <TH>Enrolment</TH>
                <TH>Course</TH>
                <TH>Semester</TH>
                <TH>Status</TH>
                {isAdmin ? <TH className="text-right">Actions</TH> : null}
              </THead>
              <TBody>
                {query.data.items.map((student) => (
                  <TR key={student.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-[11px] font-bold text-violet-600">
                          {initials(
                            `${student.first_name} ${student.last_name}`,
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {student.first_name} {student.last_name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs">{student.enrollment_no}</TD>
                    <TD>
                      <div className="text-slate-700">{student.course_name}</div>
                      <div className="text-xs text-slate-500">
                        {student.department_name}
                      </div>
                    </TD>
                    <TD className="whitespace-nowrap">
                      Semester {student.current_semester}
                    </TD>
                    <TD>
                      <ActiveBadge active={student.is_active} />
                    </TD>
                    {isAdmin ? (
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(student);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${student.first_name} ${student.last_name}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {student.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(student)}
                              aria-label={`Deactivate ${student.first_name} ${student.last_name}`}
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

      {isAdmin ? (
        <StudentFormModal
          open={formOpen}
          initial={editing}
          courses={courses.data ?? []}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            query.refetch();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Deactivate student?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.first_name} {deleting?.last_name}
            </strong>{" "}
            will lose access immediately. Academic history such as attendance
            and results is retained.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function StudentFormModal({
  open,
  initial,
  courses,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Student | null;
  courses: { id: string; name: string; duration_semesters: number }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [semester, setSemester] = useState("1");
  const [admissionYear, setAdmissionYear] = useState(
    String(new Date().getFullYear()),
  );
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initial?.email ?? "");
    setPassword("");
    setCourseId(initial?.course_id ?? "");
    setEnrollmentNo(initial?.enrollment_no ?? "");
    setFirstName(initial?.first_name ?? "");
    setLastName(initial?.last_name ?? "");
    setPhone(initial?.phone ?? "");
    setDateOfBirth(initial?.date_of_birth ?? "");
    setSemester(String(initial?.current_semester ?? 1));
    setAdmissionYear(
      String(initial?.admission_year ?? new Date().getFullYear()),
    );
    setActive(initial?.is_active ?? true);
    setError(null);
  }, [open, initial]);

  const selectedCourse = courses.find((course) => course.id === courseId);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const semesterValue = Number(semester);
    const yearValue = Number(admissionYear);
    if (!courseId) return setError("Choose a course.");
    if (!enrollmentNo.trim() || !firstName.trim() || !lastName.trim()) {
      return setError("Enrolment number, first name and last name are required.");
    }
    if (
      !Number.isInteger(semesterValue) ||
      semesterValue < 1 ||
      semesterValue > (selectedCourse?.duration_semesters ?? 12)
    ) {
      return setError(
        `Semester must be between 1 and ${
          selectedCourse?.duration_semesters ?? 12
        } for this course.`,
      );
    }
    if (!Number.isInteger(yearValue) || yearValue < 1900 || yearValue > 2100) {
      return setError("Enter a valid admission year.");
    }
    if (!initial) {
      if (!email.trim()) return setError("Email is required.");
      if (password.length < 8) {
        return setError("Password must be at least 8 characters.");
      }
    }

    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await apiRequest<Student>(`/students/${initial.id}`, {
          method: "PUT",
          body: {
            course_id: courseId,
            enrollment_no: enrollmentNo.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            date_of_birth: dateOfBirth || null,
            current_semester: semesterValue,
            admission_year: yearValue,
            is_active: active,
          },
        });
        toast("Student updated", "success");
      } else {
        await apiRequest<Student>("/students", {
          method: "POST",
          body: {
            email: email.trim(),
            password,
            course_id: courseId,
            enrollment_no: enrollmentNo.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            date_of_birth: dateOfBirth || null,
            current_semester: semesterValue,
            admission_year: yearValue,
          },
        });
        toast("Student created", "success");
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
      title={initial ? "Edit student" : "Add student"}
      description={
        initial
          ? "Update enrolment details and account status."
          : "This creates a linked sign-in account for the student."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="student-form" loading={saving}>
            {initial ? "Save changes" : "Create student"}
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        {initial ? null : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email address" htmlFor="student-email" required>
              <Input
                id="student-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="student@college.edu"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="student-password"
              required
              hint="At least 8 characters."
            >
              <Input
                id="student-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="student-first" required>
            <Input
              id="student-first"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label="Last name" htmlFor="student-last" required>
            <Input
              id="student-last"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course" htmlFor="student-course" required>
            <Select
              id="student-course"
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Enrolment number" htmlFor="student-enrollment" required>
            <Input
              id="student-enrollment"
              value={enrollmentNo}
              onChange={(event) => setEnrollmentNo(event.target.value)}
              className="font-mono"
              placeholder="ENR-2024-001"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current semester" htmlFor="student-semester" required>
            <Input
              id="student-semester"
              type="number"
              min={1}
              max={selectedCourse?.duration_semesters ?? 12}
              value={semester}
              onChange={(event) => setSemester(event.target.value)}
            />
          </Field>
          <Field label="Admission year" htmlFor="student-year" required>
            <Input
              id="student-year"
              type="number"
              min={1900}
              max={2100}
              value={admissionYear}
              onChange={(event) => setAdmissionYear(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone" htmlFor="student-phone">
            <Input
              id="student-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optional"
            />
          </Field>
          <Field label="Date of birth" htmlFor="student-dob">
            <Input
              id="student-dob"
              type="date"
              value={dateOfBirth}
              onChange={(event) => setDateOfBirth(event.target.value)}
            />
          </Field>
        </div>

        {initial ? (
          <>
            <Field label="Account status" htmlFor="student-active">
              <Select
                id="student-active"
                value={active ? "active" : "inactive"}
                onChange={(event) => setActive(event.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
            <p className="text-xs text-slate-500">
              Admitted {initial.admission_year} · Last updated{" "}
              {formatDate(initial.updated_at.slice(0, 10))}
            </p>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
