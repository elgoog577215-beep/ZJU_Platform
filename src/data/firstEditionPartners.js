// Confirmed first-edition acknowledgements, from the 2026-05-10 ceremony deck.
// Event-specific roles must not inherit the ecosystem-wide partner directory.
export const firstEditionPartners = [
    { id: "guidance", labelKey: "guidance", names: ["浙江大学团委"] },
    { id: "support", labelKey: "support", names: ["浙江大学基础医学院"] },
    { id: "coordination", labelKey: "coordination", names: ["未来学习中心智能生命健康项目"] },
    {
        id: "enterprise",
        labelKey: "technology",
        names: ["MiniMax", "阿里云", "Qoder", "阶跃星辰", "魔搭社区", "Bonjour"],
    },
];
const namesEn = {
    浙江大学团委: "Zhejiang University Youth League Committee",
    浙江大学基础医学院: "ZJU School of Basic Medical Sciences",
    未来学习中心智能生命健康项目: "Future Learning Center · Intelligent Life and Health Project",
    阿里云: "Alibaba Cloud",
    阶跃星辰: "StepFun",
    魔搭社区: "ModelScope",
};
const aliases = { 阶跃星辰: "阶跃 StepFun", 魔搭社区: "ModelScope 魔搭社区" };
export function getFirstEditionPartnerGroups(ecosystemGroups, t, english) {
    const directory = ecosystemGroups.flatMap((group) => group.partners);
    return firstEditionPartners.map((group) => ({
        id: group.id,
        label: t(`firstEdition.partnerRoles.${group.labelKey}`),
        partners: group.names.map((name) => ({
            ...(directory.find((partner) => partner.name === (aliases[name] || name)) || {}),
            id: name,
            name,
            displayName: english ? namesEn[name] || name : name,
        })),
    }));
}
