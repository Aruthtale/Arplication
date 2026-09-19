import React, { useState, useEffect } from 'react';
import ToolboxBentoGrid from './ToolboxBentoGrid';
import QrSuiteView from './tools/QrSuiteView';
import TextDevView from './tools/TextDevView';
import QuickCalcView from './tools/QuickCalcView';
import ColorStudioView from './tools/ColorStudioView';
import ToolboxHistoryModal from './tools/ToolboxHistoryModal';
import { getToolboxHistory } from '../../../services/toolboxDb';

export default function ArToolboxModule() {
  const [activeTool, setActiveTool] = useState(null); // null | 'qr' | 'text' | 'calc' | 'color'
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState([]);

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

      {activeTool === 'text' && (
        <TextDevView onBack={handleBackToBento} onRefreshHistory={refreshHistory} />
      )}

      {activeTool === 'calc' && (
        <QuickCalcView onBack={handleBackToBento} onRefreshHistory={refreshHistory} />
      )}

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
