// src/components/ScannerPointage.jsx
import { useState } from "react";
import QrReader from "react-qr-reader";
import axios from "axios";

export default function ScannerPointage() {
  const [message, setMessage] = useState("");

  const handleScan = async (data) => {
    if (data) {
      try {
        const res = await axios.post("http://localhost:5000/pointage/qr", {
          contenu: data,
        });
        setMessage(res.data.message);
      } catch (err) {
        setMessage("Erreur lors du pointage");
        console.error(err);
      }
    }
  };

  const handleError = (err) => {
    console.error("Erreur caméra", err);
    setMessage("Erreur caméra");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
      <h2 className="text-2xl font-bold mb-6">📸 Scanner ton badge QR</h2>

      <div className="bg-white rounded shadow p-4 border">
        <QrReader
          delay={300}
          onError={handleError}
          onScan={handleScan}
          style={{ width: "300px" }}
        />
      </div>

      <p className="mt-6 text-lg text-blue-600">{message}</p>
    </div>
  );
}
