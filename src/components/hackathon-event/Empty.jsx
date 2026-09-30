import { Clock3 } from "lucide-react";
export default function Empty({ icon: Icon = Clock3, title, description }) {
    return (
        <div className="hx-empty">
            <span className="hx-empty-icon">
                <Icon size={24} strokeWidth={1.4} />
            </span>
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
    );
}
