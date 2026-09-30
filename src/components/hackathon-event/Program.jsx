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
                <p className="hx-overline">Competition Board</p>
                <h2>{t("aix.agendaTitle")}</h2>
                <p>{t("aix.planned")}</p>
            </header>
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
                {["technology", "entrepreneurship"].map((forum, index) => (
                    <article key={forum}>
                        <time>{date(index ? event.endAt : event.startAt)}</time>
                        <h3>{t(`aix.forums.${forum}.title`)}</h3>
                        <p>{t(`aix.forums.${forum}.description`)}</p>
                    </article>
                ))}
            </div>
        </div>
    );
}
