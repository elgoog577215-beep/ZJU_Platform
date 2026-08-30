import assert from "node:assert/strict";
import test from "node:test";

import {
    ACTIVITY_PROVIDER_SCOPE,
    CORE_PARTNER_SCOPE,
    ORGANIZATION_PARTNER_LOGOS,
    defaultEcosystemPartners,
    getSupportViewGroupId,
    getSupportersByCategory,
    getPartnerLogoSrc,
    getPartnersByCategory,
    groupEcosystemPartners,
    groupEcosystemSupportViewGroups,
    groupEcosystemSupporters,
    normalizeEcosystemPartner,
} from "./partnerLogos.js";

const mixedPartners = [
    {
        id: 1,
        category: "organization",
        name: "ZJUAI",
        enabled: true,
        partner_scope: CORE_PARTNER_SCOPE,
        sort_order: 10,
    },
    {
        id: 2,
        category: "organization",
        name: "浙江大学学生会",
        enabled: true,
        partner_scope: ACTIVITY_PROVIDER_SCOPE,
        sort_order: 20,
    },
    {
        id: 3,
        category: "enterprise",
        name: "Qoder",
        enabled: true,
        partner_scope: CORE_PARTNER_SCOPE,
        sort_order: 30,
    },
];

test("ecosystem partner helpers separate core partners from activity providers", () => {
    const coreOrganizations = getPartnersByCategory(mixedPartners, "organization");
    assert.deepEqual(
        coreOrganizations.map((partner) => partner.name),
        ["ZJUAI"]
    );

    const eventOrganizations = getPartnersByCategory(mixedPartners, "organization", {
        featuredOnly: false,
        scope: null,
    });
    assert.deepEqual(
        eventOrganizations.map((partner) => partner.name),
        ["ZJUAI", "浙江大学学生会"]
    );

    const groups = groupEcosystemPartners(mixedPartners);
    const organizationGroup = groups.find((group) => group.id === "organization");
    assert.deepEqual(
        organizationGroup.partners.map((partner) => partner.name),
        ["ZJUAI"]
    );
});

test("verified core support identities carry theme-aware official logos", () => {
    const expectedLogoNames = ["未来学习中心", "XLAB", "ZJUAI"];
    const verifiedPartners = defaultEcosystemPartners.filter((partner) =>
        expectedLogoNames.includes(partner.name)
    );

    assert.deepEqual(
        verifiedPartners.map((partner) => partner.name),
        expectedLogoNames
    );
    for (const partner of verifiedPartners) {
        assert.equal(typeof ORGANIZATION_PARTNER_LOGOS[partner.name], "object");
        assert.match(getPartnerLogoSrc(partner, true), /^\/images\/partner-logos\//);
        assert.match(getPartnerLogoSrc(partner, false), /^\/images\/partner-logos\//);
    }
    assert.match(getPartnerLogoSrc(verifiedPartners[1], false), /xlab-white\.svg$/);

    assert.match(
        getPartnerLogoSrc({ name: "XLAB", logo_url: null, dark_logo_url: null }, false),
        /xlab-white\.svg$/
    );
});

test("supporter helpers expose five support categories without promoting activity providers", () => {
    const supportPartners = [
        ...mixedPartners,
        {
            id: 4,
            category: "enterprise",
            support_category: "industry_enterprise",
            name: "Industry Partner",
            enabled: true,
            partner_scope: CORE_PARTNER_SCOPE,
            sort_order: 40,
        },
        {
            id: 5,
            category: "enterprise",
            support_category: "capital",
            name: "Capital Partner",
            enabled: true,
            partner_scope: CORE_PARTNER_SCOPE,
            sort_order: 50,
        },
    ];

    assert.equal(normalizeEcosystemPartner({ category: "school" }).support_category, "college");
    assert.equal(normalizeEcosystemPartner({ category: "organization" }).support_category, "club");
    assert.equal(
        normalizeEcosystemPartner({ category: "enterprise" }).support_category,
        "technology_enterprise"
    );

    const groups = groupEcosystemSupporters(supportPartners);
    assert.deepEqual(
        groups.map((group) => group.id),
        ["college", "technology_enterprise", "industry_enterprise", "capital", "club"]
    );
    assert.deepEqual(
        getSupportersByCategory(supportPartners, "club").map((partner) => partner.name),
        ["ZJUAI"]
    );

    const viewGroups = groupEcosystemSupportViewGroups(supportPartners);
    assert.deepEqual(
        viewGroups.map((group) => group.id),
        ["college", "enterprise", "capital", "club"]
    );
    assert.deepEqual(
        viewGroups
            .find((group) => group.id === "enterprise")
            .partners.map((partner) => partner.name),
        ["Qoder", "Industry Partner"]
    );
    assert.equal(getSupportViewGroupId("technology_enterprise"), "enterprise");
    assert.equal(getSupportViewGroupId("industry_enterprise"), "enterprise");
    assert.equal(getSupportViewGroupId("unknown"), null);
});
