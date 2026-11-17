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
} from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiRequest, toApiError } from "@/lib/api";
import { DEFAULT_PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useDepartmentOptions } from "@/lib/lookups";
import { initials } from "@/lib/utils";
import type { Faculty, Paginated } from "@/types/api";

export default function FacultyPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState<Faculty | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const departments = useDepartmentOptions();

  const query = useQuery(
    () =>
      apiRequest<Paginated<Faculty>>("/faculty", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          department_id: departmentId || undefined,
          include_inactive: includeInactive ? true : undefined,
        },
      }),
    [page, perPage, debouncedSearch, departmentId, includeInactive],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/faculty/${deleting.id}`, { method: "DELETE" });
      toast("Faculty member deactivated", "success");
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
        title="Faculty"
        description="Faculty accounts and their departmental profiles. Each profile is linked to a sign-in account."
        actions={
          <Button
            icon={<Icon name="plus" size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add faculty
          </Button>
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
              placeholder="Search name, email or ID…"
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
        </div>

        {query.loading && !query.data ? (
          <TableLoading />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            icon="users"
            title="No faculty found"
            description="Add faculty members to grant them access to attendance, results and assignments."
          />
        ) : (
          <>
            <Table minWidth={900}>
              <THead>
                <TH>Faculty</TH>
                <TH>Employee ID</TH>
                <TH>Department</TH>
                <TH>Designation</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {query.data.items.map((member) => (
                  <TR key={member.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[11px] font-bold text-indigo-600">
                          {initials(
                            `${member.first_name} ${member.last_name}`,
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs">{member.employee_id}</TD>
                    <TD className="text-slate-600">{member.department_name}</TD>
                    <TD className="text-slate-600">{member.designation}</TD>
                    <TD>
                      <ActiveBadge active={member.is_active} />
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(member);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${member.first_name} ${member.last_name}`}
                          title="Edit"
                        >
                          <Icon name="pencil" size={16} />
                        </Button>
                        {member.is_active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDeleting(member)}
                            aria-label={`Deactivate ${member.first_name} ${member.last_name}`}
                            title="Deactivate"
                          >
                            <Icon name="trash" size={16} />
                          </Button>
                        ) : null}
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

      <FacultyFormModal
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
        title="Deactivate faculty member?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.first_name} {deleting?.last_name}
            </strong>{" "}
            will lose access immediately. Their profile and teaching history are
            retained.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function FacultyFormModal({
  open,
  initial,
  departments,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Faculty | null;
  departments: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [joinedOn, setJoinedOn] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail(initial?.email ?? "");
    setPassword("");
    setDepartmentId(initial?.department_id ?? "");
    setEmployeeId(initial?.employee_id ?? "");
    setFirstName(initial?.first_name ?? "");
    setLastName(initial?.last_name ?? "");
    setPhone(initial?.phone ?? "");
    setDesignation(initial?.designation ?? "");
    setJoinedOn(initial?.joined_on ?? "");
    setActive(initial?.is_active ?? true);
    setError(null);
  }, [open, initial]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!departmentId) return setError("Choose a department.");
    if (!employeeId.trim() || !firstName.trim() || !lastName.trim()) {
      return setError("Employee ID, first name and last name are required.");
    }
    if (!designation.trim()) return setError("Designation is required.");
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
        await apiRequest<Faculty>(`/faculty/${initial.id}`, {
          method: "PUT",
          body: {
            department_id: departmentId,
            employee_id: employeeId.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            designation: designation.trim(),
            joined_on: joinedOn || null,
            is_active: active,
          },
        });
        toast("Faculty member updated", "success");
      } else {
        await apiRequest<Faculty>("/faculty", {
          method: "POST",
          body: {
            email: email.trim(),
            password,
            department_id: departmentId,
            employee_id: employeeId.trim(),
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim() || null,
            designation: designation.trim(),
            joined_on: joinedOn || null,
          },
        });
        toast("Faculty member created", "success");
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
      title={initial ? "Edit faculty member" : "Add faculty member"}
      description={
        initial
          ? "Update profile details and account status."
          : "This creates a linked sign-in account for the faculty member."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="faculty-form" loading={saving}>
            {initial ? "Save changes" : "Create faculty"}
          </Button>
        </>
      }
    >
      <form id="faculty-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}

        {initial ? null : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email address" htmlFor="faculty-email" required>
              <Input
                id="faculty-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="faculty@college.edu"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Temporary password"
              htmlFor="faculty-password"
              required
              hint="At least 8 characters."
            >
              <Input
                id="faculty-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
            </Field>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="faculty-first" required>
            <Input
              id="faculty-first"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </Field>
          <Field label="Last name" htmlFor="faculty-last" required>
            <Input
              id="faculty-last"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Employee ID" htmlFor="faculty-employee" required>
            <Input
              id="faculty-employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              className="font-mono"
              placeholder="EMP-001"
            />
          </Field>
          <Field label="Department" htmlFor="faculty-department" required>
            <Select
              id="faculty-department"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">Select department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Designation" htmlFor="faculty-designation" required>
            <Input
              id="faculty-designation"
              value={designation}
              onChange={(event) => setDesignation(event.target.value)}
              placeholder="Assistant Professor"
            />
          </Field>
          <Field label="Phone" htmlFor="faculty-phone">
            <Input
              id="faculty-phone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Joined on" htmlFor="faculty-joined">
            <Input
              id="faculty-joined"
              type="date"
              value={joinedOn}
              onChange={(event) => setJoinedOn(event.target.value)}
            />
          </Field>
          {initial ? (
            <Field label="Account status" htmlFor="faculty-active">
              <Select
                id="faculty-active"
                value={active ? "active" : "inactive"}
                onChange={(event) => setActive(event.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          ) : null}
        </div>

        {initial ? (
          <p className="text-xs text-slate-500">
            Last updated {formatDate(initial.updated_at.slice(0, 10))}
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
