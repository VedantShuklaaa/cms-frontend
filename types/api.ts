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

export type MySubmissionListQuery = PaginationQuery;

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
