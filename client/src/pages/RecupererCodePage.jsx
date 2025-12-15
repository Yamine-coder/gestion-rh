import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import logo from "../assets/logo.jpg";

// URL de l'API (utilise la variable d'environnement en production)
const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function RecupererCodePage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [erreur, setErreur] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${API_BASE}/auth/recuperer-code`, {
        email
      });

      setMessage("✅ Code envoyé avec succès ! Vérifiez votre email.");
      
      // Redirection automatique vers la page de connexion après 3 secondes
      setTimeout(() => {
        navigate('/login');
      }, 3000);
      
    } catch (err) {
      setErreur(
        err.response?.data?.error || "Erreur lors de l'envoi. Vérifiez votre email."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full">
        {/* Bouton retour */}
        <button
          onClick={() => navigate('/login')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 text-sm"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour à la connexion
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src={logo} alt="Logo" className="h-28 w-auto object-contain" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2 text-center text-blue-700">
          Récupérer mon code
        </h1>
        <p className="text-gray-600 text-center mb-6 text-sm">
          Entrez votre email pour recevoir votre code de connexion
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Champ Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              placeholder="Votre email"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Message de succès */}
          {message && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-lg text-sm border border-green-200">
              {message}
            </div>
          )}

          {/* Message d'erreur */}
          {erreur && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
              {erreur}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 ${
              isLoading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
            }`}
            disabled={isLoading || !email}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Envoi en cours...
              </span>
            ) : (
              "📧 Envoyer mon code"
            )}
          </button>
        </form>

        {/* Info supplémentaire */}
        <div className="mt-6 text-center">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-2">💡 Comment ça marche ?</h3>
            <div className="text-xs text-gray-600 space-y-1">
              <p>1. Tapez votre email professionnel</p>
              <p>2. Recevez votre code par email</p>
              <p>3. Utilisez-le pour vous connecter</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecupererCodePage;
