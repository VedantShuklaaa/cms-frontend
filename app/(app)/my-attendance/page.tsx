"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarList, PercentRing } from "@/components/ui/chart";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiRequestAll } from "@/lib/api";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_STATUSES,
  ATTENDANCE_TONES,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import { todayISO } from "@/lib/utils";
import type { Attendance, AttendanceStatus } from "@/types/api";

interface SubjectSummary {
  subjectId: string;
  name: string;
  code: string;
  total: number;
  attended: number;
  absent: number;
  late: number;
  excused: number;
  percent: number;
}

function summarize(records: Attendance[]): SubjectSummary[] {
  const groups = new Map<string, SubjectSummary>();
  for (const record of records) {
    const current = groups.get(record.subject_id) ?? {
      subjectId: record.subject_id,
      name: record.subject_name,
      code: record.subject_code,
      total: 0,
      attended: 0,
      absent: 0,
      late: 0,
      excused: 0,
      percent: 0,
    };
    current.total += 1;
    if (record.status === "PRESENT") current.attended += 1;
    if (record.status === "LATE") {
      current.attended += 1;
      current.late += 1;
    }
    if (record.status === "ABSENT") current.absent += 1;
    if (record.status === "EXCUSED") current.excused += 1;
    current.percent =
      current.total === 0
        ? 0
        : Math.round((current.attended / current.total) * 100);
    groups.set(record.subject_id, current);
  }
  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export default function MyAttendancePage() {
  const [subjectId, setSubjectId] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const query = useQuery(
    () => apiRequestAll<Attendance>("/attendance/me"),
    [],
  );

  const records = useMemo(() => query.data ?? [], [query.data]);
  const subjects = useMemo(() => summarize(records), [records]);

  const visible = useMemo(() => {
    return records
      .filter((record) => {
        if (subjectId && record.subject_id !== subjectId) return false;
        if (status && record.status !== status) return false;
        if (dateFrom && record.attendance_date < dateFrom) return false;
        if (dateTo && record.attendance_date > dateTo) return false;
        return true;
      })
      .sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
  }, [records, subjectId, status, dateFrom, dateTo]);

  const overall = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      EXCUSED: 0,
    };
    for (const record of records) tally[record.status] += 1;
    const total = records.length;
    const attended = tally.PRESENT + tally.LATE;
    return {
      total,
      attended,
      late: tally.LATE,
      absent: tally.ABSENT,
      excused: tally.EXCUSED,
      percent: total === 0 ? 0 : Math.round((attended / total) * 100),
    };
  }, [records]);

  const pageItems = visible.slice((page - 1) * perPage, page * perPage);
  const hasFilters = Boolean(subjectId || status || dateFrom || dateTo);
  const belowThreshold = overall.total > 0 && overall.percent < 75;

  function resetFilters() {
    setSubjectId("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="My attendance"
        description="Your attendance across every subject, with subject-wise percentages."
      />

      {query.loading ? (
        <Card>
          <LoadingState label="Loading your attendance…" />
        </Card>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={query.refetch} />
        </Card>
      ) : records.length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboard"
            title="No attendance yet"
            description="Once your faculty mark attendance, your record will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                <PercentRing value={overall.percent} label="overall" />
                <div className="w-full space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {overall.attended} of {overall.total} classes attended
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Includes late arrivals.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <div className="font-semibold text-emerald-700">
                        {overall.attended - overall.late}
                      </div>
                      <div className="text-emerald-600">Present</div>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2">
                      <div className="font-semibold text-amber-700">
                        {overall.late}
                      </div>
                      <div className="text-amber-600">Late</div>
                    </div>
                    <div className="rounded-lg bg-rose-50 px-3 py-2">
                      <div className="font-semibold text-rose-700">
                        {overall.absent}
                      </div>
                      <div className="text-rose-600">Absent</div>
                    </div>
                    <div className="rounded-lg bg-sky-50 px-3 py-2">
                      <div className="font-semibold text-sky-700">
                        {overall.excused}
                      </div>
                      <div className="text-sky-600">Excused</div>
                    </div>
                  </div>
                  {belowThreshold ? (
                    <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      Your attendance is below 75%. Speak to your faculty if you
                      need support catching up.
                    </p>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Subject-wise attendance
                </h2>
                <p className="text-xs text-slate-500">
                  Percentage of classes attended per subject.
                </p>
              </div>
              <div className="p-5">
                <BarList
                  items={subjects.map((subject) => ({
                    label: subject.name,
                    sublabel: `${subject.code} · ${subject.attended}/${subject.total} classes`,
                    value: subject.percent,
                    max: 100,
                    valueLabel: `${subject.percent}%`,
                    tone:
                      subject.percent >= 75
                        ? "emerald"
                        : subject.percent >= 50
                          ? "amber"
                          : "rose",
                  }))}
                />
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-col gap-3 border-b border-slate-100 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={subjectId}
                  onChange={(event) => {
                    setSubjectId(event.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-56"
                  aria-label="Filter by subject"
                >
                  <option value="">All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject.subjectId} value={subject.subjectId}>
                      {subject.code} · {subject.name}
                    </option>
                  ))}
                </Select>
                <Select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-40"
                  aria-label="Filter by status"
                >
                  <option value="">All statuses</option>
                  {ATTENDANCE_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {ATTENDANCE_LABELS[value]}
                    </option>
                  ))}
                </Select>
                <Input
                  type="date"
                  value={dateFrom}
                  max={dateTo || todayISO()}
                  onChange={(event) => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full sm:w-40"
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(event) => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 w-full sm:w-40"
                  aria-label="To date"
                />
                {hasFilters ? (
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                ) : null}
              </div>
            </div>

            {visible.length === 0 ? (
              <EmptyState
                icon="search"
                title="No records match"
                description="Try widening the date range or clearing the filters."
              />
            ) : (
              <>
                <Table minWidth={720}>
                  <THead>
                    <TH>Date</TH>
                    <TH>Subject</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Recorded</TH>
                  </THead>
                  <TBody>
                    {pageItems.map((record) => (
                      <TR key={record.id}>
                        <TD className="whitespace-nowrap">
                          {formatDate(record.attendance_date)}
                        </TD>
                        <TD>
                          <div className="font-medium text-slate-900">
                            {record.subject_name}
                          </div>
                          <div className="font-mono text-xs text-slate-500">
                            {record.subject_code}
                          </div>
                        </TD>
                        <TD>
                          <Badge tone={ATTENDANCE_TONES[record.status]}>
                            {ATTENDANCE_LABELS[record.status]}
                          </Badge>
                        </TD>
                        <TD className="whitespace-nowrap text-right text-xs text-slate-500">
                          {formatDateTime(record.created_at)}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <Pagination
                  page={page}
                  perPage={perPage}
                  total={visible.length}
                  onPageChange={setPage}
                  onPerPageChange={(value) => {
                    setPerPage(value);
                    setPage(1);
                  }}
                />
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
