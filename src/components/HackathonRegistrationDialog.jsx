import { useEffect, useRef, useState } from "react";
import { X, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import BodyPortal from "../shared/ui/BodyPortal";
import { useBackClose, useBodyScrollLock } from "../hooks/useBackClose";
import { buildHackathonInitialAnswers, getActiveHackathonFields } from "../data/hackathonTemplate";
import api from "../services/api";

export default function HackathonRegistrationDialog({
    template,
    registration,
    onRegistered,
    onClose,
    isDay,
    user,
    onLogin,
}) {
    const { t } = useTranslation();
    const dialog = useRef(null);
    const [answers, setAnswers] = useState(
        () => registration?.answers || buildHackathonInitialAnswers(template)
    );
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    useBodyScrollLock(true);
    useBackClose(true, onClose);
    useEffect(() => {
        const element = dialog.current;
        element.showModal();
        return () => element.close();
    }, []);
    const fields = getActiveHackathonFields(template);
    const submit = async (event) => {
        event.preventDefault();
        if (busy || registration) return;
        setBusy(true);
        setError("");
        try {
            const { data } = await api.post(
                "/hackathon/register",
                { eventKey: template.event.key, answers },
                { noRetry: true }
            );
            onRegistered({ id: data.id, eventKey: template.event.key, answers });
        } catch (err) {
            if (err.response?.status === 409) {
                try {
                    const { data } = await api.get("/hackathon/registration", {
                        params: { event: template.event.key },
                    });
                    if (data.registration) {
                        onRegistered(data.registration);
                        return;
                    }
                } catch {
                    /* Keep the form and report the original failed submission. */
                }
            }
            setError(err.response?.data?.error || t("aix.register.failed"));
        } finally {
            setBusy(false);
        }
    };
    const update = (id, value) => setAnswers((current) => ({ ...current, [id]: value }));
    return (
        <BodyPortal>
            <dialog
                ref={dialog}
                className={`hx-dialog ${isDay ? "is-day" : ""}`}
                aria-labelledby="hx-registration-title"
                onCancel={(event) => {
                    event.preventDefault();
                    onClose();
                }}
                onClick={(event) => {
                    if (event.target === dialog.current) {
                        const box = dialog.current.getBoundingClientRect();
                        if (
                            event.clientX < box.left ||
                            event.clientX > box.right ||
                            event.clientY < box.top ||
                            event.clientY > box.bottom
                        )
                            onClose();
                    }
                }}
            >
                <div className="hx-dialog-heading">
                    <div>
                        <p>{template.event.title}</p>
                        <h2 id="hx-registration-title">
                            {t(registration ? "aix.register.registered" : "aix.register.title")}
                        </h2>
                    </div>
                    <button
                        type="button"
                        className="hx-icon"
                        onClick={onClose}
                        aria-label={t("aix.close")}
                    >
                        <X size={22} />
                    </button>
                </div>
                {!user ? (
                    <div className="hx-login">
                        <p>{t("aix.register.loginHint")}</p>
                        <button className="hx-primary" onClick={onLogin}>
                            {t("aix.register.login")}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={submit}>
                        <p className="hx-muted">
                            {t(registration ? "aix.register.success" : "aix.register.description")}
                        </p>
                        {registration && (
                            <div className="hx-success" role="status">
                                <Check size={18} />
                                {t("aix.register.saved")}
                            </div>
                        )}
                        <div className="hx-form-grid">
                            {fields.map((field) => {
                                const label = t(`aix.fields.${field.id}`, {
                                    defaultValue: field.label,
                                });
                                const value = registration
                                    ? registration.answers?.[field.id]
                                    : answers[field.id];
                                const optionLabel = (option) =>
                                    t(`aix.options.${option.value}`, {
                                        defaultValue: option.label,
                                    });
                                return (
                                    <label
                                        key={field.id}
                                        className={field.width === "half" ? "" : "hx-full"}
                                    >
                                        <span>
                                            {label}
                                            {field.required && !registration ? " *" : ""}
                                        </span>
                                        {registration ? (
                                            <span className="hx-answer">
                                                {Array.isArray(value)
                                                    ? value
                                                          .map((item) =>
                                                              optionLabel(
                                                                  field.options.find(
                                                                      (option) =>
                                                                          option.value === item
                                                                  ) || { value: item, label: item }
                                                              )
                                                          )
                                                          .join(" / ")
                                                    : typeof value === "boolean"
                                                      ? t(value ? "aix.yes" : "aix.no")
                                                      : field.options.find(
                                                              (option) => option.value === value
                                                          )
                                                        ? optionLabel(
                                                              field.options.find(
                                                                  (option) => option.value === value
                                                              )
                                                          )
                                                        : value || "—"}
                                            </span>
                                        ) : field.type === "select" ? (
                                            <select
                                                required={field.required}
                                                value={value || ""}
                                                onChange={(e) => update(field.id, e.target.value)}
                                            >
                                                <option value="">{t("aix.register.choose")}</option>
                                                {field.options.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {optionLabel(option)}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : field.type === "textarea" ? (
                                            <textarea
                                                required={field.required}
                                                value={value || ""}
                                                maxLength={3000}
                                                onChange={(e) => update(field.id, e.target.value)}
                                            />
                                        ) : field.type === "multi_select" ? (
                                            <select
                                                multiple
                                                required={field.required}
                                                value={value || []}
                                                onChange={(e) =>
                                                    update(
                                                        field.id,
                                                        [...e.target.selectedOptions].map(
                                                            (option) => option.value
                                                        )
                                                    )
                                                }
                                            >
                                                {field.options.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {optionLabel(option)}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input
                                                type={
                                                    field.type === "checkbox"
                                                        ? "checkbox"
                                                        : field.id === "contact"
                                                          ? "email"
                                                          : "text"
                                                }
                                                required={field.required}
                                                value={
                                                    field.type === "checkbox"
                                                        ? undefined
                                                        : value || ""
                                                }
                                                checked={
                                                    field.type === "checkbox" ? !!value : undefined
                                                }
                                                maxLength={300}
                                                autoComplete={
                                                    field.id === "name"
                                                        ? "name"
                                                        : field.id === "contact"
                                                          ? "email"
                                                          : "off"
                                                }
                                                onChange={(e) =>
                                                    update(
                                                        field.id,
                                                        field.type === "checkbox"
                                                            ? e.target.checked
                                                            : e.target.value
                                                    )
                                                }
                                            />
                                        )}
                                    </label>
                                );
                            })}
                        </div>
                        {error && (
                            <p className="hx-error" role="alert">
                                {error}
                            </p>
                        )}
                        <p className="hx-privacy">{t("aix.register.privacy")}</p>
                        <button
                            className="hx-primary hx-submit"
                            type={registration ? "button" : "submit"}
                            disabled={busy}
                            onClick={registration ? onClose : undefined}
                        >
                            {t(
                                registration
                                    ? "aix.close"
                                    : busy
                                      ? "aix.register.submitting"
                                      : "aix.register.submit"
                            )}
                        </button>
                    </form>
                )}
            </dialog>
        </BodyPortal>
    );
}
