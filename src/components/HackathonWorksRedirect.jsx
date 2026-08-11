import React from "react";
import { Navigate, useLocation } from "react-router-dom";

const HackathonWorksRedirect = () => {
    const location = useLocation();
    const legacy = new URLSearchParams(location.search);
    const next = new URLSearchParams();
    next.set("view", "showcase");
    const competition = legacy.get("competition");
    const work = legacy.get("work") || legacy.get("id");
    if (competition) next.set("competition", competition);
    if (work) next.set("work", work);
    return <Navigate to={`/hackathon?${next.toString()}#showcase-works`} replace />;
};

export default HackathonWorksRedirect;
