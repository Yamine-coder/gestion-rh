import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import logo from "../assets/logo.jpg";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState("");
  const [confirmMotDePasse, setConfirmMotDePasse] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [erreur, setErreur] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Critères de validation
  const [validation, setValidation] = useState({
    longueur: false,
    majuscule: false,
    minuscule: false,
    chiffre: false,
    special: false,
    match: false
  });

  useEffect(() => {
    if (!token) {
      setErreur("Token manquant. Veuillez utiliser le lien reçu par email.");
    }
  }, [token]);

  // Validation en temps réel du mot de passe
  useEffect(() => {
    if (nouveauMotDePasse) {
      setValidation({
        longueur: nouveauMotDePasse.length >= 8,
        majuscule: /[A-Z]/.test(nouveauMotDePasse),
        minuscule: /[a-z]/.test(nouveauMotDePasse),
        chiffre: /\d/.test(nouveauMotDePasse),
        special: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>?]/.test(nouveauMotDePasse),
        match: confirmMotDePasse && nouveauMotDePasse === confirmMotDePasse
      });
    }
  }, [nouveauMotDePasse, confirmMotDePasse]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");

    if (!token) {
      setErreur("Token manquant");
      return;
    }

    if (nouveauMotDePasse !== confirmMotDePasse) {
      setErreur("Les mots de passe ne correspondent pas");
      return;
    }

    const isValid = Object.entries(validation).every(([key, value]) => value);
    if (!isValid) {
      setErreur("Le mot de passe ne respecte pas tous les critères");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post("http://localhost:5000/auth/reset-password", {
        token,
        nouveauMotDePasse
      });

      setSuccess(true);
      
      // Redirection après 3 secondes
      setTimeout(() => {
        navigate("/login");
      }, 3000);

    } catch (err) {
      setErreur(
        err.response?.data?.error || "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center px-4">
        <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-6">
            <CheckCircle className="text-green-500" size={64} />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-green-700">Succès !</h1>
          <p className="text-gray-600 mb-6">
            Votre mot de passe a été réinitialisé avec succès. 
            Vous allez être redirigé vers la page de connexion.
          </p>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <div className="animate-spin h-4 w-4 mr-2 border-2 border-green-500 border-t-transparent rounded-full"></div>
            Redirection en cours...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img src={logo} alt="Logo Chez Antoine" className="h-20" />
        </div>
        
        <h1 className="text-3xl font-bold mb-6 text-center text-red-700">
          Nouveau mot de passe
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nouveau mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nouveau mot de passe
            </label>
            <div className="relative mt-1 flex items-center">
              <Lock className="absolute left-3 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                className="pl-12 pr-12 h-12 block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                value={nouveauMotDePasse}
                onChange={(e) => setNouveauMotDePasse(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirmation mot de passe */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirmer le mot de passe
            </label>
            <div className="relative mt-1 flex items-center">
              <Lock className="absolute left-3 text-gray-400" size={20} />
              <input
                type={showPassword ? "text" : "password"}
                className="pl-12 h-12 block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                value={confirmMotDePasse}
                onChange={(e) => setConfirmMotDePasse(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Critères de validation */}
          {nouveauMotDePasse && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Critères du mot de passe :
              </h3>
              <div className="space-y-1">
                {[
                  { key: 'longueur', text: 'Au moins 8 caractères' },
                  { key: 'majuscule', text: 'Une majuscule (A-Z)' },
                  { key: 'minuscule', text: 'Une minuscule (a-z)' },
                  { key: 'chiffre', text: 'Un chiffre (0-9)' },
                  { key: 'special', text: 'Un caractère spécial (!@#$...)' },
                  { key: 'match', text: 'Les mots de passe correspondent' }
                ].map(({ key, text }) => (
                  <div key={key} className="flex items-center text-xs">
                    <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                      validation[key] ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {validation[key] && <CheckCircle size={12} className="text-white" />}
                    </div>
                    <span className={validation[key] ? 'text-green-600' : 'text-gray-500'}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {erreur && (
            <p className="bg-red-100 text-red-600 text-sm mt-2 p-3 rounded-lg">
              {erreur}
            </p>
          )}

          <button
            type="submit"
            className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 ${
              isLoading
                ? "bg-red-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 hover:shadow-lg"
            }`}
            disabled={isLoading}
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
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
                Réinitialisation...
              </span>
            ) : (
              "Réinitialiser le mot de passe"
            )}
          </button>
        </form>

        {/* Retour à la connexion */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium hover:underline"
          >
            ← Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
