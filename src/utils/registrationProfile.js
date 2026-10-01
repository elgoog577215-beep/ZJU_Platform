import config from "../../shared/registrationProfile.json";

export const registrationProfileFields = config.fields;
export const registrationProfileGrades = config.grades;
export const emptyRegistrationProfile = () =>
    Object.fromEntries(config.fields.map(({ id }) => [id, ""]));
export const hasRegistrationProfile = (profile) =>
    config.fields.every(
        ({ id, maxLength }) =>
            typeof profile?.[id] === "string" &&
            profile[id].trim().length > 0 &&
            profile[id].trim().length <= maxLength &&
            ![...profile[id]].some(
                (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
            )
    ) &&
    !/\s/.test(profile?.studentId?.trim()) &&
    config.grades.some(({ value }) => value === profile?.grade);
