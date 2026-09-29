import { useCallback, useEffect, useMemo, useState } from "react";

import { normalizeHackathonSchedule } from "../data/hackathonTemplate";
import api from "../services/api";

const EMPTY_SETTINGS = Object.freeze({});
export const useHackathonSchedule = (legacySettings = EMPTY_SETTINGS) => {
    const fallback = useMemo(
        () => normalizeHackathonSchedule({}, legacySettings),
        [legacySettings]
    );
    const [schedule, setSchedule] = useState(fallback);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [revision, setRevision] = useState(0);

    useEffect(() => {
        let active = true;
        if (revision === 0) setLoading(true);
        setError(false);
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
                    if (active) {
                        setSchedule(fallback);
                        setError(true);
                    }
                }
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, [fallback, legacySettings, revision]);

    const reload = useCallback(() => setRevision((value) => value + 1), []);
    return { schedule, loading, error, reload };
};

export default useHackathonSchedule;
