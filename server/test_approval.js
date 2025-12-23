const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3001/api';

async function runTest() {
    try {
        console.log('--- Starting Approval Flow Test ---');

        // 0. Unauthenticated Upload (should fail)
        console.log('\n0. Testing Unauthenticated Upload (should fail)...');
        try {
            await axios.post(`${BASE_URL}/photos`, {
                title: 'Anon Photo',
                category: 'Nature',
                url: '/uploads/anon.jpg'
            });
            console.error('FAILED: Unauthenticated upload should have failed!');
        } catch (e) {
            if (e.response && (e.response.status === 401 || e.response.status === 403)) {
                console.log('PASSED: Unauthenticated upload failed as expected (401/403).');
            } else {
                console.error('FAILED: Unexpected error code for unauthenticated upload:', e.response?.status || e.message);
            }
        }

        // 1. Admin Login
        console.log('\n1. Logging in as Admin...');
        const adminRes = await axios.post(`${BASE_URL}/auth/admin-login`, { password: '12345' });
        const adminToken = adminRes.data.token;
        console.log('Admin logged in.');

        // 2. Register/Login Normal User
        console.log('\n2. Registering/Logging in Normal User...');
        const username = `user_${Date.now()}`;
        const password = 'password123';
        let userToken;
        try {
            const regRes = await axios.post(`${BASE_URL}/auth/register`, { username, password });
            userToken = regRes.data.token;
            console.log(`User ${username} registered.`);
        } catch (e) {
            console.error('Registration failed:', e.response?.data || e.message);
            return;
        }

        // 3. Normal User Uploads Content (Simulating Photo Creation)
        console.log('\n3. Normal User Creating Photo (should be pending)...');
        const photoData = {
            title: 'User Photo ' + Date.now(),
            category: 'Nature',
            url: '/uploads/placeholder.jpg', // Mock URL
            size: 'medium',
            gameType: 'skyfall',
            gameDescription: 'desc'
        };

        const createRes = await axios.post(`${BASE_URL}/photos`, photoData, {
            headers: { Authorization: `Bearer ${userToken}` }
        });
        const createdPhoto = createRes.data;
        console.log(`Photo created. ID: ${createdPhoto.id}, Status: ${createdPhoto.status}`);

        if (createdPhoto.status !== 'pending') {
            console.error('FAILED: User photo should be pending!');
        } else {
            console.log('PASSED: User photo is pending.');
        }

        // 4. Admin Uploads Content
        console.log('\n4. Admin Creating Photo (should be approved)...');
        const adminPhotoData = {
            title: 'Admin Photo ' + Date.now(),
            category: 'Urban',
            url: '/uploads/placeholder.jpg',
            size: 'medium',
            gameType: 'runner',
            gameDescription: 'desc'
        };

        const adminCreateRes = await axios.post(`${BASE_URL}/photos`, adminPhotoData, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const adminCreatedPhoto = adminCreateRes.data;
        console.log(`Admin Photo created. ID: ${adminCreatedPhoto.id}, Status: ${adminCreatedPhoto.status}`);

        if (adminCreatedPhoto.status !== 'approved') {
            console.error('FAILED: Admin photo should be approved!');
        } else {
            console.log('PASSED: Admin photo is approved.');
        }

        // 5. Admin Checks Pending List
        console.log('\n5. Admin Checking Pending List...');
        const pendingRes = await axios.get(`${BASE_URL}/admin/pending`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const pendingItems = pendingRes.data;
        const foundItem = pendingItems.find(i => i.id === createdPhoto.id && i.type === 'photos'); // API returns 'photos' as type?
        // Note: systemController.js maps type: 'photos' manually in getPendingContent

        if (foundItem) {
            console.log('PASSED: User photo found in pending list.');
        } else {
            console.error('FAILED: User photo NOT found in pending list.');
            console.log('Pending items:', pendingItems.map(i => `${i.type}:${i.id}`));
        }

        // 6. Admin Approves Photo
        if (foundItem) {
            console.log('\n6. Admin Approving Photo...');
            await axios.put(`${BASE_URL}/photos/${createdPhoto.id}/status`, 
                { status: 'approved' },
                { headers: { Authorization: `Bearer ${adminToken}` } }
            );
            console.log('Approval request sent.');

            // Verify status
            const verifyRes = await axios.get(`${BASE_URL}/photos/${createdPhoto.id}`);
            if (verifyRes.data.status === 'approved') {
                console.log('PASSED: Photo status is now approved.');
            } else {
                console.error(`FAILED: Photo status is ${verifyRes.data.status}`);
            }
        }

        console.log('\n--- Test Completed ---');

    } catch (error) {
        console.error('Test Error:', error.response?.data || error.message);
    }
}

runTest();
