export const getHackathonViewFromLocation = (location = {}) => {
    const params = new URLSearchParams(location.search || "");
    const requestedView = params.get("view");
    if (requestedView === "register") return "register";
    if (String(location.pathname || "").includes("/showcase") || requestedView === "showcase") {
        return "showcase";
    }
    return "register";
};

export default getHackathonViewFromLocation;
