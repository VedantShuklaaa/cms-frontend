"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useToast } from "@/components/ui/toast";
import { toApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function ChangePasswordPage() {
  const { changePassword } = useAuth();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccess(false);
    if (!currentPassword) return setError("Enter your current password.");
    if (newPassword.length < 8 || newPassword.length > 128) {
      return setError("The new password must be between 8 and 128 characters.");
    }
    if (newPassword === currentPassword) {
      return setError("Choose a password different from your current one.");
    }
    if (newPassword !== confirmPassword) {
      return setError("The new passwords do not match.");
    }

    setSaving(true);
    setError(null);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast("Password changed", "success", "All other sessions have been signed out.");
    } catch (err: unknown) {
      setError(toApiError(err).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Change password"
        description="Changing your password signs out every other session and issues a fresh token for this one."
      />

      <div className="max-w-xl">
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4 p-6" noValidate>
            {success ? (
              <Alert tone="success">
                Your password has been changed and this session is using a new
                token.
              </Alert>
            ) : null}
            {error ? <Alert tone="error">{error}</Alert> : null}

            <Field
              label="Current password"
              htmlFor="current-password"
              required
            >
              <Input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="New password"
                htmlFor="new-password"
                required
                hint="8–128 characters."
              >
                <Input
                  id="new-password"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field
                label="Confirm new password"
                htmlFor="confirm-password"
                required
              >
                <Input
                  id="confirm-password"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </Field>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={showPasswords}
                onChange={(event) => setShowPasswords(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Show passwords
            </label>

            <div className="rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-500">
              <p className="flex items-center gap-1.5 font-medium text-slate-700">
                <Icon name="shield" size={14} />
                Password tips
              </p>
              <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                <li>Use a mix of upper and lower case letters, numbers and symbols.</li>
                <li>Avoid reusing a password from another service.</li>
                <li>Never share your password with anyone.</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                  setSuccess(false);
                }}
                disabled={saving}
              >
                Clear
              </Button>
              <Button
                type="submit"
                loading={saving}
                icon={<Icon name="lock" size={16} />}
              >
                Change password
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
