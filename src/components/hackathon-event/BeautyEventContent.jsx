import { useState } from "react";
import EventStage from "./EventStage";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { useEventOutcome } from "./useEventOutcome";
import { getEventUrl } from "../../utils/hackathonRoute";
import Media from "./Media";
import FirstEditionResults from "./FirstEditionResults";
import "./BeautyEventContent.css";
import "./ChallengePresentation.css";

const materials = [
    ["brief", "/uploads/documents/getui-beauty-challenge-ef8533c40c.pdf", "PDF"],
    ["products", "/uploads/documents/getui-beauty-products-57be310dc9.json", "JSON · 297"],
    ["images", "/uploads/documents/getui-beauty-test-images-ab7261c026.zip", "ZIP · 20"],
];

function Materials() {
    const { t } = useTranslation();
    return (
        <section className="hx-beauty-section">
            <h2>{t("getuiBeauty.materialsTitle")}</h2>
            <div className="hx-beauty-materials">
                {materials.map(([key, href, format]) => (
                    <a key={key} href={href} target="_blank" rel="noreferrer">
                        <span>
                            <strong>{t(`getuiBeauty.materials.${key}`)}</strong>
                            <small>{format}</small>
                        </span>
                        <ArrowDownToLine size={20} />
                    </a>
                ))}
            </div>
            <p className="hx-beauty-note">{t("getuiBeauty.materialsNote")}</p>
            <h3 className="hx-beauty-tutorial-heading">{t("getuiBeauty.tutorialsTitle")}</h3>
            <ul className="hx-beauty-list">
                <li>
                    <a
                        href="https://modelscope.cn/docs/studios/create"
                        target="_blank"
                        rel="noreferrer"
                    >
                        ModelScope Studio · {t("getuiBeauty.tutorialDeployment")}
                    </a>
                </li>
                <li>
                    <a
                        href="https://modelscope.cn/skills/modelscope/ModelScope-Studio"
                        target="_blank"
                        rel="noreferrer"
                    >
                        ModelScope Studio Skill
                    </a>
                </li>
                <li>
                    <a
                        href="https://modelscope.cn/docs/model-service/API-Inference/intro"
                        target="_blank"
                        rel="noreferrer"
                    >
                        ModelScope · API
                    </a>
                </li>
                <li>
                    <a
                        href="https://modelscope.cn/docs/aigc/intro"
                        target="_blank"
                        rel="noreferrer"
                    >
                        ModelScope · AIGC
                    </a>
                </li>
            </ul>
        </section>
    );
}

function Scenes({ template, photos }) {
    const { t } = useTranslation();
    if (!photos.length) return null;
    return (
        <section className="hx-beauty-section">
            <div className="hx-beauty-section-heading">
                <h2>{t("getuiBeauty.scenesTitle")}</h2>
                <Link to={getEventUrl(template.event.key, "media")}>
                    {t("getuiBeauty.allPhotos")} <ArrowUpRight size={16} />
                </Link>
            </div>
            <div className="hx-beauty-scenes">
                {photos.slice(0, 3).map((photo) => (
                    <Link
                        key={photo.id}
                        to={getEventUrl(template.event.key, "media", {
                            search: `photo=${photo.source_id || photo.id}`,
                        })}
                    >
                        <figure>
                            <img
                                src={photo.url || photo.cover_url}
                                alt={photo.title}
                                loading="lazy"
                            />
                            <figcaption>{photo.title}</figcaption>
                        </figure>
                    </Link>
                ))}
            </div>
        </section>
    );
}

function Overview({ template }) {
    const { t } = useTranslation();
    const { outcome } = useEventOutcome(template.results.competitionSlug);
    const photos = outcome?.media?.stage_photos || [];
    const cover = outcome?.media?.featured_photos?.[0] || photos[0];
    const partners = t("getuiBeauty.partners", { returnObjects: true });
    const schedule = t("getuiBeauty.schedule", { returnObjects: true });
    return (
        <div className="hx-content hx-beauty hx-beauty-overview">
            <header className="hx-beauty-hero">
                <div>
                    <p className="hx-overline">2026.06.07 · {t("getuiBeauty.kicker")}</p>
                    <h1>{t("getuiBeauty.title")}</h1>
                    <p className="hx-beauty-lead">{t("getuiBeauty.intro")}</p>
                    <div className="hx-beauty-actions">
                        <Link
                            className="hx-primary"
                            to={getEventUrl(template.event.key, "challenges")}
                        >
                            {t("getuiBeauty.viewChallenge")} <ArrowUpRight size={17} />
                        </Link>
                        <Link className="hx-outline" to={getEventUrl(template.event.key, "media")}>
                            {t("getuiBeauty.viewPhotos")}
                        </Link>
                    </div>
                </div>
                {cover && (
                    <figure>
                        <img src={cover.url || cover.cover_url} alt={cover.title} />
                        <figcaption>{cover.title}</figcaption>
                    </figure>
                )}
            </header>
            <dl className="hx-beauty-facts">
                {[
                    ["time", "2026.06.07 · 13:30–17:00"],
                    ["location", t("getuiBeauty.location")],
                    ["format", t("getuiBeauty.format")],
                ].map(([key, value]) => (
                    <div key={key}>
                        <dt>{t(`getuiBeauty.facts.${key}`)}</dt>
                        <dd>{value}</dd>
                    </div>
                ))}
            </dl>
            <section className="hx-beauty-section hx-beauty-program">
                <div>
                    <p className="hx-overline">{t("getuiBeauty.challengeLabel")}</p>
                    <h2>{t("getuiBeauty.challengeTitle")}</h2>
                    <p>{t("getuiBeauty.taskSummary")}</p>
                    <p className="hx-beauty-note">{t("getuiBeauty.awards")}</p>
                </div>
                <ol>
                    {schedule.map((item) => (
                        <li key={item.time}>
                            <time>{item.time}</time>
                            <span>{item.label}</span>
                        </li>
                    ))}
                </ol>
            </section>
            <section className="hx-beauty-section">
                <h2>{t("getuiBeauty.partnersTitle")}</h2>
                <dl className="hx-beauty-partners">
                    {partners.map((group) => (
                        <div key={group.role}>
                            <dt>{group.role}</dt>
                            <dd>
                                {group.names.map((name) => (
                                    <span key={name}>{name}</span>
                                ))}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>
            <Scenes template={template} photos={photos.filter((photo) => photo.id !== cover?.id)} />
            <p className="hx-beauty-note">
                <a
                    href="/uploads/images/getui-beauty-poster-56a47f2019.webp"
                    target="_blank"
                    rel="noreferrer"
                >
                    {t("getuiBeauty.poster")} ↗
                </a>
            </p>
            <p className="hx-beauty-note" id="registration-form">
                {t("getuiBeauty.ended")}
            </p>
        </div>
    );
}

function Challenge() {
    const { t } = useTranslation();
    const [selectedTask, setSelectedTask] = useState(0);
    const requirements = t("getuiBeauty.requirements", { returnObjects: true });
    const advanced = t("getuiBeauty.advanced", { returnObjects: true });
    const scoring = t("getuiBeauty.scoring", { returnObjects: true });
    return (
        <div className="hx-content hx-beauty hx-challenge-page hx-beauty-challenge-page">
            <EventStage
                kicker={t("getuiBeauty.challengeLabel")}
                title={t("getuiBeauty.challengeTitle").replace("与", "与\n")}
                description={t("getuiBeauty.taskSummary")}
                action={
                    <a className="hx-primary" href="#beauty-requirements">
                        {t("challengeStage.fullRequirements")} ↓
                    </a>
                }
            >
                <section
                    className="hx-challenge-console"
                    aria-label={t("getuiBeauty.requirementsTitle")}
                >
                    <div className="hx-challenge-console-top">
                        <span>{t("getuiBeauty.requirementsTitle")}</span>
                        <span>0{selectedTask + 1} / 03</span>
                    </div>
                    <div className="hx-challenge-console-body" aria-live="polite">
                        <span className="hx-challenge-step-number" aria-hidden="true">
                            0{selectedTask + 1}
                        </span>
                        <h2>{requirements[selectedTask].title}</h2>
                        <p>{requirements[selectedTask].description}</p>
                    </div>
                    <div
                        className="hx-challenge-selectors hx-challenge-selectors-three"
                        aria-label={t("getuiBeauty.requirementsTitle")}
                    >
                        {requirements.map((item, index) => (
                            <button
                                key={item.title}
                                type="button"
                                aria-pressed={selectedTask === index}
                                onClick={() => setSelectedTask(index)}
                            >
                                <span>0{index + 1}</span>
                                <strong>{t(`challengeStage.beautyTasks.${index}`)}</strong>
                            </button>
                        ))}
                    </div>
                </section>
            </EventStage>
            <div
                className="hx-challenge-layout hx-challenge-detail-section"
                id="beauty-requirements"
            >
                <div className="hx-challenge-main">
                    <section className="hx-challenge-section">
                        <h2>{t("getuiBeauty.requirementsTitle")}</h2>
                        <ol className="hx-challenge-steps">
                            {requirements.map((item) => (
                                <li key={item.title}>
                                    <h3>{item.title}</h3>
                                    <p>{item.description}</p>
                                </li>
                            ))}
                        </ol>
                    </section>
                    <section className="hx-challenge-section">
                        <h2>{t("getuiBeauty.advancedTitle")}</h2>
                        <ul className="hx-beauty-list">
                            {advanced.map((item) => (
                                <li key={item}>{item}</li>
                            ))}
                        </ul>
                    </section>
                    <section className="hx-challenge-section">
                        <h2>{t("getuiBeauty.deliveryTitle")}</h2>
                        <p>{t("getuiBeauty.delivery")}</p>
                        <p className="hx-beauty-note">{t("getuiBeauty.boundary")}</p>
                    </section>
                </div>
                <aside className="hx-challenge-aside">
                    <section>
                        <h2>{t("getuiBeauty.scoringTitle")}</h2>
                        <dl className="hx-beauty-scoring">
                            {scoring.map((item) => (
                                <div key={item.label}>
                                    <dt>{item.label}</dt>
                                    <dd>{item.weight}</dd>
                                </div>
                            ))}
                        </dl>
                        <p>{t("getuiBeauty.presentation")}</p>
                    </section>
                    <Materials />
                </aside>
            </div>
        </div>
    );
}

function Results({ template }) {
    return <FirstEditionResults template={template} copyNamespace="getuiBeauty" />;
}

export default function BeautyEventContent({ template, view, live }) {
    if (view === "media") return <Media template={template} live={live} />;
    if (view === "challenges") return <Challenge />;
    if (view === "results") return <Results template={template} />;
    return <Overview template={template} />;
}
