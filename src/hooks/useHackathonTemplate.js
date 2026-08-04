import { useEffect, useMemo, useState } from "react";

import { normalizeHackathonTemplate } from "../data/hackathonTemplate";
import api from "../services/api";

export const useHackathonTemplate = (legacySettings = {}) => {
    const fallback = useMemo(
        () => normalizeHackathonTemplate({}, legacySettings),
        [legacySettings]
    );
    const [template, setTemplate] = useState(fallback);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setTemplate((current) => normalizeHackathonTemplate(current, legacySettings));

        api.get("/hackathon/template")
            .then((response) => {
                if (active) setTemplate(normalizeHackathonTemplate(response.data, legacySettings));
            })
            .catch(() => {
                if (active) setTemplate(fallback);
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [fallback, legacySettings]);

    return { template, loading };
};

export default useHackathonTemplate;
