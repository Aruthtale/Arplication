import React, { useState, useRef, useEffect, useCallback } from 'react';
import { QrCode, Upload, Camera, X, Copy, Download, Trash2, ExternalLink, Check } from 'lucide-react';
import { addToolboxHistory } from '../../../../services/toolboxDb';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

export default function QrSuiteView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('generator'); // 'generator' | 'scanner'
  const [qrText, setQrText] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const [qrColor, setQrColor] = useState('#000000');
  const [qrBgColor, setQrBgColor] = useState('#FFFFFF');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [copied, setCopied] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);

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

      if (onRefreshHistory) onRefreshHistory();
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: salin teks
      await navigator.clipboard.writeText(qrText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Hentikan scan QR
  const stopQrScan = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  // Deteksi QR dari video
  const detectQrFromVideo = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        setScanResult(code.data);
        setScanError(null);
        
        // Simpan riwayat
        addToolboxHistory({
          toolType: 'qr',
          title: `Scan QR: ${code.data.substring(0, 50)}${code.data.length > 50 ? '...' : ''}`,
          dataPayload: code.data,
        });
        if (onRefreshHistory) onRefreshHistory();

        stopQrScan();
        return;
      }
    }

    animFrameRef.current = requestAnimationFrame(detectQrFromVideo);
  }, [onRefreshHistory, stopQrScan]);

  // Scan QR Code from camera
  const startQrScan = async () => {
    setScanResult(null);
    setScanError(null);
    setIsScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        await videoRef.current.play();
        animFrameRef.current = requestAnimationFrame(detectQrFromVideo);
      }
    } catch (err) {
      console.error('Gagal mengakses kamera:', err);
      setScanError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
      setIsScanning(false);
    }
  };

  // Upload QR dari file
  const handleQrUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setScanError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          setScanResult(code.data);
          addToolboxHistory({
            toolType: 'qr',
            title: `QR Upload: ${file.name}`,
            dataPayload: code.data,
          });
          if (onRefreshHistory) onRefreshHistory();
        } else {
          setScanError('Tidak menemukan kode QR pada gambar ini.');
        }
      };
      img.src = e.target?.result;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    return () => {
      stopQrScan();
    };
  }, [stopQrScan]);

  const isUrl = (str) => {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

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

        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1">
        <button
          onClick={() => { stopQrScan(); setActiveTab('generator'); }}
          className={`flex-1 py-2 px-4 rounded-lg font-black text-sm transition-all ${activeTab === 'generator' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'}`}
        >
          Generator
        </button>
        <button
          onClick={() => { setActiveTab('scanner'); }}
          className={`flex-1 py-2 px-4 rounded-lg font-black text-sm transition-all ${activeTab === 'scanner' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'}`}
        >
          Scanner
        </button>
      </div>

      {/* Generator Tab */}
      {activeTab === 'generator' && (
        <div className="space-y-4">
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
                onClick={() => document.getElementById('qr-upload-gen').click()}
                className="py-2 px-4 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <input
                id="qr-upload-gen"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleQrUpload}
              />
            </div>
          </div>

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
                  {copied ? <Check className="w-4 h-4 inline mr-2 text-green-700" /> : <Copy className="w-4 h-4 inline mr-2" />}
                  {copied ? 'Tersalin!' : 'Salin'}
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
                  <Camera className="w-16 h-16 text-white/30" />
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

            {scanError && (
              <div className="p-3 bg-[#FF70A6]/20 border-2 border-[#FF70A6] rounded-lg text-xs font-bold text-[#121212]">
                {scanError}
              </div>
            )}
          </div>

          {scanResult && (
            <div className="bg-[#C4FAF8] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-[#121212]">Hasil Deteksi QR</h3>
                <span className="px-2 py-0.5 bg-[#38E54D] border border-[#121212] rounded-md text-[10px] font-black uppercase">
                  Terdeteksi
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border-2 border-[#121212] font-mono text-sm break-all">
                {scanResult}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(scanResult);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="flex-1 py-2 px-3 bg-[#FFE600] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] rounded-lg font-black text-xs"
                >
                  {copied ? 'Tersalin!' : 'Salin Teks'}
                </button>

                {isUrl(scanResult) && (
                  <a
                    href={scanResult}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2 px-3 bg-[#38E54D] border-2 border-[#121212] shadow-[2px_2px_0px_#121212] rounded-lg font-black text-xs text-center inline-flex items-center justify-center gap-1"
                  >
                    Buka Link <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
