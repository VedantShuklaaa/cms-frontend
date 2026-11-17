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
import { Field, Input, SearchInput, Textarea } from "@/components/ui/input";
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
import type { Department, Paginated } from "@/types/api";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const query = useQuery(
    () =>
      apiRequest<Paginated<Department>>("/departments", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          include_inactive: isAdmin && includeInactive ? true : undefined,
        },
      }),
    [page, perPage, debouncedSearch, includeInactive, isAdmin],
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(department: Department) {
    setEditing(department);
    setFormOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/departments/${deleting.id}`, { method: "DELETE" });
      toast("Department deactivated", "success");
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
        title="Departments"
        description="The academic units that own courses, faculty and subjects across the college."
        actions={
          isAdmin ? (
            <Button icon={<Icon name="plus" size={16} />} onClick={openCreate}>
              New department
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder="Search by name or code…"
          />
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
            icon="building"
            title="No departments found"
            description={
              search
                ? "No departments match your search. Try a different term."
                : "Create your first department to start building the academic structure."
            }
            action={
              isAdmin && !search ? (
                <Button
                  size="sm"
                  icon={<Icon name="plus" size={14} />}
                  onClick={openCreate}
                >
                  New department
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <Table minWidth={820}>
              <THead>
                <TH>Department</TH>
                <TH>Code</TH>
                <TH>Description</TH>
                <TH>Status</TH>
                <TH>Created</TH>
                {isAdmin ? <TH className="text-right">Actions</TH> : null}
              </THead>
              <TBody>
                {query.data.items.map((department) => (
                  <TR key={department.id}>
                    <TD>
                      <div className="font-medium text-slate-900">
                        {department.name}
                      </div>
                    </TD>
                    <TD>
                      <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">
                        {department.code}
                      </span>
                    </TD>
                    <TD className="max-w-xs">
                      <p className="truncate text-sm text-slate-500">
                        {department.description || "—"}
                      </p>
                    </TD>
                    <TD>
                      <ActiveBadge active={department.is_active} />
                    </TD>
                    <TD className="whitespace-nowrap text-xs">
                      {formatDateTime(department.created_at)}
                    </TD>
                    {isAdmin ? (
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(department)}
                            aria-label={`Edit ${department.name}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {department.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(department)}
                              aria-label={`Deactivate ${department.name}`}
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

      <DepartmentFormModal
        open={formOpen}
        initial={editing}
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
        title="Deactivate department?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.name}
            </strong>{" "}
            will be hidden from non-admin views. Departments with active courses
            cannot be deactivated.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function DepartmentFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Department | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setCode(initial?.code ?? "");
    setDescription(initial?.description ?? "");
    setError(null);
  }, [open, initial]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || !code.trim()) {
      setError("Name and code are both required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const body = {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
      };
      if (initial) {
        await apiRequest<Department>(`/departments/${initial.id}`, {
          method: "PUT",
          body,
        });
        toast("Department updated", "success");
      } else {
        await apiRequest<Department>("/departments", {
          method: "POST",
          body,
        });
        toast("Department created", "success");
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
      title={initial ? "Edit department" : "New department"}
      description={
        initial
          ? "Update the department details. The code is stored in uppercase."
          : "Add an academic unit to your college structure."
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="department-form" loading={saving}>
            {initial ? "Save changes" : "Create department"}
          </Button>
        </>
      }
    >
      <form
        id="department-form"
        onSubmit={handleSubmit}
        className="space-y-4"
        noValidate
      >
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Department name" htmlFor="department-name" required>
          <Input
            id="department-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Computer Science"
            autoFocus
          />
        </Field>
        <Field
          label="Code"
          htmlFor="department-code"
          required
          hint="A short unique code, e.g. CSE. It will be uppercased."
        >
          <Input
            id="department-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="CSE"
            className="font-mono"
          />
        </Field>
        <Field label="Description" htmlFor="department-description">
          <Textarea
            id="department-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A short description of this department (optional)."
          />
        </Field>
      </form>
    </Modal>
  );
}
