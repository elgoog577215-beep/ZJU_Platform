const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const {
    validateRegistrationProfile,
    getRegistrationProfile,
    saveRegistrationProfile,
    createRegisteredUser,
} = require("../src/services/registrationProfileService");
const { migrateRegistrationProfiles } = require("../src/config/migrations/registrationProfiles");
const { ensureCoreSchema } = require("../src/config/ensureCoreSchema");
const profile = { name: "测试用户", studentId: "TEST-001", major: "计算机", grade: "junior" };
const response = () => ({
    statusCode: 200,
    headers: {},
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(body) {
        this.body = body;
        return this;
    },
    setHeader(key, value) {
        this.headers[key] = value;
    },
});
const next = (error) => {
    throw error;
};

test("account basics reject missing, malformed, overlong and unknown grade values", () => {
    assert.deepEqual(validateRegistrationProfile(profile), { profile, errors: [] });
    assert.equal(validateRegistrationProfile(null).errors.length, 4);
    for (const invalid of [
        { name: ["invalid"] },
        { name: "x".repeat(81) },
        { studentId: "A B" },
        { major: "a\nb" },
        { grade: "unknown" },
    ])
        assert.ok(validateRegistrationProfile({ ...profile, ...invalid }).errors.length);
});

test("registration persists private profile atomically; legacy login and own edits preserve boundaries", async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "registration-profile-"));
    process.env.DATABASE_FILE = path.join(directory, "test.sqlite");
    process.env.SECRET_KEY = "isolated-registration-profile-test-key";
    process.env.NODE_ENV = "test";
    const { getDb, pool } = require("../src/config/db");
    const auth = require("../src/controllers/authController");
    try {
        const db = await getDb();
        await ensureCoreSchema(db);
        await db.exec(
            "ALTER TABLE users ADD COLUMN auth_version INTEGER DEFAULT 0; ALTER TABLE users ADD COLUMN admin_permissions TEXT DEFAULT '[]'"
        );
        await db.exec(
            "CREATE TABLE audit_logs(admin_id INTEGER, resource_type TEXT, resource_id INTEGER, action TEXT, reason TEXT)"
        );
        await migrateRegistrationProfiles(db);
        await migrateRegistrationProfiles(db);
        let res = response();
        await auth.register({ body: { username: "missing", password: "testpassword" } }, res, next);
        assert.equal(res.statusCode, 400);
        assert.equal(res.body.errorCode, "REGISTRATION_PROFILE_INVALID");
        assert.equal((await db.get("SELECT COUNT(*) AS count FROM users")).count, 0);
        res = response();
        await auth.register(
            { body: { username: "first", password: "testpassword", registrationProfile: profile } },
            res,
            next
        );
        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body.user.registrationProfile, profile);
        assert.equal(jwt.decode(res.body.token).registrationProfile, undefined);
        const id = res.body.user.id;
        assert.equal((await db.get("SELECT * FROM users WHERE id=?", [id])).student_id, undefined);
        const privateRow = await getRegistrationProfile(db, id);
        await migrateRegistrationProfiles(db);
        assert.deepEqual(await getRegistrationProfile(db, id), privateRow);
        res = response();
        await auth.login({ body: { username: "first", password: "testpassword" } }, res, next);
        assert.deepEqual(res.body.user.registrationProfile, profile);
        assert.equal(res.headers["Cache-Control"], "no-store");
        res = response();
        await auth.me({ user: { id } }, res, next);
        assert.deepEqual(res.body.registrationProfile, profile);
        assert.equal(res.body.password, undefined);
        // An existing account has no profile; ordinary login still works.
        const passwordHash = (await db.get("SELECT password FROM users WHERE id=?", [id])).password;
        const legacy = await db.run("INSERT INTO users(username,password) VALUES(?,?)", [
            "legacy",
            passwordHash,
        ]);
        res = response();
        await auth.login({ body: { username: "legacy", password: "testpassword" } }, res, next);
        assert.equal(res.body.user.registrationProfile, null);
        res = response();
        const updated = { ...profile, name: "旧账号用户", studentId: "TEST-002" };
        await auth.updateRegistrationProfile(
            { user: { id: legacy.lastID }, body: { userId: id, registrationProfile: updated } },
            res,
            next
        );
        assert.deepEqual(res.body.registrationProfile, updated);
        assert.deepEqual(await getRegistrationProfile(db, id), profile);
        res = response();
        await auth.updateRegistrationProfile(
            {
                user: { id: legacy.lastID },
                body: { registrationProfile: { ...updated, grade: "wrong" } },
            },
            res,
            next
        );
        assert.equal(res.statusCode, 400);
        assert.deepEqual(await getRegistrationProfile(db, legacy.lastID), updated);
        // Failure writing the private table must roll back the account as well.
        await db.exec(
            "CREATE TRIGGER reject_test_profile BEFORE INSERT ON user_registration_profiles WHEN NEW.name='reject' BEGIN SELECT RAISE(ABORT, 'profile write failed'); END"
        );
        await assert.rejects(
            createRegisteredUser(db, "rollback", passwordHash, { ...profile, name: "reject" }),
            /profile write failed/
        );
        assert.equal(await db.get("SELECT id FROM users WHERE username='rollback'"), undefined);
        // Independent writes cannot join each other's transactions.
        const concurrent = await Promise.allSettled([
            createRegisteredUser(db, "concurrent", passwordHash, profile),
            createRegisteredUser(db, "concurrent", passwordHash, profile),
        ]);
        assert.equal(concurrent.filter((result) => result.status === "fulfilled").length, 1);
        const concurrentUser = await db.get("SELECT id FROM users WHERE username='concurrent'");
        assert.deepEqual(await getRegistrationProfile(db, concurrentUser.id), profile);
        await saveRegistrationProfile(db, concurrentUser.id, { ...profile, major: "设计" });
        await db.run("DELETE FROM users WHERE id=?", [concurrentUser.id]);
        assert.equal(await getRegistrationProfile(db, concurrentUser.id), null);
    } finally {
        await pool.close();
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
