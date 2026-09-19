import React, { useState, useRef, useEffect } from 'react';
import { QrCode, Upload, Camera, X, Copy, Check, Download, Palette, RotateCcw, Trash2 } from 'lucide-react';
import { addToolboxHistory } from '../../../services/toolboxDb';

// Import QR code library
import QRCode from 'qrcode';

export default function QrSuiteView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'scanner'
  const [qrText, setQrText] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const [qrColor, setQrColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#FFFFFF');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Generate QR Code
  const generateQrCode = async () => {
    if (!qrText.trim()) return;

    try {
      const canvas = document.createElement('canvas');
      await QRCode.toCanvas(canvas, qrText, {
        width: qrSize,
        height: qrSize,
        colorDark: qrColor,
        colorLight: qrBgColor,
        margin: 2,
      });

      const imageDataUrl = canvas.toDataURL('image/png');
      setGeneratedImage(imageDataUrl);

      // Simpan riwayat
      addToolboxHistory({
        toolType: 'qr',
        title: `QR Code: ${qrText.substring(0, 50)}${qrText.length > 50 ? '...' : ''}`,
        dataPayload: `Text: ${qrText}, Size: ${qrSize}, Dark: ${qrColor}, Bg: ${qrBgColor}`,
      });

      onRefreshHistory();
    } catch (error) {
      console.error('Gagal membuat QR Code:', error);
    }
  };

  // Download QR Code
  const downloadQrCode = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.download = `qrcode-${Date.now()}.png`;
    link.href = generatedImage;
    link.click();
  };

  // Salin QR Code ke clipboard
  const copyQrCode = async () => {
    if (!generatedImage) return;

    try {
      const blob = await fetch(generatedImage).then(r => r.blob());
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
    } catch (error) {
      // Fallback: salin teks
      await navigator.clipboard.writeText(qrText);
    }
  };

  // Scan QR Code from camera
  const startQrScan = async () => {
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error('Gagal mengakses kamera:', error);
      setIsScanning(false);
    }
  };

  // Hentikan scan QR
  const stopQrScan = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  // Deteksi QR dari video
  const detectQrFromVideo = async () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // TODO: Implement QR detection using a library like jsqr or similar
      // Untuk sementara, hanya deteksi teks sederhana
      console.log('Frame captured for QR detection');
    } catch (error) {
      console.error('Gagal mendeteksi QR:', error);
    }

    // Terus deteksi selama pemindaian aktif
    if (isScanning) {
      requestAnimationFrame(detectQrFromVideo);
    }
  };

  // Upload QR dari file
  const handleQrUpload = (event) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // TODO: Implement QR decoding
        console.log('Gambar diunggah:', img);
        // Untuk sementara, simpan riwayat upload saja
        addToolboxHistory({
          toolType: 'qr',
          title: `QR Upload: ${file.name}`,
          dataPayload: `File: ${file.name}, Size: ${file.size} bytes`,
        });
        onRefreshHistory();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (activeTab === 'scanner' && isScanning) {
      detectQrFromVideo();
    }
    return () => {
      stopQrScan();
    };
  }, [activeTab, isScanning]);

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#C4FAF8] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-black text-[#121212] uppercase">QR & Barcode Suite</h2>

        <div className="w-9" /> {/* Spacer for balance */}
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1">
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex-1 py-2 px-4 rounded-lg font-black text-sm transition-all ${activeTab === 'generator' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'}`}
        >
          Generator
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`flex-1 py-2 px-4 rounded-lg font-black text-sm transition-all ${activeTab === 'scanner' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'}`}
        >
          Scanner
        </button>
      </div>

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <div className="space-y-4">
          {/* Input QR */}
          <div className="bg-[#FFFFFF] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-4 space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Teks/Input QR</h3>
            <textarea
              value={qrText}
              onChange={(e) => setQrText(e.target.value)}
              placeholder="Masukkan teks, URL, atau data..."
              className="w-full p-3 rounded-lg border-2 border-[#121212] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
              rows={3}
            />

            <div className="flex gap-3">
              <button
                onClick={generateQrCode}
                className="flex-1 py-2 px-4 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
              >
                <QrCode className="w-4 h-4 inline mr-2" />
                Buat QR
              </button>

              <button
                onClick={() => document.getElementById('qr-upload').click()}
                className="py-2 px-4 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <input
                id="qr-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
            </div>
          </div>

          {/* Pengaturan QR */}
          <div className="bg-[#FFFFFF] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-4 space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Pengaturan QR</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-black mb-1">Ukuran (px)</label>
                <input
                  type="number"
                  value={qrSize}
                  onChange={(e) => setQrSize(Math.max(128, Math.min(1024, parseInt(e.target.value) || 256)))}
                  min={128}
                  max={1024}
                  step={64}
                  className="w-full p-2 rounded-lg border-2 border-[#121212] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-1">Warna Gelap</label>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => setQrColor(e.target.value)}
                  className="w-full h-8 rounded-lg border-2 border-[#121212] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-black mb-1">Warna Terang</label>
                <input
                  type="color"
                  value={qrBgColor}
                  onChange={(e) => setQrBgColor(e.target.value)}
                  className="w-full h-8 rounded-lg border-2 border-[#121212] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Pratinjau & Aksi */}
          {generatedImage && (
            <div className="bg-[#FFFFFF] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-4 space-y-3">
              <h3 className="text-lg font-black text-[#121212]">Pratinjau QR</h3>
              <div className="flex justify-center">
                <img
                  src={generatedImage}
                  alt="QR Code"
                  className="w-48 h-48 border-2 border-[#121212] rounded-lg"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={downloadQrCode}
                  className="flex-1 py-2 px-4 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
                >
                  <Download className="w-4 h-4 inline mr-2" />
                  Unduh
                </button>

                <button
                  onClick={copyQrCode}
                  className="flex-1 py-2 px-4 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
                >
                  <Copy className="w-4 h-4 inline mr-2" />
                  Salin
                </button>

                <button
                  onClick={() => setGeneratedImage(null)}
                  className="py-2 px-4 bg-[#FF70A6] hover:bg-[#FF5A8C] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
                >
                  <Trash2 className="w-4 h-4 inline mr-2" />
                  Hapus
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Scanner Tab */}
      {activeTab === 'scanner' && (
        <div className="space-y-4">
          <div className="bg-[#FFFFFF] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-4 space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Pindai QR Code</h3>

            <div className="relative bg-[#121212] rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
              {isScanning && (
                <div className="absolute inset-0 border-2 border-[#38E54D] border-dashed rounded-lg pointer-events-none">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-[#38E54D] animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-[#38E54D] animate-pulse" />
                </div>
              )}
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Camera className="w-16 h-16 text-[#121212]/30" />
                </div>
              )}
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-2">
              {!isScanning ? (
                <button
                  onClick={startQrScan}
                  className="flex-1 py-2 px-4 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
                >
                  <Camera className="w-4 h-4 inline mr-2" />
                  Mulai Scan
                </button>
              ) : (
                <button
                  onClick={stopQrScan}
                  className="flex-1 py-2 px-4 bg-[#FF70A6] hover:bg-[#FF5A8C] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
                >
                  <X className="w-4 h-4 inline mr-2" />
                  Hentikan Scan
                </button>
              )}

              <button
                onClick={() => document.getElementById('qr-scan-upload').click()}
                className="py-2 px-4 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload Gambar
              </button>
              <input
                id="qr-scan-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
            </div>

            <div className="text-xs text-gray-600 font-mono">
              Tips: Arahkan kamera ke QR Code. Tunggu hingga kotak pemindaian muncul.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
