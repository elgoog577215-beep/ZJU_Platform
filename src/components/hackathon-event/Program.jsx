import { useTranslation } from "react-i18next";
import { ArrowUpRight } from "lucide-react";
import { eventTimestamp, stageState } from "../../utils/hackathonAiX";

export default function Program({ template, now, switchView }) {
    const { t, i18n } = useTranslation();
    const event = template.event;
    const date = (value) =>
        new Intl.DateTimeFormat(i18n.resolvedLanguage?.startsWith("en") ? "en-GB" : "zh-CN", {
            month: "numeric",
            day: "numeric",
            timeZone: event.timezone,
        }).format(eventTimestamp(value));
    return (
        <div className="hx-program-summary relative mx-auto w-full">
            <header>
                {/* 眉题对齐报名区左栏（Register → 赛事报名）的样式：英文标签 + 大标题 + 弱化说明，见 .hx-program-summary header。 */}
                <p className="hx-overline">Agenda</p>
                <h2>{t("aix.agendaTitle")}</h2>
                <p>{t("aix.planned")}</p>
            </header>
            <p className="hx-program-campus-schedule">{t("aix.campusSchedule")}</p>
            <h3>{t("aix.industryStages")}</h3>
            <ol className="hx-program-stages">
                {(event.program.stages || []).map((stage, index) => (
                    <li key={stage.id}>
                        <div>
                            <span>
                                0{index + 1} / {date(stage.opensAt)}
                            </span>
                            <span>{t(`aix.state.${stageState(stage, now)}`)}</span>
                        </div>
                        <h3>{t(`aix.stages.${stage.id}.title`)}</h3>
                        <p>{t(`aix.stages.${stage.id}.description`)}</p>
                    </li>
                ))}
            </ol>
            <div className="hx-program-tracks">
                {["campus", "industry"].map((track) => (
                    <button key={track} onClick={() => switchView("challenges")}>
                        <h3>
                            {t(`aix.tracks.${track}.title`)}
                            <ArrowUpRight size={22} />
                        </h3>
                        <p>{t(`aix.tracks.${track}.description`)}</p>
                        <span>{t(`aix.tracks.${track}.topics`)}</span>
                    </button>
                ))}
            </div>
            <div className="hx-program-forums">
                <div>
                    <h3>{t("aix.forumsKicker")}</h3>
                    <p>{t("aix.forumsDescription")}</p>
                </div>
                {["technology", "entrepreneurship"].map((forum) => (
                    <article key={forum}>
                        <time>{t(`aix.forums.${forum}.date`)}</time>
                        <h3>{t(`aix.forums.${forum}.title`)}</h3>
                        <p>{t(`aix.forums.${forum}.description`)}</p>
                    </article>
                ))}
            </div>
        </div>
    );
}
