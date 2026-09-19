import React, { useState } from 'react';
import { ArrowLeft, Calculator, Percent, Ratio, HardDrive, Copy, Check, RefreshCw } from 'lucide-react';
import { addToolboxHistory } from '../../../../services/toolboxDb';

export default function QuickCalcView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('discount'); // 'discount' | 'ratio' | 'storage'
  const [copiedKey, setCopiedKey] = useState(null);

  // Discount & Tax State
  const [originalPrice, setOriginalPrice] = useState(100000);
  const [discountPercent, setDiscountPercent] = useState(20);
  const [taxPercent, setTaxPercent] = useState(11);
  const [cashbackAmount, setCashbackAmount] = useState(0);

  // Aspect Ratio State
  const [ratioWidth, setRatioWidth] = useState(1920);
  const [ratioHeight, setRatioHeight] = useState(1080);
  const [targetWidth, setTargetWidth] = useState(1280);
  const [calculatedHeight, setCalculatedHeight] = useState(720);

  // Digital Storage & Speed State
  const [fileSizeVal, setFileSizeVal] = useState(1.5);
  const [fileSizeUnit, setFileSizeUnit] = useState('GB'); // 'MB' | 'GB' | 'TB'
  const [speedVal, setSpeedVal] = useState(50);
  const [speedUnit, setSpeedUnit] = useState('Mbps'); // 'Kbps' | 'Mbps' | 'Gbps'

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Helper gcd for aspect ratio
  const gcd = (a, b) => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // Calculations for Discount
  const discValue = (Number(originalPrice) || 0) * ((Number(discountPercent) || 0) / 100);
  const priceAfterDisc = Math.max(0, (Number(originalPrice) || 0) - discValue);
  const taxValue = priceAfterDisc * ((Number(taxPercent) || 0) / 100);
  const finalPrice = Math.max(0, priceAfterDisc + taxValue - (Number(cashbackAmount) || 0));
  const totalSaved = discValue + (Number(cashbackAmount) || 0);

  const handleSaveDiscountHistory = () => {
    const summary = `Harga: Rp${Number(originalPrice).toLocaleString('id-ID')} | Disc ${discountPercent}% + Pajak ${taxPercent}% -> Total: Rp${Math.round(finalPrice).toLocaleString('id-ID')}`;
    addToolboxHistory({
      toolType: 'calc',
      title: `Hitung Diskon: Rp${Math.round(finalPrice).toLocaleString('id-ID')}`,
      dataPayload: summary,
    });
    if (onRefreshHistory) onRefreshHistory();
  };

  // Calculations for Aspect Ratio
  const divisor = gcd(Math.round(ratioWidth) || 1, Math.round(ratioHeight) || 1);
  const simplifiedRatio = `${Math.round(ratioWidth) / divisor}:${Math.round(ratioHeight) / divisor}`;

  const handleTargetWidthChange = (val) => {
    const w = parseFloat(val) || 0;
    setTargetWidth(val);
    if (ratioWidth > 0 && ratioHeight > 0 && w > 0) {
      setCalculatedHeight(Math.round((w * ratioHeight) / ratioWidth));
    }
  };

  const applyPresetRatio = (w, h) => {
    setRatioWidth(w);
    setRatioHeight(h);
    if (targetWidth > 0) {
      setCalculatedHeight(Math.round((targetWidth * h) / w));
    }
  };

  const handleSaveRatioHistory = () => {
    const summary = `Rasio Asal: ${ratioWidth}x${ratioHeight} (${simplifiedRatio}) -> Skala Baru: ${targetWidth}x${calculatedHeight}`;
    addToolboxHistory({
      toolType: 'calc',
      title: `Rasio Aspek: ${simplifiedRatio} (${targetWidth}x${calculatedHeight})`,
      dataPayload: summary,
    });
    if (onRefreshHistory) onRefreshHistory();
  };

  // Calculations for Digital Speed / ETA
  const getSizeBytes = (val, unit) => {
    const n = parseFloat(val) || 0;
    switch (unit) {
      case 'KB': return n * 1024;
      case 'MB': return n * 1024 * 1024;
      case 'GB': return n * 1024 * 1024 * 1024;
      case 'TB': return n * 1024 * 1024 * 1024 * 1024;
      default: return n;
    }
  };

  const getSpeedBytesPerSec = (val, unit) => {
    const n = parseFloat(val) || 0;
    switch (unit) {
      case 'Kbps': return (n * 1000) / 8;
      case 'Mbps': return (n * 1000 * 1000) / 8;
      case 'Gbps': return (n * 1000 * 1000 * 1000) / 8;
      default: return n / 8;
    }
  };

  const totalBytes = getSizeBytes(fileSizeVal, fileSizeUnit);
  const bytesPerSec = getSpeedBytesPerSec(speedVal, speedUnit);
  const totalSeconds = bytesPerSec > 0 ? totalBytes / bytesPerSec : 0;

  const formatEta = (seconds) => {
    if (!seconds || !isFinite(seconds) || seconds <= 0) return '0 Detik';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const parts = [];
    if (hrs > 0) parts.push(`${hrs} Jam`);
    if (mins > 0) parts.push(`${mins} Menit`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs} Detik`);
    return parts.join(' ');
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#FF70A6] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-[#121212]" />
        </button>
        <h2 className="text-xl font-black text-[#121212] uppercase tracking-tight">Quick Calculator</h2>
        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1 gap-1">
        <button
          onClick={() => setActiveTab('discount')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'discount' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <Percent className="w-3.5 h-3.5" />
          <span>Diskon & Pajak</span>
        </button>
        <button
          onClick={() => setActiveTab('ratio')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'ratio' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <Ratio className="w-3.5 h-3.5" />
          <span>Rasio Aspek</span>
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`flex-1 py-2 px-2 rounded-lg font-black text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'storage' ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Data & Speed</span>
        </button>
      </div>

      {/* Main Content Area */}
      {activeTab === 'discount' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase text-[#121212]">Parameter Belanja</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Harga Asli (Rp)</label>
                <input
                  type="number"
                  value={originalPrice}
                  onChange={(e) => setOriginalPrice(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE] focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Diskon (%)</label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE] focus:outline-none focus:bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Pajak / PPN (%)</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE] focus:outline-none focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setTaxPercent(11)}
                    className="px-2.5 py-1 text-xs font-black bg-[#FFE600] border-2 border-[#121212] rounded-xl cursor-pointer"
                  >
                    11%
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaxPercent(12)}
                    className="px-2.5 py-1 text-xs font-black bg-[#FFE600] border-2 border-[#121212] rounded-xl cursor-pointer"
                  >
                    12%
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Cashback / Voucher (Rp)</label>
                <input
                  type="number"
                  value={cashbackAmount}
                  onChange={(e) => setCashbackAmount(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE] focus:outline-none focus:bg-white"
                />
              </div>
            </div>
          </div>

          {/* Breakdown Card */}
          <div className="p-4 bg-[#E8FCE8] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase text-[#121212]">Ringkasan Total</span>
              <span className="text-[10px] font-black uppercase bg-[#38E54D] px-2 py-0.5 border border-[#121212] rounded-md">
                Hasil Hitung
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
              <div className="p-2.5 bg-white rounded-xl border border-[#121212]">
                <div className="text-gray-500 text-[10px]">POTONGAN DISKON</div>
                <div className="text-sm font-black text-[#FF70A6]">
                  - Rp{Math.round(discValue).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#121212]">
                <div className="text-gray-500 text-[10px]">NILAI PAJAK</div>
                <div className="text-sm font-black text-gray-800">
                  + Rp{Math.round(taxValue).toLocaleString('id-ID')}
                </div>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border-2 border-[#121212] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono font-black text-gray-500 uppercase">Total Bayar Akhir</div>
                <div className="text-xl sm:text-2xl font-mono font-black text-[#121212]">
                  Rp{Math.round(finalPrice).toLocaleString('id-ID')}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    copyToClipboard(`Rp${Math.round(finalPrice).toLocaleString('id-ID')}`, 'finalPrice');
                    handleSaveDiscountHistory();
                  }}
                  className="px-3 py-2 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'finalPrice' ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'finalPrice' ? 'Tersalin' : 'Salin & Simpan'}</span>
                </button>
              </div>
            </div>

            {totalSaved > 0 && (
              <div className="text-center text-[11px] font-bold text-green-800 bg-[#38E54D]/25 p-1.5 rounded-lg border border-[#121212]">
                🎉 Kamu menghemat total <strong>Rp{Math.round(totalSaved).toLocaleString('id-ID')}</strong>!
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ratio' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase text-[#121212]">Preset Rasio Umum</h3>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '16:9 (HD Video)', w: 1920, h: 1080 },
                { label: '9:16 (Story/Reel)', w: 1080, h: 1920 },
                { label: '4:3 (Klasik)', w: 1440, h: 1080 },
                { label: '1:1 (Persegi/Feed)', w: 1080, h: 1080 },
                { label: '21:9 (Ultrawide)', w: 2560, h: 1080 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => applyPresetRatio(p.w, p.h)}
                  className="px-2.5 py-1 bg-[#F8F5EE] hover:bg-[#FFE600] active:translate-x-0.5 active:translate-y-0.5 rounded-lg border border-[#121212] text-xs font-bold font-mono transition-colors cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lebar Asal (W1)</label>
                <input
                  type="number"
                  value={ratioWidth}
                  onChange={(e) => {
                    const w = parseFloat(e.target.value) || 0;
                    setRatioWidth(w);
                    if (w > 0 && ratioHeight > 0 && targetWidth > 0) {
                      setCalculatedHeight(Math.round((targetWidth * ratioHeight) / w));
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tinggi Asal (H1)</label>
                <input
                  type="number"
                  value={ratioHeight}
                  onChange={(e) => {
                    const h = parseFloat(e.target.value) || 0;
                    setRatioHeight(h);
                    if (ratioWidth > 0 && h > 0 && targetWidth > 0) {
                      setCalculatedHeight(Math.round((targetWidth * h) / ratioWidth));
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE]"
                />
              </div>
            </div>

            <div className="p-2.5 bg-[#FFFDE6] rounded-xl border border-[#121212] text-center font-mono font-black text-xs">
              Rasio Terduksi: <span className="text-[#121212] text-sm bg-[#FFE600] px-2 py-0.5 rounded border border-[#121212]">{simplifiedRatio}</span>
            </div>
          </div>

          <div className="p-4 bg-[#C4FAF8] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase text-[#121212]">Skalakan Dimensi Baru</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lebar Target (W2)</label>
                <input
                  type="number"
                  value={targetWidth}
                  onChange={(e) => handleTargetWidthChange(e.target.value)}
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Tinggi Hasil (H2)</label>
                <input
                  type="number"
                  value={calculatedHeight}
                  readOnly
                  className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-white/70 text-gray-800"
                />
              </div>
            </div>

            <button
              onClick={() => {
                copyToClipboard(`${targetWidth}x${calculatedHeight}`, 'ratioResult');
                handleSaveRatioHistory();
              }}
              className="w-full py-2.5 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedKey === 'ratioResult' ? <Check className="w-4 h-4 text-green-700" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey === 'ratioResult' ? 'Tersalin!' : `Salin Dimensi (${targetWidth}x${calculatedHeight})`}</span>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'storage' && (
        <div className="space-y-3.5">
          <div className="p-4 bg-white rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <h3 className="text-sm font-black uppercase text-[#121212]">Kalkulator Estimasi Waktu Download</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Ukuran File</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    step="0.1"
                    value={fileSizeVal}
                    onChange={(e) => setFileSizeVal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE]"
                  />
                  <select
                    value={fileSizeUnit}
                    onChange={(e) => setFileSizeUnit(e.target.value)}
                    className="p-2.5 rounded-xl border-2 border-[#121212] font-mono font-black text-xs bg-[#FFE600] cursor-pointer"
                  >
                    <option value="KB">KB</option>
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Kecepatan Internet</label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    value={speedVal}
                    onChange={(e) => setSpeedVal(e.target.value)}
                    className="w-full p-2.5 rounded-xl border-2 border-[#121212] font-mono font-bold text-sm bg-[#F8F5EE]"
                  />
                  <select
                    value={speedUnit}
                    onChange={(e) => setSpeedUnit(e.target.value)}
                    className="p-2.5 rounded-xl border-2 border-[#121212] font-mono font-black text-xs bg-[#FFE600] cursor-pointer"
                  >
                    <option value="Kbps">Kbps</option>
                    <option value="Mbps">Mbps</option>
                    <option value="Gbps">Gbps</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#FFEBF2] rounded-2xl border-2 border-[#121212] shadow-[3px_3px_0px_#121212] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-black uppercase text-[#121212]">Estimasi Waktu Selesai</span>
              <span className="text-[10px] font-black uppercase bg-[#FF70A6] px-2 py-0.5 border border-[#121212] rounded-md">
                Transfer Rate
              </span>
            </div>

            <div className="p-4 bg-white rounded-xl border-2 border-[#121212] text-center space-y-1">
              <div className="text-[10px] font-mono font-bold text-gray-500 uppercase">Waktu yang Dibutuhkan</div>
              <div className="text-2xl font-mono font-black text-[#FF70A6]">
                {formatEta(totalSeconds)}
              </div>
              <div className="text-[11px] font-mono font-semibold text-gray-600">
                Kecepatan Nyata: ~{(bytesPerSec / (1024 * 1024)).toFixed(2)} MB/detik
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono font-bold">
              <div className="p-2.5 bg-white rounded-lg border border-[#121212]">
                <div className="text-gray-500 text-[9px]">TOTAL MEGABYTES</div>
                <div>{(totalBytes / (1024 * 1024)).toFixed(2)} MB</div>
              </div>
              <div className="p-2.5 bg-white rounded-lg border border-[#121212]">
                <div className="text-gray-500 text-[9px]">TOTAL GIGABYTES</div>
                <div>{(totalBytes / (1024 * 1024 * 1024)).toFixed(3)} GB</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
