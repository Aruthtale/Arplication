import React, { useState } from 'react';
import { Copy, Save, Trash2, ArrowLeft, Download, Check, Type, FileText, Code, Shield, Braces } from 'lucide-react';
import { addToolboxHistory } from '../../../../services/toolboxDb';

export default function TextDevView({ onBack, onRefreshHistory }) {
  const [activeTab, setActiveTab] = useState('case');
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  const tools = [
    { id: 'case', label: 'Case Converter', icon: Type },
    { id: 'count', label: 'Word/Character Counter', icon: FileText },
    { id: 'base64', label: 'Base64 Encoder/Decoder', icon: Code },
    { id: 'hash', label: 'Hash Generator (SHA-256)', icon: Shield },
    { id: 'json', label: 'JSON Beautifier/Minifier', icon: Braces },
  ];

  const convertCase = (text, type) => {
    if (!text) return '';
    switch (type) {
      case 'upper': return text.toUpperCase();
      case 'lower': return text.toLowerCase();
      case 'title': return text.replace(/\b\w/g, l => l.toUpperCase());
      case 'camel': return text.replace(/[-_\s]+(.)?/g, (match, chr) => chr ? chr.toUpperCase() : '');
      case 'snake': return text.toLowerCase().replace(/\s+/g, '_');
      case 'kebab': return text.toLowerCase().replace(/\s+/g, '-');
      default: return text;
    }
  };

  const countWords = (text) => {
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    return {
      characters: text.length,
      charactersNoSpaces: text.replace(/\s/g, '').length,
      words: words.length,
      lines: text.split(/\n+/).length,
      paragraphs: text.split(/\n\n+/).length,
    };
  };

  const encodeDecodeBase64 = (text, action) => {
    try {
      if (action === 'encode') {
        return btoa(unescape(encodeURIComponent(text)));
      } else {
        return decodeURIComponent(atob(text));
      }
    } catch {
      return 'Error: Invalid input';
    }
  };

  const generateHash = async (text, algorithm = 'SHA-256') => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const formatJson = (text, action) => {
    try {
      const parsed = JSON.parse(text);
      return action === 'beautify' ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
    } catch {
      return 'Error: Invalid JSON';
    }
  };

  const handleTransform = async () => {
    let result = inputText;

    switch (activeTab) {
      case 'case':
        result = convertCase(inputText, 'upper'); // Default to upper case
        break;
      case 'count':
        const counts = countWords(inputText);
        result = `Characters: ${counts.characters}\nCharacters (no spaces): ${counts.charactersNoSpaces}\nWords: ${counts.words}\nLines: ${counts.lines}\nParagraphs: ${counts.paragraphs}`;
        break;
      case 'base64':
        result = encodeDecodeBase64(inputText, 'encode');
        break;
      case 'hash':
        result = await generateHash(inputText);
        break;
      case 'json':
        result = formatJson(inputText, 'beautify');
        break;
    }

    setOutputText(result);

    // Save to history
    addToolboxHistory({
      toolType: 'text',
      title: `Text Tool: ${activeTab} Transformation`,
      dataPayload: `Input: ${inputText.substring(0, 50)}..., Output: ${result.substring(0, 50)}...`,
    });

    onRefreshHistory();
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(outputText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const downloadOutput = () => {
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `text-tool-output-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearAll = () => {
    setInputText('');
    setOutputText('');
    setIsCopied(false);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-[#C4FAF8] rounded-2xl border-2 border-[#121212] shadow-[4px_4px_0px_#121212]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white border-2 border-[#121212] shadow-[2px_2px_0px_#121212] hover:shadow-[1px_1px_0px_#121212] hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black text-[#121212] uppercase">Text & Dev Tools</h2>
        <div className="w-9" />
      </div>

      {/* Tab Navigation */}
      <div className="flex bg-[#FFE600] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-1 overflow-x-auto">
        {tools.map((tool) => {
          const IconComponent = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveTab(tool.id)}
              className={`flex-1 py-2 px-3 rounded-lg font-black text-xs sm:text-sm transition-all whitespace-nowrap ${activeTab === tool.id ? 'bg-white shadow-[1px_1px_0px_#121212] text-[#121212]' : 'text-[#121212]/70 hover:bg-white/50'}`}
            >
              <IconComponent className="w-3.5 h-3.5 inline mr-1" />
              {tool.label}
            </button>
          );
        })}
      </div>

      {/* Tool Interface */}
      <div className="bg-[#FFFFFF] rounded-xl border-2 border-[#121212] shadow-[2px_2px_0px_#121212] p-4 space-y-4">
        {/* Case Converter */}
        {activeTab === 'case' && (
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Case Converter</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { type: 'upper', label: 'UPPERCASE', example: 'HELLO WORLD' },
                { type: 'lower', label: 'lowercase', example: 'hello world' },
                { type: 'title', label: 'Title Case', example: 'Hello World' },
                { type: 'camel', label: 'camelCase', example: 'helloWorld' },
                { type: 'snake', label: 'snake_case', example: 'hello_world' },
                { type: 'kebab', label: 'kebab-case', example: 'hello-world' },
              ].map(({ type, label, example }) => (
                <button
                  key={type}
                  onClick={() => setInputText(convertCase(inputText, type))}
                  className="py-2 px-3 bg-[#F3F4F6] hover:bg-[#E5E7EB] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-mono text-sm font-black"
                >
                  <div>{label}</div>
                  <div className="text-xs text-gray-600 mt-1">{example}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Counter */}
        {activeTab === 'count' && (
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Word & Character Counter</h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to count..."
              className="w-full p-3 rounded-lg border-2 border-[#121212] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
              rows={4}
            />
            {inputText && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(countWords(inputText)).map(([key, value]) => (
                  <div key={key} className="bg-[#F3F4F6] p-3 rounded-lg border border-[#121212]">
                    <div className="text-xs font-bold text-[#121212] uppercase">{key.replace(/No/, 'No.').replace(/Characters/, 'Chars').replace(/Words/, 'Words').replace(/Lines/, 'Lines').replace(/Paragraphs/, 'Paras')}</div>
                    <div className="text-lg font-mono font-black text-[#38E54D]">{value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Base64 */}
        {activeTab === 'base64' && (
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Base64 Encoder/Decoder</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setInputText(encodeDecodeBase64(inputText, 'encode'))}
                className="py-2 px-4 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-black text-sm"
              >
                Encode →
              </button>
              <button
                onClick={() => setInputText(encodeDecodeBase64(inputText, 'decode'))}
                className="py-2 px-4 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-black text-sm"
              >
                ← Decode
              </button>
            </div>
            <div className="text-xs text-gray-600 font-mono bg-[#F3F4F6] p-2 rounded border border-[#121212]">
              Paste Base64 here to decode, or plain text to encode
            </div>
          </div>
        )}

        {/* Hash */}
        {activeTab === 'hash' && (
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[#121212]">Hash Generator (SHA-256)</h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to hash..."
              className="w-full p-3 rounded-lg border-2 border-[#121212] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
              rows={3}
            />
            <button
              onClick={handleTransform}
              className="w-full py-2 px-4 bg-[#FF70A6] hover:bg-[#FF5A8C] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-black"
            >
              Generate SHA-256 Hash
            </button>
            {outputText && !outputText.startsWith('Error') && (
              <div className="bg-[#F3F4F6] p-3 rounded-lg border border-[#121212]">
                <div className="text-xs font-bold text-[#121212] uppercase mb-2">Hash Result</div>
                <div className="font-mono text-xs break-all text-[#121212]">{outputText}</div>
              </div>
            )}
          </div>
        )}

        {/* JSON */}
        {activeTab === 'json' && (
          <div className="space-y-3">
            <h3 className="text-lg font-black text-[#121212]">JSON Beautifier/Minifier</h3>
            <div className="flex gap-2 mb-2">
              <button
                onClick={() => setInputText(formatJson(inputText, 'beautify'))}
                className="py-1 px-3 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-black text-xs"
              >
                Beautify
              </button>
              <button
                onClick={() => setInputText(formatJson(inputText, 'minify'))}
                className="py-1 px-3 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-black text-xs"
              >
                Minify
              </button>
              <button
                onClick={() => setInputText('')}
                className="py-1 px-3 bg-[#FF70A6] hover:bg-[#FF5A8C] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] font-black text-xs"
              >
                Clear
              </button>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder='Enter JSON here (e.g. {"name": "John", "age": 30})...'
              className="w-full p-3 rounded-lg border-2 border-[#121212] font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FFE600]"
              rows={4}
            />
            {outputText && !outputText.startsWith('Error') && (
              <div>
                <div className="text-xs font-bold text-[#121212] uppercase mb-2">Formatted JSON</div>
                <pre className="bg-[#F3F4F6] p-3 rounded-lg border border-[#121212] font-mono text-xs overflow-auto max-h-40">
                  {outputText}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t-2 border-[#121212]/15">
          <button
            onClick={handleTransform}
            className="flex-1 py-2 px-4 bg-[#FFE600] hover:bg-[#FFD700] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Apply
          </button>
          <button
            onClick={copyToClipboard}
            className="py-2 px-4 bg-[#A076F9] hover:bg-[#8B5CF6] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
          >
            {isCopied ? (
              <Check className="w-4 h-4 inline mr-2" />
            ) : (
              <Copy className="w-4 h-4 inline mr-2" />
            )}
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={downloadOutput}
            className="py-2 px-4 bg-[#38E54D] hover:bg-[#30CC43] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
          >
            <Download className="w-4 h-4 inline mr-2" />
            Download
          </button>
          <button
            onClick={clearAll}
            className="py-2 px-4 bg-[#FF70A6] hover:bg-[#FF5A8C] active:translate-x-0.5 active:translate-y-0.5 transition-all rounded-lg border-2 border-[#121212] shadow-[2px_2px_0px_#121212] font-black"
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
