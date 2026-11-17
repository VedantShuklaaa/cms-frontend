"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarList, PercentRing, ProgressBar } from "@/components/ui/chart";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/feedback";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney, formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import {
  useCourseOptions,
  useDepartmentOptions,
  useExamOptions,
  useSubjectOptions,
} from "@/lib/lookups";
import { cn, todayISO } from "@/lib/utils";
import type {
  AttendanceReportRow,
  FeeReportRow,
  OverviewReport,
  ResultsReportRow,
} from "@/types/api";

type Tab = "overview" | "attendance" | "results" | "fees";

export default function ReportsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [tab, setTab] = useState<Tab>(isAdmin ? "overview" : "attendance");

  const tabs: { key: Tab; label: string; icon: IconName }[] = [
    ...(isAdmin
      ? [{ key: "overview" as const, label: "Overview", icon: "dashboard" as const }]
      : []),
    { key: "attendance" as const, label: "Attendance", icon: "clipboard" as const },
    { key: "results" as const, label: "Results", icon: "award" as const },
    ...(isAdmin
      ? [{ key: "fees" as const, label: "Fees", icon: "wallet" as const }]
      : []),
  ];

  return (
    <>
      <PageHeader
        title="Reports"
        description={
          isAdmin
            ? "College-wide analytics for attendance, results and fee collection."
            : "Attendance and result analytics for the subjects you teach."
        }
      />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-200/40">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
              tab === item.key
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100",
            )}
            aria-pressed={tab === item.key}
          >
            <Icon name={item.icon} size={14} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && isAdmin ? <OverviewTab /> : null}
      {tab === "attendance" ? <AttendanceTab /> : null}
      {tab === "results" ? <ResultsTab /> : null}
      {tab === "fees" && isAdmin ? <FeesTab /> : null}
    </>
  );
}

function OverviewTab() {
  const query = useQuery(() => apiRequest<OverviewReport>("/reports/overview"), []);

  if (query.loading) {
    return (
      <Card>
        <LoadingState label="Building the overview…" />
      </Card>
    );
  }
  if (query.error) {
    return (
      <Card>
        <ErrorState error={query.error} onRetry={query.refetch} />
      </Card>
    );
  }
  if (!query.data) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Departments"
          value={query.data.departments}
          icon="building"
          accent="indigo"
        />
        <StatCard
          label="Courses"
          value={query.data.courses}
          icon="book"
          accent="sky"
        />
        <StatCard
          label="Subjects"
          value={query.data.subjects}
          icon="layers"
          accent="violet"
        />
        <StatCard
          label="Faculty"
          value={query.data.faculty}
          icon="users"
          accent="emerald"
        />
        <StatCard
          label="Students"
          value={query.data.students}
          icon="graduation"
          accent="amber"
        />
        <StatCard
          label="Active assignments"
          value={query.data.active_assignments}
          icon="clipboardList"
          accent="rose"
        />
        <StatCard
          label="Notices"
          value={query.data.notices}
          icon="megaphone"
          accent="slate"
        />
        <Card>
          <div className="flex h-full flex-col justify-center p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Total people
            </p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums text-slate-900">
              {formatNumber(query.data.students + query.data.faculty)}
            </p>
            <p className="text-xs text-slate-500">
              {formatNumber(query.data.students)} students ·{" "}
              {formatNumber(query.data.faculty)} faculty
            </p>
          </div>
        </Card>
      </div>
      <Card>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">
            Structure at a glance
          </h2>
        </div>
        <div className="p-5">
          <BarList
            items={[
              {
                label: "Courses",
                value: query.data.courses,
                max: Math.max(query.data.courses, 1),
              },
              {
                label: "Subjects",
                value: query.data.subjects,
                max: Math.max(query.data.subjects, 1),
              },
              {
                label: "Students",
                value: query.data.students,
                max: Math.max(query.data.students, 1),
              },
              {
                label: "Faculty",
                value: query.data.faculty,
                max: Math.max(query.data.students, query.data.faculty, 1),
                tone: "emerald",
              },
            ]}
          />
        </div>
      </Card>
    </div>
  );
}

function AttendanceTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const subjects = useSubjectOptions({ mine: !isAdmin });
  const courses = useCourseOptions();
  const departments = useDepartmentOptions();

  const query = useQuery(
    () =>
      apiRequest<AttendanceReportRow[]>("/reports/attendance", {
        params: {
          subject_id: subjectId || undefined,
          course_id: courseId || undefined,
          department_id: departmentId || undefined,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      }),
    [subjectId, courseId, departmentId, dateFrom, dateTo],
  );

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const totals = useMemo(
    () =>
      rows.reduce(
        (accumulator, row) => ({
          total: accumulator.total + row.total,
          present: accumulator.present + row.present,
          absent: accumulator.absent + row.absent,
          late: accumulator.late + row.late,
          excused: accumulator.excused + row.excused,
        }),
        { total: 0, present: 0, absent: 0, late: 0, excused: 0 },
      ),
    [rows],
  );
  const overallPercent =
    totals.total === 0
      ? 0
      : Math.round(((totals.present + totals.late) / totals.total) * 100);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="w-full sm:w-52"
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
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="w-full sm:w-44"
            aria-label="Filter by course"
          >
            <option value="">All courses</option>
            {courses.data?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </Select>
          {isAdmin ? (
            <Select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className="w-full sm:w-44"
              aria-label="Filter by department"
            >
              <option value="">All departments</option>
              {departments.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Input
            type="date"
            value={dateFrom}
            max={dateTo || todayISO()}
            onChange={(event) => setDateFrom(event.target.value)}
            className="h-9 w-full sm:w-40"
            aria-label="From date"
          />
          <Input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            max={todayISO()}
            onChange={(event) => setDateTo(event.target.value)}
            className="h-9 w-full sm:w-40"
            aria-label="To date"
          />
          {subjectId || courseId || departmentId || dateFrom || dateTo ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubjectId("");
                setCourseId("");
                setDepartmentId("");
                setDateFrom("");
                setDateTo("");
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </Card>

      {query.loading ? (
        <Card>
          <LoadingState label="Crunching attendance…" />
        </Card>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={query.refetch} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="clipboard"
            title="No attendance data"
            description="No attendance records match these filters."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
            <Card>
              <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                <PercentRing value={overallPercent} label="attendance" />
                <div className="w-full space-y-2 text-xs">
                  <div className="rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="font-semibold text-emerald-700">
                      {formatNumber(totals.present + totals.late)}
                    </span>{" "}
                    <span className="text-emerald-600">attended classes</span>
                  </div>
                  <div className="rounded-lg bg-rose-50 px-3 py-2">
                    <span className="font-semibold text-rose-700">
                      {formatNumber(totals.absent)}
                    </span>{" "}
                    <span className="text-rose-600">absences</span>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-2">
                    <span className="font-semibold text-slate-700">
                      {formatNumber(totals.total)}
                    </span>{" "}
                    <span className="text-slate-600">marks in total</span>
                  </div>
                </div>
              </div>
            </Card>
            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Attendance by subject
                </h2>
                <p className="text-xs text-slate-500">
                  Present and late count as attended.
                </p>
              </div>
              <div className="p-5">
                <BarList
                  items={rows
                    .slice()
                    .sort((a, b) => b.attendance_percent - a.attendance_percent)
                    .slice(0, 8)
                    .map((row) => ({
                      label: row.subject_name,
                      sublabel: `${row.subject_code} · ${row.course_name}`,
                      value: row.attendance_percent,
                      max: 100,
                      valueLabel: `${row.attendance_percent}%`,
                      tone:
                        row.attendance_percent >= 75
                          ? "emerald"
                          : row.attendance_percent >= 50
                            ? "amber"
                            : "rose",
                    }))}
                />
              </div>
            </Card>
          </div>

          <Card>
            <div className="overflow-hidden">
              <Table minWidth={960}>
                <THead>
                  <TH>Subject</TH>
                  <TH>Course</TH>
                  <TH>Total</TH>
                  <TH>Present</TH>
                  <TH>Absent</TH>
                  <TH>Late</TH>
                  <TH>Excused</TH>
                  <TH>Attendance</TH>
                </THead>
                <TBody>
                  {rows.map((row) => (
                    <TR key={row.subject_id}>
                      <TD>
                        <div className="font-medium text-slate-900">
                          {row.subject_name}
                        </div>
                        <div className="font-mono text-xs text-slate-500">
                          {row.subject_code}
                        </div>
                      </TD>
                      <TD className="text-slate-600">{row.course_name}</TD>
                      <TD className="tabular-nums">{row.total}</TD>
                      <TD className="tabular-nums text-emerald-600">
                        {row.present}
                      </TD>
                      <TD className="tabular-nums text-rose-600">
                        {row.absent}
                      </TD>
                      <TD className="tabular-nums text-amber-600">{row.late}</TD>
                      <TD className="tabular-nums text-sky-600">
                        {row.excused}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={row.attendance_percent}
                            size="sm"
                            tone={
                              row.attendance_percent >= 75
                                ? "emerald"
                                : row.attendance_percent >= 50
                                  ? "amber"
                                  : "rose"
                            }
                            className="w-20"
                          />
                          <span className="w-10 text-right text-xs font-medium tabular-nums text-slate-600">
                            {row.attendance_percent}%
                          </span>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function ResultsTab() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";

  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [courseId, setCourseId] = useState("");

  const exams = useExamOptions();
  const subjects = useSubjectOptions({ mine: !isAdmin });
  const courses = useCourseOptions();

  const query = useQuery(
    () =>
      apiRequest<ResultsReportRow[]>("/reports/results", {
        params: {
          exam_id: examId || undefined,
          subject_id: subjectId || undefined,
          course_id: courseId || undefined,
        },
      }),
    [examId, subjectId, courseId],
  );

  const rows = query.data ?? [];
  const totals = rows.reduce(
    (accumulator, row) => ({
      graded: accumulator.graded + row.students_graded,
    }),
    { graded: 0 },
  );

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Select
            value={examId}
            onChange={(event) => setExamId(event.target.value)}
            className="w-full sm:w-60"
            aria-label="Filter by exam"
          >
            <option value="">All exams</option>
            {exams.data?.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name} · {exam.subject_code}
              </option>
            ))}
          </Select>
          <Select
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
            className="w-full sm:w-52"
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
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="w-full sm:w-44"
            aria-label="Filter by course"
          >
            <option value="">All courses</option>
            {courses.data?.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name}
              </option>
            ))}
          </Select>
          {examId || subjectId || courseId ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setExamId("");
                setSubjectId("");
                setCourseId("");
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </Card>

      {query.loading ? (
        <Card>
          <LoadingState label="Crunching results…" />
        </Card>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={query.refetch} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="award"
            title="No result data"
            description="No results match these filters yet."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Exams in report"
              value={rows.length}
              icon="calendarDays"
              accent="indigo"
            />
            <StatCard
              label="Students graded"
              value={formatNumber(totals.graded)}
              icon="usersRound"
              accent="violet"
            />
            <StatCard
              label="Average pass rate"
              value={`${Math.round(
                rows.reduce((sum, row) => sum + row.pass_rate, 0) / rows.length,
              )}%`}
              hint="Pass mark is 40%"
              icon="trendingUp"
              accent="emerald"
            />
          </div>

          <Card>
            <Table minWidth={980}>
              <THead>
                <TH>Exam</TH>
                <TH>Subject</TH>
                <TH>Graded</TH>
                <TH>Average</TH>
                <TH>Highest</TH>
                <TH>Lowest</TH>
                <TH>Pass rate</TH>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.exam_id}>
                    <TD>
                      <div className="font-medium text-slate-900">
                        {row.exam_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        Out of {row.max_marks}
                      </div>
                    </TD>
                    <TD>
                      <div className="text-slate-700">{row.subject_name}</div>
                      <div className="font-mono text-xs text-slate-500">
                        {row.subject_code}
                      </div>
                    </TD>
                    <TD className="tabular-nums">{row.students_graded}</TD>
                    <TD className="whitespace-nowrap tabular-nums">
                      {row.average_marks}
                      <span className="text-xs text-slate-400">
                        {" "}
                        / {row.max_marks}
                      </span>
                    </TD>
                    <TD className="tabular-nums text-emerald-600">
                      {row.highest_marks}
                    </TD>
                    <TD className="tabular-nums text-rose-600">
                      {row.lowest_marks}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={row.pass_rate}
                          size="sm"
                          tone={row.pass_rate >= 75 ? "emerald" : "amber"}
                          className="w-20"
                        />
                        <span className="w-10 text-right text-xs font-medium tabular-nums text-slate-600">
                          {row.pass_rate}%
                        </span>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}

function FeesTab() {
  const [courseId, setCourseId] = useState("");
  const [year, setYear] = useState("");
  const courses = useCourseOptions();

  const query = useQuery(
    () =>
      apiRequest<FeeReportRow[]>("/reports/fees", {
        params: {
          course_id: courseId || undefined,
          academic_year: year || undefined,
        },
      }),
    [courseId, year],
  );

  const rows = query.data ?? [];
  const totals = rows.reduce(
    (accumulator, row) => ({
      amount: accumulator.amount + row.amount,
      collected: accumulator.collected + row.collected,
      outstanding: accumulator.outstanding + row.outstanding,
      payments: accumulator.payments + row.payment_count,
    }),
    { amount: 0, collected: 0, outstanding: 0, payments: 0 },
  );
  const collectionRate =
    totals.amount === 0
      ? 0
      : Math.round((totals.collected / totals.amount) * 100);

  return (
    <div className="space-y-5">
      <Card>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <Select
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            className="w-full sm:w-56"
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
            value={year}
            onChange={(event) => setYear(event.target.value)}
            placeholder="Academic year"
            className="h-9 w-full sm:w-44"
            aria-label="Filter by academic year"
          />
          {courseId || year ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCourseId("");
                setYear("");
              }}
            >
              Reset
            </Button>
          ) : null}
        </div>
      </Card>

      {query.loading ? (
        <Card>
          <LoadingState label="Crunching fee collection…" />
        </Card>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={query.refetch} />
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="wallet"
            title="No fee data"
            description="No fee structures match these filters."
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Billed"
              value={formatMoney(totals.amount)}
              icon="wallet"
              accent="indigo"
            />
            <StatCard
              label="Collected"
              value={formatMoney(totals.collected)}
              hint={`${collectionRate}% of billed`}
              icon="banknote"
              accent="emerald"
            />
            <StatCard
              label="Outstanding"
              value={formatMoney(totals.outstanding)}
              icon="alert"
              accent="rose"
            />
            <StatCard
              label="Payments"
              value={formatNumber(totals.payments)}
              icon="checkCircle"
              accent="sky"
            />
          </div>

          <Card>
            <Table minWidth={960}>
              <THead>
                <TH>Fee</TH>
                <TH>Course</TH>
                <TH>Year</TH>
                <TH>Amount</TH>
                <TH>Collected</TH>
                <TH>Outstanding</TH>
                <TH>Progress</TH>
                <TH>Payments</TH>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const pct =
                    row.amount === 0
                      ? 0
                      : Math.round((row.collected / row.amount) * 100);
                  return (
                    <TR key={row.fee_structure_id}>
                      <TD className="font-medium text-slate-900">{row.name}</TD>
                      <TD className="text-slate-600">{row.course_name}</TD>
                      <TD className="tabular-nums">{row.academic_year}</TD>
                      <TD className="whitespace-nowrap tabular-nums">
                        {formatMoney(row.amount)}
                      </TD>
                      <TD className="whitespace-nowrap tabular-nums text-emerald-600">
                        {formatMoney(row.collected)}
                      </TD>
                      <TD className="whitespace-nowrap tabular-nums text-rose-600">
                        {formatMoney(row.outstanding)}
                      </TD>
                      <TD>
                        <div className="flex items-center gap-2">
                          <ProgressBar
                            value={pct}
                            size="sm"
                            tone={pct >= 100 ? "emerald" : "indigo"}
                            className="w-20"
                          />
                          <span className="w-10 text-right text-xs font-medium tabular-nums text-slate-600">
                            {pct}%
                          </span>
                        </div>
                      </TD>
                      <TD>
                        <Badge tone="slate">{row.payment_count}</Badge>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
