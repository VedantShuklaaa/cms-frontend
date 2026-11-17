"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { apiRequest, apiRequestAll, toApiError } from "@/lib/api";
import {
  DEFAULT_PAGE_SIZE,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import { useCourseOptions, useStudentOptions } from "@/lib/lookups";
import { todayISO } from "@/lib/utils";
import type {
  FeePayment,
  FeeStructure,
  Paginated,
  PaymentMethod,
} from "@/types/api";

export default function FeesPage() {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [courseId, setCourseId] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FeeStructure | null>(null);
  const [paymentsFor, setPaymentsFor] = useState<FeeStructure | null>(null);
  const [deleting, setDeleting] = useState<FeeStructure | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const courses = useCourseOptions();

  const query = useQuery(
    () =>
      apiRequest<Paginated<FeeStructure>>("/fees", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          course_id: courseId || undefined,
          academic_year: academicYear || undefined,
          include_inactive: includeInactive ? true : undefined,
        },
      }),
    [
      page,
      perPage,
      debouncedSearch,
      courseId,
      academicYear,
      includeInactive,
    ],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/fees/${deleting.id}`, { method: "DELETE" });
      toast("Fee structure deactivated", "success");
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
        title="Fees"
        description="Fee structures per course and year, with payment recording against each student."
        actions={
          <Button
            icon={<Icon name="plus" size={16} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            New fee structure
          </Button>
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
              placeholder="Search fee names…"
            />
            <Select
              value={courseId}
              onChange={(event) => {
                setCourseId(event.target.value);
                setPage(1);
              }}
              className="sm:w-52"
              aria-label="Filter by course"
            >
              <option value="">All courses</option>
              {courses.data?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </Select>
            <Input
              type="number"
              min={2000}
              max={2100}
              value={academicYear}
              onChange={(event) => {
                setAcademicYear(event.target.value);
                setPage(1);
              }}
              placeholder="Academic year"
              className="h-9 sm:w-40"
              aria-label="Filter by academic year"
            />
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
            icon="wallet"
            title="No fee structures"
            description="Create a fee structure to start recording student payments."
            action={
              <Button
                size="sm"
                icon={<Icon name="plus" size={14} />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                New fee structure
              </Button>
            }
          />
        ) : (
          <>
            <Table minWidth={960}>
              <THead>
                <TH>Fee</TH>
                <TH>Course</TH>
                <TH>Academic year</TH>
                <TH>Amount</TH>
                <TH>Due date</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <TBody>
                {query.data.items.map((fee) => (
                  <TR key={fee.id}>
                    <TD className="font-medium text-slate-900">{fee.name}</TD>
                    <TD className="text-slate-600">{fee.course_name}</TD>
                    <TD className="tabular-nums">{fee.academic_year}</TD>
                    <TD className="whitespace-nowrap font-medium tabular-nums">
                      {formatMoney(fee.amount)}
                    </TD>
                    <TD className="whitespace-nowrap">
                      {formatDate(fee.due_date)}
                    </TD>
                    <TD>
                      <ActiveBadge active={fee.is_active} />
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaymentsFor(fee)}
                        >
                          Payments
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(fee);
                            setFormOpen(true);
                          }}
                          aria-label={`Edit ${fee.name}`}
                          title="Edit"
                        >
                          <Icon name="pencil" size={16} />
                        </Button>
                        {fee.is_active ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => setDeleting(fee)}
                            aria-label={`Deactivate ${fee.name}`}
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

      <FeeFormModal
        open={formOpen}
        initial={editing}
        courses={courses.data ?? []}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          query.refetch();
        }}
      />

      <FeePaymentsModal
        fee={paymentsFor}
        onClose={() => setPaymentsFor(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Deactivate fee structure?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.name}
            </strong>{" "}
            will be hidden. Fee structures with active payments cannot be
            deactivated.
          </>
        }
        confirmLabel="Deactivate"
      />
    </>
  );
}

function FeeFormModal({
  open,
  initial,
  courses,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: FeeStructure | null;
  courses: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCourseId(initial?.course_id ?? "");
    setYear(String(initial?.academic_year ?? new Date().getFullYear()));
    setName(initial?.name ?? "");
    setAmount(String(initial?.amount ?? ""));
    setDueDate(initial?.due_date ?? "");
    setActive(initial?.is_active ?? true);
    setError(null);
  }, [open, initial]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const yearValue = Number(year);
    const amountValue = Number(amount);
    if (!courseId) return setError("Choose a course.");
    if (!name.trim()) return setError("Fee name is required.");
    if (
      !Number.isFinite(amountValue) ||
      !Number.isInteger(amountValue) ||
      amountValue <= 0
    ) {
      return setError("Amount must be a whole number greater than zero.");
    }
    if (!dueDate) return setError("Due date is required.");
    if (!Number.isInteger(yearValue) || yearValue < 2000 || yearValue > 2100) {
      return setError("Enter a valid academic year.");
    }

    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await apiRequest<FeeStructure>(`/fees/${initial.id}`, {
          method: "PUT",
          body: {
            course_id: courseId,
            academic_year: yearValue,
            name: name.trim(),
            amount: amountValue,
            due_date: dueDate,
            is_active: active,
          },
        });
        toast("Fee structure updated", "success");
      } else {
        await apiRequest<FeeStructure>("/fees", {
          method: "POST",
          body: {
            course_id: courseId,
            academic_year: yearValue,
            name: name.trim(),
            amount: amountValue,
            due_date: dueDate,
          },
        });
        toast("Fee structure created", "success");
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
      title={initial ? "Edit fee structure" : "New fee structure"}
      description="Amounts are in whole rupees. Lowering an amount below recorded payments is rejected."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="fee-form" loading={saving}>
            {initial ? "Save changes" : "Create fee"}
          </Button>
        </>
      }
    >
      <form id="fee-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Course" htmlFor="fee-course" required>
          <Select
            id="fee-course"
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
        <Field label="Fee name" htmlFor="fee-name" required>
          <Input
            id="fee-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Semester tuition"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Academic year" htmlFor="fee-year" required>
            <Input
              id="fee-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(event) => setYear(event.target.value)}
            />
          </Field>
          <Field label="Amount (₹)" htmlFor="fee-amount" required>
            <Input
              id="fee-amount"
              type="number"
              min={1}
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="50000"
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Due date" htmlFor="fee-due" required>
            <Input
              id="fee-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </Field>
          {initial ? (
            <Field label="Status" htmlFor="fee-active">
              <Select
                id="fee-active"
                value={active ? "active" : "inactive"}
                onChange={(event) => setActive(event.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}

function FeePaymentsModal({
  fee,
  onClose,
}: {
  fee: FeeStructure | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [studentId, setStudentId] = useState("");
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(todayISO());
  const [method, setMethod] = useState<PaymentMethod>("UPI");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FeePayment | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const students = useStudentOptions(fee?.course_id, Boolean(fee));

  const payments = useQuery(
    () =>
      fee
        ? apiRequestAll<FeePayment>(`/fees/${fee.id}/payments`, {
            include_inactive: true,
          })
        : Promise.resolve([] as FeePayment[]),
    [fee?.id],
    { enabled: Boolean(fee) },
  );

  useEffect(() => {
    if (!fee) return;
    setStudentId("");
    setAmount("");
    setReference("");
    setPaidOn(todayISO());
    setMethod("UPI");
    setError(null);
  }, [fee]);

  const paidByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const payment of payments.data ?? []) {
      if (!payment.is_active) continue;
      map.set(
        payment.student_id,
        (map.get(payment.student_id) ?? 0) + payment.amount,
      );
    }
    return map;
  }, [payments.data]);

  const outstanding = fee
    ? Math.max(0, fee.amount - (paidByStudent.get(studentId) ?? 0))
    : 0;

  function handleStudentChange(value: string) {
    setStudentId(value);
    if (!fee) return;
    const balance = Math.max(
      0,
      fee.amount - (paidByStudent.get(value) ?? 0),
    );
    setAmount(balance > 0 ? String(balance) : "");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fee) return;
    const value = Number(amount);
    if (!studentId) return setError("Choose a student.");
    if (
      !Number.isFinite(value) ||
      !Number.isInteger(value) ||
      value <= 0
    ) {
      return setError("Amount must be a whole number greater than zero.");
    }
    if (value > outstanding) {
      return setError(
        `Payment cannot exceed the outstanding balance of ${formatMoney(
          outstanding,
        )}.`,
      );
    }
    if (!paidOn) return setError("Payment date is required.");
    if (paidOn > todayISO()) return setError("Payment date cannot be in the future.");

    setSaving(true);
    setError(null);
    try {
      await apiRequest<FeePayment>(`/fees/${fee.id}/payments`, {
        method: "POST",
        body: {
          student_id: studentId,
          amount: value,
          paid_on: paidOn,
          method,
          reference: reference.trim() || null,
        },
      });
      toast("Payment recorded", "success");
      setStudentId("");
      setAmount("");
      setReference("");
      payments.refetch();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeletePayment() {
    if (!fee || !deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(
        `/fees/${fee.id}/payments/${deleting.id}`,
        { method: "DELETE" },
      );
      toast("Payment removed", "success");
      setDeleting(null);
      payments.refetch();
    } catch (err: unknown) {
      toast(toApiError(err).message, "error");
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <Modal
      open={Boolean(fee)}
      onClose={onClose}
      size="xl"
      title={fee ? `Payments · ${fee.name}` : "Payments"}
      description={
        fee
          ? `${fee.course_name} · ${fee.academic_year} · ${formatMoney(
              fee.amount,
            )} per student`
          : undefined
      }
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Record a payment
            </h3>
            {studentId ? (
              <span className="text-xs text-slate-500">
                Outstanding:{" "}
                <strong className="font-semibold text-slate-700">
                  {formatMoney(outstanding)}
                </strong>
              </span>
            ) : null}
          </div>
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Student" htmlFor="payment-student" required>
              <Select
                id="payment-student"
                value={studentId}
                onChange={(event) => handleStudentChange(event.target.value)}
                disabled={students.loading}
              >
                <option value="">
                  {students.loading ? "Loading students…" : "Select a student"}
                </option>
                {students.data?.map((student) => {
                  const balance = Math.max(
                    0,
                    (fee?.amount ?? 0) - (paidByStudent.get(student.id) ?? 0),
                  );
                  return (
                    <option key={student.id} value={student.id}>
                      {student.first_name} {student.last_name} ·{" "}
                      {student.enrollment_no} · {formatMoney(balance)} due
                    </option>
                  );
                })}
              </Select>
            </Field>
            <Field
              label="Amount (₹)"
              htmlFor="payment-amount"
              required
              hint={
                studentId && outstanding <= 0
                  ? "This student has fully paid."
                  : undefined
              }
            >
              <Input
                id="payment-amount"
                type="number"
                min={1}
                max={outstanding || undefined}
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={studentId ? String(outstanding) : "0"}
                disabled={!studentId || outstanding <= 0}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Paid on" htmlFor="payment-date" required>
              <Input
                id="payment-date"
                type="date"
                max={todayISO()}
                value={paidOn}
                onChange={(event) => setPaidOn(event.target.value)}
              />
            </Field>
            <Field label="Method" htmlFor="payment-method" required>
              <Select
                id="payment-method"
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as PaymentMethod)
                }
              >
                {PAYMENT_METHODS.map((value) => (
                  <option key={value} value={value}>
                    {PAYMENT_METHOD_LABELS[value]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Reference" htmlFor="payment-reference">
              <Input
                id="payment-reference"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Optional"
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={saving}
              disabled={!studentId || outstanding <= 0}
              icon={<Icon name="banknote" size={16} />}
            >
              Record payment
            </Button>
          </div>
        </form>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-900">
            Payment history
          </h3>
          {payments.loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-10 text-sm text-slate-500">
              <Spinner /> Loading payments…
            </div>
          ) : payments.error ? (
            <ErrorState error={payments.error} onRetry={payments.refetch} />
          ) : !payments.data || payments.data.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No payments recorded for this fee yet.
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto rounded-xl border border-slate-200">
              <Table minWidth={720}>
                <THead>
                  <TH>Student</TH>
                  <TH>Amount</TH>
                  <TH>Paid on</TH>
                  <TH>Method</TH>
                  <TH>Reference</TH>
                  <TH className="text-right">Actions</TH>
                </THead>
                <TBody>
                  {payments.data.map((payment) => (
                    <TR key={payment.id}>
                      <TD>
                        <div className="font-medium text-slate-900">
                          {payment.student_first_name}{" "}
                          {payment.student_last_name}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {payment.enrollment_no}
                        </div>
                      </TD>
                      <TD className="whitespace-nowrap font-medium tabular-nums">
                        {formatMoney(payment.amount)}
                      </TD>
                      <TD className="whitespace-nowrap">
                        {formatDate(payment.paid_on)}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-1.5">
                          <Badge tone="sky">
                            {PAYMENT_METHOD_LABELS[payment.method]}
                          </Badge>
                          {!payment.is_active ? (
                            <Badge tone="slate">Removed</Badge>
                          ) : null}
                        </div>
                      </TD>
                      <TD className="text-xs text-slate-500">
                        {payment.reference || "—"}
                      </TD>
                      <TD>
                        <div className="flex justify-end">
                          {payment.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(payment)}
                              aria-label={`Remove payment for ${payment.student_first_name} ${payment.student_last_name}`}
                              title="Remove payment"
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
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDeletePayment}
        pending={deletePending}
        title="Remove payment?"
        description={
          <>
            The {deleting ? formatMoney(deleting.amount) : ""} payment by{" "}
            {deleting?.student_first_name} {deleting?.student_last_name} will be
            soft-deleted and the balance recalculated.
          </>
        }
        confirmLabel="Remove payment"
      />
    </Modal>
  );
}
