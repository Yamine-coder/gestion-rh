import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff } from "lucide-react";
import logo from "../assets/logo.jpg";

function OnboardingPage() {
  const navigate = useNavigate();
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmMotDePasse, setConfirmMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");

    if (nouveauMotDePasse !== confirmMotDePasse) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }

    if (nouveauMotDePasse.length < 8) {
      setErreur("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      await axios.post("http://localhost:5000/auth/complete-onboarding", {
        nouveauMotDePasse
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Redirection vers l'accueil employé
      const role = localStorage.getItem("role");
      console.log('🔍 ONBOARDING DEBUG:');
      console.log('- role stocké:', role);
      console.log('- redirection vers:', role === "admin" ? "/admin" : "/home");
      
      navigate(role === "admin" ? "/admin" : "/home");
      window.location.reload();

    } catch (err) {
      setErreur(
        err.response?.data?.error || "Erreur lors de la mise à jour du mot de passe"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo" className="h-20" />
        </div>
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-green-700 mb-2">
            🎉 Bienvenue !
          </h1>
          <p className="text-gray-600 text-sm">
            Créez votre mot de passe personnel pour sécuriser votre compte
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nouveau mot de passe */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Nouveau mot de passe"
              className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              value={nouveauMotDePasse}
              onChange={(e) => setNouveauMotDePasse(e.target.value)}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Confirmation mot de passe */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Confirmer le mot de passe"
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
              value={confirmMotDePasse}
              onChange={(e) => setConfirmMotDePasse(e.target.value)}
              required
              minLength={8}
            />
          </div>

          {/* Conseils */}
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2 text-sm">💡 Conseils pour un bon mot de passe :</h3>
            <ul className="text-xs text-green-700 space-y-1">
              <li>• Au moins 8 caractères</li>
              <li>• Facile à retenir pour vous</li>
              <li>• Évitez les informations personnelles évidentes</li>
            </ul>
          </div>

          {/* Message d'erreur */}
          {erreur && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm border border-red-200">
              {erreur}
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 ${
              isLoading || !nouveauMotDePasse || !confirmMotDePasse
                ? "bg-green-400 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700 hover:shadow-lg"
            }`}
            disabled={isLoading || !nouveauMotDePasse || !confirmMotDePasse}
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
                Mise à jour...
              </span>
            ) : (
              "🔒 Définir mon mot de passe"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default OnboardingPage;
