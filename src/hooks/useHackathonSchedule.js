import { useEffect, useMemo, useState } from "react";

import { normalizeHackathonSchedule } from "../data/hackathonTemplate";
import api from "../services/api";

export const useHackathonSchedule = (legacySettings = {}) => {
    const fallback = useMemo(
        () => normalizeHackathonSchedule({}, legacySettings),
        [legacySettings]
    );
    const [schedule, setSchedule] = useState(fallback);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setSchedule((current) => normalizeHackathonSchedule(current, legacySettings));

        api.get("/hackathon/schedule")
            .then((response) => {
                if (active) {
                    setSchedule(normalizeHackathonSchedule(response.data, legacySettings));
                }
            })
            .catch(async () => {
                try {
                    const response = await api.get("/hackathon/template");
                    if (active) {
                        setSchedule(normalizeHackathonSchedule(response.data, legacySettings));
                    }
                } catch {
                    if (active) setSchedule(fallback);
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [fallback, legacySettings]);

    return { schedule, loading };
};

export default useHackathonSchedule;
