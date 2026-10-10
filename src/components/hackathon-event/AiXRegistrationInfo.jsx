import { useRef, useState } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
const groupQr = "/images/hackathon/ai-x/official/wechat-group.webp";
export default function AiXRegistrationInfo() {
    const { t } = useTranslation();
    const dialog = useRef(null);
    const [signup, setSignup] = useState(false);
    return (
        <div className="aix-registration-info">
            <div className="aix-signup-qr">
                <img
                    src="/images/hackathon/ai-x/official/registration-qr.webp"
                    alt={t("aix.official.signupQr")}
                    width="190"
                    height="190"
                />
                <div>
                    <strong>{t("aix.official.signupQr")}</strong>
                    <a href="https://tuotuzju.com/hackathon/2#registration-form">
                        tuotuzju.com/hackathon/2
                    </a>
                </div>
            </div>
            <button
                className="aix-secondary aix-signup-qr-button"
                type="button"
                onClick={() => {
                    setSignup(true);
                    dialog.current?.showModal();
                }}
            >
                {t("aix.official.signupQr")}
            </button>
            <div className="aix-contact">
                <strong>{t("aix.landing.contactTitle")}</strong>
                <p>{t("aix.landing.contactHint")}</p>
                <button
                    type="button"
                    className="aix-secondary"
                    aria-haspopup="dialog"
                    onClick={() => {
                        setSignup(false);
                        dialog.current?.showModal();
                    }}
                >
                    {t("aix.landing.groupQr")}
                    <ArrowUpRight size={18} />
                </button>
                <small>{t("aix.landing.qrExpiry")}</small>
            </div>
            <dialog
                ref={dialog}
                className="aix-qr-dialog"
                aria-label={t(signup ? "aix.official.signupQr" : "aix.landing.groupQr")}
            >
                <form method="dialog">
                    <button autoFocus aria-label={t("aix.landing.closeQr")}>
                        <X size={22} />
                    </button>
                </form>
                <img
                    src={signup ? "/images/hackathon/ai-x/official/registration-qr.webp" : groupQr}
                    alt={t(signup ? "aix.official.signupQr" : "aix.landing.qrAlt")}
                    width="900"
                    height="900"
                />
            </dialog>
        </div>
    );
}
