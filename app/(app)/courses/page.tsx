"use client";

import { useEffect, useState } from "react";
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
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useDepartmentOptions } from "@/lib/lookups";
import type { Course, Paginated } from "@/types/api";

export default function CoursesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const departments = useDepartmentOptions();

  const query = useQuery(
    () =>
      apiRequest<Paginated<Course>>("/courses", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          department_id: departmentId || undefined,
          include_inactive: isAdmin && includeInactive ? true : undefined,
        },
      }),
    [page, perPage, debouncedSearch, departmentId, includeInactive, isAdmin],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/courses/${deleting.id}`, { method: "DELETE" });
      toast("Course deactivated", "success");
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
        title="Courses"
        description="Programmes offered by each department, with their semester structure."
        actions={
          isAdmin ? (
            <Button
              icon={<Icon name="plus" size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New course
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
              placeholder="Search courses…"
            />
            <Select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setPage(1);
              }}
              className="sm:w-52"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
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
            icon="book"
            title="No courses found"
            description="Courses define the semester structure students are enrolled in."
          />
        ) : (
          <>
            <Table minWidth={860}>
              <THead>
                <TH>Course</TH>
                <TH>Code</TH>
                <TH>Department</TH>
                <TH>Duration</TH>
                <TH>Status</TH>
                {isAdmin ? <TH className="text-right">Actions</TH> : null}
              </THead>
              <TBody>
                {query.data.items.map((course) => (
                  <TR key={course.id}>
                    <TD>
                      <div className="font-medium text-slate-900">{course.name}</div>
                      {course.description ? (
                        <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                          {course.description}
                        </p>
                      ) : null}
                    </TD>
                    <TD>
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">
                        {course.code}
                      </span>
                    </TD>
                    <TD className="text-slate-600">{course.department_name}</TD>
                    <TD className="whitespace-nowrap">
                      {course.duration_semesters} semesters
                    </TD>
                    <TD>
                      <ActiveBadge active={course.is_active} />
                    </TD>
                    {isAdmin ? (
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(course);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${course.name}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {course.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(course)}
                              aria-label={`Deactivate ${course.name}`}
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

      <CourseFormModal
        open={formOpen}
        initial={editing}
        departments={departments.data ?? []}
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
        title="Deactivate course?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.name}
            </strong>{" "}
            will be hidden from non-admin views. Courses with active subjects or
            students cannot be deactivated.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function CourseFormModal({
  open,
  initial,
  departments,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Course | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [departmentId, setDepartmentId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [duration, setDuration] = useState("6");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDepartmentId(initial?.department_id ?? "");
    setName(initial?.name ?? "");
    setCode(initial?.code ?? "");
    setDuration(String(initial?.duration_semesters ?? 6));
    setDescription(initial?.description ?? "");
    setError(null);
  }, [open, initial]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const durationValue = Number(duration);
    if (!departmentId) return setError("Choose a department.");
    if (!name.trim() || !code.trim()) return setError("Name and code are required.");
    if (!Number.isFinite(durationValue) || durationValue < 1 || durationValue > 12) {
      return setError("Duration must be between 1 and 12 semesters.");
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        department_id: departmentId,
        name: name.trim(),
        code: code.trim(),
        duration_semesters: durationValue,
        description: description.trim() || null,
      };
      if (initial) {
        await apiRequest<Course>(`/courses/${initial.id}`, {
          method: "PUT",
          body,
        });
        toast("Course updated", "success");
      } else {
        await apiRequest<Course>("/courses", { method: "POST", body });
        toast("Course created", "success");
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
      title={initial ? "Edit course" : "New course"}
      description="Courses belong to a department and define how many semesters they span."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="course-form" loading={saving}>
            {initial ? "Save changes" : "Create course"}
          </Button>
        </>
      }
    >
      <form id="course-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Department" htmlFor="course-department" required>
          <Select
            id="course-department"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <option value="">Select a department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Course name" htmlFor="course-name" required>
            <Input
              id="course-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. B.Tech Computer Science"
            />
          </Field>
          <Field label="Code" htmlFor="course-code" required>
            <Input
              id="course-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="BTECH-CSE"
              className="font-mono"
            />
          </Field>
        </div>
        <Field
          label="Duration (semesters)"
          htmlFor="course-duration"
          required
          hint="Between 1 and 12 semesters."
        >
          <Input
            id="course-duration"
            type="number"
            min={1}
            max={12}
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
          />
        </Field>
        <Field label="Description" htmlFor="course-description">
          <Textarea
            id="course-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description."
          />
        </Field>
      </form>
    </Modal>
  );
}
