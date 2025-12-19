const axios = require('axios');

axios.get('http://localhost:3001/api/events?page=1&limit=6&sort=newest')
  .then(res => {
    console.log('Status:', res.status);
    console.log('Data:', JSON.stringify(res.data, null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
    if (err.response) {
        console.error('Response data:', err.response.data);
    }
  });
