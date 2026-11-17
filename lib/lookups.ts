"use client";

import { apiRequestAll } from "@/lib/api";
import { useQuery } from "@/lib/hooks";
import type {
  Course,
  Department,
  Exam,
  Faculty,
  Student,
  Subject,
} from "@/types/api";

export function useDepartmentOptions(enabled = true) {
  return useQuery(
    () => apiRequestAll<Department>("/departments"),
    [enabled],
    { enabled },
  );
}

export function useCourseOptions(departmentId?: string, enabled = true) {
  return useQuery(
    () =>
      apiRequestAll<Course>("/courses", {
        department_id: departmentId || undefined,
      }),
    [departmentId, enabled],
    { enabled },
  );
}

export function useSubjectOptions(options: {
  mine?: boolean;
  courseId?: string;
  enabled?: boolean;
} = {}) {
  const { mine = false, courseId, enabled = true } = options;
  return useQuery(
    () =>
      apiRequestAll<Subject>(mine ? "/subjects/mine" : "/subjects", {
        course_id: courseId || undefined,
      }),
    [mine, courseId, enabled],
    { enabled },
  );
}

export function useFacultyOptions(enabled = true) {
  return useQuery(() => apiRequestAll<Faculty>("/faculty"), [enabled], {
    enabled,
  });
}

export function useStudentOptions(courseId?: string, enabled = true) {
  return useQuery(
    () =>
      apiRequestAll<Student>("/students", {
        course_id: courseId || undefined,
      }),
    [courseId, enabled],
    { enabled },
  );
}

export function useExamOptions(courseId?: string, enabled = true) {
  return useQuery(
    () =>
      apiRequestAll<Exam>("/exams", {
        course_id: courseId || undefined,
      }),
    [courseId, enabled],
    { enabled },
  );
}
