import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X, UserRound } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { hasRegistrationProfile } from "../utils/registrationProfile";
import { hasSeenProfileReminder, markProfileReminderSeen } from "../utils/profileReminderSession";
import RegistrationProfileForm from "./RegistrationProfileForm";

export default function RegistrationProfileReminder() {
    const { user, loading } = useAuth();
    const { uiMode } = useSettings();
    const { t } = useTranslation();
    const { pathname } = useLocation();
    const [openFor, setOpenFor] = useState(null);
    const titleId = useId();
    const descriptionId = useId();
    const needsProfile = Boolean(user) && !hasRegistrationProfile(user.registrationProfile);
    const isOpen = needsProfile && openFor === user.id;
    const day = uiMode === "day";
    const close = () => setOpenFor(null);
    useBackClose(isOpen, close);
    useBodyScrollLock(isOpen);
    const dialogRef = useFocusTrap(isOpen);

    useEffect(() => {
        if (!needsProfile) setOpenFor(null);
    }, [needsProfile]);

    useEffect(() => {
        if (loading || !needsProfile) return;
        const remind = () => {
            if (
                document.visibilityState === "hidden" ||
                !navigator.onLine ||
                hasSeenProfileReminder(user.id)
            )
                return;
            // Allow an in-progress login or another dialog to finish first.
            if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
            markProfileReminderSeen(user.id);
            setOpenFor(user.id);
        };
        const timer = window.setTimeout(remind, 600);
        window.addEventListener("focus", remind);
        window.addEventListener("online", remind);
        document.addEventListener("visibilitychange", remind);
        return () => {
            window.clearTimeout(timer);
            window.removeEventListener("focus", remind);
            window.removeEventListener("online", remind);
            document.removeEventListener("visibilitychange", remind);
        };
    }, [loading, needsProfile, user?.id, pathname]);

    if (!needsProfile) return null;
    const panel = day
        ? "bg-white text-slate-900 border-slate-200"
        : "bg-[#111219] text-white border-white/15";
    return createPortal(
        isOpen ? (
            <div className="fixed inset-0 z-[105] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <div
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby={titleId}
                    aria-describedby={descriptionId}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") close();
                    }}
                    className={`relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-lg border p-5 shadow-2xl sm:p-7 ${panel}`}
                >
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 id={titleId} className="text-xl font-bold">
                            {t("accountProfile.complete")}
                        </h2>
                        <button
                            type="button"
                            aria-label={t("common.close")}
                            onClick={close}
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-gray-500/10"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <p id={descriptionId} className="mb-4 text-sm leading-6 opacity-70">
                        {t("accountProfile.reminderHint")}
                    </p>
                    <RegistrationProfileForm
                        key={user.id}
                        variant="account"
                        onSaved={close}
                        onCancel={close}
                    />
                </div>
            </div>
        ) : (
            <button
                type="button"
                onClick={() => {
                    markProfileReminderSeen(user.id);
                    setOpenFor(user.id);
                }}
                className={`fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium shadow-lg ${panel}`}
            >
                <UserRound size={17} aria-hidden="true" />
                {t("accountProfile.complete")}
            </button>
        ),
        document.body
    );
}
