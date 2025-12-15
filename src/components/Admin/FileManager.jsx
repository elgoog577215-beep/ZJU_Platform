import React, { useState, useEffect, useRef } from 'react';
import { Folder, File, FileCode, ChevronRight, ChevronDown, Save, RotateCcw, FileImage, FileText } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

const FileTreeItem = ({ item, level = 0, onSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e) => {
    e.stopPropagation();
    if (item.type === 'file') {
      onSelect(item);
      return;
    }

    if (!isOpen) {
      setLoading(true);
      try {
        const res = await api.get(`/fs/list`, { params: { path: item.path } });
        setChildren(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    setIsOpen(!isOpen);
  };

  const getIcon = () => {
    if (item.type === 'dir') return isOpen ? <Folder className="text-yellow-400" size={16} /> : <Folder className="text-yellow-400" size={16} fill="currentColor" />;
    if (item.name.endsWith('.js') || item.name.endsWith('.jsx') || item.name.endsWith('.json')) return <FileCode className="text-cyan-400" size={16} />;
    if (item.name.endsWith('.css')) return <FileCode className="text-blue-400" size={16} />;
    if (item.name.endsWith('.md')) return <FileText className="text-gray-400" size={16} />;
    if (item.name.match(/\.(jpg|jpeg|png|gif|svg)$/)) return <FileImage className="text-purple-400" size={16} />;
    return <File className="text-gray-400" size={16} />;
  };

  return (
    <div>
      <div 
        onClick={handleToggle}
        className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-white/5 rounded select-none text-sm
          ${selectedPath === item.path ? 'bg-indigo-500/20 text-indigo-300 font-medium' : 'text-gray-300'}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center text-gray-500">
          {item.type === 'dir' && (
            isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          )}
        </span>
        {getIcon()}
        <span className="truncate">{item.name}</span>
      </div>
      
      {isOpen && (
        <div className="border-l border-white/5 ml-3">
          {children.map((child) => (
            <FileTreeItem 
              key={child.path} 
              item={child} 
              level={level + 1} 
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const FileManager = () => {
  const { t } = useTranslation();
  const [rootFiles, setRootFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/fs/list')
      .then(res => setRootFiles(res.data))
      .catch(err => console.error(err));
  }, []);

  const handleSelectFile = async (file) => {
    if (selectedFile?.path === file.path) return;
    
    // Check for unsaved changes
    if (fileContent !== originalContent) {
      if (!window.confirm(t('admin.file_manager_ui.unsaved_confirm'))) return;
    }

    setSelectedFile(file);
    setLoading(true);
    
    try {
      const res = await api.get(`/fs/content`, { params: { path: file.path } });
      const data = res.data;
      setFileContent(data.content || '');
      setOriginalContent(data.content || '');
    } catch (err) {
      toast.error(t('admin.file_manager_ui.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await api.post('/fs/content', { path: selectedFile.path, content: fileContent });
      setOriginalContent(fileContent);
      toast.success(t('admin.file_manager_ui.save_success'));
    } catch (err) {
      toast.error(t('admin.file_manager_ui.save_fail'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-180px)] bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Sidebar */}
      <div className="w-64 border-r border-white/10 bg-[#111] flex flex-col">
        <div className="p-4 border-b border-white/10 font-bold text-gray-400 text-xs uppercase tracking-wider">
          {t('admin.file_manager_ui.explorer')}
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          {rootFiles.map(item => (
            <FileTreeItem 
              key={item.path} 
              item={item} 
              onSelect={handleSelectFile}
              selectedPath={selectedFile?.path}
            />
          ))}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedFile ? (
          <>
            <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 bg-[#111]">
              <div className="flex items-center gap-2 text-sm text-gray-300 font-mono">
                <FileCode size={16} className="text-indigo-400" />
                {selectedFile.path}
                {fileContent !== originalContent && <span className="w-2 h-2 rounded-full bg-yellow-500" />}
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setFileContent(originalContent)}
                  disabled={fileContent === originalContent}
                  className="p-2 hover:bg-white/10 rounded text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title={t('admin.file_manager_ui.revert')}
                >
                  <RotateCcw size={16} />
                </button>
                <button 
                  onClick={handleSave}
                  disabled={fileContent === originalContent || saving}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded text-xs font-bold transition-all"
                >
                  {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                  {t('admin.file_manager_ui.save')}
                </button>
              </div>
            </div>
            <div className="flex-1 relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : (
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  className="w-full h-full bg-[#0a0a0a] text-gray-300 font-mono text-sm p-4 resize-none focus:outline-none"
                  spellCheck={false}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <FileCode size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('admin.file_manager_ui.select_hint')}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;
