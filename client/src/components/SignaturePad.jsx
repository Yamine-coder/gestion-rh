import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";

function SignaturePad({ onValidate, onCancel }) {
  const sigRef = useRef();
  const [error, setError] = useState(false); // État pour gérer les erreurs

  const clear = () => {
    sigRef.current.clear();
    setError(false); // Réinitialise l'erreur si l'utilisateur efface
  };

  const validerSignature = () => {
    if (!sigRef.current.isEmpty()) {
      const image = sigRef.current.toDataURL();
      onValidate(image); // Envoie l'image de la signature si nécessaire
    } else {
      setError(true); // Affiche un message d'erreur si la signature est vide
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-xl max-w-xl w-full text-center">
      <h2 className="text-xl font-bold text-gray-800 mb-2">✍️ Signature</h2>
      <p className="text-sm text-gray-600 mb-4">Merci de valider ce pointage :</p>

      <div className="border border-gray-300 rounded-lg overflow-hidden bg-gray-50">
        <SignatureCanvas
          ref={sigRef}
          penColor="black"
          canvasProps={{
            width: 500,
            height: 150,
            className: "w-full h-[150px]",
          }}
        />
      </div>

      {/* Message d'erreur si la signature est vide */}
      {error && (
        <p className="text-red-600 text-sm mt-2">
          ⚠️ Veuillez signer avant de valider.
        </p>
      )}

      <div className="flex justify-between mt-4">
        <button
          onClick={clear}
          className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded shadow"
        >
          Effacer
        </button>
        <button
          onClick={validerSignature}
          className={`${
            sigRef.current && !sigRef.current.isEmpty()
              ? "bg-green-600 hover:bg-green-700"
              : "bg-gray-300 cursor-not-allowed"
          } text-white px-4 py-2 rounded shadow`}
          disabled={sigRef.current && sigRef.current.isEmpty()} // Désactive le bouton si la signature est vide
        >
          Valider
        </button>
      </div>

      {onCancel && (
        <button
          onClick={onCancel}
          className="text-sm mt-4 text-gray-500 underline"
        >
          Annuler
        </button>
      )}
    </div>
  );
}

export default SignaturePad;