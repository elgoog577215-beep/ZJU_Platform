import { AdminPanel, AdminButton } from "./AdminUI";
const names = { initial: "初赛", semifinal: "复赛", final: "决赛" };
const toLocal = (value) =>
    value ? new Date(new Date(value).getTime() + 8 * 3600000).toISOString().slice(0, 16) : "";
const toZoned = (value) => (value ? `${value}:00+08:00` : "");
export default function HackathonProgramEditor({ program, onChange, inputClass, fieldClass }) {
    const update = (collection, index, field, value) =>
        onChange({
            ...program,
            [collection]: program[collection].map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            ),
        });
    const remove = (collection, index) =>
        onChange({ ...program, [collection]: program[collection].filter((_, i) => i !== index) });
    const add = (collection) =>
        onChange({
            ...program,
            [collection]: [
                ...(program[collection] || []),
                {
                    id: crypto.randomUUID(),
                    title: "",
                    published: false,
                    ...(collection === "challenges"
                        ? {
                              stage: "initial",
                              track: "campus",
                              description: "",
                              briefUrl: "",
                              submissionUrl: "",
                          }
                        : { speaker: "", forum: "", summary: "", url: "" }),
                },
            ],
        });
    return (
        <AdminPanel
            title="赛程、赛题与分享"
            description="时间统一使用北京时间。已勾选发布的华为初赛命题按独立发布时间公开，其他赛题按阶段开始时间公开；分享勾选发布并保存后立即公开。"
        >
            <label className="block text-sm mb-5">
                报名截止时间
                <input
                    type="datetime-local"
                    className={`${inputClass} mt-2`}
                    value={toLocal(program.registrationClosesAt)}
                    onChange={(e) =>
                        onChange({ ...program, registrationClosesAt: toZoned(e.target.value) })
                    }
                />
            </label>
            <label className="block text-sm mb-5">
                华为初赛命题发布时间（选填，默认采用阶段开始时间）
                <input
                    type="datetime-local"
                    className={`${inputClass} mt-2`}
                    value={toLocal(program.challengeReleaseAt)}
                    onChange={(e) =>
                        onChange({ ...program, challengeReleaseAt: toZoned(e.target.value) })
                    }
                />
            </label>
            <div className="space-y-3">
                {(program.stages || []).map((stage, index) => (
                    <fieldset key={stage.id} className={fieldClass}>
                        <legend>{names[stage.id]}</legend>
                        <div className="grid gap-3 md:grid-cols-2">
                            {["opensAt", "closesAt"].map((key) => (
                                <label key={key} className="text-sm">
                                    {key === "opensAt" ? "阶段开始" : "提交截止"}
                                    <input
                                        type="datetime-local"
                                        className={`${inputClass} mt-2`}
                                        value={toLocal(stage[key])}
                                        onChange={(e) =>
                                            update("stages", index, key, toZoned(e.target.value))
                                        }
                                    />
                                </label>
                            ))}
                        </div>
                    </fieldset>
                ))}
            </div>
            {["challenges", "reports"].map((collection) => (
                <section key={collection} className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3>{collection === "challenges" ? "赛题" : "讲话与论坛分享"}</h3>
                        <AdminButton tone="subtle" onClick={() => add(collection)}>
                            新增
                        </AdminButton>
                    </div>
                    <div className="space-y-4">
                        {(program[collection] || []).map((item, index) => (
                            <fieldset key={item.id} className={fieldClass}>
                                <div className="flex justify-between mb-3">
                                    <label className="flex items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={item.published}
                                            onChange={(e) =>
                                                update(
                                                    collection,
                                                    index,
                                                    "published",
                                                    e.target.checked
                                                )
                                            }
                                        />
                                        发布
                                    </label>
                                    <AdminButton
                                        tone="subtle"
                                        onClick={() => remove(collection, index)}
                                    >
                                        移除
                                    </AdminButton>
                                </div>
                                {collection === "challenges" && (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <label className="text-sm">
                                            阶段
                                            <select
                                                className={inputClass}
                                                value={item.stage}
                                                onChange={(e) =>
                                                    update(
                                                        collection,
                                                        index,
                                                        "stage",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                {Object.entries(names).map(([id, label]) => (
                                                    <option key={id} value={id}>
                                                        {label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="text-sm">
                                            赛道
                                            <select
                                                className={inputClass}
                                                value={item.track}
                                                onChange={(e) =>
                                                    update(
                                                        collection,
                                                        index,
                                                        "track",
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="campus">校园赛道</option>
                                                <option value="industry">产业赛道</option>
                                            </select>
                                        </label>
                                    </div>
                                )}
                                <label className="block text-sm mb-3">
                                    标题
                                    <input
                                        className={inputClass}
                                        value={item.title}
                                        onChange={(e) =>
                                            update(collection, index, "title", e.target.value)
                                        }
                                    />
                                </label>
                                {collection === "reports" && (
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        {["speaker", "forum"].map((key) => (
                                            <label className="text-sm" key={key}>
                                                {key === "speaker" ? "分享人" : "所属论坛"}
                                                <input
                                                    className={inputClass}
                                                    value={item[key] || ""}
                                                    onChange={(e) =>
                                                        update(
                                                            collection,
                                                            index,
                                                            key,
                                                            e.target.value
                                                        )
                                                    }
                                                />
                                            </label>
                                        ))}
                                    </div>
                                )}
                                <label className="block text-sm mb-3">
                                    {collection === "challenges" ? "赛题说明" : "分享摘要"}
                                    <textarea
                                        className={inputClass}
                                        rows={4}
                                        value={
                                            item[
                                                collection === "challenges"
                                                    ? "description"
                                                    : "summary"
                                            ] || ""
                                        }
                                        onChange={(e) =>
                                            update(
                                                collection,
                                                index,
                                                collection === "challenges"
                                                    ? "description"
                                                    : "summary",
                                                e.target.value
                                            )
                                        }
                                    />
                                </label>
                                {(collection === "challenges"
                                    ? [
                                          ["briefUrl", "完整赛题链接"],
                                          ["submissionUrl", "提交入口链接"],
                                      ]
                                    : [["url", "全文 / 回放链接"]]
                                ).map(([key, label]) => (
                                    <label className="block text-sm mb-3" key={key}>
                                        {label}
                                        <input
                                            type="url"
                                            className={inputClass}
                                            value={item[key] || ""}
                                            placeholder="https://"
                                            onChange={(e) =>
                                                update(collection, index, key, e.target.value)
                                            }
                                        />
                                    </label>
                                ))}
                            </fieldset>
                        ))}
                    </div>
                </section>
            ))}
        </AdminPanel>
    );
}
