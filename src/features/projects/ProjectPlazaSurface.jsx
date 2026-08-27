import { useEffect, useRef } from "react";
import {
    ArrowRight,
    CalendarDays,
    FolderKanban,
    Image,
    Plus,
    RotateCcw,
    Search,
    SlidersHorizontal,
    Trophy,
} from "lucide-react";

/*
THESIS: 项目广场是始终可回退的赛事档案索引，不再用赛事状态替换整页结构。
OWN-WORLD: 深夜舞台、青柠行动色、紧凑矩形控件和真实项目影像。
STORY: 先确认浏览范围，再理解赛事上下文，最后搜索、比较并行动。
FIRST VIEWPORT: 固定项目中心身份；其下常驻赛事索引，当前赛事面板和作品工具栏依次进入视野。
FORM: 有序候选 3“赛事时间档案架”，横向档案账本 staging，seed 71dabc5b；拒绝一次性入口和随机卡片拼贴。
*/

export const ProjectHubHeader = ({
    t,
    total,
    competitionCount,
    competition,
    featuredCompetition,
    submissionAvailable,
    competitionPhase,
    onSelectCompetition,
    onSubmitCompetition,
    onCreateProject,
    embedded = false,
}) => (
    <header
        className={`ppx-hero ${embedded ? "is-embedded" : ""}`}
        aria-labelledby="project-plaza-title"
    >
        <div className="ppx-hero-copy">
            <span className="ppx-kicker">
                {embedded
                    ? t("project_plaza.workspace.stage_kicker", "当前赛事 · 项目作品")
                    : t("project_plaza.kicker", "HACKATHON · PROJECT HUB")}
            </span>
            <h1 id="project-plaza-title">
                {embedded
                    ? t("project_plaza.workspace.stage_title", "提交作品，也看见所有作品")
                    : t("project_plaza.title", "黑客松项目中心")}
            </h1>
            <p>
                {embedded
                    ? t(
                          "project_plaza.workspace.stage_subtitle",
                          "这里保存本场比赛的作品提交、公开项目和赛后迭代记录。"
                      )
                    : t(
                          "project_plaza.workspace.subtitle",
                          "浏览每一届比赛的真实作品，也让项目在赛后继续被发现、协作和迭代。"
                      )}
            </p>
            {!embedded ? (
                <div
                    className="ppx-lifecycle"
                    aria-label={t("project_plaza.hub.aria", "黑客松项目流程")}
                >
                    <span>{t("project_plaza.hub.submit", "参赛提交")}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>{t("project_plaza.hub.archive", "成果归档")}</span>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>{t("project_plaza.hub.grow", "赛后生长")}</span>
                </div>
            ) : null}
        </div>

        <div className="ppx-hero-side">
            <div
                className="ppx-hero-facts"
                aria-label={t("project_plaza.workspace.facts_aria", "项目中心概况")}
            >
                <span>
                    <strong>{total}</strong>
                    {t("project_plaza.facts.total", "个项目在册")}
                </span>
                <span>
                    <strong>{competitionCount}</strong>
                    {t("project_plaza.workspace.events_count", "场赛事已归档")}
                </span>
            </div>
            <div className="ppx-hero-actions">
                {competition ? (
                    <button
                        className="ppp-newbtn"
                        type="button"
                        onClick={onSubmitCompetition}
                        disabled={!submissionAvailable}
                    >
                        <Trophy size={17} aria-hidden="true" />
                        {submissionAvailable
                            ? t("project_plaza.event.submit_action", "提交参赛项目")
                            : competitionPhase === "upcoming"
                              ? t("project_plaza.event.submission_upcoming_short", "等待开赛")
                              : t("project_plaza.event.submission_closed_short", "提交已结束")}
                    </button>
                ) : featuredCompetition ? (
                    <button
                        className="ppp-newbtn"
                        type="button"
                        onClick={() => onSelectCompetition(featuredCompetition.slug)}
                    >
                        <Trophy size={17} aria-hidden="true" />
                        {t("project_plaza.actions.enter_submission", "进入赛事投稿")}
                    </button>
                ) : null}
                <button className="ppp-newbtn ghost" type="button" onClick={onCreateProject}>
                    <Plus size={17} aria-hidden="true" />
                    {t("project_plaza.actions.publish_long_term", "发布长期项目")}
                </button>
            </div>
        </div>
    </header>
);

export const ProjectScopeNavigator = ({
    t,
    competitions,
    currentSlug,
    allProjectTotal,
    onSelect,
}) => {
    const activeRef = useRef(null);
    const trackRef = useRef(null);

    useEffect(() => {
        const active = activeRef.current;
        const track = trackRef.current;
        if (!active || !track) return;
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
        const left = active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2;
        track.scrollTo({
            left: Math.max(0, left),
            behavior: reduceMotion ? "auto" : "smooth",
        });
    }, [currentSlug]);

    return (
        <section className="ppx-scope" aria-labelledby="project-scope-title">
            <div className="ppx-scope-heading">
                <div>
                    <span>{t("project_plaza.workspace.scope_kicker", "赛事档案")}</span>
                    <h2 id="project-scope-title">
                        {t("project_plaza.workspace.scope_title", "选择浏览范围")}
                    </h2>
                </div>
                <p>
                    {t(
                        "project_plaza.workspace.scope_hint",
                        "选择之后仍可在这里切换或返回全部项目。"
                    )}
                </p>
            </div>
            <nav
                ref={trackRef}
                className="ppx-scope-track"
                aria-label={t("project_plaza.filters.competition", "按赛事查看项目")}
            >
                <button
                    ref={!currentSlug ? activeRef : null}
                    type="button"
                    className={!currentSlug ? "is-current" : ""}
                    aria-current={!currentSlug ? "page" : undefined}
                    onClick={() => onSelect("")}
                >
                    <span className="ppx-scope-icon" aria-hidden="true">
                        <FolderKanban size={16} />
                    </span>
                    <span className="ppx-scope-copy">
                        <strong>{t("project_plaza.filters.all_events", "全部项目")}</strong>
                        <small>
                            {t("project_plaza.workspace.project_count", "{{count}} 个项目", {
                                count: allProjectTotal,
                            })}
                        </small>
                    </span>
                </button>
                {competitions.map((item) => {
                    const current = currentSlug === item.slug;
                    return (
                        <button
                            ref={current ? activeRef : null}
                            type="button"
                            key={item.slug}
                            className={current ? "is-current" : ""}
                            aria-current={current ? "page" : undefined}
                            onClick={() => onSelect(item.slug)}
                        >
                            <span className="ppx-scope-icon" aria-hidden="true">
                                <Trophy size={16} />
                            </span>
                            <span className="ppx-scope-copy">
                                <strong>{item.title}</strong>
                                <small>
                                    {t("project_plaza.workspace.work_count", "{{count}} 件作品", {
                                        count: item.works_count || 0,
                                    })}
                                </small>
                            </span>
                        </button>
                    );
                })}
            </nav>
        </section>
    );
};

export const CompetitionContext = ({
    t,
    competition,
    total,
    submissionAvailable,
    competitionPhase,
}) => {
    if (!competition) return null;

    const phaseLabel = submissionAvailable
        ? t("project_plaza.workspace.submission_open", "投稿通道开放")
        : competitionPhase === "upcoming"
          ? t("project_plaza.event.submission_upcoming_short", "等待开赛")
          : t("project_plaza.event.submission_closed_short", "提交已结束");

    return (
        <section className="ppx-event-context" aria-labelledby="selected-competition-title">
            <div className="ppx-event-main">
                <span className="ppx-event-label">
                    {t("project_plaza.workspace.current_event", "当前赛事")}
                </span>
                <h2 id="selected-competition-title">{competition.title}</h2>
                <p>{t("project_plaza.event.subtitle", "让作品被看见，让项目在赛后继续生长。")}</p>
            </div>
            <dl className="ppx-event-facts">
                <div>
                    <dt>{t("project_plaza.workspace.event_date", "赛事时间")}</dt>
                    <dd>
                        <CalendarDays size={15} aria-hidden="true" />
                        {competition.event_date || "—"}
                    </dd>
                </div>
                <div>
                    <dt>{t("project_plaza.workspace.selected_works", "公开作品")}</dt>
                    <dd>
                        <Trophy size={15} aria-hidden="true" />
                        {competition.approved_project_count ?? total}
                    </dd>
                </div>
                <div>
                    <dt>{t("project_plaza.workspace.submission_state", "投稿状态")}</dt>
                    <dd className={submissionAvailable ? "is-open" : ""}>{phaseLabel}</dd>
                </div>
            </dl>
            <nav
                className="ppx-event-links"
                aria-label={t("project_plaza.event.journey_aria", "本场赛事相关页面")}
            >
                <a
                    href={`/hackathon?view=showcase&competition=${encodeURIComponent(competition.slug)}`}
                >
                    <Trophy size={15} aria-hidden="true" />
                    {t("project_plaza.event.back_event", "赛事现场")}
                </a>
                <a href={`/media?event=${encodeURIComponent(competition.slug)}`}>
                    <Image size={15} aria-hidden="true" />
                    {t("project_plaza.event.media", "影像档案")}
                </a>
            </nav>
        </section>
    );
};

export const ProjectDiscoveryToolbar = ({
    t,
    search,
    onSearch,
    sort,
    sortOptions,
    onSort,
    competitionSelected,
    filtersOpen,
    activeFilterCount,
    onToggleFilters,
    filtersId,
}) => (
    <div className="ppx-discovery" role="search">
        <label className="ppp-search">
            <Search size={17} aria-hidden="true" />
            <span className="sr-only">{t("project_plaza.workspace.search_label", "搜索项目")}</span>
            <input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder={t("project_plaza.search_placeholder", "搜索项目、技术栈、发起人...")}
            />
        </label>
        <div className="ppp-sort" aria-label={t("project_plaza.sort.aria", "项目排序")}>
            {sortOptions.map(({ key, labelKey, fallback }) => (
                <button
                    key={key}
                    type="button"
                    className={sort === key ? "on" : ""}
                    aria-pressed={sort === key}
                    onClick={() => onSort(key)}
                >
                    {t(labelKey, fallback)}
                </button>
            ))}
        </div>
        {competitionSelected ? (
            <span className="ppx-filter-scope-note">
                {t("project_plaza.workspace.event_filter_note", "当前仅筛选本场赛事作品")}
            </span>
        ) : (
            <button
                type="button"
                className={`ppp-filter-toggle ${filtersOpen || activeFilterCount ? "on" : ""}`}
                aria-expanded={filtersOpen}
                aria-controls={filtersId}
                onClick={onToggleFilters}
            >
                <SlidersHorizontal size={15} aria-hidden="true" />
                {filtersOpen
                    ? t("project_plaza.filters.close", "收起")
                    : t("project_plaza.filters.more", "筛选")}
                {activeFilterCount ? <span>{activeFilterCount}</span> : null}
            </button>
        )}
    </div>
);

export const ProjectResultsHeader = ({ t, competition, total, hasConditions, onClear }) => (
    <header className="ppx-results-head">
        <div>
            <span>{t("project_plaza.workspace.catalog_kicker", "作品目录")}</span>
            <h2 id="project-results-title">
                {competition
                    ? t("project_plaza.workspace.event_catalog", "{{event}}作品", {
                          event: competition.title,
                      })
                    : t("project_plaza.workspace.all_catalog", "全部项目")}
            </h2>
        </div>
        <div className="ppx-results-state" aria-live="polite">
            <strong>
                {t("project_plaza.workspace.result_count", "{{count}} 个结果", { count: total })}
            </strong>
            {hasConditions ? (
                <button type="button" onClick={onClear}>
                    <RotateCcw size={14} aria-hidden="true" />
                    {t("project_plaza.workspace.clear_conditions", "清除条件")}
                </button>
            ) : null}
        </div>
    </header>
);

export const ProjectGridSkeleton = ({ t }) => (
    <div
        className="ppp-grid ppx-skeleton-grid"
        aria-label={t("project_plaza.workspace.loading_results", "正在加载项目")}
        aria-busy="true"
    >
        {Array.from({ length: 6 }, (_, index) => (
            <div className="ppx-skeleton" key={index} aria-hidden="true">
                <span className="ppx-skeleton-cover" />
                <span className="ppx-skeleton-line wide" />
                <span className="ppx-skeleton-line" />
                <span className="ppx-skeleton-line short" />
            </div>
        ))}
    </div>
);

export const ProjectEmptyState = ({
    t,
    competition,
    hasConditions,
    submissionAvailable,
    onClear,
    onSubmitCompetition,
    onCreateProject,
}) => (
    <div className="ppp-empty">
        <FolderKanban size={34} aria-hidden="true" />
        <strong>
            {hasConditions
                ? t("project_plaza.workspace.no_match_title", "当前条件没有匹配项目")
                : competition
                  ? t("project_plaza.event.empty_title", "本场项目正在入场")
                  : t("project_plaza.empty_title", "还没有公开项目")}
        </strong>
        <span>
            {hasConditions
                ? t(
                      "project_plaza.workspace.no_match_desc",
                      "清除搜索或筛选条件，继续查看当前范围。"
                  )
                : competition
                  ? t(
                        "project_plaza.event.empty_desc",
                        "提交项目并通过审核后，会进入本场作品目录。"
                    )
                  : t("project_plaza.empty_desc", "发布第一个长期项目，让它进入项目中心。")}
        </span>
        <button
            className="ppp-newbtn ppp-empty-action"
            type="button"
            onClick={hasConditions ? onClear : competition ? onSubmitCompetition : onCreateProject}
            disabled={!hasConditions && competition && !submissionAvailable}
        >
            {hasConditions ? (
                <RotateCcw size={17} aria-hidden="true" />
            ) : competition ? (
                <Trophy size={17} aria-hidden="true" />
            ) : (
                <Plus size={17} aria-hidden="true" />
            )}
            {hasConditions
                ? t("project_plaza.workspace.clear_conditions", "清除条件")
                : competition
                  ? submissionAvailable
                      ? t("project_plaza.event.submit_action", "提交参赛项目")
                      : t("project_plaza.event.submission_closed_short", "提交已结束")
                  : t("project_plaza.actions.publish_first", "发布第一个项目")}
        </button>
    </div>
);

export const ProjectPlazaWorkspace = ({
    t,
    allProjectTotal,
    competitions,
    competition,
    currentCompetitionSlug,
    featuredCompetition,
    submissionAvailable,
    competitionPhase,
    onSelectCompetition,
    onSubmitCompetition,
    onCreateProject,
    search,
    onSearch,
    sort,
    sortOptions,
    onSort,
    filtersOpen,
    activeFilterCount,
    onToggleFilters,
    filterPanel,
    resultTotal,
    hasConditions,
    onClearConditions,
    loading,
    items,
    renderProject,
    embedded = false,
}) => (
    <>
        <ProjectHubHeader
            t={t}
            total={allProjectTotal}
            competitionCount={competitions.length}
            competition={competition}
            featuredCompetition={featuredCompetition}
            submissionAvailable={submissionAvailable}
            competitionPhase={competitionPhase}
            onSelectCompetition={onSelectCompetition}
            onSubmitCompetition={onSubmitCompetition}
            onCreateProject={onCreateProject}
            embedded={embedded}
        />
        {!embedded ? (
            <ProjectScopeNavigator
                t={t}
                competitions={competitions}
                currentSlug={currentCompetitionSlug}
                allProjectTotal={allProjectTotal}
                onSelect={onSelectCompetition}
            />
        ) : null}
        {!embedded ? (
            <CompetitionContext
                t={t}
                competition={competition}
                total={resultTotal}
                submissionAvailable={submissionAvailable}
                competitionPhase={competitionPhase}
            />
        ) : null}
        <section className="ppx-workspace" aria-labelledby="project-results-title">
            <ProjectDiscoveryToolbar
                t={t}
                search={search}
                onSearch={onSearch}
                sort={sort}
                sortOptions={sortOptions}
                onSort={onSort}
                competitionSelected={Boolean(currentCompetitionSlug)}
                filtersOpen={filtersOpen}
                activeFilterCount={activeFilterCount}
                onToggleFilters={onToggleFilters}
                filtersId="project-plaza-advanced-filters"
            />
            {filterPanel}
            <ProjectResultsHeader
                t={t}
                competition={competition}
                total={resultTotal}
                hasConditions={hasConditions}
                onClear={onClearConditions}
            />
            {loading ? (
                <ProjectGridSkeleton t={t} />
            ) : items.length === 0 ? (
                <ProjectEmptyState
                    t={t}
                    competition={competition}
                    hasConditions={hasConditions}
                    submissionAvailable={submissionAvailable}
                    onClear={onClearConditions}
                    onSubmitCompetition={onSubmitCompetition}
                    onCreateProject={onCreateProject}
                />
            ) : (
                <div className="ppp-grid">{items.map(renderProject)}</div>
            )}
        </section>
    </>
);
