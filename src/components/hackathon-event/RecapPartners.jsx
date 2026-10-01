import { useTranslation } from "react-i18next";
import { useEcosystemPartners } from "../../hooks/useEcosystemPartners";
import { getFirstEditionPartnerGroups } from "../../data/firstEditionPartners";
import { getPartnerLogoSrc } from "../../data/partnerLogos";
import "./RecapPartners.css";

function PartnerSection({ children }) {
    const { t } = useTranslation();
    return (
        <section
            className="hx-recap-partners"
            id="recap-partners"
            aria-labelledby="recap-partners-title"
        >
            <header className="hx-recap-partners-heading">
                <p>{t("hackathon.outcome_archive.support_eyebrow")}</p>
                <h2 id="recap-partners-title">
                    <span aria-hidden="true">04</span>
                    {t("hackathon.outcome_archive.support_title")}
                </h2>
            </header>
            {children}
        </section>
    );
}

function PartnerGroups({ groups }) {
    return (
        <dl className="hx-recap-partner-groups">
            {groups.map((group) => (
                <div key={group.id}>
                    <dt>{group.label}</dt>
                    <dd>
                        {group.partners.map((partner) => (
                            <span key={partner.id}>{partner.displayName}</span>
                        ))}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

function FirstEditionPartners() {
    const { t, i18n } = useTranslation();
    const { groups: directory } = useEcosystemPartners();
    const groups = getFirstEditionPartnerGroups(directory, t, i18n.language.startsWith("en"));
    const technology = groups.find((group) => group.id === "enterprise");
    return (
        <PartnerSection>
            <section className="hx-recap-technology" aria-labelledby="recap-technology-title">
                <h3 id="recap-technology-title">{technology.label}</h3>
                <ul className="hx-recap-partner-logos">
                    {technology.partners.map((partner) => {
                        const logo = getPartnerLogoSrc(partner, false);
                        return (
                            <li key={partner.id}>
                                {logo ? (
                                    <img
                                        src={logo}
                                        alt={partner.displayName}
                                        loading="lazy"
                                        className={partner.darkClassName || ""}
                                    />
                                ) : (
                                    <span>{partner.displayName}</span>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
            <PartnerGroups groups={groups.filter((group) => group.id !== "enterprise")} />
        </PartnerSection>
    );
}

function BeautyPartners() {
    const { t } = useTranslation();
    const partners = t("getuiBeauty.partners", { returnObjects: true });
    const groups = partners.map((group) => ({
        id: group.role,
        label: group.role,
        partners: group.names.map((name) => ({ id: name, displayName: name })),
    }));
    return (
        <PartnerSection>
            <PartnerGroups groups={groups} />
        </PartnerSection>
    );
}

export default function RecapPartners({ template }) {
    if (template.event.key === "zhekesong-current") return <FirstEditionPartners />;
    if (template.event.key === "getui-beauty-2026") return <BeautyPartners />;
    return null;
}
