import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext";
import RegistrationProfileFields from "./RegistrationProfileFields";
import { emptyRegistrationProfile, hasRegistrationProfile } from "../utils/registrationProfile";

export default function RegistrationProfileForm({ onSaved, onCancel }) {
    const { user, saveRegistrationProfile } = useAuth();
    const { t } = useTranslation();
    const [profile, setProfile] = useState(
        () => user?.registrationProfile || emptyRegistrationProfile()
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const submit = async (event) => {
        event.preventDefault();
        if (saving) return;
        if (!hasRegistrationProfile(profile)) {
            setError(t("accountProfile.invalid"));
            return;
        }
        setSaving(true);
        setError("");
        try {
            const saved = await saveRegistrationProfile(profile);
            if (saved) onSaved?.();
        } catch (error) {
            setError(
                t(
                    error.response?.data?.errorCode === "REGISTRATION_PROFILE_INVALID"
                        ? "accountProfile.invalid"
                        : "accountProfile.saveFailed"
                )
            );
        } finally {
            setSaving(false);
        }
    };
    return (
        <form
            onSubmit={submit}
            className="min-h-0 overflow-y-auto overscroll-contain space-y-5 py-2"
            aria-label={t("accountProfile.complete")}
        >
            {!onCancel && <p className="text-sm opacity-75">{t("accountProfile.completeHint")}</p>}
            <RegistrationProfileFields
                value={profile}
                disabled={saving}
                onChange={(id, value) => setProfile((current) => ({ ...current, [id]: value }))}
            />
            {error && (
                <p role="alert" className="text-sm text-rose-400">
                    {error}
                </p>
            )}
            <div className="flex flex-wrap gap-3">
                <button
                    type="submit"
                    disabled={saving}
                    className="hx-primary min-h-[44px] disabled:opacity-50"
                >
                    {t(saving ? "common.submitting" : "accountProfile.saveContinue")}
                </button>
                {onCancel && (
                    <button
                        type="button"
                        disabled={saving}
                        onClick={onCancel}
                        className="hx-outline min-h-[44px]"
                    >
                        {t("common.cancel")}
                    </button>
                )}
            </div>
        </form>
    );
}
