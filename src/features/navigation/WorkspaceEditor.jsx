import { useState } from "react";
import { ArrowUp, ArrowDown, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { moveItem, newId, titleOf, nameOf, descriptionOf } from "./workspace";
export function OrderButtons({ index, count, onMove, label, disabled }) {
    const { t } = useTranslation("navigation");
    return (
        <span className="workspace-order">
            <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => onMove(-1)}
                aria-label={t("custom.up", { name: label })}
            >
                <ArrowUp size={15} />
            </button>
            <button
                type="button"
                disabled={disabled || index === count - 1}
                onClick={() => onMove(1)}
                aria-label={t("custom.down", { name: label })}
            >
                <ArrowDown size={15} />
            </button>
        </span>
    );
}
export default function WorkspaceEditor({ groups, onChange, disabled, english }) {
    const { t } = useTranslation("navigation");
    const [selected, setSelected] = useState(groups[0]?.id);
    const group = groups.find((item) => item.id === selected) || groups[0];
    const update = (patch) =>
        onChange(groups.map((item) => (item.id === group.id ? { ...item, ...patch } : item)));
    const updateLink = (id, patch) =>
        update({
            links: group.links.map((link) => (link.id === id ? { ...link, ...patch } : link)),
        });
    function addGroup() {
        const id = newId();
        onChange([...groups, { id, title: t("custom.newGroup"), titleEn: "", links: [] }]);
        setSelected(id);
    }
    return (
        <fieldset disabled={disabled} className="workspace-editor">
            <legend className="sr-only">{t("custom.edit")}</legend>
            <nav className="workspace-groups" aria-label={t("custom.groupList")}>
                {groups.map((item, index) => (
                    <div className="workspace-group-row" key={item.id}>
                        <button
                            type="button"
                            className="workspace-group-select"
                            aria-current={group?.id === item.id ? "true" : undefined}
                            onClick={() => setSelected(item.id)}
                        >
                            {titleOf(item, english) || t("custom.newGroup")}
                            <small>{item.links.length}</small>
                        </button>
                        <OrderButtons
                            index={index}
                            count={groups.length}
                            onMove={(delta) => onChange(moveItem(groups, index, delta))}
                            label={titleOf(item, english)}
                        />
                    </div>
                ))}
                <button
                    type="button"
                    className="workspace-button"
                    disabled={groups.length >= 40}
                    onClick={addGroup}
                >
                    <Plus size={16} />
                    {t("custom.addGroup")}
                </button>
            </nav>
            <div className="workspace-group-edit">
                {group ? (
                    <>
                        <div className="workspace-group-title">
                            <label>
                                {t("custom.groupName")}
                                <input
                                    value={titleOf(group, english)}
                                    maxLength={80}
                                    onChange={(e) => update({ title: e.target.value, titleEn: "" })}
                                />
                            </label>
                            <button
                                type="button"
                                className="workspace-button"
                                onClick={() => {
                                    if (window.confirm(t("custom.deleteGroupConfirm")))
                                        onChange(groups.filter((item) => item.id !== group.id));
                                }}
                            >
                                <Trash2 size={16} />
                                {t("custom.deleteGroup")}
                            </button>
                        </div>
                        <ol className="workspace-links">
                            {group.links.map((link, index) => (
                                <li key={link.id} className="workspace-link-edit">
                                    <div className="workspace-link-fields">
                                        <label>
                                            {t("custom.linkName")}
                                            <input
                                                value={nameOf(link, english)}
                                                maxLength={100}
                                                onChange={(e) =>
                                                    updateLink(link.id, {
                                                        name: e.target.value,
                                                        nameEn: "",
                                                    })
                                                }
                                            />
                                        </label>
                                        <label>
                                            {t("custom.url")}
                                            <input
                                                type="url"
                                                value={link.url}
                                                maxLength={2048}
                                                placeholder="https://"
                                                onChange={(e) =>
                                                    updateLink(link.id, { url: e.target.value })
                                                }
                                            />
                                        </label>
                                        <label className="workspace-description-field">
                                            {t("custom.linkDescription")}
                                            <input
                                                value={descriptionOf(link, english) || ""}
                                                maxLength={200}
                                                onChange={(e) =>
                                                    updateLink(link.id, {
                                                        description: e.target.value,
                                                        descriptionEn: "",
                                                    })
                                                }
                                            />
                                        </label>
                                    </div>
                                    <div className="workspace-link-actions">
                                        <OrderButtons
                                            index={index}
                                            count={group.links.length}
                                            label={link.name || t("custom.linkName")}
                                            onMove={(delta) =>
                                                update({
                                                    links: moveItem(group.links, index, delta),
                                                })
                                            }
                                        />
                                        <button
                                            type="button"
                                            aria-label={t("custom.deleteLink", { name: link.name })}
                                            onClick={() =>
                                                update({
                                                    links: group.links.filter(
                                                        (item) => item.id !== link.id
                                                    ),
                                                })
                                            }
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ol>
                        {!group.links.length && (
                            <p className="workspace-hint">{t("custom.emptyGroup")}</p>
                        )}
                        <button
                            type="button"
                            className="workspace-button"
                            disabled={
                                group.links.length >= 100 ||
                                groups.reduce((n, item) => n + item.links.length, 0) >= 600
                            }
                            onClick={() =>
                                update({
                                    links: [
                                        ...group.links,
                                        { id: newId(), name: "", url: "", description: "" },
                                    ],
                                })
                            }
                        >
                            <Plus size={16} />
                            {t("custom.addLink")}
                        </button>
                    </>
                ) : (
                    <p className="workspace-hint">{t("custom.emptyWorkspace")}</p>
                )}
            </div>
        </fieldset>
    );
}
