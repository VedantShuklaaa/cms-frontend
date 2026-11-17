import type { Role } from "@/types/api";
import type { IconName } from "@/components/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: IconName;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

const account: NavItem[] = [
  { label: "My profile", href: "/profile", icon: "user" },
  { label: "Change password", href: "/change-password", icon: "lock" },
];

const notices: NavItem = {
  label: "Notices",
  href: "/notices",
  icon: "megaphone",
};

export const NAVIGATION: Record<Role, NavSection[]> = {
  ADMIN: [
    {
      items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }],
    },
    {
      label: "Academics",
      items: [
        { label: "Departments", href: "/departments", icon: "building" },
        { label: "Courses", href: "/courses", icon: "book" },
        { label: "Subjects", href: "/subjects", icon: "layers" },
      ],
    },
    {
      label: "People",
      items: [
        { label: "Faculty", href: "/faculty", icon: "users" },
        { label: "Students", href: "/students", icon: "graduation" },
      ],
    },
    {
      label: "Teaching",
      items: [
        { label: "Attendance", href: "/attendance", icon: "clipboard" },
        { label: "Exams", href: "/exams", icon: "calendar" },
        { label: "Results", href: "/results", icon: "award" },
        { label: "Assignments", href: "/assignments", icon: "file" },
      ],
    },
    {
      label: "Administration",
      items: [
        { label: "Fees", href: "/fees", icon: "wallet" },
        notices,
        { label: "Reports", href: "/reports", icon: "chart" },
      ],
    },
    { label: "Account", items: account },
  ],
  FACULTY: [
    {
      items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }],
    },
    {
      label: "Teaching",
      items: [
        { label: "My subjects", href: "/subjects", icon: "layers" },
        { label: "Students", href: "/students", icon: "graduation" },
        { label: "Attendance", href: "/attendance", icon: "clipboard" },
        { label: "Results", href: "/results", icon: "award" },
        { label: "Assignments", href: "/assignments", icon: "file" },
        notices,
      ],
    },
    { label: "Account", items: account },
  ],
  STUDENT: [
    {
      items: [{ label: "Dashboard", href: "/dashboard", icon: "dashboard" }],
    },
    {
      label: "Academics",
      items: [
        { label: "My subjects", href: "/subjects", icon: "layers" },
        { label: "My attendance", href: "/my-attendance", icon: "clipboard" },
        { label: "My results", href: "/my-results", icon: "award" },
        { label: "Assignments", href: "/assignments", icon: "file" },
        notices,
        { label: "My fees", href: "/my-fees", icon: "wallet" },
      ],
    },
    { label: "Account", items: account },
  ],
};

interface RouteRule {
  prefix: string;
  roles: Role[];
}

const ROUTE_RULES: RouteRule[] = [
  { prefix: "/faculty", roles: ["ADMIN"] },
  { prefix: "/students", roles: ["ADMIN", "FACULTY"] },
  { prefix: "/attendance", roles: ["ADMIN", "FACULTY"] },
  { prefix: "/my-attendance", roles: ["STUDENT"] },
  { prefix: "/exams", roles: ["ADMIN", "FACULTY"] },
  { prefix: "/results", roles: ["ADMIN", "FACULTY"] },
  { prefix: "/my-results", roles: ["STUDENT"] },
  { prefix: "/fees", roles: ["ADMIN"] },
  { prefix: "/my-fees", roles: ["STUDENT"] },
  { prefix: "/reports", roles: ["ADMIN", "FACULTY"] },
];

export function canAccessRoute(pathname: string, role: Role): boolean {
  const rule = ROUTE_RULES.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );
  return !rule || rule.roles.includes(role);
}

export function isActiveRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitleFor(pathname: string): string {
  const all: NavItem[] = Object.values(NAVIGATION).flatMap((sections) =>
    sections.flatMap((section) => section.items),
  );
  const match = all.find((item) => isActiveRoute(pathname, item.href));
  return match?.label ?? "Dashboard";
}
