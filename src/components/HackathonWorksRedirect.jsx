import { Navigate, useLocation } from "react-router-dom";
import { getLegacyWorksUrl } from "../utils/hackathonRoute";

export default function HackathonWorksRedirect() {
    const location = useLocation();
    return <Navigate to={getLegacyWorksUrl(location)} replace />;
}
