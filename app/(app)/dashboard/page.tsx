"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarList, PercentRing, ProgressBar } from "@/components/ui/chart";
import {
  EmptyState,
  ErrorState,
  Spinner,
} from "@/components/ui/feedback";
import { StatCard } from "@/components/ui/stat-card";
import { apiRequest, apiRequestAll } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  AUDIENCE_LABELS,
  ROLE_BADGE_TONES,
  ROLE_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import { isPastDate, todayISO } from "@/lib/utils";
import type {
  Assignment,
  Attendance,
  AttendanceReportRow,
  FeeReportRow,
  FeeStatement,
  Faculty,
  Notice,
  OverviewReport,
  Paginated,
  Result,
  ResultsReportRow,
  Student,
  Submission,
  Subject,
} from "@/types/api";

interface NoticesQuery {
  data: Paginated<Notice> | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "ADMIN";
  const isStaff = role === "ADMIN" || role === "FACULTY";

  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  const overview = useQuery(
    () => apiRequest<OverviewReport>("/reports/overview"),
    [],
    { enabled: isAdmin },
  );
  const attendanceReport = useQuery(
    () => apiRequest<AttendanceReportRow[]>("/reports/attendance"),
    [],
    { enabled: isStaff },
  );
  const resultsReport = useQuery(
    () => apiRequest<ResultsReportRow[]>("/reports/results"),
    [],
    { enabled: isStaff },
  );
  const feeReport = useQuery(
    () => apiRequest<FeeReportRow[]>("/reports/fees"),
    [],
    { enabled: isAdmin },
  );

  const facultyProfile = useQuery(
    () => apiRequest<Faculty>("/faculty/me"),
    [],
    { enabled: role === "FACULTY" },
  );
  const studentProfile = useQuery(
    () => apiRequest<Student>("/students/me"),
    [],
    { enabled: role === "STUDENT" },
  );

  const subjects = useQuery(
    () => apiRequestAll<Subject>("/subjects/mine"),
    [],
    { enabled: role === "FACULTY" || role === "STUDENT" },
  );
  const assignments = useQuery(
    () => apiRequestAll<Assignment>("/assignments"),
    [],
    { enabled: isStaff || role === "STUDENT" },
  );
  const todayRegister = useQuery(
    () =>
      apiRequest<Paginated<Attendance>>("/attendance", {
        params: {
          date_from: todayISO(),
          date_to: todayISO(),
          per_page: 1,
        },
      }),
    [],
    { enabled: role === "FACULTY" },
  );

  const myAttendance = useQuery(
    () => apiRequestAll<Attendance>("/attendance/me"),
    [],
    { enabled: role === "STUDENT" },
  );
  const myResults = useQuery(
    () => apiRequestAll<Result>("/results/me"),
    [],
    { enabled: role === "STUDENT" },
  );
  const mySubmissions = useQuery(
    () => apiRequestAll<Submission>("/submissions/me"),
    [],
    { enabled: role === "STUDENT" },
  );
  const myFees = useQuery(
    () => apiRequestAll<FeeStatement>("/fees/me"),
    [],
    { enabled: role === "STUDENT" },
  );

  const notices = useQuery(
    () =>
      apiRequest<Paginated<Notice>>("/notices", {
        params: { per_page: 5 },
      }),
    [],
  );

  const displayName =
    facultyProfile.data
      ? `${facultyProfile.data.first_name} ${facultyProfile.data.last_name}`
      : studentProfile.data
        ? `${studentProfile.data.first_name} ${studentProfile.data.last_name}`
        : user?.email.split("@")[0] ?? "there";

  return (
    <>
      <div className="mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 py-7 text-white shadow-xl shadow-slate-900/10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-indigo-300">
              {today || "Dashboard"}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              Welcome back, {displayName}
            </h1>
            <p className="mt-1 text-sm text-slate-300">
              {role === "ADMIN"
                ? "Here is how the college is doing today."
                : role === "FACULTY"
                  ? "Your teaching overview, at a glance."
                  : "Your attendance, results and deadlines in one place."}
            </p>
          </div>
          {role ? (
            <div className="flex items-center gap-2">
              <Badge tone={ROLE_BADGE_TONES[role]}>{ROLE_LABELS[role]}</Badge>
              <Link
                href="/notices"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-3 text-xs font-medium text-white transition hover:bg-white/20"
              >
                <Icon name="bell" size={14} />
                Notices
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      {role === "ADMIN" ? (
        <AdminDashboard
          overview={overview}
          attendance={attendanceReport}
          results={resultsReport}
          fees={feeReport}
        />
      ) : role === "FACULTY" ? (
        <FacultyDashboard
          profile={facultyProfile}
          subjects={subjects}
          assignments={assignments}
          attendance={attendanceReport}
          results={resultsReport}
          todayRegister={todayRegister}
        />
      ) : (
        <StudentDashboard
          profile={studentProfile}
          subjects={subjects}
          assignments={assignments}
          attendance={myAttendance}
          results={myResults}
          submissions={mySubmissions}
          fees={myFees}
        />
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <NoticesCard notices={notices} />
        {role === "ADMIN" ? (
          <QuickActionsCard />
        ) : (
          <DeadlinesCard assignments={assignments.data ?? []} />
        )}
      </div>
    </>
  );
}

function AdminDashboard({
  overview,
  attendance,
  results,
  fees,
}: {
  overview: ReturnType<typeof useQuery<OverviewReport>>;
  attendance: ReturnType<typeof useQuery<AttendanceReportRow[]>>;
  results: ReturnType<typeof useQuery<ResultsReportRow[]>>;
  fees: ReturnType<typeof useQuery<FeeReportRow[]>>;
}) {
  const feeTotals = (fees.data ?? []).reduce(
    (accumulator, row) => ({
      amount: accumulator.amount + row.amount,
      collected: accumulator.collected + row.collected,
      outstanding: accumulator.outstanding + row.outstanding,
    }),
    { amount: 0, collected: 0, outstanding: 0 },
  );
  const collectionRate =
    feeTotals.amount === 0
      ? 0
      : Math.round((feeTotals.collected / feeTotals.amount) * 100);

  return (
    <div className="space-y-5">
      {overview.loading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Spinner /> Loading college overview…
          </div>
        </Card>
      ) : overview.error ? (
        <Card>
          <ErrorState error={overview.error} onRetry={overview.refetch} />
        </Card>
      ) : overview.data ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Students"
            value={formatNumber(overview.data.students)}
            hint="Enrolled across all courses"
            icon="graduation"
            accent="indigo"
          />
          <StatCard
            label="Faculty"
            value={formatNumber(overview.data.faculty)}
            hint={`${formatNumber(overview.data.departments)} departments`}
            icon="users"
            accent="violet"
          />
          <StatCard
            label="Subjects"
            value={formatNumber(overview.data.subjects)}
            hint={`${formatNumber(overview.data.courses)} courses`}
            icon="layers"
            accent="sky"
          />
          <StatCard
            label="Active assignments"
            value={formatNumber(overview.data.active_assignments)}
            hint={`${formatNumber(overview.data.notices)} notices published`}
            icon="clipboardList"
            accent="amber"
          />
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card>
          <SectionHeader
            title="Attendance by subject"
            subtitle="Present + late as attended"
            href="/reports"
          />
          <div className="p-5">
            {attendance.loading ? (
              <InlineLoading />
            ) : attendance.error ? (
              <p className="text-sm text-rose-600">Could not load attendance.</p>
            ) : (attendance.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No attendance recorded yet.</p>
            ) : (
              <BarList
                items={(attendance.data ?? [])
                  .slice()
                  .sort((a, b) => b.attendance_percent - a.attendance_percent)
                  .slice(0, 5)
                  .map((row) => ({
                    label: row.subject_name,
                    sublabel: `${row.subject_code} · ${row.total} marks`,
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
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Results by exam"
            subtitle="Pass mark is 40%"
            href="/reports"
          />
          <div className="p-5">
            {results.loading ? (
              <InlineLoading />
            ) : results.error ? (
              <p className="text-sm text-rose-600">Could not load results.</p>
            ) : (results.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No results recorded yet.</p>
            ) : (
              <BarList
                items={(results.data ?? [])
                  .slice()
                  .sort((a, b) => b.pass_rate - a.pass_rate)
                  .slice(0, 5)
                  .map((row) => ({
                    label: row.exam_name,
                    sublabel: `${row.subject_code} · ${row.students_graded} graded`,
                    value: row.pass_rate,
                    max: 100,
                    valueLabel: `${row.pass_rate}%`,
                    tone: row.pass_rate >= 75 ? "emerald" : "amber",
                  }))}
              />
            )}
          </div>
        </Card>

        <Card>
          <SectionHeader
            title="Fee collection"
            subtitle="Across all fee structures"
            href="/reports"
          />
          <div className="flex flex-col items-center gap-5 p-5">
            {fees.loading ? (
              <InlineLoading />
            ) : fees.error ? (
              <p className="text-sm text-rose-600">Could not load fee data.</p>
            ) : (fees.data ?? []).length === 0 ? (
              <p className="text-sm text-slate-500">No fee structures yet.</p>
            ) : (
              <>
                <PercentRing value={collectionRate} label="collected" />
                <div className="w-full space-y-2 text-xs">
                  <div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="text-emerald-700">Collected</span>
                    <span className="font-semibold text-emerald-800">
                      {formatMoney(feeTotals.collected)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-rose-50 px-3 py-2">
                    <span className="text-rose-700">Outstanding</span>
                    <span className="font-semibold text-rose-800">
                      {formatMoney(feeTotals.outstanding)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function FacultyDashboard({
  profile,
  subjects,
  assignments,
  attendance,
  results,
  todayRegister,
}: {
  profile: ReturnType<typeof useQuery<Faculty>>;
  subjects: ReturnType<typeof useQuery<Subject[]>>;
  assignments: ReturnType<typeof useQuery<Assignment[]>>;
  attendance: ReturnType<typeof useQuery<AttendanceReportRow[]>>;
  results: ReturnType<typeof useQuery<ResultsReportRow[]>>;
  todayRegister: ReturnType<typeof useQuery<Paginated<Attendance>>>;
}) {
  const totalMarks = (attendance.data ?? []).reduce(
    (sum, row) => sum + row.total,
    0,
  );
  const attended = (attendance.data ?? []).reduce(
    (sum, row) => sum + row.present + row.late,
    0,
  );
  const attendancePercent =
    totalMarks === 0 ? 0 : Math.round((attended / totalMarks) * 100);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My subjects"
          value={subjects.data?.length ?? "—"}
          hint="Assigned to you"
          icon="book"
          accent="indigo"
        />
        <StatCard
          label="Attendance"
          value={`${attendancePercent}%`}
          hint="Across your subjects"
          icon="clipboard"
          accent="emerald"
        />
        <StatCard
          label="Marked today"
          value={
            todayRegister.loading
              ? "—"
              : formatNumber(todayRegister.data?.total ?? 0)
          }
          hint="Attendance records"
          icon="checkCircle"
          accent="sky"
        />
        <StatCard
          label="Assignments"
          value={assignments.data?.length ?? "—"}
          hint={`${
            (assignments.data ?? []).filter(
              (assignment) => !isPastDate(assignment.due_date),
            ).length
          } still open`}
          icon="clipboardList"
          accent="amber"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              My subjects
            </h2>
            <Link href="/subjects" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all
            </Link>
          </div>
          <div className="p-5">
            {profile.loading || subjects.loading ? (
              <InlineLoading />
            ) : subjects.error ? (
              <ErrorState error={subjects.error} onRetry={subjects.refetch} />
            ) : !subjects.data || subjects.data.length === 0 ? (
              <EmptyState
                icon="book"
                title="No subjects assigned"
                description="An administrator can assign subjects to your faculty profile."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {subjects.data.slice(0, 4).map((subject) => (
                  <div
                    key={subject.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {subject.name}
                        </h3>
                        <p className="font-mono text-xs text-slate-500">
                          {subject.code}
                        </p>
                      </div>
                      <Badge tone="indigo">Sem {subject.semester}</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {subject.course_name} · {subject.credits} credits
                    </p>
                    <div className="mt-3 flex gap-1.5">
                      <Link href="/attendance">
                        <Button variant="outline" size="sm">
                          Attendance
                        </Button>
                      </Link>
                      <Link href="/results">
                        <Button variant="outline" size="sm">
                          Results
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Your profile
              </h2>
            </div>
            <div className="space-y-2 p-5 text-sm">
              {profile.loading ? (
                <InlineLoading />
              ) : profile.error ? (
                <p className="text-sm text-rose-600">
                  Could not load your profile.
                </p>
              ) : profile.data ? (
                <>
                  <p className="font-semibold text-slate-900">
                    {profile.data.first_name} {profile.data.last_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {profile.data.designation} ·{" "}
                    {profile.data.department_name}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500">Employee ID</div>
                      <div className="font-mono font-medium text-slate-800">
                        {profile.data.employee_id}
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <div className="text-slate-500">Joined</div>
                      <div className="font-medium text-slate-800">
                        {profile.data.joined_on
                          ? formatDate(profile.data.joined_on)
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View profile <Icon name="arrowRight" size={12} />
                  </Link>
                </>
              ) : null}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Results performance"
              subtitle="Pass rate by exam"
              href="/reports"
            />
            <div className="p-5">
              {results.loading ? (
                <InlineLoading />
              ) : (results.data ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No results recorded yet.</p>
              ) : (
                <BarList
                  items={(results.data ?? [])
                    .slice()
                    .sort((a, b) => b.pass_rate - a.pass_rate)
                    .slice(0, 4)
                    .map((row) => ({
                      label: row.exam_name,
                      sublabel: row.subject_code,
                      value: row.pass_rate,
                      max: 100,
                      valueLabel: `${row.pass_rate}%`,
                      tone: row.pass_rate >= 75 ? "emerald" : "amber",
                    }))}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StudentDashboard({
  profile,
  subjects,
  assignments,
  attendance,
  results,
  submissions,
  fees,
}: {
  profile: ReturnType<typeof useQuery<Student>>;
  subjects: ReturnType<typeof useQuery<Subject[]>>;
  assignments: ReturnType<typeof useQuery<Assignment[]>>;
  attendance: ReturnType<typeof useQuery<Attendance[]>>;
  results: ReturnType<typeof useQuery<Result[]>>;
  submissions: ReturnType<typeof useQuery<Submission[]>>;
  fees: ReturnType<typeof useQuery<FeeStatement[]>>;
}) {
  const attendanceRecords = attendance.data ?? [];
  const attended = attendanceRecords.filter(
    (record) => record.status === "PRESENT" || record.status === "LATE",
  ).length;
  const attendancePercent =
    attendanceRecords.length === 0
      ? 0
      : Math.round((attended / attendanceRecords.length) * 100);

  const resultRecords = results.data ?? [];
  const marksObtained = resultRecords.reduce(
    (sum, result) => sum + result.marks_obtained,
    0,
  );
  const maxMarks = resultRecords.reduce(
    (sum, result) => sum + result.max_marks,
    0,
  );
  const averagePercent =
    maxMarks === 0 ? 0 : Math.round((marksObtained / maxMarks) * 100);

  const submittedIds = new Set(
    (submissions.data ?? []).map((submission) => submission.assignment_id),
  );
  const pendingAssignments = (assignments.data ?? []).filter(
    (assignment) =>
      !isPastDate(assignment.due_date) && !submittedIds.has(assignment.id),
  );

  const feeTotals = (fees.data ?? []).reduce(
    (accumulator, statement) => ({
      amount: accumulator.amount + statement.amount,
      paid: accumulator.paid + statement.paid_amount,
      balance: accumulator.balance + statement.balance,
    }),
    { amount: 0, paid: 0, balance: 0 },
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My attendance"
          value={`${attendancePercent}%`}
          hint={`${attended} of ${attendanceRecords.length} classes`}
          icon="clipboard"
          accent="emerald"
        />
        <StatCard
          label="Average result"
          value={`${averagePercent}%`}
          hint={`${resultRecords.length} results recorded`}
          icon="award"
          accent="indigo"
        />
        <StatCard
          label="Pending work"
          value={pendingAssignments.length}
          hint={`${submittedIds.size} submitted`}
          icon="clipboardList"
          accent="amber"
        />
        <StatCard
          label="Fee balance"
          value={formatMoney(feeTotals.balance)}
          hint={`${formatMoney(feeTotals.paid)} paid`}
          icon="wallet"
          accent={feeTotals.balance > 0 ? "rose" : "emerald"}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              This semester
            </h2>
            <Link
              href="/subjects"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              View subjects
            </Link>
          </div>
          <div className="p-5">
            {profile.loading || subjects.loading ? (
              <InlineLoading />
            ) : subjects.error ? (
              <ErrorState error={subjects.error} onRetry={subjects.refetch} />
            ) : (
              <>
                {profile.data ? (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {profile.data.first_name} {profile.data.last_name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {profile.data.course_name} · Semester{" "}
                        {profile.data.current_semester} ·{" "}
                        {profile.data.enrollment_no}
                      </p>
                    </div>
                  </div>
                ) : null}
                {!subjects.data || subjects.data.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No subjects for your current semester.
                  </p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {subjects.data.slice(0, 6).map((subject) => (
                      <div
                        key={subject.id}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-semibold text-slate-900">
                              {subject.name}
                            </h3>
                            <p className="font-mono text-xs text-slate-500">
                              {subject.code}
                            </p>
                          </div>
                          <Badge tone="sky">{subject.credits} cr</Badge>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Semester {subject.semester}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <div className="space-y-5">
          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent results
              </h2>
              <Link
                href="/my-results"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                All results
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {results.loading ? (
                <div className="p-5">
                  <InlineLoading />
                </div>
              ) : resultRecords.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  No results yet.
                </p>
              ) : (
                resultRecords.slice(0, 4).map((result) => {
                  const pct =
                    result.max_marks === 0
                      ? 0
                      : Math.round(
                          (result.marks_obtained / result.max_marks) * 100,
                        );
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between gap-3 px-5 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {result.exam_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {result.subject_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar
                          value={pct}
                          size="sm"
                          tone={
                            pct >= 75 ? "emerald" : pct >= 40 ? "amber" : "rose"
                          }
                          className="w-14"
                        />
                        <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700">
                          {result.marks_obtained}
                          <span className="text-xs font-normal text-slate-400">
                            /{result.max_marks}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-slate-900">My fees</h2>
              <Link
                href="/my-fees"
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              >
                Details
              </Link>
            </div>
            <div className="p-5">
              {fees.loading ? (
                <InlineLoading />
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Outstanding</span>
                    <span
                      className={
                        feeTotals.balance > 0
                          ? "font-semibold text-rose-600"
                          : "font-semibold text-emerald-600"
                      }
                    >
                      {formatMoney(feeTotals.balance)}
                    </span>
                  </div>
                  <ProgressBar
                    className="mt-3"
                    value={
                      feeTotals.amount === 0
                        ? 0
                        : Math.round((feeTotals.paid / feeTotals.amount) * 100)
                    }
                    tone={feeTotals.balance > 0 ? "indigo" : "emerald"}
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    {formatMoney(feeTotals.paid)} paid of{" "}
                    {formatMoney(feeTotals.amount)}
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {href ? (
        <Link
          href={href}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View report
        </Link>
      ) : null}
    </div>
  );
}

function InlineLoading() {
  return (
    <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
      <Spinner /> Loading…
    </div>
  );
}

function NoticesCard({ notices }: { notices: NoticesQuery }) {
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Recent notices</h2>
          <p className="text-xs text-slate-500">
            The latest announcements for you.
          </p>
        </div>
        <Link
          href="/notices"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          View all
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {notices.loading ? (
          <div className="p-5">
            <InlineLoading />
          </div>
        ) : notices.error ? (
          <p className="px-5 py-6 text-sm text-rose-600">
            Could not load notices.
          </p>
        ) : !notices.data || notices.data.items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            No notices right now.
          </p>
        ) : (
          notices.data.items.map((notice) => (
            <Link
              key={notice.id}
              href="/notices"
              className="block px-5 py-3 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">
                    {notice.title}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {notice.body}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <Badge tone="slate">{AUDIENCE_LABELS[notice.audience]}</Badge>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {formatDateTime(notice.published_at)}
                  </p>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

function DeadlinesCard({ assignments }: { assignments: Assignment[] }) {
  const upcoming = assignments
    .filter((assignment) => !isPastDate(assignment.due_date))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Upcoming deadlines
          </h2>
          <p className="text-xs text-slate-500">Assignments still open.</p>
        </div>
        <Link
          href="/assignments"
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
        >
          All assignments
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {upcoming.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-500">
            Nothing due right now. You are all caught up.
          </p>
        ) : (
          upcoming.map((assignment) => (
            <Link
              key={assignment.id}
              href="/assignments"
              className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {assignment.title}
                </p>
                <p className="text-xs text-slate-500">
                  {assignment.subject_code} · {assignment.subject_name}
                </p>
              </div>
              <Badge
                tone={
                  assignment.due_date <= todayISO() ? "amber" : "indigo"
                }
              >
                {formatDate(assignment.due_date)}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </Card>
  );
}

const quickActions: {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  accent: "indigo" | "violet" | "sky" | "emerald" | "amber" | "rose";
}[] = [
  {
    href: "/departments",
    label: "Department",
    description: "Add an academic unit",
    icon: "building",
    accent: "indigo",
  },
  {
    href: "/courses",
    label: "Course",
    description: "Create a programme",
    icon: "book",
    accent: "sky",
  },
  {
    href: "/subjects",
    label: "Subject",
    description: "Add to a course",
    icon: "layers",
    accent: "violet",
  },
  {
    href: "/faculty",
    label: "Faculty",
    description: "Create an account",
    icon: "users",
    accent: "emerald",
  },
  {
    href: "/students",
    label: "Student",
    description: "Enrol a student",
    icon: "graduation",
    accent: "amber",
  },
  {
    href: "/notices",
    label: "Notice",
    description: "Publish an update",
    icon: "megaphone",
    accent: "rose",
  },
  {
    href: "/fees",
    label: "Fee structure",
    description: "Bill a course",
    icon: "wallet",
    accent: "indigo",
  },
  {
    href: "/reports",
    label: "Reports",
    description: "Review analytics",
    icon: "chart",
    accent: "sky",
  },
];

const actionAccents: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
  emerald: "bg-emerald-50 text-emerald-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
};

function QuickActionsCard() {
  return (
    <Card>
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">Quick actions</h2>
        <p className="text-xs text-slate-500">Jump straight into common tasks.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-xl border border-slate-200 p-3 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40"
          >
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${actionAccents[action.accent]}`}
            >
              <Icon name={action.icon} size={15} />
            </span>
            <p className="mt-2 text-xs font-semibold text-slate-800">
              {action.label}
            </p>
            <p className="text-[11px] leading-snug text-slate-500">
              {action.description}
            </p>
          </Link>
        ))}
      </div>
    </Card>
  );
}
