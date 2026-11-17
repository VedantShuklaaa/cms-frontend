"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/chart";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/feedback";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiRequestAll } from "@/lib/api";
import {
  PAYMENT_METHOD_LABELS,
} from "@/lib/constants";
import { formatDate, formatMoney } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import type { FeePayment, FeeStatement } from "@/types/api";

export default function MyFeesPage() {
  const [year, setYear] = useState("");

  const statements = useQuery(() => apiRequestAll<FeeStatement>("/fees/me"), []);
  const payments = useQuery(
    () => apiRequestAll<FeePayment>("/fees/me/payments"),
    [],
  );

  const years = useMemo(() => {
    const set = new Set<number>();
    for (const statement of statements.data ?? []) {
      set.add(statement.academic_year);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [statements.data]);

  const visibleStatements = useMemo(
    () =>
      (statements.data ?? []).filter(
        (statement) => !year || String(statement.academic_year) === year,
      ),
    [statements.data, year],
  );

  const visiblePayments = useMemo(() => {
    if (!year) return payments.data ?? [];
    const structureIds = new Set(
      visibleStatements.map((statement) => statement.fee_structure_id),
    );
    return (payments.data ?? []).filter((payment) =>
      structureIds.has(payment.fee_structure_id),
    );
  }, [payments.data, visibleStatements, year]);

  const totals = visibleStatements.reduce(
    (accumulator, statement) => ({
      amount: accumulator.amount + statement.amount,
      paid: accumulator.paid + statement.paid_amount,
      balance: accumulator.balance + statement.balance,
    }),
    { amount: 0, paid: 0, balance: 0 },
  );

  const loading = statements.loading || payments.loading;
  const error = statements.error ?? payments.error;
  const refetch = () => {
    statements.refetch();
    payments.refetch();
  };

  return (
    <>
      <PageHeader
        title="My fees"
        description="Fee statements, balances and every payment recorded against your account."
        actions={
          years.length > 1 ? (
            <Select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-44"
              aria-label="Filter by academic year"
            >
              <option value="">All years</option>
              {years.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          ) : undefined
        }
      />

      {loading ? (
        <Card>
          <LoadingState label="Loading your fee account…" />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      ) : (statements.data ?? []).length === 0 ? (
        <Card>
          <EmptyState
            icon="wallet"
            title="No fees on record"
            description="Your fee statements will appear here once they are published."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Total fees
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {formatMoney(totals.amount)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Paid
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600">
                  {formatMoney(totals.paid)}
                </p>
              </div>
            </Card>
            <Card>
              <div className="p-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Outstanding
                </p>
                <p
                  className={
                    totals.balance > 0
                      ? "mt-1 text-2xl font-semibold tabular-nums text-rose-600"
                      : "mt-1 text-2xl font-semibold tabular-nums text-slate-900"
                  }
                >
                  {formatMoney(totals.balance)}
                </p>
              </div>
            </Card>
          </div>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Fee statements
              </h2>
              <p className="text-xs text-slate-500">
                Balances update as payments are recorded by the accounts office.
              </p>
            </div>
            {visibleStatements.length === 0 ? (
              <EmptyState
                icon="wallet"
                title="No statements for this year"
                description="Choose a different academic year."
              />
            ) : (
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {visibleStatements.map((statement) => {
                  const pct =
                    statement.amount === 0
                      ? 0
                      : Math.round(
                          (statement.paid_amount / statement.amount) * 100,
                        );
                  return (
                    <div
                      key={statement.fee_structure_id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {statement.name}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {statement.course_name} · {statement.academic_year}
                          </p>
                        </div>
                        <Badge
                          tone={
                            statement.balance <= 0
                              ? "emerald"
                              : statement.due_date <
                                  new Date().toISOString().slice(0, 10)
                                ? "rose"
                                : "amber"
                          }
                        >
                          {statement.balance <= 0
                            ? "Paid"
                            : `Due ${formatDate(statement.due_date)}`}
                        </Badge>
                      </div>
                      <div className="mt-4">
                        <div className="mb-1.5 flex justify-between text-xs">
                          <span className="text-slate-500">
                            {formatMoney(statement.paid_amount)} paid
                          </span>
                          <span className="font-medium text-slate-700">
                            {formatMoney(statement.amount)}
                          </span>
                        </div>
                        <ProgressBar
                          value={pct}
                          tone={pct >= 100 ? "emerald" : "indigo"}
                        />
                        <p className="mt-2 text-xs text-slate-500">
                          Balance{" "}
                          <span
                            className={
                              statement.balance > 0
                                ? "font-semibold text-rose-600"
                                : "font-semibold text-emerald-600"
                            }
                          >
                            {formatMoney(statement.balance)}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Payment history
              </h2>
              <p className="text-xs text-slate-500">
                Receipts recorded against your fee statements.
              </p>
            </div>
            {visiblePayments.length === 0 ? (
              <EmptyState
                icon="banknote"
                title="No payments recorded"
                description="Payments appear here as soon as the accounts office records them."
              />
            ) : (
              <Table minWidth={680}>
                <THead>
                  <TH>Paid on</TH>
                  <TH>Amount</TH>
                  <TH>Method</TH>
                  <TH>Reference</TH>
                  <TH>Status</TH>
                </THead>
                <TBody>
                  {visiblePayments.map((payment) => (
                    <TR key={payment.id}>
                      <TD className="whitespace-nowrap">
                        {formatDate(payment.paid_on)}
                      </TD>
                      <TD className="font-medium tabular-nums">
                        {formatMoney(payment.amount)}
                      </TD>
                      <TD>
                        <Badge tone="sky">
                          {PAYMENT_METHOD_LABELS[payment.method]}
                        </Badge>
                      </TD>
                      <TD className="text-xs text-slate-500">
                        {payment.reference || "—"}
                      </TD>
                      <TD>
                        <Badge tone={payment.is_active ? "emerald" : "slate"}>
                          {payment.is_active ? "Recorded" : "Removed"}
                        </Badge>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
