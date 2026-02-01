const axios = require('axios');

// Config
const API_URL = 'http://localhost:3001/api';

async function runTest() {
    console.log('--- Starting Security Test ---');

    try {
        // 1. Register User A (Owner)
        const userA = { username: `userA_${Date.now()}`, password: 'password123' };
        console.log(`Registering User A: ${userA.username}`);
        let tokenA;
        try {
            const regA = await axios.post(`${API_URL}/auth/register`, userA);
            tokenA = regA.data.token;
        } catch (e) {
            console.log('Registration A failed, trying login...');
            if (e.response && e.response.status === 400) {
                 const loginA = await axios.post(`${API_URL}/auth/login`, userA);
                 tokenA = loginA.data.token;
            } else {
                throw e;
            }
        }
        console.log('User A logged in.');

        // 2. Register User B (Attacker)
        const userB = { username: `userB_${Date.now()}`, password: 'password123' };
        console.log(`Registering User B: ${userB.username}`);
        let tokenB;
        try {
            const regB = await axios.post(`${API_URL}/auth/register`, userB);
            tokenB = regB.data.token;
        } catch (e) {
             console.log('Registration B failed, trying login...');
             const loginB = await axios.post(`${API_URL}/auth/login`, userB);
             tokenB = loginB.data.token;
        }
        console.log('User B logged in.');

        // 3. User A creates a resource (Article for simplicity)
        console.log('User A creating an article...');
        const articleData = {
            title: 'User A Article',
            content: 'Content',
            excerpt: 'Excerpt',
            tags: 'test'
        };
        const createRes = await axios.post(`${API_URL}/articles`, articleData, {
            headers: { Authorization: `Bearer ${tokenA}` }
        });
        const articleId = createRes.data.id;
        console.log(`Article created with ID: ${articleId}`);

        // 4. Anonymous Attack (Try to delete)
        console.log('Testing Anonymous Delete (Expect 401/403)...');
        try {
            await axios.delete(`${API_URL}/articles/${articleId}`);
            console.error('FAILED: Anonymous user should not be able to delete!');
        } catch (e) {
            console.log(`PASSED: Anonymous delete rejected with ${e.response?.status}`);
        }

        // 5. User B Attack (Try to update)
        console.log('Testing User B Update (Expect 403)...');
        try {
            await axios.put(`${API_URL}/articles/${articleId}`, { title: 'Hacked' }, {
                headers: { Authorization: `Bearer ${tokenB}` }
            });
            console.error('FAILED: User B should not be able to update User A\'s article!');
        } catch (e) {
            console.log(`PASSED: User B update rejected with ${e.response?.status}`);
        }

        // 6. User B Attack (Try to delete)
        console.log('Testing User B Delete (Expect 403)...');
        try {
            await axios.delete(`${API_URL}/articles/${articleId}`, {
                headers: { Authorization: `Bearer ${tokenB}` }
            });
            console.error('FAILED: User B should not be able to delete User A\'s article!');
        } catch (e) {
            console.log(`PASSED: User B delete rejected with ${e.response?.status}`);
        }

        // 7. User A Delete (Should succeed)
        console.log('Testing User A Delete (Expect 200)...');
        try {
            await axios.delete(`${API_URL}/articles/${articleId}`, {
                headers: { Authorization: `Bearer ${tokenA}` }
            });
            console.log('PASSED: User A deleted their own article.');
        } catch (e) {
            console.error(`FAILED: User A failed to delete own article: ${e.response?.status}`);
            console.error(e.response?.data);
        }

    } catch (error) {
        console.error('Test script failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        } else {
            console.error(error);
        }
    }
}

runTest();
