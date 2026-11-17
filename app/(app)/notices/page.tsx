"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Alert,
  EmptyState,
  ErrorState,
  TableLoading,
} from "@/components/ui/feedback";
import { Field, Input, SearchInput, Select, Textarea } from "@/components/ui/input";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { useToast } from "@/components/ui/toast";
import { apiRequest, toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  AUDIENCES,
  AUDIENCE_LABELS,
  DEFAULT_PAGE_SIZE,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useDebouncedValue, useQuery } from "@/lib/hooks";
import {
  fromDateTimeInput,
  toDateTimeInput,
} from "@/lib/utils";
import type { Audience, Notice, Paginated } from "@/types/api";

const AUDIENCE_TONES: Record<Audience, "emerald" | "sky" | "violet" | "amber"> = {
  ALL: "emerald",
  STUDENTS: "sky",
  FACULTY: "violet",
  ADMIN: "amber",
};

export default function NoticesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === "ADMIN";

  const [search, setSearch] = useState("");
  const [audience, setAudience] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [includeExpired, setIncludeExpired] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [deleting, setDeleting] = useState<Notice | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const debouncedSearch = useDebouncedValue(search);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const query = useQuery(
    () =>
      apiRequest<Paginated<Notice>>("/notices", {
        params: {
          page,
          per_page: perPage,
          search: debouncedSearch || undefined,
          audience: audience || undefined,
          include_inactive:
            isAdmin && includeInactive ? true : undefined,
          include_expired: isAdmin && includeExpired ? true : undefined,
        },
      }),
    [
      page,
      perPage,
      debouncedSearch,
      audience,
      includeInactive,
      includeExpired,
      isAdmin,
    ],
  );

  async function handleDelete() {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await apiRequest<null>(`/notices/${deleting.id}`, { method: "DELETE" });
      toast("Notice removed", "success");
      setDeleting(null);
      query.refetch();
    } catch (error: unknown) {
      toast(toApiError(error).message, "error");
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Notices"
        description={
          isAdmin
            ? "Announcements shown to everyone or targeted at a specific audience."
            : "Announcements published for you and the wider college."
        }
        actions={
          isAdmin ? (
            <Button
              icon={<Icon name="plus" size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New notice
            </Button>
          ) : undefined
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
              placeholder="Search notices…"
            />
            <Select
              value={audience}
              onChange={(event) => {
                setAudience(event.target.value);
                setPage(1);
              }}
              className="sm:w-44"
              aria-label="Filter by audience"
            >
              <option value="">All audiences</option>
              {AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABELS[value]}
                </option>
              ))}
            </Select>
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(event) => {
                    setIncludeInactive(event.target.checked);
                    setPage(1);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Inactive
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={includeExpired}
                  onChange={(event) => {
                    setIncludeExpired(event.target.checked);
                    setPage(1);
                  }}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                Expired
              </label>
            </div>
          ) : null}
        </div>

        {query.loading && !query.data ? (
          <TableLoading />
        ) : query.error ? (
          <ErrorState error={query.error} onRetry={query.refetch} />
        ) : !query.data || query.data.items.length === 0 ? (
          <EmptyState
            icon="megaphone"
            title="No notices"
            description={
              isAdmin
                ? "Publish a notice to keep the college informed."
                : "There are no announcements for you right now."
            }
            action={
              isAdmin ? (
                <Button
                  size="sm"
                  icon={<Icon name="plus" size={14} />}
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  New notice
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="divide-y divide-slate-100">
              {query.data.items.map((notice) => {
                const expired =
                  notice.expires_at !== null &&
                  new Date(notice.expires_at).getTime() < now;
                const scheduled =
                  new Date(notice.published_at).getTime() > now;
                return (
                  <article key={notice.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-semibold text-slate-900">
                            {notice.title}
                          </h2>
                          <Badge tone={AUDIENCE_TONES[notice.audience]}>
                            {AUDIENCE_LABELS[notice.audience]}
                          </Badge>
                          {scheduled ? (
                            <Badge tone="amber">Scheduled</Badge>
                          ) : null}
                          {expired ? <Badge tone="slate">Expired</Badge> : null}
                          {!notice.is_active ? (
                            <Badge tone="rose">Inactive</Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {notice.created_by_email} · Published{" "}
                          {formatDateTime(notice.published_at)}
                          {notice.expires_at
                            ? ` · Expires ${formatDateTime(notice.expires_at)}`
                            : ""}
                        </p>
                      </div>
                      {isAdmin ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditing(notice);
                              setFormOpen(true);
                            }}
                            aria-label={`Edit ${notice.title}`}
                            title="Edit"
                          >
                            <Icon name="pencil" size={16} />
                          </Button>
                          {notice.is_active ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-rose-500 hover:bg-rose-50 hover:text-rose-600"
                              onClick={() => setDeleting(notice)}
                              aria-label={`Remove ${notice.title}`}
                              title="Remove"
                            >
                              <Icon name="trash" size={16} />
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {notice.body}
                    </p>
                  </article>
                );
              })}
            </div>
            <Pagination
              page={page}
              perPage={perPage}
              total={query.data.total}
              onPageChange={setPage}
              onPerPageChange={(value) => {
                setPerPage(value);
                setPage(1);
              }}
            />
          </>
        )}
      </Card>

      <NoticeFormModal
        open={formOpen}
        initial={editing}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          query.refetch();
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        pending={deletePending}
        title="Remove notice?"
        description={
          <>
            <strong className="font-semibold text-slate-800">
              {deleting?.title}
            </strong>{" "}
            will no longer be visible to its audience.
          </>
        }
        confirmLabel="Remove notice"
      />
    </>
  );
}

function NoticeFormModal({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: Notice | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [publishedAt, setPublishedAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setBody(initial?.body ?? "");
    setAudience(initial?.audience ?? "ALL");
    setPublishedAt(toDateTimeInput(initial?.published_at) || "");
    setExpiresAt(toDateTimeInput(initial?.expires_at) || "");
    setActive(initial?.is_active ?? true);
    setError(null);
  }, [open, initial]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      return setError("A title and message body are required.");
    }
    if (
      publishedAt &&
      expiresAt &&
      new Date(expiresAt).getTime() <= new Date(publishedAt).getTime()
    ) {
      return setError("The expiry must be after the publish time.");
    }

    setSaving(true);
    setError(null);
    try {
      if (initial) {
        await apiRequest<Notice>(`/notices/${initial.id}`, {
          method: "PUT",
          body: {
            title: title.trim(),
            body: body.trim(),
            audience,
            published_at: publishedAt ? fromDateTimeInput(publishedAt) : null,
            expires_at: expiresAt ? fromDateTimeInput(expiresAt) : null,
            is_active: active,
          },
        });
        toast("Notice updated", "success");
      } else {
        await apiRequest<Notice>("/notices", {
          method: "POST",
          body: {
            title: title.trim(),
            body: body.trim(),
            audience,
            ...(publishedAt
              ? { published_at: fromDateTimeInput(publishedAt) }
              : {}),
            expires_at: expiresAt ? fromDateTimeInput(expiresAt) : null,
          },
        });
        toast(publishedAt ? "Notice scheduled" : "Notice published", "success");
      }
      onSaved();
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial ? "Edit notice" : "New notice"}
      description="Leave the publish time empty to publish immediately."
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="notice-form" loading={saving}>
            {initial ? "Save changes" : "Publish notice"}
          </Button>
        </>
      }
    >
      <form id="notice-form" onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field label="Title" htmlFor="notice-title" required>
          <Input
            id="notice-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Mid-semester timetable published"
          />
        </Field>
        <Field label="Message" htmlFor="notice-body" required>
          <Textarea
            id="notice-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write the announcement…"
            rows={6}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Audience" htmlFor="notice-audience" required>
            <Select
              id="notice-audience"
              value={audience}
              onChange={(event) => setAudience(event.target.value as Audience)}
            >
              {AUDIENCES.map((value) => (
                <option key={value} value={value}>
                  {AUDIENCE_LABELS[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Publish at"
            htmlFor="notice-published"
            hint="Empty publishes now."
          >
            <Input
              id="notice-published"
              type="datetime-local"
              value={publishedAt}
              onChange={(event) => setPublishedAt(event.target.value)}
            />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Expires at"
            htmlFor="notice-expires"
            hint="Optional. Must be after publishing."
          >
            <Input
              id="notice-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
            />
          </Field>
          {initial ? (
            <Field label="Status" htmlFor="notice-active">
              <Select
                id="notice-active"
                value={active ? "active" : "inactive"}
                onChange={(event) => setActive(event.target.value === "active")}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </Field>
          ) : null}
        </div>
      </form>
    </Modal>
  );
}
