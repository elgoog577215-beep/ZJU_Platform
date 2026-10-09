import { useTranslation } from "react-i18next";

const brands = [
    {
        id: "qwen",
        name: "千问 Qwen",
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
    return (
        <span className={`aix-brand-logo ${brand.plate ? "aix-brand-plate" : ""}`}>
            <img
                className="aix-logo-light"
                src={`/images/partner-logos/${brand.light}`}
                alt={brand.name}
                loading="lazy"
            />
            <img
                className="aix-logo-dark"
                src={`/images/partner-logos/${brand.dark}`}
                alt={brand.name}
                loading="lazy"
            />
        </span>
    );
}
export default function AiXPartnerLogos() {
    const { t } = useTranslation();
    return (
        <ul className="aix-partner-logo-wall">
            {brands.map((brand) => (
                <li key={brand.id}>
                    <AiXBrand id={brand.id} />
                    <span>{t(`aix.refined.partners.${brand.id}`)}</span>
                </li>
            ))}
        </ul>
    );
}
