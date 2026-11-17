"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BarList, PercentRing, ProgressBar } from "@/components/ui/chart";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/feedback";
import { Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { apiRequestAll } from "@/lib/api";
import {
  DEFAULT_PAGE_SIZE,
  EXAM_TYPE_LABELS,
  EXAM_TYPE_TONES,
} from "@/lib/constants";
import { useQuery } from "@/lib/hooks";
import type { Result } from "@/types/api";

function percent(marks: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((marks / max) * 100);
}

export default function MyResultsPage() {
  const [subjectId, setSubjectId] = useState("");
  const [examId, setExamId] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);

  const query = useQuery(() => apiRequestAll<Result>("/results/me"), []);
  const results = useMemo(() => query.data ?? [], [query.data]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const result of results) {
      map.set(result.subject_id, result.subject_name);
    }
    return Array.from(map.entries());
  }, [results]);

  const exams = useMemo(() => {
    const map = new Map<string, string>();
    for (const result of results) {
      map.set(result.exam_id, `${result.exam_name} · ${result.subject_name}`);
    }
    return Array.from(map.entries());
  }, [results]);

  const filtered = useMemo(
    () =>
      results.filter((result) => {
        if (subjectId && result.subject_id !== subjectId) return false;
        if (examId && result.exam_id !== examId) return false;
        return true;
      }),
    [results, subjectId, examId],
  );

  const overall = useMemo(() => {
    const totalMarks = results.reduce(
      (sum, result) => sum + result.marks_obtained,
      0,
    );
    const totalMax = results.reduce((sum, result) => sum + result.max_marks, 0);
    return {
      percent: totalMax === 0 ? 0 : Math.round((totalMarks / totalMax) * 100),
      exams: new Set(results.map((result) => result.exam_id)).size,
      subjects: new Set(results.map((result) => result.subject_id)).size,
      bestGrade:
        [...results]
          .filter((result) => result.grade)
          .sort((a, b) =>
            percent(b.marks_obtained, b.max_marks) -
            percent(a.marks_obtained, a.max_marks),
          )[0]?.grade ?? "—",
    };
  }, [results]);

  const subjectAverages = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; obtained: number; max: number }
    >();
    for (const result of results) {
      const current = groups.get(result.subject_id) ?? {
        label: result.subject_name,
        obtained: 0,
        max: 0,
      };
      current.obtained += result.marks_obtained;
      current.max += result.max_marks;
      groups.set(result.subject_id, current);
    }
    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        percent: group.max === 0 ? 0 : Math.round((group.obtained / group.max) * 100),
      }))
      .sort((a, b) => b.percent - a.percent);
  }, [results]);

  const pageItems = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <>
      <PageHeader
        title="My results"
        description="Every exam result recorded for you, with subject-wise averages."
      />

      {query.loading ? (
        <Card>
          <LoadingState label="Loading your results…" />
        </Card>
      ) : query.error ? (
        <Card>
          <ErrorState error={query.error} onRetry={query.refetch} />
        </Card>
      ) : results.length === 0 ? (
        <Card>
          <EmptyState
            icon="award"
            title="No results yet"
            description="Once your faculty record exam marks, your results will appear here."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Card>
              <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                <PercentRing value={overall.percent} label="average" />
                <div className="w-full space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Across {overall.exams} {overall.exams === 1 ? "exam" : "exams"}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {overall.subjects}{" "}
                      {overall.subjects === 1 ? "subject" : "subjects"} with
                      recorded marks.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-indigo-50 px-3 py-2">
                      <div className="font-semibold text-indigo-700">
                        {overall.percent}%
                      </div>
                      <div className="text-indigo-600">Weighted average</div>
                    </div>
                    <div className="rounded-lg bg-emerald-50 px-3 py-2">
                      <div className="font-semibold text-emerald-700">
                        {overall.bestGrade}
                      </div>
                      <div className="text-emerald-600">Best grade</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">
                  Subject averages
                </h2>
                <p className="text-xs text-slate-500">
                  Weighted by maximum marks across all recorded exams.
                </p>
              </div>
              <div className="p-5">
                <BarList
                  items={subjectAverages.map((subject) => ({
                    label: subject.label,
                    sublabel: `${subject.obtained}/${subject.max} marks across all exams`,
                    value: subject.percent,
                    max: 100,
                    valueLabel: `${subject.percent}%`,
                    tone:
                      subject.percent >= 75
                        ? "emerald"
                        : subject.percent >= 40
                          ? "amber"
                          : "rose",
                  }))}
                />
              </div>
            </Card>
          </div>

          <Card>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
              <Select
                value={subjectId}
                onChange={(event) => {
                  setSubjectId(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-64"
                aria-label="Filter by subject"
              >
                <option value="">All subjects</option>
                {subjects.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
              <Select
                value={examId}
                onChange={(event) => {
                  setExamId(event.target.value);
                  setPage(1);
                }}
                className="w-full sm:w-64"
                aria-label="Filter by exam"
              >
                <option value="">All exams</option>
                {exams.map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </Select>
              {subjectId || examId ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSubjectId("");
                    setExamId("");
                    setPage(1);
                  }}
                >
                  Reset
                </Button>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon="search"
                title="No results match"
                description="Try clearing the filters to see every recorded result."
              />
            ) : (
              <>
                <Table minWidth={800}>
                  <THead>
                    <TH>Exam</TH>
                    <TH>Subject</TH>
                    <TH>Marks</TH>
                    <TH>Grade</TH>
                  </THead>
                  <TBody>
                    {pageItems.map((result) => {
                      const pct = percent(result.marks_obtained, result.max_marks);
                      return (
                        <TR key={result.id}>
                          <TD>
                            <div className="font-medium text-slate-900">
                              {result.exam_name}
                            </div>
                            <Badge tone={EXAM_TYPE_TONES[result.exam_type]}>
                              {EXAM_TYPE_LABELS[result.exam_type]}
                            </Badge>
                          </TD>
                          <TD>
                            <div className="text-slate-700">
                              {result.subject_name}
                            </div>
                          </TD>
                          <TD>
                            <div className="flex items-center gap-2">
                              <span className="whitespace-nowrap text-sm font-medium tabular-nums text-slate-900">
                                {result.marks_obtained}
                                <span className="text-slate-400">
                                  /{result.max_marks}
                                </span>
                              </span>
                              <ProgressBar
                                value={pct}
                                size="sm"
                                tone={
                                  pct >= 75
                                    ? "emerald"
                                    : pct >= 40
                                      ? "amber"
                                      : "rose"
                                }
                                className="w-16"
                              />
                              <span className="w-9 text-right text-xs text-slate-500">
                                {pct}%
                              </span>
                            </div>
                          </TD>
                          <TD>
                            {result.grade ? (
                              <Badge tone="indigo">{result.grade}</Badge>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TD>
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
                <Pagination
                  page={page}
                  perPage={perPage}
                  total={filtered.length}
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
