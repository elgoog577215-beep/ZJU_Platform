const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testDelete() {
  try {
    // 1. Admin Login
    console.log('Logging in...');
    const loginRes = await axios.post(`${API_URL}/auth/admin-login`, { password: '12345' });
    const token = loginRes.data.token;
    console.log('Logged in, token:', token ? 'Yes' : 'No');

    // 2. Get Photos
    console.log('Fetching photos...');
    const photosRes = await axios.get(`${API_URL}/photos?limit=1`);
    const photos = photosRes.data.data;
    
    if (photos.length === 0) {
      console.log('No photos to delete.');
      return;
    }

    const photoId = photos[0].id;
    console.log(`Trying to delete photo with ID: ${photoId}`);

    // 3. Delete Photo
    try {
        const deleteRes = await axios.delete(`${API_URL}/photos/${photoId}`, {
        headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Delete response:', deleteRes.data);
    } catch (delErr) {
        console.error('Delete failed:', delErr.response ? delErr.response.data : delErr.message);
        console.error('Status:', delErr.response ? delErr.response.status : 'Unknown');
    }

  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
        console.error('Response data:', error.response.data);
    }
  }
}

testDelete();