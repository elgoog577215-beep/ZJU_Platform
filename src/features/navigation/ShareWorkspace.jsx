import { useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../services/api";
import { newId, titleOf } from "./workspace";
import { GroupPreview } from "./NavigationPlaza";
export default function ShareWorkspace({ groups, version, english, onClose, onShared }) {
    const { t } = useTranslation("navigation");
    const [selected, setSelected] = useState([]);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [id] = useState(newId);
    const chosen = groups.filter((group) => selected.includes(group.id));
    async function submit(e) {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
            const { data } = await api.post(
                "/navigation/collections",
                { id, title, description, groupIds: selected, version },
                { silent: true, noRetry: true, timeout: 15000 }
            );
            onShared(data.status);
        } catch (err) {
            setError(
                t(err.response?.status === 409 ? "custom.shareConflict" : "custom.actionError")
            );
        } finally {
            setBusy(false);
        }
    }
    return (
        <form className="workspace-share-form" onSubmit={submit}>
            <div className="workspace-section-heading">
                <div>
                    <h2>{t("custom.share")}</h2>
                    <p>{t("custom.shareHelp")}</p>
                </div>
                <button
                    className="workspace-button"
                    type="button"
                    disabled={busy}
                    onClick={onClose}
                >
                    {t("custom.cancel")}
                </button>
            </div>
            <fieldset disabled={busy}>
                <legend>{t("custom.chooseGroups")}</legend>
                <div className="workspace-group-choices">
                    {groups.map((group) => (
                        <label key={group.id}>
                            <input
                                type="checkbox"
                                checked={selected.includes(group.id)}
                                onChange={(e) =>
                                    setSelected(
                                        e.target.checked
                                            ? [...selected, group.id]
                                            : selected.filter((id) => id !== group.id)
                                    )
                                }
                            />
                            {titleOf(group, english)} <small>{group.links.length}</small>
                        </label>
                    ))}
                </div>
            </fieldset>
            <div className="workspace-share-fields">
                <label>
                    {t("custom.collectionTitle")}
                    <input
                        required
                        maxLength={100}
                        value={title}
                        disabled={busy}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </label>
                <label>
                    {t("custom.collectionDescription")}
                    <textarea
                        maxLength={500}
                        value={description}
                        disabled={busy}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </label>
            </div>
            <h3>{t("custom.publicPreview")}</h3>
            {!chosen.length ? (
                <p className="workspace-hint">{t("custom.chooseFirst")}</p>
            ) : (
                <GroupPreview groups={chosen} english={english} />
            )}
            {error && (
                <p role="alert" className="workspace-notice">
                    {error}
                </p>
            )}
            <button
                className="workspace-button primary"
                disabled={busy || !title.trim() || !chosen.some((group) => group.links.length)}
            >
                {t(busy ? "custom.saving" : "custom.submitShare")}
            </button>
        </form>
    );
}
