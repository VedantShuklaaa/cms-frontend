"use client";

import Link from "next/link";
import { Icon } from "@/components/icons";
import { ActiveBadge, Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/feedback";
import { PageHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_BADGE_TONES, ROLE_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import { useQuery } from "@/lib/hooks";
import { initials } from "@/lib/utils";
import type { Faculty, Student } from "@/types/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const role = user?.role;

  const profile = useQuery(
    async () => {
      if (role === "FACULTY") {
        return apiRequest<Faculty>("/faculty/me");
      }
      if (role === "STUDENT") {
        return apiRequest<Student>("/students/me");
      }
      return null;
    },
    [role],
    { enabled: Boolean(user) },
  );

  const displayName =
    profile.data && "first_name" in profile.data
      ? `${profile.data.first_name} ${profile.data.last_name}`
      : user?.email.split("@")[0] ?? "Account";

  return (
    <>
      <PageHeader
        title="My profile"
        description="Your account details. Profile changes are managed by the college administration."
        actions={
          <Link href="/change-password">
            <Button variant="outline" icon={<Icon name="lock" size={16} />}>
              Change password
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-semibold text-white shadow-lg shadow-indigo-500/20">
                {initials(displayName)}
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">
                  {displayName}
                </h2>
                <p className="truncate text-sm text-slate-500">{user?.email}</p>
                {role ? (
                  <span className="mt-1.5 inline-flex">
                    <Badge tone={ROLE_BADGE_TONES[role]}>
                      {ROLE_LABELS[role]}
                    </Badge>
                  </span>
                ) : null}
              </div>
            </div>

            <dl className="mt-6 space-y-3 border-t border-slate-100 pt-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Account status</dt>
                <dd>
                  <ActiveBadge active={user?.is_active ?? false} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Member since</dt>
                <dd className="font-medium text-slate-700">
                  {user ? formatDate(user.created_at.slice(0, 10)) : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Account created</dt>
                <dd className="text-right text-xs text-slate-600">
                  {user ? formatDateTime(user.created_at) : "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
              <p className="font-medium text-slate-700">Need a change?</p>
              <p className="mt-1">
                Contact the administration office to update your name, contact
                details or enrolment information.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-slate-900">
              {role === "STUDENT"
                ? "Enrolment details"
                : role === "FACULTY"
                  ? "Faculty details"
                  : "Administrator account"}
            </h2>
            <p className="text-xs text-slate-500">
              {role === "ADMIN"
                ? "Administrator accounts are provisioned from the backend environment."
                : "Official records held by the college."}
            </p>
          </div>
          <div className="p-5">
            {role === "ADMIN" ? (
              <div className="space-y-3">
                <DetailRow
                  icon="mail"
                  label="Email address"
                  value={user?.email ?? "—"}
                />
                <DetailRow
                  icon="shield"
                  label="Role"
                  value={ROLE_LABELS.ADMIN}
                />
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No extended profile is attached to administrator accounts.
                </div>
              </div>
            ) : profile.loading ? (
              <LoadingState label="Loading your profile…" />
            ) : profile.error ? (
              <ErrorState error={profile.error} onRetry={profile.refetch} />
            ) : !profile.data ? null : role === "STUDENT" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  icon="mail"
                  label="Email"
                  value={(profile.data as Student).email}
                />
                <DetailRow
                  icon="graduation"
                  label="Enrolment number"
                  value={(profile.data as Student).enrollment_no}
                />
                <DetailRow
                  icon="book"
                  label="Course"
                  value={(profile.data as Student).course_name}
                />
                <DetailRow
                  icon="building"
                  label="Department"
                  value={(profile.data as Student).department_name}
                />
                <DetailRow
                  icon="layers"
                  label="Current semester"
                  value={String((profile.data as Student).current_semester)}
                />
                <DetailRow
                  icon="calendarDays"
                  label="Admission year"
                  value={String((profile.data as Student).admission_year)}
                />
                <DetailRow
                  icon="phone"
                  label="Phone"
                  value={(profile.data as Student).phone || "Not provided"}
                />
                <DetailRow
                  icon="calendar"
                  label="Date of birth"
                  value={
                    (profile.data as Student).date_of_birth
                      ? formatDate((profile.data as Student).date_of_birth!)
                      : "Not provided"
                  }
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <DetailRow
                  icon="mail"
                  label="Email"
                  value={(profile.data as Faculty).email}
                />
                <DetailRow
                  icon="user"
                  label="Employee ID"
                  value={(profile.data as Faculty).employee_id}
                />
                <DetailRow
                  icon="building"
                  label="Department"
                  value={(profile.data as Faculty).department_name}
                />
                <DetailRow
                  icon="shield"
                  label="Designation"
                  value={(profile.data as Faculty).designation}
                />
                <DetailRow
                  icon="phone"
                  label="Phone"
                  value={(profile.data as Faculty).phone || "Not provided"}
                />
                <DetailRow
                  icon="calendar"
                  label="Joined on"
                  value={
                    (profile.data as Faculty).joined_on
                      ? formatDate((profile.data as Faculty).joined_on!)
                      : "Not provided"
                  }
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: "mail" | "phone" | "building" | "graduation" | "book" | "layers" | "calendar" | "calendarDays" | "user" | "shield";
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon name={icon} size={15} />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
