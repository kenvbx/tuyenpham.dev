import { Button, Card, Input } from "@cms/ui";
import { type FormEvent, useState } from "react";

import { useAuth } from "../auth/auth-context";
import { updateCurrentProfile } from "../lib/api";
import { supabase } from "../lib/supabase";

export function ProfilePage() {
  const auth = useAuth();
  const profile = auth.currentUser?.profile;
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  async function handleProfileSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!auth.token) {
      return;
    }

    const formData = new FormData(event.currentTarget);
    setIsSavingProfile(true);
    setProfileMessage(null);

    try {
      await updateCurrentProfile(auth.token, {
        avatarId: normalizeNullableValue(formData.get("avatarId")),
        displayName: String(formData.get("displayName") ?? ""),
        firstName: String(formData.get("firstName") ?? ""),
        lastName: String(formData.get("lastName") ?? ""),
      });
      await auth.refreshCurrentUser();
      setProfileMessage("Profile updated.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "Unable to update profile.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setPasswordMessage("Missing Supabase admin configuration.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (password !== confirmPassword) {
      setPasswordMessage("Password confirmation does not match.");
      return;
    }

    setIsSavingPassword(true);
    setPasswordMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        throw error;
      }

      form.reset();
      setPasswordMessage("Password updated.");
    } catch (error) {
      setPasswordMessage(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setIsSavingPassword(false);
    }
  }

  return (
    <section className="profile-page">
      <div className="module-header">
        <div>
          <p>Account</p>
          <h2>Profile</h2>
        </div>
      </div>

      <div className="profile-layout">
        <Card className="form-panel">
          <form className="profile-form" onSubmit={handleProfileSubmit}>
            <div>
              <p>Public profile</p>
              <h3>{profile?.email}</h3>
            </div>
            <label>
              Display name
              <Input name="displayName" defaultValue={profile?.displayName ?? ""} />
            </label>
            <div className="form-grid">
              <label>
                First name
                <Input name="firstName" defaultValue={profile?.firstName ?? ""} />
              </label>
              <label>
                Last name
                <Input name="lastName" defaultValue={profile?.lastName ?? ""} />
              </label>
            </div>
            <label>
              Avatar media ID
              <Input name="avatarId" defaultValue={profile?.avatarId ?? ""} />
            </label>
            {profileMessage && (
              <p className="form-alert form-alert--neutral" role="status">
                {profileMessage}
              </p>
            )}
            <Button disabled={isSavingProfile} type="submit">
              {isSavingProfile ? "Saving" : "Save profile"}
            </Button>
          </form>
        </Card>

        <Card className="form-panel">
          <form className="profile-form" onSubmit={handlePasswordSubmit}>
            <div>
              <p>Security</p>
              <h3>Change password</h3>
            </div>
            <label>
              New password
              <Input required minLength={8} name="password" type="password" />
            </label>
            <label>
              Confirm password
              <Input required minLength={8} name="confirmPassword" type="password" />
            </label>
            {passwordMessage && (
              <p className="form-alert form-alert--neutral" role="status">
                {passwordMessage}
              </p>
            )}
            <Button disabled={isSavingPassword} type="submit">
              {isSavingPassword ? "Saving" : "Update password"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
}

function normalizeNullableValue(value: FormDataEntryValue | null) {
  const normalizedValue = String(value ?? "").trim();

  return normalizedValue ? normalizedValue : null;
}
