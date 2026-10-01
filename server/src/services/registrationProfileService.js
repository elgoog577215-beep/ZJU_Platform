const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const config = require("../../../shared/registrationProfile.json");
const labels = { name: "姓名", studentId: "学号", major: "专业", grade: "年级" };
const grades = new Set(config.grades.map((grade) => grade.value));

function validateRegistrationProfile(input) {
    const profile = {};
    const errors = [];
    for (const { id, maxLength } of config.fields) {
        const value = typeof input?.[id] === "string" ? input[id].trim() : "";
        profile[id] = value;
        if (!value) errors.push({ field: id, message: `请填写${labels[id]}` });
        else if (value.length > maxLength || /[\u0000-\u001f\u007f]/.test(value))
            errors.push({ field: id, message: `${labels[id]}格式不正确或过长` });
    }
    if (profile.studentId && /\s/.test(profile.studentId))
        errors.push({ field: "studentId", message: "学号不能包含空格" });
    if (profile.grade && !grades.has(profile.grade))
        errors.push({ field: "grade", message: "请选择有效年级" });
    return { profile, errors };
}

async function getRegistrationProfile(db, userId) {
    return (
        (await db.get(
            "SELECT name, student_id AS studentId, major, grade FROM user_registration_profiles WHERE user_id = ?",
            [userId]
        )) || null
    );
}

async function saveRegistrationProfile(db, userId, profile) {
    await db.run(
        `INSERT INTO user_registration_profiles(user_id, name, student_id, major, grade, updated_at)
         VALUES(?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET name=excluded.name, student_id=excluded.student_id,
             major=excluded.major, grade=excluded.grade, updated_at=excluded.updated_at`,
        [
            userId,
            profile.name,
            profile.studentId,
            profile.major,
            profile.grade,
            new Date().toISOString(),
        ]
    );
}

// A dedicated connection keeps account creation atomic without enrolling unrelated
// requests in the shared connection's transaction. Hash passwords before entering it.
async function createRegisteredUser(db, username, passwordHash, profile) {
    const database = (await db.all("PRAGMA database_list")).find((row) => row.name === "main");
    if (!database?.file) throw new Error("Account registration requires a persistent database");
    const transaction = await open({ filename: database.file, driver: sqlite3.Database });
    try {
        await transaction.exec(
            "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=10000; BEGIN IMMEDIATE"
        );
        const count = await transaction.get("SELECT COUNT(*) AS count FROM users");
        const role = count.count === 0 ? "admin" : "user";
        const user = {
            username,
            role,
            account_type: "personal",
            review_permission: role === "admin" ? "admin" : "normal",
            admin_scope: role === "admin" ? "platform" : "none",
        };
        const result = await transaction.run(
            `INSERT INTO users(username,password,role,account_type,review_permission,admin_scope,created_at)
             VALUES(?,?,?,?,?,?,?)`,
            [
                username,
                passwordHash,
                role,
                user.account_type,
                user.review_permission,
                user.admin_scope,
                new Date().toISOString(),
            ]
        );
        user.id = result.lastID;
        await saveRegistrationProfile(transaction, user.id, profile);
        await transaction.exec("COMMIT");
        return user;
    } catch (error) {
        await transaction.exec("ROLLBACK").catch(() => {});
        throw error;
    } finally {
        await transaction.close();
    }
}

module.exports = {
    validateRegistrationProfile,
    getRegistrationProfile,
    saveRegistrationProfile,
    createRegisteredUser,
};
