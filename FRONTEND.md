# CMS Frontend Build Guide

This document is the contract between the CMS backend and the frontend. It covers:

1. The application layout (login, dashboard shell, sidebar, top navbar).
2. Role-based routing and dashboard content for `ADMIN`, `FACULTY`, and `STUDENT`.
3. Every endpoint, its access rules, query parameters, request body, and response shape.
4. A complete TypeScript type file you can copy into the frontend repo for end-to-end type safety.

The backend source and `openapi.yaml` are the ultimate source of truth. If this document and the
code disagree, the code wins. Types for the OpenAPI spec can also be generated with:

```bash
npx openapi-typescript openapi.yaml -o src/types/api.ts
```

---

## 1. Application layout

### 1.1 Screens

The app has two top-level experiences:

| Screen | Who | Purpose |
| --- | --- | --- |
| `/login` | Unauthenticated | Email + password sign-in. No public registration. |
| App shell | Any authenticated user | Full-screen dashboard frame: top navbar + left sidebar + content area. |

After a successful login the user is sent to `/dashboard`. The dashboard's widgets and the sidebar's
navigation items are derived from `user.role` returned by the login response (and confirmed by
`GET /auth/me` on refresh).

### 1.2 App shell anatomy

```
+-----------------------------------------------------------------------+
| TOP NAVBAR (full width, fixed, h-16)                                  |
| [menu] Logo/Product        [global search]      [notices] [user menu] |
+----------------+------------------------------------------------------+
| SIDEBAR        | MAIN CONTENT                                          |
| (fixed, under  |  Page header: title, breadcrumb, primary action       |
|  navbar)       |  ---------------------------------------------------  |
| role-filtered  |  Cards / tables / charts / forms                      |
| nav sections   |  Pagination / empty states / loading skeletons        |
|                |                                                       |
+----------------+------------------------------------------------------+
```

**Top navbar**

- Full viewport width, fixed at the top, sits above everything.
- Left: sidebar toggle (mobile/tablet and optionally desktop collapse) and the product name.
- Center (desktop only): optional global search or command palette trigger (`Ctrl/Cmd + K`).
- Right:
  - Notices bell. Fetch `GET /notices?per_page=5`; show the newest published notices.
  - User menu with full name/email, role badge (`ADMIN` / `FACULTY` / `STUDENT`), links to profile
    and change password, and a logout action that calls `POST /auth/logout` then clears local auth.

**Sidebar**

- Fixed below the navbar on desktop (`lg` and up). Starts at `top: 64px`.
- Width `260px`; collapsible to a `64px` icon rail. Persist the collapsed state locally.
- On mobile/tablet it becomes an off-canvas drawer with a dimmed overlay and closes on navigation.
- Highlights the active route. Groups items under section labels.
- Items are filtered by role (see 1.4). The backend still enforces authorization, so never treat
  hidden UI as security.

**Main content**

- Responsive padding: `16px` on mobile, `24-32px` on desktop.
- Page header pattern: page title, optional breadcrumb, optional primary action button.
- Lists use server-side pagination: `page`, `per_page` (default 20, maximum 100), and `total`, with
  Previous/Next and a page-size selector (`10`, `20`, `50`, `100`).
- Always implement loading, empty, and error states. Surface the API's `message` and `error` text.

### 1.3 Login screen

- Centered card on a neutral background. Email + password fields, show/hide password, submit button
  with a loading state.
- Call `POST /auth/login` with `{ email, password }`.
- On success:
  1. Store `access_token` (and optionally `expires_at` and `user`) in `localStorage`.
  2. Send the user to `/dashboard`; the shell reads the role from the stored user or `GET /auth/me`.
- On failure the backend returns `401` with
  `{ "success": false, "message": "Authentication required", "error": "Invalid email or password" }`.
  Display `error` (or `message`) inline, not as a raw JSON dump.
- On app boot: if a token exists, call `GET /auth/me`. On `401`, clear storage and redirect to
  `/login`. Do the same from a global response interceptor for any `401` during the session.
- Token expiry (`expires_at`) can be used to proactively log out.

### 1.4 Role-based dashboard content

All three dashboards share the app shell; only the widgets, KPIs, quick actions, and sidebar items
differ.

**ADMIN dashboard**

| Area | Data source |
| --- | --- |
| KPI cards: departments, courses, subjects, faculty, students, notices, active assignments | `GET /reports/overview` |
| Attendance performance by subject (bar/line) | `GET /reports/attendance` |
| Results / pass rate by exam | `GET /reports/results` |
| Fee collection vs outstanding | `GET /reports/fees` |
| Recent notices | `GET /notices?per_page=5` |
| Quick actions | Create department, course, subject, faculty, student, notice, fee structure |

**FACULTY dashboard**

| Area | Data source |
| --- | --- |
| Profile summary card | `GET /faculty/me` |
| My assigned subjects (cards with student/attendance actions) | `GET /subjects/mine?per_page=100` |
| Attendance performance for assigned subjects | `GET /reports/attendance` (optionally per `subject_id`) |
| Results performance for assigned subjects | `GET /reports/results` |
| Assignments and upcoming due dates | `GET /assignments?per_page=100` (server scopes to assigned subjects) |
| Today's attendance register shortcut | `GET /attendance?date_from=<today>&date_to=<today>` |
| Recent notices | `GET /notices?per_page=5` |

**STUDENT dashboard**

| Area | Data source |
| --- | --- |
| Profile summary card | `GET /students/me` |
| My subjects for the current semester | `GET /subjects/mine?per_page=100` |
| Attendance history and percentage | `GET /attendance/me` (there is no aggregate endpoint: paginate all pages or scope with `date_from`/`date_to`/`subject_id`; count `PRESENT` + `LATE` as attended) |
| My results | `GET /results/me?per_page=100` |
| Assignments for my course | `GET /assignments?per_page=100` (server scopes to the student's course) |
| My submissions and grades | `GET /submissions/me?per_page=100` |
| Fee statements: amount, paid, balance | `GET /fees/me?per_page=100` |
| Recent notices | `GET /notices?per_page=5` |

### 1.5 Role-based sidebar navigation

**ADMIN**

- Dashboard
- Academics: Departments, Courses, Subjects
- People: Faculty, Students
- Teaching: Attendance, Exams & Results, Assignments
- Administration: Fees, Notices, Reports
- Account: Profile, Change password

**FACULTY**

- Dashboard
- My Subjects
- Students (read-only list)
- Attendance
- Results
- Assignments
- Notices
- Account: My Profile, Change password

**STUDENT**

- Dashboard
- My Subjects
- My Attendance
- My Results
- Assignments
- Notices
- My Fees
- Account: My Profile, Change password

### 1.6 Suggested route map and guards

| Route | Allowed roles | Notes |
| --- | --- | --- |
| `/login` | Public (redirect away if authenticated) | Login form |
| `/dashboard` | All | Renders the role-specific dashboard |
| `/departments`, `/courses`, `/subjects` | All (UI: ADMIN for create/edit) | Backend reads are open to any authenticated user |
| `/faculty` | ADMIN | List/manage faculty |
| `/students` | ADMIN, FACULTY | Faculty read-only |
| `/attendance` | ADMIN, FACULTY | Faculty scoped to assigned subjects |
| `/exams`, `/results` | ADMIN, FACULTY | Admin manages exams; faculty manages results |
| `/assignments` | All | Role-specific actions |
| `/notices` | All | Admin can create/edit |
| `/fees` | ADMIN (list/statement); STUDENT (`/fees/me` pages) | |
| `/reports` | ADMIN, FACULTY | Fees report is admin-only |
| `/profile` | All | Resolve profile by role: `/auth/me` + `/faculty/me` or `/students/me` |
| `/change-password` | All | |

Guard rules:

- No token -> `/login`.
- Token but wrong role -> `/dashboard` (or a 403 page), never render the restricted screen.
- The backend returns `403` for role violations; map it to an "access denied" state.

---

## 2. API integration contract

### 2.1 Base URL and CORS

- Base URL: `http://127.0.0.1:8080/api/v1` (override with an environment variable in the frontend).
- The backend only accepts the origins listed in its `FRONTEND_URL` environment variable
  (comma-separated, no wildcards). Run the backend with the frontend origin, e.g.
  `FRONTEND_URL=http://localhost:3000`.
- `Content-Type: application/json` on every request body.

### 2.2 Authentication

- Every private endpoint requires `Authorization: Bearer <access_token>`.
- Login is the only public endpoint besides health.
- Tokens are stateless JWTs. The role is read from the database on every request, never trusted from
  the client.
- Logout revokes the current token server-side.
- Change password revokes all previously issued tokens and returns a new login payload (store the
  new token).
- No refresh-token endpoint: when the token expires, send the user back to login.

### 2.3 Response envelopes

Success:

```json
{
  "success": true,
  "message": "Departments retrieved",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Validation failed",
  "error": "password must be between 8 and 128 characters"
}
```

`data` is always present on success. For deletes and logout, `data` is `null`.

### 2.4 HTTP status codes

| Status | Meaning | `message` in the envelope |
| --- | --- | --- |
| `200` | Read, update, delete, action success | Varies |
| `201` | Resource created | Varies |
| `400` | Malformed JSON, query string, or path parameter | `Invalid request` |
| `401` | Missing/invalid/expired/revoked token, bad credentials | `Authentication required` |
| `403` | Authenticated but role or ownership is not allowed | `Access denied` |
| `404` | Resource does not exist, or is not visible to this user | `Resource not found` |
| `409` | Unique constraint or state conflict (e.g. deactivating a department with active courses) | `Conflict` |
| `422` | Business validation failure | `Validation failed` |
| `500` | Internal error | `Internal server error` |

The human-readable detail is always in `error`. Use it for toasts/inline form errors.

### 2.5 Pagination

Pass `?page=1&per_page=20` on list endpoints. `page` is clamped to at least 1; `per_page` is clamped
to 1-100 and defaults to 20.

Paginated data:

```json
{
  "items": [],
  "page": 1,
  "per_page": 20,
  "total": 0
}
```

`total` is the total number of matching records, not the length of `items`. Reports are the only
endpoints that return plain arrays, and they are not paginated.

### 2.6 Dates, numbers, and identifiers

- IDs are UUIDs serialized as strings.
- `created_at`, `updated_at`, `expires_at`, `published_at`, `submitted_at`, `graded_at`,
  `assigned_at`, `expires_at` are RFC 3339 UTC timestamps, e.g. `"2026-11-17T10:30:00Z"`.
  Format them in the user's local timezone for display.
- `attendance_date`, `exam_date`, `due_date`, `paid_on`, `joined_on`, `date_of_birth`, `date_from`,
  `date_to` are date-only strings, `"YYYY-MM-DD"`. Do not shift them through timezone conversion.
- Fee `amount`, `paid_amount`, `balance`, `collected`, and `outstanding` are whole currency units
  (`BIGINT`), not cents. Divide by nothing; just format with the currency symbol.
- Optional fields are serialized as `null`, not omitted. Always include them in the interface.
- `PUT` endpoints are partial updates: send only the fields you want to change. Omitted fields keep
  their current value. Sending `null` for a nullable field is treated the same as omitting it, so it
  does not clear the stored value.

### 2.7 Soft deletes and visibility

- `DELETE` does not remove rows. It sets `is_active = false` and returns `200` with `data: null`.
- Inactive records are hidden from non-admins.
- `include_inactive=true` is accepted by admin list endpoints. For non-admins it is silently ignored.
- Some resources are further scoped by ownership or enrollment. The frontend does not need to filter;
  the server already returns only visible rows.

### 2.8 Upserts

These POST endpoints update an existing record instead of creating a duplicate:

- `POST /attendance` (same student + subject + date)
- `POST /results` (same exam + student)
- `POST /submissions` on an assignment (re-submission replaces content and clears the grade)

They still return `201` with the resulting record. Treat them as upserts.

---

## 3. Complete TypeScript types

Copy this into `src/types/api.ts`. It matches the serialized JSON exactly.

```ts
/* ------------------------------------------------------------------ */
/* Shared                                                              */
/* ------------------------------------------------------------------ */

/** UUID string. */
export type UUID = string;
/** Date-only string, "YYYY-MM-DD". */
export type ISODate = string;
/** RFC 3339 UTC timestamp string, e.g. "2026-11-17T10:30:00Z". */
export type ISODateTime = string;

export type Role = "ADMIN" | "FACULTY" | "STUDENT";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";
export type ExamType = "QUIZ" | "MIDTERM" | "FINAL" | "PRACTICAL";
export type Audience = "ALL" | "STUDENTS" | "FACULTY" | "ADMIN";
export type PaymentMethod = "CASH" | "CARD" | "UPI" | "BANK_TRANSFER";

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
}

export interface ApiError {
  success: false;
  message: string;
  error: string;
}

export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export interface Paginated<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
}

export interface PaginationQuery {
  page?: number;
  per_page?: number;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface UserResponse {
  id: UUID;
  email: string;
  role: Role;
  is_active: boolean;
  created_at: ISODateTime;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: "Bearer";
  expires_at: ISODateTime;
  user: UserResponse;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface HealthData {
  status: "ok" | "degraded";
  database: "up" | "down";
  version: string;
}

/* ------------------------------------------------------------------ */
/* Departments                                                         */
/* ------------------------------------------------------------------ */

export interface Department {
  id: UUID;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description?: string | null;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  description?: string | null;
  is_active?: boolean;
}

export interface DepartmentListQuery extends PaginationQuery {
  search?: string;
  include_inactive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Courses                                                             */
/* ------------------------------------------------------------------ */

export interface Course {
  id: UUID;
  department_id: UUID;
  department_name: string;
  name: string;
  code: string;
  duration_semesters: number;
  description: string | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateCourseRequest {
  department_id: UUID;
  name: string;
  code: string;
  duration_semesters: number;
  description?: string | null;
}

export interface UpdateCourseRequest {
  department_id?: UUID;
  name?: string;
  code?: string;
  duration_semesters?: number;
  description?: string | null;
  is_active?: boolean;
}

export interface CourseListQuery extends PaginationQuery {
  search?: string;
  department_id?: UUID;
  include_inactive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Subjects                                                            */
/* ------------------------------------------------------------------ */

export interface Subject {
  id: UUID;
  course_id: UUID;
  course_name: string;
  department_id: UUID;
  department_name: string;
  name: string;
  code: string;
  semester: number;
  credits: number;
  description: string | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateSubjectRequest {
  course_id: UUID;
  name: string;
  code: string;
  semester: number;
  credits: number;
  description?: string | null;
}

export interface UpdateSubjectRequest {
  course_id?: UUID;
  name?: string;
  code?: string;
  semester?: number;
  credits?: number;
  description?: string | null;
  is_active?: boolean;
}

export interface SubjectListQuery extends PaginationQuery {
  search?: string;
  course_id?: UUID;
  department_id?: UUID;
  semester?: number;
  faculty_id?: UUID;
  include_inactive?: boolean;
}

export interface MySubjectQuery extends PaginationQuery {
  search?: string;
}

export interface AssignFacultyRequest {
  faculty_id: UUID;
}

export interface SubjectFaculty {
  subject_id: UUID;
  faculty_id: UUID;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  department_id: UUID;
  department_name: string;
  assigned_at: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Faculty                                                             */
/* ------------------------------------------------------------------ */

export interface Faculty {
  id: UUID;
  user_id: UUID;
  email: string;
  department_id: UUID;
  department_name: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  designation: string;
  joined_on: ISODate | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateFacultyRequest {
  email: string;
  password: string;
  department_id: UUID;
  employee_id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  designation: string;
  joined_on?: ISODate | null;
}

export interface UpdateFacultyRequest {
  department_id?: UUID;
  employee_id?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  designation?: string;
  joined_on?: ISODate | null;
  is_active?: boolean;
}

export interface FacultyListQuery extends PaginationQuery {
  search?: string;
  department_id?: UUID;
  include_inactive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Students                                                            */
/* ------------------------------------------------------------------ */

export interface Student {
  id: UUID;
  user_id: UUID;
  email: string;
  course_id: UUID;
  course_name: string;
  department_id: UUID;
  department_name: string;
  enrollment_no: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  date_of_birth: ISODate | null;
  current_semester: number;
  admission_year: number;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateStudentRequest {
  email: string;
  password: string;
  course_id: UUID;
  enrollment_no: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  date_of_birth?: ISODate | null;
  current_semester: number;
  admission_year: number;
}

export interface UpdateStudentRequest {
  course_id?: UUID;
  enrollment_no?: string;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  date_of_birth?: ISODate | null;
  current_semester?: number;
  admission_year?: number;
  is_active?: boolean;
}

export interface StudentListQuery extends PaginationQuery {
  search?: string;
  department_id?: UUID;
  course_id?: UUID;
  semester?: number;
  include_inactive?: boolean;
}

/* ------------------------------------------------------------------ */
/* Attendance                                                          */
/* ------------------------------------------------------------------ */

export interface Attendance {
  id: UUID;
  subject_id: UUID;
  subject_name: string;
  subject_code: string;
  student_id: UUID;
  enrollment_no: string;
  student_first_name: string;
  student_last_name: string;
  marked_by: UUID | null;
  attendance_date: ISODate;
  status: AttendanceStatus;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateAttendanceRequest {
  subject_id: UUID;
  student_id: UUID;
  attendance_date: ISODate;
  status: AttendanceStatus;
}

export interface UpdateAttendanceRequest {
  attendance_date?: ISODate;
  status?: AttendanceStatus;
  is_active?: boolean;
}

export interface AttendanceListQuery extends PaginationQuery {
  subject_id?: UUID;
  student_id?: UUID;
  status?: AttendanceStatus;
  date_from?: ISODate;
  date_to?: ISODate;
  include_inactive?: boolean;
}

export interface MyAttendanceQuery extends PaginationQuery {
  subject_id?: UUID;
  status?: AttendanceStatus;
  date_from?: ISODate;
  date_to?: ISODate;
}

/* ------------------------------------------------------------------ */
/* Exams and results                                                   */
/* ------------------------------------------------------------------ */

export interface Exam {
  id: UUID;
  subject_id: UUID;
  subject_name: string;
  subject_code: string;
  course_id: UUID;
  course_name: string;
  name: string;
  exam_type: ExamType;
  exam_date: ISODate;
  max_marks: number;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateExamRequest {
  subject_id: UUID;
  name: string;
  exam_type: ExamType;
  exam_date: ISODate;
  max_marks: number;
}

export interface UpdateExamRequest {
  subject_id?: UUID;
  name?: string;
  exam_type?: ExamType;
  exam_date?: ISODate;
  max_marks?: number;
  is_active?: boolean;
}

export interface ExamListQuery extends PaginationQuery {
  search?: string;
  subject_id?: UUID;
  course_id?: UUID;
  exam_type?: ExamType;
  include_inactive?: boolean;
}

export interface Result {
  id: UUID;
  exam_id: UUID;
  exam_name: string;
  exam_type: ExamType;
  subject_id: UUID;
  subject_name: string;
  student_id: UUID;
  student_user_id: UUID;
  enrollment_no: string;
  student_first_name: string;
  student_last_name: string;
  marks_obtained: number;
  max_marks: number;
  grade: string | null;
  recorded_by: UUID | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateResultRequest {
  exam_id: UUID;
  student_id: UUID;
  marks_obtained: number;
  grade?: string | null;
}

export interface UpdateResultRequest {
  marks_obtained?: number;
  grade?: string | null;
  is_active?: boolean;
}

export interface ResultListQuery extends PaginationQuery {
  exam_id?: UUID;
  subject_id?: UUID;
  student_id?: UUID;
  include_inactive?: boolean;
}

export interface MyResultQuery extends PaginationQuery {
  subject_id?: UUID;
  exam_id?: UUID;
}

/* ------------------------------------------------------------------ */
/* Notices                                                             */
/* ------------------------------------------------------------------ */

export interface Notice {
  id: UUID;
  title: string;
  body: string;
  audience: Audience;
  created_by: UUID;
  created_by_email: string;
  published_at: ISODateTime;
  expires_at: ISODateTime | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateNoticeRequest {
  title: string;
  body: string;
  audience?: Audience;
  published_at?: ISODateTime | null;
  expires_at?: ISODateTime | null;
}

export interface UpdateNoticeRequest {
  title?: string;
  body?: string;
  audience?: Audience;
  published_at?: ISODateTime | null;
  expires_at?: ISODateTime | null;
  is_active?: boolean;
}

export interface NoticeListQuery extends PaginationQuery {
  search?: string;
  audience?: Audience;
  include_inactive?: boolean;
  include_expired?: boolean;
}

/* ------------------------------------------------------------------ */
/* Fees                                                                */
/* ------------------------------------------------------------------ */

export interface FeeStructure {
  id: UUID;
  course_id: UUID;
  course_name: string;
  academic_year: number;
  name: string;
  amount: number;
  due_date: ISODate;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateFeeStructureRequest {
  course_id: UUID;
  academic_year: number;
  name: string;
  amount: number;
  due_date: ISODate;
}

export interface UpdateFeeStructureRequest {
  course_id?: UUID;
  academic_year?: number;
  name?: string;
  amount?: number;
  due_date?: ISODate;
  is_active?: boolean;
}

export interface FeeStructureListQuery extends PaginationQuery {
  search?: string;
  course_id?: UUID;
  academic_year?: number;
  include_inactive?: boolean;
}

export interface FeePayment {
  id: UUID;
  fee_structure_id: UUID;
  student_id: UUID;
  enrollment_no: string;
  student_first_name: string;
  student_last_name: string;
  amount: number;
  paid_on: ISODate;
  method: PaymentMethod;
  reference: string | null;
  recorded_by: UUID | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateFeePaymentRequest {
  student_id: UUID;
  amount: number;
  paid_on: ISODate;
  method: PaymentMethod;
  reference?: string | null;
}

export interface FeePaymentListQuery extends PaginationQuery {
  student_id?: UUID;
  include_inactive?: boolean;
}

export interface FeeStatement {
  fee_structure_id: UUID;
  course_id: UUID;
  course_name: string;
  academic_year: number;
  name: string;
  amount: number;
  due_date: ISODate;
  paid_amount: number;
  balance: number;
}

export interface FeeStatementListQuery extends PaginationQuery {
  academic_year?: number;
}

export interface MyPaymentListQuery extends PaginationQuery {
  academic_year?: number;
}

/* ------------------------------------------------------------------ */
/* Assignments and submissions                                         */
/* ------------------------------------------------------------------ */

export interface Assignment {
  id: UUID;
  subject_id: UUID;
  subject_name: string;
  subject_code: string;
  course_id: UUID;
  faculty_id: UUID;
  faculty_first_name: string;
  faculty_last_name: string;
  title: string;
  description: string;
  due_date: ISODate;
  max_marks: number | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateAssignmentRequest {
  subject_id: UUID;
  /** Required when an ADMIN creates on behalf of a faculty member. */
  faculty_id?: UUID | null;
  title: string;
  description: string;
  due_date: ISODate;
  max_marks?: number | null;
}

export interface UpdateAssignmentRequest {
  title?: string;
  description?: string;
  due_date?: ISODate;
  max_marks?: number | null;
  is_active?: boolean;
}

export interface AssignmentListQuery extends PaginationQuery {
  search?: string;
  subject_id?: UUID;
  course_id?: UUID;
  include_inactive?: boolean;
}

export interface Submission {
  id: UUID;
  assignment_id: UUID;
  assignment_title: string;
  student_id: UUID;
  student_user_id: UUID;
  enrollment_no: string;
  student_first_name: string;
  student_last_name: string;
  content: string;
  submitted_at: ISODateTime;
  marks_obtained: number | null;
  graded_by: UUID | null;
  graded_at: ISODateTime | null;
  is_active: boolean;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface CreateSubmissionRequest {
  content: string;
}

export interface GradeSubmissionRequest {
  marks_obtained?: number | null;
  is_active?: boolean;
}

export interface SubmissionListQuery extends PaginationQuery {
  student_id?: UUID;
  include_inactive?: boolean;
}

export interface MySubmissionListQuery extends PaginationQuery {}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

export interface OverviewReport {
  departments: number;
  courses: number;
  subjects: number;
  faculty: number;
  students: number;
  notices: number;
  active_assignments: number;
}

export interface AttendanceReportRow {
  subject_id: UUID;
  subject_code: string;
  subject_name: string;
  course_name: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percent: number;
}

export interface ResultsReportRow {
  exam_id: UUID;
  exam_name: string;
  subject_id: UUID;
  subject_code: string;
  subject_name: string;
  students_graded: number;
  average_marks: number;
  highest_marks: number;
  lowest_marks: number;
  max_marks: number;
  pass_rate: number;
}

export interface FeeReportRow {
  fee_structure_id: UUID;
  name: string;
  course_name: string;
  academic_year: number;
  amount: number;
  collected: number;
  outstanding: number;
  payment_count: number;
}

export interface AttendanceReportQuery {
  subject_id?: UUID;
  course_id?: UUID;
  department_id?: UUID;
  date_from?: ISODate;
  date_to?: ISODate;
}

export interface ResultsReportQuery {
  exam_id?: UUID;
  subject_id?: UUID;
  course_id?: UUID;
}

export interface FeeReportQuery {
  course_id?: UUID;
  academic_year?: number;
}
```

---

## 4. Endpoint reference

Legend:

- **Access**: `Public`, `Auth` (any authenticated user), or a role list.
- **Returns**: the type inside `ApiResponse<T>`; all endpoints use the success envelope.
- Query parameters shown as `name?` are optional. All list endpoints accept `page?` and `per_page?`.
- `include_inactive` is only honored for `ADMIN`; other roles are ignored.
- `DELETE` returns `200` with `data: null` and is a soft deactivation unless noted otherwise.

### 4.1 Health

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| GET | `/health` | Public | `HealthData` |

- `200` when the database is reachable (`status: "ok"`, `database: "up"`).
- `503` when it is not (`status: "degraded"`, `database: "down"`), still using the success envelope.

### 4.2 Auth

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| POST | `/auth/login` | Public | `LoginRequest` | `LoginResponse` | `200` |
| POST | `/auth/logout` | Auth | none | `null` | `200` |
| GET | `/auth/me` | Auth | none | `UserResponse` | `200` |
| POST | `/auth/change-password` | Auth | `ChangePasswordRequest` | `LoginResponse` | `200` |

Notes:

- Login failure is `401` with `Invalid email or password`.
- Change password invalidates every earlier token and returns a fresh `LoginResponse`; replace the
  stored token. `new_password` must be 8-128 characters, and `current_password` must be correct.
- No registration endpoint. Admin accounts are bootstrapped from the backend environment.

Login response example:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "Bearer",
    "expires_at": "2026-11-18T10:30:00Z",
    "user": {
      "id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "admin@college.local",
      "role": "ADMIN",
      "is_active": true,
      "created_at": "2026-11-17T10:00:00Z"
    }
  }
}
```

### 4.3 Departments

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/departments` | Auth | - | `Paginated<Department>` | `200` |
| GET | `/departments/{id}` | Auth | - | `Department` | `200` |
| POST | `/departments` | ADMIN | `CreateDepartmentRequest` | `Department` | `201` |
| PUT | `/departments/{id}` | ADMIN | `UpdateDepartmentRequest` | `Department` | `200` |
| DELETE | `/departments/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (name or code), `include_inactive?`.

Notes:

- `code` is uppercased and unique.
- `PUT` is a partial update. Omitted fields are unchanged. Sending `null` for `description` also
  leaves it unchanged (the API cannot clear it).
- Deactivating a department with active courses returns `409`.

### 4.4 Courses

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/courses` | Auth | - | `Paginated<Course>` | `200` |
| GET | `/courses/{id}` | Auth | - | `Course` | `200` |
| POST | `/courses` | ADMIN | `CreateCourseRequest` | `Course` | `201` |
| PUT | `/courses/{id}` | ADMIN | `UpdateCourseRequest` | `Course` | `200` |
| DELETE | `/courses/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (name or code), `department_id?`, `include_inactive?`.

Notes:

- `duration_semesters` is 1-12.
- The department must be active.
- `code` is uppercased and unique.

### 4.5 Subjects

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/subjects` | Auth | - | `Paginated<Subject>` | `200` |
| GET | `/subjects/mine` | FACULTY, STUDENT | - | `Paginated<Subject>` | `200` |
| GET | `/subjects/{id}` | Auth | - | `Subject` | `200` |
| POST | `/subjects` | ADMIN | `CreateSubjectRequest` | `Subject` | `201` |
| PUT | `/subjects/{id}` | ADMIN | `UpdateSubjectRequest` | `Subject` | `200` |
| DELETE | `/subjects/{id}` | ADMIN | - | `null` | `200` |
| GET | `/subjects/{id}/faculty` | ADMIN, FACULTY | - | `SubjectFaculty[]` | `200` |
| POST | `/subjects/{id}/faculty` | ADMIN | `AssignFacultyRequest` | `SubjectFaculty` | `201` |
| DELETE | `/subjects/{id}/faculty/{faculty_id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (name or code), `course_id?`, `department_id?`, `semester?`,
`faculty_id?` (subjects assigned to that faculty member), `include_inactive?`.

Query for `/subjects/mine`: `search?`, `page?`, `per_page?`.

Notes:

- `/subjects/mine` returns `403` for `ADMIN`. Faculty receive their assigned subjects; students
  receive the active subjects in their course and current semester.
- `/subjects/{id}/faculty` returns a plain array, not a paginated object.
- Assigning the same faculty again is safe (idempotent).
- `code` is uppercased and unique; `name` is unique within a course; `semester` must fit the
  course's `duration_semesters`; the course must be active.
- Faculty access to attendance, results, and assignments is limited to assigned subjects.

### 4.6 Faculty

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/faculty` | ADMIN | - | `Paginated<Faculty>` | `200` |
| POST | `/faculty` | ADMIN | `CreateFacultyRequest` | `Faculty` | `201` |
| GET | `/faculty/me` | FACULTY | - | `Faculty` | `200` |
| GET | `/faculty/{id}` | ADMIN, or the faculty member themself | - | `Faculty` | `200` |
| PUT | `/faculty/{id}` | ADMIN | `UpdateFacultyRequest` | `Faculty` | `200` |
| DELETE | `/faculty/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (name, employee_id, email), `department_id?`, `include_inactive?`.

Notes:

- Creating a faculty member creates the linked user account and profile in one transaction.
- `email` and `employee_id` are unique; the department must be active.
- Delete deactivates the linked user account; the profile row is kept.
- `/faculty/me` returns `403` for non-faculty roles.

### 4.7 Students

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/students` | ADMIN, FACULTY | - | `Paginated<Student>` | `200` |
| POST | `/students` | ADMIN | `CreateStudentRequest` | `Student` | `201` |
| GET | `/students/me` | STUDENT | - | `Student` | `200` |
| GET | `/students/{id}` | ADMIN, FACULTY, or the student themself | - | `Student` | `200` |
| PUT | `/students/{id}` | ADMIN | `UpdateStudentRequest` | `Student` | `200` |
| DELETE | `/students/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (name, enrollment_no, email), `department_id?`, `course_id?`,
`semester?`, `include_inactive?` (admin only).

Notes:

- Creating a student creates the linked user account and profile in one transaction.
- `current_semester` must fit the course's `duration_semesters`; `admission_year` is 1950 through
  next year; `date_of_birth` must be in the past; the course must be active.
- `email` and `enrollment_no` are unique.
- Delete deactivates the linked user account; the profile row is kept.
- `/students/me` returns `403` for non-student roles.

### 4.8 Attendance

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/attendance` | ADMIN, FACULTY | - | `Paginated<Attendance>` | `200` |
| POST | `/attendance` | ADMIN, FACULTY | `CreateAttendanceRequest` | `Attendance` | `201` |
| GET | `/attendance/me` | STUDENT | - | `Paginated<Attendance>` | `200` |
| GET | `/attendance/{id}` | ADMIN, assigned FACULTY, owning STUDENT | - | `Attendance` | `200` |
| PUT | `/attendance/{id}` | ADMIN, assigned FACULTY | `UpdateAttendanceRequest` | `Attendance` | `200` |
| DELETE | `/attendance/{id}` | ADMIN, assigned FACULTY | - | `null` | `200` |

Query for `/attendance`: `subject_id?`, `student_id?`, `status?`, `date_from?`, `date_to?`,
`include_inactive?`.

Query for `/attendance/me`: `subject_id?`, `status?`, `date_from?`, `date_to?`, and pagination.

Notes:

- Faculty only see and modify attendance for subjects assigned to them.
- Posting the same student + subject + date updates the existing record (upsert).
- `attendance_date` cannot be in the future.
- The student must be enrolled in the subject's course.
- `status` must be one of `PRESENT`, `ABSENT`, `LATE`, `EXCUSED`. Input is normalized to uppercase,
  so `present` is accepted and returned as `PRESENT`.

### 4.9 Exams

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/exams` | Auth | - | `Paginated<Exam>` | `200` |
| GET | `/exams/{id}` | Auth | - | `Exam` | `200` |
| POST | `/exams` | ADMIN | `CreateExamRequest` | `Exam` | `201` |
| PUT | `/exams/{id}` | ADMIN | `UpdateExamRequest` | `Exam` | `200` |
| DELETE | `/exams/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (exam name, subject name, subject code), `subject_id?`, `course_id?`,
`exam_type?`, `include_inactive?`.

Notes:

- `exam_type` is one of `QUIZ`, `MIDTERM`, `FINAL`, `PRACTICAL`.
- `max_marks` is 1-1000.
- Once results exist, the subject cannot change and `max_marks` cannot drop below an existing
  result.

### 4.10 Results

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/results` | ADMIN, FACULTY | - | `Paginated<Result>` | `200` |
| POST | `/results` | ADMIN, FACULTY | `CreateResultRequest` | `Result` | `201` |
| GET | `/results/me` | STUDENT | - | `Paginated<Result>` | `200` |
| GET | `/results/{id}` | ADMIN, assigned FACULTY, owning STUDENT | - | `Result` | `200` |
| PUT | `/results/{id}` | ADMIN, assigned FACULTY | `UpdateResultRequest` | `Result` | `200` |
| DELETE | `/results/{id}` | ADMIN, assigned FACULTY | - | `null` | `200` |

Query for `/results`: `exam_id?`, `subject_id?`, `student_id?`, `include_inactive?`.

Query for `/results/me`: `subject_id?`, `exam_id?`, and pagination.

Notes:

- Faculty only see and modify results for assigned subjects.
- Posting the same exam + student updates the existing result (upsert).
- `marks_obtained` must be between 0 and the exam's `max_marks`.
- The student must be enrolled in the exam subject's course.

### 4.11 Notices

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/notices` | Auth | - | `Paginated<Notice>` | `200` |
| GET | `/notices/{id}` | Auth | - | `Notice` | `200` |
| POST | `/notices` | ADMIN | `CreateNoticeRequest` | `Notice` | `201` |
| PUT | `/notices/{id}` | ADMIN | `UpdateNoticeRequest` | `Notice` | `200` |
| DELETE | `/notices/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?` (title, body), `audience?`, `include_inactive?` (admin),
`include_expired?` (admin).

Notes:

- Non-admins only see active, published, unexpired notices addressed to `ALL` or their own role.
- `audience` is one of `ALL`, `STUDENTS`, `FACULTY`, `ADMIN`; omitted defaults to `ALL`.
- `expires_at` must be after `published_at`.
- `published_at` omitted defaults to the current time server-side.

### 4.12 Fees

Fee structures:

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/fees` | Auth | - | `Paginated<FeeStructure>` | `200` |
| GET | `/fees/{id}` | Auth | - | `FeeStructure` | `200` |
| POST | `/fees` | ADMIN | `CreateFeeStructureRequest` | `FeeStructure` | `201` |
| PUT | `/fees/{id}` | ADMIN | `UpdateFeeStructureRequest` | `FeeStructure` | `200` |
| DELETE | `/fees/{id}` | ADMIN | - | `null` | `200` |

Query for list: `search?`, `course_id?`, `academic_year?`, `include_inactive?`.

Notes:

- Students are limited to fee structures for their own course.
- A fee structure with active payments cannot be deactivated (`409`).
- Lowering `amount` below a student's recorded payments is rejected.

Payments:

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/fees/{id}/payments` | ADMIN | - | `Paginated<FeePayment>` | `200` |
| POST | `/fees/{id}/payments` | ADMIN | `CreateFeePaymentRequest` | `FeePayment` | `201` |
| DELETE | `/fees/{id}/payments/{payment_id}` | ADMIN | - | `null` | `200` |

Query for payments list: `student_id?`, `include_inactive?`.

Notes:

- `method` is one of `CASH`, `CARD`, `UPI`, `BANK_TRANSFER`.
- The student must be enrolled in the fee's course.
- Payments cannot exceed the outstanding balance.
- `paid_on` cannot be in the future.

Student self-service:

| Method | Path | Access | Returns |
| --- | --- | --- | --- |
| GET | `/fees/me` | STUDENT | `Paginated<FeeStatement>` |
| GET | `/fees/me/payments` | STUDENT | `Paginated<FeePayment>` |

Query: `academic_year?`, plus pagination.

`FeeStatement` combines the fee structure with `paid_amount` and `balance`. Both self-service
endpoints return `403` for non-student roles.

### 4.13 Assignments and submissions

Assignments:

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| GET | `/assignments` | Auth | - | `Paginated<Assignment>` | `200` |
| GET | `/assignments/{id}` | Auth | - | `Assignment` | `200` |
| POST | `/assignments` | ADMIN, FACULTY | `CreateAssignmentRequest` | `Assignment` | `201` |
| PUT | `/assignments/{id}` | ADMIN, assigned FACULTY | `UpdateAssignmentRequest` | `Assignment` | `200` |
| DELETE | `/assignments/{id}` | ADMIN, assigned FACULTY | - | `null` | `200` |

Query for list: `search?` (title, description, subject), `subject_id?`, `course_id?`,
`include_inactive?`.

Notes:

- Admins see all; faculty see assignments for assigned subjects; students see assignments for their
  own course.
- Faculty create under their own identity. Admins must pass `faculty_id`, and that faculty must be
  assigned to the subject.
- `max_marks` cannot drop below a graded submission.

Submissions:

| Method | Path | Access | Request body | Returns | Status |
| --- | --- | --- | --- | --- | --- |
| POST | `/assignments/{id}/submissions` | STUDENT | `CreateSubmissionRequest` | `Submission` | `201` |
| GET | `/assignments/{id}/submissions` | ADMIN, assigned FACULTY | - | `Paginated<Submission>` | `200` |
| PUT | `/assignments/{id}/submissions/{submission_id}` | ADMIN, assigned FACULTY | `GradeSubmissionRequest` | `Submission` | `200` |
| DELETE | `/assignments/{id}/submissions/{submission_id}` | ADMIN, assigned FACULTY | - | `null` | `200` |
| GET | `/submissions/me` | STUDENT | - | `Paginated<Submission>` | `200` |

Query for the submission list: `student_id?`, `include_inactive?`.

Notes:

- Students can submit only for their own course and before `due_date`.
- Re-submitting replaces the content and clears the grade.
- Grading: `marks_obtained` must fit the assignment's `max_marks`; send `is_active: true` to
  restore a soft-deleted submission.
- `/submissions/me` is student-only and returns that student's own submissions.

### 4.14 Reports

| Method | Path | Access | Query | Returns |
| --- | --- | --- | --- | --- |
| GET | `/reports/overview` | ADMIN | none | `OverviewReport` |
| GET | `/reports/attendance` | ADMIN, FACULTY | `subject_id?`, `course_id?`, `department_id?`, `date_from?`, `date_to?` | `AttendanceReportRow[]` |
| GET | `/reports/results` | ADMIN, FACULTY | `exam_id?`, `subject_id?`, `course_id?` | `ResultsReportRow[]` |
| GET | `/reports/fees` | ADMIN | `course_id?`, `academic_year?` | `FeeReportRow[]` |

Notes:

- Reports return plain arrays in `data`; they are not paginated.
- Faculty reports are scoped to assigned subjects.
- Attendance percentage counts `PRESENT` and `LATE` as attended.
- Pass rate uses 40% of `max_marks`.

---

## 5. Role access matrix

| Endpoint group | ADMIN | FACULTY | STUDENT |
| --- | --- | --- | --- |
| `/health` | public | public | public |
| `/auth/login` | public | public | public |
| `/auth/logout`, `/auth/me`, `/auth/change-password` | yes | yes | yes |
| `/departments` read | yes | yes | yes |
| `/departments` write | yes | no | no |
| `/courses` read | yes | yes | yes |
| `/courses` write | yes | no | no |
| `/subjects` read | yes | yes | yes |
| `/subjects/mine` | no (403) | yes | yes |
| `/subjects` write | yes | no | no |
| `/subjects/{id}/faculty` read | yes | yes | no |
| `/subjects/{id}/faculty` write | yes | no | no |
| `/faculty` list/create/update/delete | yes | no | no |
| `/faculty/me` | no (403) | yes | no (403) |
| `/faculty/{id}` read | yes | own only | no |
| `/students` list | yes | yes | no |
| `/students` create/update/delete | yes | no | no |
| `/students/me` | no (403) | no (403) | yes |
| `/students/{id}` read | yes | yes | own only |
| `/attendance` list/create | yes | assigned subjects | no |
| `/attendance/me` | no | no | yes |
| `/attendance/{id}` read | yes | assigned subjects | own only |
| `/attendance/{id}` update/delete | yes | assigned subjects | no |
| `/exams` read | yes | yes | yes |
| `/exams` write | yes | no | no |
| `/results` list/create | yes | assigned subjects | no |
| `/results/me` | no | no | yes |
| `/results/{id}` read | yes | assigned subjects | own only |
| `/results/{id}` update/delete | yes | assigned subjects | no |
| `/notices` read | yes | yes | yes |
| `/notices` write | yes | no | no |
| `/fees` read | yes | yes | own course |
| `/fees` write | yes | no | no |
| `/fees/{id}/payments` | yes | no | no |
| `/fees/me`, `/fees/me/payments` | no | no | yes |
| `/assignments` read | yes | assigned subjects | own course |
| `/assignments` create | yes | assigned subjects | no |
| `/assignments/{id}` update/delete | yes | assigned subjects | no |
| `/assignments/{id}/submissions` submit | no | no | own course |
| `/assignments/{id}/submissions` list/grade | yes | assigned subjects | no |
| `/submissions/me` | no | no | yes |
| `/reports/overview` | yes | no | no |
| `/reports/attendance`, `/reports/results` | yes | assigned subjects | no |
| `/reports/fees` | yes | no | no |

`403` responses use `message: "Access denied"`.

---

## 6. Suggested API client

```ts
import axios, { AxiosError } from "axios";
import type { ApiEnvelope, ApiError } from "@/types/api";

// Replace with your framework's environment variable, e.g.
// Vite: import.meta.env.VITE_API_BASE_URL ; Next.js: process.env.NEXT_PUBLIC_API_BASE_URL
const API_BASE_URL = "http://127.0.0.1:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

/** Unwraps the envelope and throws a typed error on failure. */
export async function request<T>(
  config: Parameters<typeof api.request>[0],
): Promise<T> {
  const { data } = await api.request<ApiEnvelope<T>>(config);
  if (!data.success) {
    throw new ApiRequestError(data.message, data.error);
  }
  return data.data;
}

export class ApiRequestError extends Error {
  constructor(
    public message: string,
    public detail: string,
  ) {
    super(detail);
  }
}
```

Example calls:

```ts
import type {
  Department,
  LoginRequest,
  LoginResponse,
  Paginated,
  Subject,
} from "@/types/api";

const login = (body: LoginRequest) =>
  request<LoginResponse>({ method: "POST", url: "/auth/login", data: body });

const departments = (page = 1) =>
  request<Paginated<Department>>({
    method: "GET",
    url: "/departments",
    params: { page, per_page: 20 },
  });

const mySubjects = () =>
  request<Paginated<Subject>>({
    method: "GET",
    url: "/subjects/mine",
    params: { per_page: 100 },
  });
```

Suggested TanStack Query keys:

```ts
["me"]
["department", id] / ["departments", params]
["course", id] / ["courses", params]
["subject", id] / ["subjects", params] / ["subjects", "mine", params]
["faculty", id] / ["faculty", "list", params] / ["faculty", "me"]
["student", id] / ["students", params] / ["students", "me"]
["attendance", params] / ["attendance", "me", params]
["exam", id] / ["exams", params]
["result", id] / ["results", params] / ["results", "me", params]
["notice", id] / ["notices", params]
["fees", params] / ["fees", "me", params] / ["fees", id, "payments", params]
["assignments", params] / ["submission-me", params] / ["submissions", assignmentId, params]
["reports", "overview"] / ["reports", "attendance", params] / ["reports", "results", params] / ["reports", "fees", params]
```

Invalidate the relevant list and detail keys after any mutation.

---

## 7. Implementation checklist

- [ ] Login page calls `POST /auth/login`, stores the token, and routes by role.
- [ ] App boot calls `GET /auth/me`; invalid tokens redirect to `/login`.
- [ ] Global `401` interceptor clears auth state.
- [ ] Top navbar is full-width and fixed; sidebar is role-filtered and responsive.
- [ ] Each role has its own dashboard widgets and quick actions.
- [ ] Menu items, route guards, and action buttons are hidden for roles that cannot call the
      endpoint (backend still enforces).
- [ ] Every list uses server pagination with `page`, `per_page` (max 100), and `total`.
- [ ] Loading, empty, error, and access-denied states exist for every screen.
- [ ] Forms display `422` validation details (`error`) next to the relevant field where possible.
- [ ] Dates: `ISODate` rendered as-is; `ISODateTime` converted to local time.
- [ ] Money: whole units, no cents conversion.
- [ ] After creating/updating/deactivating, refetch or invalidate affected queries.
- [ ] Change password replaces the stored token with the returned `access_token`.
- [ ] Logout calls `POST /auth/logout` before clearing local state.
- [ ] Test all three roles end-to-end against the running backend.
