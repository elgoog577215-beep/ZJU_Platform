import { useTranslation } from "react-i18next";

const brands = [
    {
        id: "tianmao",
        name: "天猫校园",
        source: "/images/hackathon/ai-x/official/tianmao.webp",
        plate: true,
    },
    {
        id: "guancha",
        name: "观猹",
        light: "organizations/official/guancha.svg",
        dark: "organizations/official/guancha.svg",
        plate: true,
    },
    {
        id: "deepseekclub",
        name: "深求社区",
        light: "organizations/official/deepseek-club.png",
        dark: "organizations/official/deepseek-club.png",
        plate: true,
    },
    {
        id: "innovation",
        name: "浙江大学校徽",
        light: "organizations/official/zhejiang-university.png",
        dark: "organizations/official/zhejiang-university.png",
        plate: true,
    },
    { id: "tuozhe", name: "拓浙 AI 生态", source: "/images/brand/logo-mark-transparent.png" },
    {
        id: "eagle",
        name: "时代强鹰 Elite Eagle",
        source: "/images/hackathon/ai-x/official/eagle.webp",
        light: "organizations/official/elite-eagle.png",
        dark: "organizations/official/elite-eagle.png",
        plate: true,
    },
    {
        id: "ztvp",
        name: "浙江大学管理学院科技创业中心 ZTVP",
        source: "/images/hackathon/ai-x/official/ztvp.webp",
        light: "organizations/official/ztvp.png",
        dark: "organizations/official/ztvp.png",
        plate: true,
    },
    {
        id: "qwen",
        name: "千问 Qwen",
        source: "/images/hackathon/ai-x/official/qwen.webp",
        light: "qwen-official-dark.png",
        dark: "qwen-official-dark.png",
    },
    { id: "huawei", name: "华为 Huawei", light: "huawei.png", dark: "huawei.png", plate: true },
    {
        id: "aliyun",
        name: "阿里云 Alibaba Cloud",
        light: "aliyun-cn.svg",
        dark: "aliyun-cn-white.svg",
    },
    { id: "qoder", name: "Qoder", light: "qoder.svg", dark: "qoder-dark.svg" },
    {
        id: "modelscope",
        name: "魔搭社区 ModelScope",
        light: "modelscope.png",
        dark: "modelscope-dark.png",
    },
];
export function AiXBrand({ id }) {
    const brand = brands.find((item) => item.id === id);
    if (!brand) return null;
    return (
        <span className={`aix-brand-logo aix-brand-${id} ${brand.plate ? "aix-brand-plate" : ""}`}>
            <img
                className="aix-logo-light"
                src={brand.source || `/images/partner-logos/${brand.light}`}
                alt={brand.name}
                loading="lazy"
            />
            <img
                className="aix-logo-dark"
                src={brand.source || `/images/partner-logos/${brand.dark}`}
                alt={brand.name}
                loading="lazy"
            />
        </span>
    );
}
const groups = [
    ["innovation"],
    ["tuozhe"],
    ["qwen", "huawei"],
    ["aliyun", "huawei", "qoder", "modelscope"],
    ["eagle", "ztvp"],
    ["tianmao", "guancha", "deepseekclub"],
];
export default function AiXPartnerLogos() {
    const { t } = useTranslation();
    const partners = t("aix.landing.partners", { returnObjects: true });
    return (
        <dl className="aix-partner-groups">
            {groups.map((members, index) => (
                <div key={index}>
                    <dt>
                        {partners[index]?.label ||
                            t("aix.landing.morePartners", { returnObjects: true })[1].label}
                    </dt>
                    <dd>
                        <ul className="aix-partner-members">
                            {members.map((id) => (
                                <li key={id}>
                                    <AiXBrand id={id} />
                                    <span className="aix-partner-name">
                                        {t(`aix.refined.partnerNames.${id}`)}
                                    </span>
                                    {index === 3 && id !== "modelscope" && (
                                        <span className="aix-partner-role">
                                            {t(`aix.refined.supportRoles.${id}`)}
                                        </span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </dd>
                </div>
            ))}
        </dl>
    );
}
