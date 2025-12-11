// Configuration centralisée de l'API
// Utilise REACT_APP_API_URL depuis .env ou localhost par défaut

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default API_URL;
