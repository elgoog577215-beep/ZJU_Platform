import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Folder,
    GripVertical,
    Plus,
    MoreHorizontal,
    Trash2,
    Pencil,
    Check,
    X,
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    useSortable,
    rectSortingStrategy,
    sortableKeyboardCoordinates,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { newId, titleOf, nameOf, descriptionOf, validateWorkspace } from "./workspace";

// Editing keeps the homepage grid. Drag handles reveal ordering; forms open beside their links.
function useDirectorySensors() {
    return useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );
}
function useDragAccessibility(items, getName) {
    const { t } = useTranslation("navigation");
    const label = (id) => getName(items.find((item) => item.id === id) || {});
    return {
        screenReaderInstructions: { draggable: t("custom.dragInstructions") },
        announcements: {
            onDragStart: ({ active }) => t("custom.dragStarted", { name: label(active.id) }),
            onDragOver: ({ over }) =>
                over
                    ? t("custom.dragPosition", {
                          position: items.findIndex((item) => item.id === over.id) + 1,
                      })
                    : undefined,
            onDragEnd: ({ active, over }) =>
                t("custom.dragFinished", {
                    name: label(active.id),
                    position: items.findIndex((item) => item.id === (over?.id || active.id)) + 1,
                }),
            onDragCancel: () => t("custom.dragCancelled"),
        },
    };
}
function DirectoryDragOverlay({ children, appearance }) {
    const reducedMotion = useReducedMotion();
    return createPortal(
        <div className="ai-directory inline-overlay-root" data-appearance={appearance}>
            <DragOverlay
                zIndex={1000}
                dropAnimation={
                    reducedMotion
                        ? null
                        : { duration: 180, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }
                }
            >
                {children}
            </DragOverlay>
        </div>,
        document.body
    );
}
function LinkFace({ link, english }) {
    return (
        <>
            <span className="directory-site-name">{nameOf(link, english)}</span>
            <span className="directory-site-description">
                {descriptionOf(link, english) || new URL(link.url).hostname}
            </span>
        </>
    );
}
function SortableLink({ link, english, disabled, onEdit }) {
    const { t } = useTranslation("navigation");
    const {
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: link.id, disabled });
    return (
        <li
            ref={setNodeRef}
            data-link-id={link.id}
            className={`inline-link ${isDragging ? "is-dragging" : ""}`}
            style={{ transform: CSS.Translate.toString(transform), transition }}
        >
            <button
                type="button"
                className="inline-link-face"
                onClick={onEdit}
                disabled={disabled}
                aria-label={t("custom.editLink", { name: nameOf(link, english) })}
            >
                <LinkFace link={link} english={english} />
                <Pencil className="inline-edit-mark" size={12} aria-hidden="true" />
            </button>
            <button
                ref={setActivatorNodeRef}
                type="button"
                className="inline-drag inline-link-grip"
                {...attributes}
                {...listeners}
                disabled={disabled}
                aria-label={t("custom.dragLink", { name: nameOf(link, english) })}
                title={t("custom.dragHint")}
            >
                <GripVertical size={14} />
            </button>
        </li>
    );
}
function LinkForm({
    link,
    group,
    english,
    values,
    onValuesChange,
    onDone,
    onCancel,
    onDelete,
    disabled,
}) {
    const { t } = useTranslation("navigation");
    const { name, url, description } = values;
    const [error, setError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const nameRef = useRef(null);
    useEffect(() => {
        nameRef.current?.focus({ preventScroll: true });
    }, []);
    function submit(event) {
        event.preventDefault();
        const value = {
            ...link,
            id: link?.id || newId(),
            name: name.trim(),
            url: url.trim(),
            description: description.trim(),
        };
        // Updating one language must not leave a stale translation masking the user's edit.
        if (english) {
            value.name = link?.name || value.name;
            value.nameEn = name.trim();
            value.description = link?.description || value.description;
            value.descriptionEn = description.trim();
        } else {
            value.nameEn = "";
            value.descriptionEn = "";
        }
        try {
            const [checked] = validateWorkspace([{ ...group, links: [value] }]);
            onDone(checked.links[0]);
        } catch {
            setError(t("custom.invalidLink"));
        }
    }
    return (
        <form
            className="inline-link-form"
            onSubmit={submit}
            onKeyDown={(event) => {
                if (event.key === "Escape") {
                    event.stopPropagation();
                    onCancel();
                }
            }}
            aria-label={t(link ? "custom.editLinkForm" : "custom.addLink")}
        >
            <div className="inline-form-title">
                <strong>{t(link ? "custom.editLinkForm" : "custom.addLink")}</strong>
                <button
                    type="button"
                    className="inline-icon"
                    onClick={onCancel}
                    aria-label={t("custom.closeLinkForm")}
                >
                    <X size={16} />
                </button>
            </div>
            <label>
                {t("custom.linkName")}
                <input
                    ref={nameRef}
                    required
                    maxLength={100}
                    value={name}
                    disabled={disabled}
                    onChange={(e) => onValuesChange({ ...values, name: e.target.value })}
                    placeholder={t("custom.linkNamePlaceholder")}
                />
            </label>
            <label>
                {t("custom.url")}
                <input
                    type="url"
                    required
                    maxLength={2048}
                    value={url}
                    disabled={disabled}
                    onChange={(e) => onValuesChange({ ...values, url: e.target.value })}
                    placeholder="https://"
                />
            </label>
            <label>
                {t("custom.linkDescription")}
                <input
                    maxLength={200}
                    value={description}
                    disabled={disabled}
                    onChange={(e) => onValuesChange({ ...values, description: e.target.value })}
                />
            </label>
            {error && (
                <p role="alert" className="inline-form-error">
                    {error}
                </p>
            )}
            <div className="inline-form-actions">
                {link && (
                    <button
                        type="button"
                        className="inline-icon inline-delete"
                        disabled={disabled}
                        onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}
                        aria-label={t("custom.deleteLink", { name })}
                    >
                        <Trash2 size={15} />
                        {confirmDelete ? t("custom.confirmDelete") : ""}
                    </button>
                )}
                <button type="button" className="workspace-button" onClick={onCancel}>
                    {t("custom.cancel")}
                </button>
                <button type="submit" className="workspace-button primary" disabled={disabled}>
                    <Check size={15} />
                    {t("custom.doneLink")}
                </button>
            </div>
        </form>
    );
}
function EditableGroup({
    group,
    icons,
    appearance,
    english,
    disabled,
    form,
    setForm,
    updateGroup,
    addGroupAfter,
    deleteGroup,
    canAddGroup,
    canAddLink,
    fresh,
}) {
    const { t } = useTranslation("navigation");
    const groupName = titleOf(group, english);
    const Icon = icons[group.id] || Folder;
    const titleRef = useRef(null);
    const menuRef = useRef(null);
    const groupRef = useRef(null);
    const focusTarget = useRef(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [draggedLink, setDraggedLink] = useState(null);
    const sensors = useDirectorySensors();
    const accessibility = useDragAccessibility(group.links, (link) => nameOf(link, english));
    const blocked = disabled || !!form;
    const {
        setNodeRef,
        setActivatorNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
        isOver,
    } = useSortable({ id: group.id, disabled: blocked });
    const localForm = form?.groupId === group.id ? form : null;
    const visibleLinks = expanded || localForm?.link ? group.links : group.links.slice(0, 9);
    useEffect(() => {
        if (!localForm && focusTarget.current) {
            const target = focusTarget.current;
            focusTarget.current = null;
            const selector =
                target === "add"
                    ? ".inline-add-link"
                    : `[data-link-id="${target}"] .inline-link-face`;
            groupRef.current?.querySelector(selector)?.focus();
        }
    }, [localForm]);
    useEffect(() => {
        if (fresh) {
            titleRef.current?.focus();
            titleRef.current?.select();
        }
    }, [fresh]);
    function rename(value) {
        updateGroup(
            group.id,
            english
                ? { title: group.title || value, titleEn: value }
                : { title: value, titleEn: "" }
        );
    }
    const showForm = (link = null) => {
        setForm({
            groupId: group.id,
            link,
            values: {
                name: link ? nameOf(link, english) : "",
                url: link?.url || "",
                description: link ? descriptionOf(link, english) : "",
            },
        });
        menuRef.current?.removeAttribute("open");
    };
    const formElement = localForm && (
        <LinkForm
            key={localForm.link?.id || "new"}
            link={localForm.link}
            values={localForm.values}
            onValuesChange={(values) => setForm({ ...localForm, values })}
            group={group}
            english={english}
            disabled={disabled}
            onCancel={() => {
                focusTarget.current = localForm.link?.id || "add";
                setForm(null);
            }}
            onDone={(link) => {
                focusTarget.current = link.id;
                updateGroup(group.id, {
                    links: localForm.link
                        ? group.links.map((item) => (item.id === link.id ? link : item))
                        : [...group.links, link],
                });
                setForm(null);
                setExpanded(true);
            }}
            onDelete={() => {
                focusTarget.current = "add";
                updateGroup(group.id, {
                    links: group.links.filter((item) => item.id !== localForm.link.id),
                });
                setForm(null);
            }}
        />
    );
    return (
        <section
            ref={(node) => {
                setNodeRef(node);
                groupRef.current = node;
            }}
            className={`directory-group inline-group ${isDragging ? "is-dragging" : ""} ${isOver ? "is-drop-target" : ""}`}
            data-group-id={group.id}
            style={{ transform: CSS.Translate.toString(transform), transition }}
            aria-label={groupName}
        >
            <div className="directory-group-heading inline-group-heading">
                <button
                    ref={setActivatorNodeRef}
                    type="button"
                    className="inline-drag inline-group-grip"
                    {...attributes}
                    {...listeners}
                    disabled={blocked}
                    aria-label={t("custom.dragGroup", { name: groupName })}
                    title={t("custom.dragHint")}
                >
                    <GripVertical size={18} />
                </button>
                <Icon size={18} className="inline-group-icon" aria-hidden="true" />
                <input
                    ref={titleRef}
                    className="inline-group-name"
                    aria-label={t("custom.renameGroup", { name: groupName })}
                    value={groupName}
                    maxLength={80}
                    disabled={disabled}
                    onChange={(e) => rename(e.target.value)}
                    placeholder={t("custom.newGroup")}
                />
                <small>{group.links.length}</small>
                <details
                    ref={menuRef}
                    className="inline-group-menu"
                    onToggle={(event) => {
                        if (!event.currentTarget.open) setConfirmDelete(false);
                    }}
                >
                    <summary aria-label={t("custom.groupActions", { name: groupName })}>
                        <MoreHorizontal size={18} />
                    </summary>
                    <div>
                        <button
                            type="button"
                            disabled={blocked || !canAddLink}
                            onClick={() => showForm()}
                        >
                            <Plus size={15} />
                            {t("custom.addLink")}
                        </button>
                        <button
                            type="button"
                            disabled={blocked || !canAddGroup}
                            onClick={() => {
                                menuRef.current?.removeAttribute("open");
                                addGroupAfter(group.id);
                            }}
                        >
                            <Plus size={15} />
                            {t("custom.addGroupAfter")}
                        </button>
                        <button
                            type="button"
                            disabled={blocked}
                            onClick={() =>
                                confirmDelete ? deleteGroup(group.id) : setConfirmDelete(true)
                            }
                        >
                            <Trash2 size={15} />
                            {t(confirmDelete ? "custom.confirmDeleteGroup" : "custom.deleteGroup")}
                        </button>
                    </div>
                </details>
            </div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                accessibility={accessibility}
                onDragStart={({ active }) =>
                    setDraggedLink(group.links.find((link) => link.id === active.id))
                }
                onDragCancel={() => setDraggedLink(null)}
                onDragEnd={({ active, over }) => {
                    setDraggedLink(null);
                    if (over && active.id !== over.id) {
                        updateGroup(group.id, {
                            links: arrayMove(
                                group.links,
                                group.links.findIndex((item) => item.id === active.id),
                                group.links.findIndex((item) => item.id === over.id)
                            ),
                        });
                    }
                }}
            >
                <SortableContext
                    items={visibleLinks.map((link) => link.id)}
                    strategy={rectSortingStrategy}
                >
                    <ul className="inline-links">
                        {visibleLinks.map((link) =>
                            localForm?.link?.id === link.id ? (
                                <li key={link.id} className="inline-form-cell">
                                    {formElement}
                                </li>
                            ) : (
                                <SortableLink
                                    key={link.id}
                                    link={link}
                                    english={english}
                                    disabled={blocked}
                                    onEdit={() => showForm(link)}
                                />
                            )
                        )}
                        {localForm && !localForm.link ? (
                            <li className="inline-form-cell">{formElement}</li>
                        ) : (
                            <li>
                                <button
                                    className="inline-add-link"
                                    type="button"
                                    disabled={blocked || !canAddLink}
                                    onClick={() => showForm()}
                                    aria-label={t("custom.addLinkTo", { name: groupName })}
                                >
                                    <Plus size={18} />
                                    <span>{t("custom.addLink")}</span>
                                </button>
                            </li>
                        )}
                    </ul>
                </SortableContext>
                <DirectoryDragOverlay appearance={appearance}>
                    {draggedLink ? (
                        <div className="inline-link-face inline-link-overlay">
                            <LinkFace link={draggedLink} english={english} />
                        </div>
                    ) : null}
                </DirectoryDragOverlay>
            </DndContext>
            <div className="inline-group-footer">
                {group.links.length > 9 && (
                    <button
                        type="button"
                        className="directory-view-all"
                        disabled={blocked}
                        onClick={() => setExpanded(!expanded)}
                    >
                        {t(expanded ? "collapse" : "viewAll")}
                        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>
                )}
                <button
                    type="button"
                    className="inline-insert-group"
                    disabled={blocked || !canAddGroup}
                    onClick={() => addGroupAfter(group.id)}
                    aria-label={t("custom.insertAfter", { name: groupName })}
                >
                    <Plus size={13} />
                    <span>{t("custom.addGroupAfter")}</span>
                </button>
            </div>
        </section>
    );
}
function GroupGhost({ group, icons, english }) {
    const Icon = icons[group.id] || Folder;
    return (
        <div className="directory-group inline-group-overlay">
            <div className="directory-group-heading">
                <h2>
                    <GripVertical size={18} />
                    <Icon size={18} />
                    {titleOf(group, english)}
                    <span>{group.links.length}</span>
                </h2>
            </div>
            <ul>
                {group.links.slice(0, 9).map((link) => (
                    <li key={link.id}>
                        <div className="inline-link-face">
                            <LinkFace link={link} english={english} />
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
export default function WorkspaceEditor({
    groups,
    onChange,
    disabled,
    english,
    icons,
    appearance,
    form,
    setForm,
}) {
    const { t } = useTranslation("navigation");
    const [active, setActive] = useState(null);
    const [fresh, setFresh] = useState(null);
    const sensors = useDirectorySensors();
    const accessibility = useDragAccessibility(groups, (group) => titleOf(group, english));
    const updateGroup = (id, patch) =>
        onChange(groups.map((group) => (group.id === id ? { ...group, ...patch } : group)));
    function addGroup(after) {
        const group = { id: newId(), title: t("custom.newGroup"), titleEn: "", links: [] };
        const index = after ? groups.findIndex((item) => item.id === after) + 1 : groups.length;
        onChange([...groups.slice(0, index), group, ...groups.slice(index)]);
        setFresh(group.id);
    }
    const totalLinks = groups.reduce((n, group) => n + group.links.length, 0);
    return (
        <div className="inline-home-editor" aria-label={t("custom.edit")}>
            {form && (
                <p role="status" className="inline-pending">
                    {t("custom.finishLinkFirst")}
                </p>
            )}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                accessibility={accessibility}
                onDragStart={({ active }) =>
                    setActive(groups.find((group) => group.id === active.id))
                }
                onDragCancel={() => setActive(null)}
                onDragEnd={({ active, over }) => {
                    setActive(null);
                    if (over && over.id !== active.id)
                        onChange(
                            arrayMove(
                                groups,
                                groups.findIndex((group) => group.id === active.id),
                                groups.findIndex((group) => group.id === over.id)
                            )
                        );
                }}
            >
                <SortableContext
                    items={groups.map((group) => group.id)}
                    strategy={rectSortingStrategy}
                >
                    <div
                        className={`directory-grid inline-directory-grid ${active ? "is-sorting" : ""}`}
                    >
                        {groups.map((group) => (
                            <EditableGroup
                                key={group.id}
                                group={group}
                                icons={icons}
                                appearance={appearance}
                                english={english}
                                disabled={disabled}
                                form={form}
                                setForm={setForm}
                                updateGroup={updateGroup}
                                addGroupAfter={addGroup}
                                deleteGroup={(id) =>
                                    onChange(groups.filter((item) => item.id !== id))
                                }
                                canAddGroup={groups.length < 40}
                                canAddLink={group.links.length < 100 && totalLinks < 600}
                                fresh={fresh === group.id}
                            />
                        ))}
                        <button
                            type="button"
                            className="inline-add-group"
                            disabled={disabled || !!form || !!active || groups.length >= 40}
                            onClick={() => addGroup()}
                        >
                            <Plus size={24} />
                            <span>{t("custom.addGroup")}</span>
                            <small>{t("custom.addGroupHint")}</small>
                        </button>
                    </div>
                </SortableContext>
                <DirectoryDragOverlay appearance={appearance}>
                    {active ? <GroupGhost group={active} icons={icons} english={english} /> : null}
                </DirectoryDragOverlay>
            </DndContext>
        </div>
    );
}
