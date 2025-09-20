const QRCode = require('qrcode');

exports.generateQRCode = async (req, res) => {
  const employeId = req.params.id;

  try {
    const contenu = `EMPLOYE:${employeId}`;
    const qrCodeDataURL = await QRCode.toDataURL(contenu);
    res.json({ qrCode: qrCodeDataURL });
  } catch (err) {
    res.status(500).json({ error: 'Erreur QR Code' });
  }
};
