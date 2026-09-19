import React, { useState, useEffect, useRef } from 'react';
import ToolboxBentoGrid from './ToolboxBentoGrid';
import QrSuiteView from './tools/QrSuiteView';
import ImageStudioView from './tools/ImageStudioView';
import PdfMakerView from './tools/PdfMakerView';
import ColorStudioView from './tools/ColorStudioView';
import ToolboxHistoryModal from './tools/ToolboxHistoryModal';
import { getToolboxHistory } from '../../../services/toolboxDb';
import { registerBackHandler } from '../../../services/backHandler';

export default function ArToolboxModule() {
  const [activeTool, setActiveTool] = useState(null); // null | 'qr' | 'image' | 'pdf' | 'color'
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

  const activeToolRef = useRef(activeTool);
  const isHistoryOpenRef = useRef(isHistoryOpen);

  useEffect(() => {
    activeToolRef.current = activeTool;
  }, [activeTool]);

  useEffect(() => {
    isHistoryOpenRef.current = isHistoryOpen;
  }, [isHistoryOpen]);

  // Daftarkan handler back button untuk ArToolbox
  useEffect(() => {
    const unregister = registerBackHandler(() => {
      if (isHistoryOpenRef.current) {
        setIsHistoryOpen(false);
        return true;
      }
      if (activeToolRef.current !== null) {
        setActiveTool(null);
        return true;
      }
      return false;
    });

    return () => unregister();
  }, []);

  // Muat riwayat dari storage
  const refreshHistory = () => {
    setHistoryItems(getToolboxHistory());
  };

  useEffect(() => {
    refreshHistory();
  }, [activeTool, isHistoryOpen]);

  const handleBackToBento = () => {
    setActiveTool(null);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Tampilan utama: Bento Grid */}
      {activeTool === null && (
        <ToolboxBentoGrid
          onSelectTool={(toolId) => setActiveTool(toolId)}
          onOpenHistory={() => setIsHistoryOpen(true)}
          historyCount={historyItems.length}
        />
      )}

      {/* Sub-view perkakas aktif */}
      {activeTool === 'qr' && (
        <QrSuiteView onBack={handleBackToBento} onRefreshHistory={refreshHistory} />
      )}

      {/* Sub-view Image Studio */}
      {activeTool === 'image' && (
        <ImageStudioView onBack={handleBackToBento} onRefreshHistory={refreshHistory} />
      )}

      {/* Sub-view PDF Maker */}
      {activeTool === 'pdf' && (
        <PdfMakerView onBack={handleBackToBento} onRefreshHistory={refreshHistory} />
      )}

      {/* Sub-view Color Studio */}
      {activeTool === 'color' && (
        <ColorStudioView onBack={handleBackToBento} onRefreshHistory={refreshHistory} />
      )}

      {/* Modal Riwayat Lokal */}
      {isHistoryOpen && (
        <ToolboxHistoryModal
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          historyItems={historyItems}
          onRefreshHistory={refreshHistory}
        />
      )}
    </div>
  );
}
