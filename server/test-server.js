async function testServer() {
  try {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch('http://localhost:5000/api/auth/test', {
      method: 'GET'
    });
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

testServer();
