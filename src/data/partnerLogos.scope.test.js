import assert from "node:assert/strict";
import test from "node:test";

import {
    ACTIVITY_PROVIDER_SCOPE,
    CORE_PARTNER_SCOPE,
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
