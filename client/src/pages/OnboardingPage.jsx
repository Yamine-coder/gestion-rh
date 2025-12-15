import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Lock, Eye, EyeOff, Lightbulb, CheckCircle } from "lucide-react";
import logo from "../assets/onboarding/logo.png";

function OnboardingPage() {
  const navigate = useNavigate();
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmMotDePasse, setConfirmMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

      const role = localStorage.getItem("role");
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
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="bg-white shadow-lg sm:shadow-xl rounded-2xl p-6 sm:p-8 md:p-10 w-full max-w-[420px] sm:max-w-md md:max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <img src={logo} alt="Logo" className="h-24 sm:h-28 md:h-32 w-auto object-contain" />
        </div>
        
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 text-center text-red-700">Bienvenue !</h1>
        <p className="text-gray-600 text-sm sm:text-base text-center mb-5 sm:mb-6 md:mb-8">
          Créez votre mot de passe personnel pour sécuriser votre compte
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6">
          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 sm:left-4 text-gray-400" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Minimum 8 caractères"
                className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 md:h-14 text-sm sm:text-base block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 sm:right-4 text-gray-400 hover:text-gray-600 p-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirmation mot de passe */}
          <div>
            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1">Confirmer le mot de passe</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 sm:left-4 text-gray-400" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Retapez votre mot de passe"
                className="pl-10 sm:pl-12 pr-10 sm:pr-12 h-11 sm:h-12 md:h-14 text-sm sm:text-base block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                value={confirmMotDePasse}
                onChange={(e) => setConfirmMotDePasse(e.target.value)}
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 sm:right-4 text-gray-400 hover:text-gray-600 p-1"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Conseils */}
          <div className="bg-red-50 rounded-lg p-3 sm:p-4 border border-red-100">
            <div className="flex items-start gap-2 sm:gap-3">
              <Lightbulb className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
              <div>
                <h3 className="font-semibold text-red-800 text-xs sm:text-sm mb-1">Conseils pour un bon mot de passe :</h3>
                <ul className="text-xs sm:text-sm text-red-700 space-y-0.5 sm:space-y-1">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="flex-shrink-0" />
                    <span>Au moins 8 caractères</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="flex-shrink-0" />
                    <span>Facile à retenir pour vous</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle size={12} className="flex-shrink-0" />
                    <span>Évitez les informations personnelles</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Message d'erreur */}
          {erreur && (
            <p className="bg-red-100 text-red-600 text-xs sm:text-sm p-2 sm:p-3 rounded-lg" aria-live="assertive">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            className={`w-full py-3 sm:py-3.5 md:py-4 px-4 rounded-lg text-white text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              isLoading || !nouveauMotDePasse || !confirmMotDePasse
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 hover:shadow-lg active:scale-[0.98]"
            }`}
            disabled={isLoading || !nouveauMotDePasse || !confirmMotDePasse}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
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
                <span>Mise à jour...</span>
              </>
            ) : (
              <>
                <Lock size={18} />
                <span>Définir mon mot de passe</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default OnboardingPage;
