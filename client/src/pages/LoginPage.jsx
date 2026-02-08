import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react"; // Icônes pour les champs
import logo from "../assets/onboarding/logo.png";
import { setToken } from "../utils/tokenManager";

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [emailRecuperation, setEmailRecuperation] = useState("");
  const [isLoadingRecuperation, setIsLoadingRecuperation] = useState(false);
  const [messageRecuperation, setMessageRecuperation] = useState("");

  // Fond déjà rose par défaut (HTML) - juste s'assurer et nettoyer au départ
  useEffect(() => {
    // S'assurer que c'est rose (déjà fait par HTML mais au cas où)
    document.documentElement.style.backgroundColor = '#fecaca';
    document.body.style.backgroundColor = '#fecaca';
    // Mettre à jour theme-color pour la status bar iOS
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#fecaca');
    
    return () => {
      // Changer en blanc quand on quitte login
      document.documentElement.style.backgroundColor = '#ffffff';
      document.body.style.backgroundColor = '#ffffff';
      const metaCleanup = document.querySelector('meta[name="theme-color"]');
      if (metaCleanup) metaCleanup.setAttribute('content', '#ffffff');
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErreur("");
    setIsLoading(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      const res = await axios.post(`${apiUrl}/auth/login`, {
        email,
        password,
      });

      const { token, userId, role, prenom, nom, firstLogin } = res.data;

      console.log('🔍 LOGIN DEBUG:');
      console.log('- userId reçu:', userId);
      console.log('- role reçu du serveur:', role);
      console.log('- prenom:', prenom);
      console.log('- firstLogin:', firstLogin);

      setToken(token); // Utiliser setToken avec timestamp au lieu de localStorage.setItem direct
      // Normaliser le rôle en minuscule pour cohérence
      localStorage.setItem("role", role?.toLowerCase() || 'employee');
      if (userId) localStorage.setItem("userId", userId.toString());
      if (prenom) localStorage.setItem("prenom", prenom);
      if (nom) localStorage.setItem("nom", nom);
      
      // Vérification immédiate après stockage
      const storedRole = localStorage.getItem("role");
      console.log('- role stocké dans localStorage:', storedRole);
      console.log('- token stocké avec expiration:', localStorage.getItem("token") ? 'OK' : 'ERREUR');

      // Si c'est la première connexion, rediriger vers la page d'onboarding
      if (firstLogin) {
        console.log('- Redirection vers onboarding');
        navigate("/onboarding");
      } else {
        // Connexion normale - normaliser le rôle en minuscule pour la comparaison
        const normalizedRole = role?.toLowerCase();
        const destination = normalizedRole === "admin" ? "/admin" : "/home";
        console.log('- Redirection vers:', destination);
        navigate(destination);
      }
    } catch (err) {
      setErreur(
        err.response?.data?.message || "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // 📧 GESTION RÉCUPÉRATION MOT DE PASSE
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setMessageRecuperation("");
    setIsLoadingRecuperation(true);

    try {
      const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:5000";
      await axios.post(`${apiUrl}/auth/forgot-password`, {
        email: emailRecuperation
      });

      setMessageRecuperation("Un lien de récupération a été envoyé à votre email si celui-ci existe dans notre système.");
      setEmailRecuperation(""); // Clear le champ
    } catch (err) {
      if (err.response?.status === 429) {
        setMessageRecuperation(err.response.data.error + ` (${err.response.data.retryAfter} min)`);
      } else {
        setMessageRecuperation("Une erreur est survenue. Veuillez réessayer.");
      }
    } finally {
      setIsLoadingRecuperation(false);
    }
  };

  return (
    <>
      {/* Fond rose uniforme qui couvre tout l'écran */}
      <div 
        className="fixed inset-0 bg-red-200" 
        aria-hidden="true"
      />
      {/* Contenu centré - z-index pour être au-dessus du fond */}
      <div className="fixed inset-0 flex items-center justify-center px-4 overflow-auto z-10">
        <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full my-4">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logo} alt="Logo Chez Antoine" className="h-28 w-auto object-contain" />
          </div>
        
        {!showForgotPassword ? (
          <>
            {/* FORMULAIRE DE CONNEXION */}
            <h1 className="text-3xl font-bold mb-6 text-center text-red-700">Connexion</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="relative mt-1 flex items-center">
                  <Mail className="absolute left-3 text-gray-400" size={20} />
                  <input
                    type="email"
                    className="pl-12 h-12 block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <div className="relative mt-1 flex items-center">
                  <Lock className="absolute left-3 text-gray-400" size={20} />
                  <input
                    type="password"
                    className="pl-12 h-12 block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              {erreur && (
                <p
                  className="bg-red-100 text-red-600 text-sm mt-2 p-2 rounded-lg"
                  aria-live="assertive"
                >
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
                    Connexion...
                  </span>
                ) : (
                  "Se connecter"
                )}
              </button>
            </form>
            
            {/* Lien mot de passe oublié */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowForgotPassword(true)}
                className="text-red-600 hover:text-red-800 text-sm font-medium hover:underline"
              >
                Mot de passe oublié ?
              </button>
            </div>
          </>
        ) : (
          <>
            {/* FORMULAIRE RÉCUPÉRATION */}
            <h1 className="text-3xl font-bold mb-6 text-center text-red-700">Récupération</h1>
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <div className="relative mt-1 flex items-center">
                  <Mail className="absolute left-3 text-gray-400" size={20} />
                  <input
                    type="email"
                    placeholder="Entrez votre email professionnel"
                    className="pl-12 h-12 block w-full rounded-lg bg-gray-50 border border-gray-300 shadow-sm focus:ring-red-500 focus:border-red-500 focus:bg-white hover:bg-gray-100 transition duration-200"
                    value={emailRecuperation}
                    onChange={(e) => setEmailRecuperation(e.target.value)}
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Un lien de récupération sera envoyé à cette adresse
                </p>
              </div>
              
              {messageRecuperation && (
                <p
                  className={`text-sm mt-2 p-3 rounded-lg ${
                    messageRecuperation.includes("erreur") || messageRecuperation.includes("Trop")
                      ? "bg-red-100 text-red-600"
                      : "bg-green-100 text-green-600"
                  }`}
                  aria-live="assertive"
                >
                  {messageRecuperation}
                </p>
              )}
              
              <button
                type="submit"
                className={`w-full py-3 px-4 rounded-lg text-white font-semibold transition-all duration-300 ${
                  isLoadingRecuperation
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 hover:shadow-lg"
                }`}
                disabled={isLoadingRecuperation}
              >
                {isLoadingRecuperation ? (
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
                    Envoi...
                  </span>
                ) : (
                  "Envoyer le lien"
                )}
              </button>
            </form>
            
            {/* Retour à la connexion */}
            <div className="mt-4 text-center">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setMessageRecuperation("");
                  setEmailRecuperation("");
                }}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium hover:underline"
              >
                ← Retour à la connexion
              </button>
            </div>
          </>
        )}
        </div>
      </div>
    </>
  );
}

export default LoginPage;