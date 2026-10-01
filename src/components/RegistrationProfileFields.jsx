import { useId } from "react";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import { registrationProfileFields, registrationProfileGrades } from "../utils/registrationProfile";

export default function RegistrationProfileFields({ value, onChange, disabled = false }) {
    const prefix = useId();
    const { t, i18n } = useTranslation();
    const { uiMode } = useSettings();
    const day = uiMode === "day";
    const inputClass = `w-full min-w-0 min-h-[44px] rounded-md border px-3 py-2 text-base outline-none focus:ring-2 focus:ring-cyan-400/40 disabled:opacity-60 ${day ? "bg-white border-slate-300 text-slate-900" : "bg-white/5 border-white/20 text-white"}`;
    return (
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {registrationProfileFields.map(({ id, maxLength }) => (
                <div key={id} className="min-w-0">
                    <label
                        htmlFor={`${prefix}-${id}`}
                        className={`mb-1.5 block text-sm font-medium ${day ? "text-slate-700" : "text-gray-200"}`}
                    >
                        {t(`accountProfile.fields.${id}`)} <span className="text-rose-400">*</span>
                    </label>
                    {id === "grade" ? (
                        <select
                            id={`${prefix}-${id}`}
                            value={value[id] || ""}
                            required
                            disabled={disabled}
                            onChange={(e) => onChange(id, e.target.value)}
                            className={inputClass}
                        >
                            <option value="" className={day ? "bg-white" : "bg-neutral-900"}>
                                {t("accountProfile.chooseGrade")}
                            </option>
                            {registrationProfileGrades.map((grade) => (
                                <option
                                    key={grade.value}
                                    value={grade.value}
                                    className={day ? "bg-white" : "bg-neutral-900"}
                                >
                                    {i18n.resolvedLanguage?.startsWith("en")
                                        ? grade.labelEn
                                        : grade.label}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            id={`${prefix}-${id}`}
                            name={id}
                            type="text"
                            value={value[id] || ""}
                            required
                            maxLength={maxLength}
                            disabled={disabled}
                            autoComplete={id === "name" ? "name" : "off"}
                            onChange={(e) => onChange(id, e.target.value)}
                            className={inputClass}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}
