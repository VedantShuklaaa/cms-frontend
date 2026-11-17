import type {
  AttendanceStatus,
  Audience,
  ExamType,
  PaymentMethod,
  Role,
} from "@/types/api";

export const APP_NAME = "Campus";
export const APP_TAGLINE = "College Management System";

export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  FACULTY: "Faculty",
  STUDENT: "Student",
};

export const ROLE_BADGE_TONES: Record<
  Role,
  "violet" | "sky" | "emerald"
> = {
  ADMIN: "violet",
  FACULTY: "sky",
  STUDENT: "emerald",
};

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

export const ATTENDANCE_TONES: Record<
  AttendanceStatus,
  "emerald" | "rose" | "amber" | "slate"
> = {
  PRESENT: "emerald",
  ABSENT: "rose",
  LATE: "amber",
  EXCUSED: "slate",
};

export const EXAM_TYPES: ExamType[] = ["QUIZ", "MIDTERM", "FINAL", "PRACTICAL"];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  QUIZ: "Quiz",
  MIDTERM: "Midterm",
  FINAL: "Final",
  PRACTICAL: "Practical",
};

export const EXAM_TYPE_TONES: Record<
  ExamType,
  "sky" | "indigo" | "rose" | "amber"
> = {
  QUIZ: "sky",
  MIDTERM: "indigo",
  FINAL: "rose",
  PRACTICAL: "amber",
};

export const AUDIENCES: Audience[] = ["ALL", "STUDENTS", "FACULTY", "ADMIN"];

export const AUDIENCE_LABELS: Record<Audience, string> = {
  ALL: "Everyone",
  STUDENTS: "Students",
  FACULTY: "Faculty",
  ADMIN: "Administrators",
};

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "CARD",
  "UPI",
  "BANK_TRANSFER",
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
};

export const SIDEBAR_STORAGE_KEY = "cms.sidebar_collapsed";
