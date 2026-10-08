import { useState } from "react";
import { ArrowUpRight, CheckCircle2, Github, FolderGit2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { eventTimestamp } from "../../utils/hackathonAiX";
import "./RepositorySubmission.css";

export default function RepositorySubmission({ registration, endAt, onSaved }) {
    const { t } = useTranslation();
    const [urls, setUrls] = useState(() => ({
        githubUrl: registration.repositories?.githubUrl || "",
        modelscopeUrl: registration.repositories?.modelscopeUrl || "",
    }));
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [invalidField, setInvalidField] = useState("");
    const [saved, setSaved] = useState(false);
    const closed = Date.now() >= eventTimestamp(endAt);
    const submit = async (event) => {
        event.preventDefault();
        if (saving || closed) return;
        setSaving(true);
        setError("");
        setInvalidField("");
        setSaved(false);
        try {
            const { data } = await api.put(
                "/hackathon/registration/repositories",
                { eventKey: registration.eventKey, ...urls },
                { noRetry: true }
            );
            setUrls({
                githubUrl: data.repositories.githubUrl,
                modelscopeUrl: data.repositories.modelscopeUrl,
            });
            onSaved?.({ ...registration, repositories: data.repositories });
            setSaved(true);
        } catch (e) {
            const data = e.response?.data;
            setInvalidField(data?.field || "");
            setError(
                t(
                    data?.code === "HACKATHON_REPOSITORY_INVALID"
                        ? `aix.repositories.invalid.${data.field === "githubUrl" ? "github" : "modelscope"}`
                        : data?.code === "HACKATHON_REPOSITORY_EMPTY"
                          ? "aix.repositories.empty"
                          : data?.code === "HACKATHON_REPOSITORIES_CLOSED"
                            ? "aix.repositories.closed"
                            : "aix.repositories.failed"
                )
            );
        } finally {
            setSaving(false);
        }
    };
    const answer = (key, value) =>
        Array.isArray(value)
            ? value.map((item) => t(`aix.options.${item}`, { defaultValue: item })).join(" · ")
            : key === "grade"
              ? t(`aix.options.${value}`, { defaultValue: value })
              : String(value || "");
    return (
        <div className="aix-repository-receipt">
            <div className="aix-repository-success" role="status">
                <CheckCircle2 size={24} />
                <div>
                    <h3>{t("aix.register.saved")}</h3>
                    <p>{t("aix.repositories.receipt", { id: registration.id })}</p>
                </div>
            </div>
            <details className="aix-registration-receipt-details">
                <summary>
                    {registration.answers?.name} · {t("aix.repositories.viewRegistration")}
                </summary>
                <dl>
                    {Object.entries(registration.answers || {})
                        .filter(([, v]) => v && (!Array.isArray(v) || v.length))
                        .map(([key, value]) => (
                            <div key={key}>
                                <dt>{t(`aix.fields.${key}`, { defaultValue: key })}</dt>
                                <dd>{answer(key, value)}</dd>
                            </div>
                        ))}
                </dl>
            </details>
            <form onSubmit={submit} className="aix-repository-form">
                <div>
                    <h3>{t("aix.repositories.title")}</h3>
                    <p>{t("aix.repositories.description")}</p>
                </div>
                {[
                    ["githubUrl", "github", Github, "https://github.com/owner/repo"],
                    [
                        "modelscopeUrl",
                        "modelscope",
                        FolderGit2,
                        "https://modelscope.cn/studios/owner/repo",
                    ],
                ].map(([field, provider, Icon, placeholder]) => (
                    <div className="aix-repository-field" key={field}>
                        <label htmlFor={`repository-${field}`}>
                            <Icon size={19} />
                            {t(`aix.repositories.${provider}`)}
                        </label>
                        <input
                            id={`repository-${field}`}
                            type="url"
                            inputMode="url"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            maxLength={1000}
                            placeholder={placeholder}
                            value={urls[field]}
                            disabled={saving || closed}
                            aria-invalid={invalidField === field || undefined}
                            aria-describedby={
                                invalidField === field
                                    ? "repository-error"
                                    : `repository-${field}-hint`
                            }
                            onChange={(e) => {
                                setUrls((current) => ({ ...current, [field]: e.target.value }));
                                setSaved(false);
                                setInvalidField("");
                                setError("");
                            }}
                        />
                        <p id={`repository-${field}-hint`}>
                            {t(`aix.repositories.${provider}Hint`)}
                        </p>
                        {registration.repositories?.[field] && (
                            <a
                                href={registration.repositories[field]}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {t("aix.repositories.openSaved")}
                                <ArrowUpRight size={15} />
                            </a>
                        )}
                    </div>
                ))}
                {error && (
                    <p role="alert" id="repository-error" className="aix-repository-error">
                        {error}
                    </p>
                )}
                {saved && (
                    <p role="status" className="aix-repository-saved">
                        {t("aix.repositories.saved")}
                    </p>
                )}
                {closed ? (
                    <p role="status">{t("aix.repositories.closed")}</p>
                ) : (
                    <button className="aix-primary" type="submit" disabled={saving}>
                        {t(saving ? "aix.repositories.saving" : "aix.repositories.save")}
                    </button>
                )}
            </form>
        </div>
    );
}
