import assert from "node:assert/strict";
import test from "node:test";

import {
    ACTIVITY_PROVIDER_SCOPE,
    CORE_PARTNER_SCOPE,
    ORGANIZATION_PARTNER_LOGOS,
    defaultEcosystemPartners,
    getPartnerLogoSrc,
    getPartnersByCategory,
    groupEcosystemPartners,
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
