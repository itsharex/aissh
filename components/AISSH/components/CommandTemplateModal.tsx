import React, { useState } from 'react';
import { X, Save, Trash2, Command, FileText, Search } from 'lucide-react';
import { CyberPanel } from '../common/CyberPanel';
import { CommandTemplate } from '../types';
import { useSSHStore } from '../store/useSSHStore';

interface CommandTemplateModalProps {
  onClose: () => void;
  onSelect: (command: string) => void;
  initialCommand?: string;
}

export const CommandTemplateModal: React.FC<CommandTemplateModalProps> = ({ onClose, onSelect, initialCommand }) => {
  const { commandTemplates, addCommandTemplate, updateCommandTemplate, deleteCommandTemplate } = useSSHStore();
  const [isAdding, setIsAdding] = useState(!!initialCommand);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState<Omit<CommandTemplate, 'id'>>({
    name: '',
    command: initialCommand || '',
    description: '',
    tags: []
  });

  const filteredTemplates = commandTemplates.filter(template => 
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSave = () => {
    if (!formData.name || !formData.command) return;
    
    if (editingId) {
      updateCommandTemplate(editingId, formData);
      setEditingId(null);
    } else {
      addCommandTemplate(formData);
    }
    setIsAdding(false);
    setFormData({ name: '', command: '', description: '', tags: [] });
  };

  const handleEdit = (template: CommandTemplate) => {
    setEditingId(template.id);
    setFormData({
      name: template.name,
      command: template.command,
      description: template.description || '',
      tags: template.tags || []
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定要删除这个模板吗？')) {
      deleteCommandTemplate(id);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <CyberPanel variant="obsidian" className="w-[600px] max-h-[80vh] flex flex-col border border-sci-cyan/30 shadow-[0_0_50px_rgba(0,243,255,0.1)] relative overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-sci-cyan/5">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-sci-cyan/20 rounded-sm">
              <Command size={18} className="text-sci-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-sci-cyan">命令模板库</h3>
              <p className="text-[10px] text-sci-dim uppercase font-bold tracking-tighter">Command Template Library</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 transition-colors text-sci-dim hover:text-sci-text">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {isAdding ? (
            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-sci-cyan uppercase tracking-widest ml-1">模板名称</label>
                <input 
                  type="text"
                  value={formData.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例如: 检查磁盘空间"
                  className="w-full bg-black/40 border border-white/10 px-4 py-2.5 text-xs focus:outline-none focus:border-sci-cyan/50 text-sci-text"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-sci-cyan uppercase tracking-widest ml-1">命令内容</label>
                <textarea 
                  value={formData.command}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, command: e.target.value }))}
                  placeholder="输入要保存的 Linux 命令..."
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 px-4 py-2.5 text-xs font-mono focus:outline-none focus:border-sci-cyan/50 text-sci-text resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-sci-cyan uppercase tracking-widest ml-1">描述 (可选)</label>
                <input 
                  type="text"
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="简单说明模板用途..."
                  className="w-full bg-black/40 border border-white/10 px-4 py-2.5 text-xs focus:outline-none focus:border-sci-cyan/50 text-sci-text"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={handleSave}
                  className="flex-1 py-2.5 bg-sci-cyan/10 border border-sci-cyan/50 text-sci-cyan text-xs font-bold uppercase tracking-widest hover:bg-sci-cyan hover:text-black transition-all flex items-center justify-center gap-2"
                >
                  <Save size={14} />
                  保存模板
                </button>
                <button 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingId(null);
                  }}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-sci-dim text-xs font-bold uppercase tracking-widest hover:bg-white/10 hover:text-sci-text transition-all"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-sci-dim uppercase tracking-widest">
                    {searchQuery ? `搜索结果: ${filteredTemplates.length} / ${commandTemplates.length}` : `共 ${commandTemplates.length} 个模板`}
                  </span>
                  <button 
                    onClick={() => setIsAdding(true)}
                    className="px-3 py-1.5 bg-sci-cyan/10 border border-sci-cyan/30 text-sci-cyan text-[10px] font-bold uppercase tracking-widest hover:bg-sci-cyan hover:text-black transition-all"
                  >
                    + 新建模板
                  </button>
                </div>
                
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sci-dim group-focus-within:text-sci-cyan transition-colors" />
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索模板名称、命令或描述..."
                    className="w-full bg-black/40 border border-white/10 pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-sci-cyan/50 text-sci-text transition-all"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sci-dim hover:text-sci-text"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-sci-dim border border-dashed border-white/10">
                  <FileText size={40} className="mb-3 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">
                    {searchQuery ? '未找到匹配的模板' : '暂无命令模板'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredTemplates.map(template => (
                    <div 
                      key={template.id}
                      className="group p-3 bg-white/5 border border-white/10 hover:border-sci-cyan/30 transition-all relative overflow-hidden"
                    >
                      <div className="absolute right-0 top-0 h-full w-1 bg-sci-cyan transform translate-x-full group-hover:translate-x-0 transition-transform"></div>
                      
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 cursor-pointer" onClick={() => onSelect(template.command)}>
                          <h4 className="text-xs font-bold text-sci-cyan group-hover:text-sci-text transition-colors">{template.name}</h4>
                          <p className="text-[10px] text-sci-dim mt-0.5 line-clamp-1">{template.description || '无描述'}</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEdit(template)}
                            className="p-1.5 hover:bg-sci-cyan/20 text-sci-dim hover:text-sci-cyan transition-colors"
                          >
                            <FileText size={14} />
                          </button>
                          <button 
                            onClick={() => handleDelete(template.id)}
                            className="p-1.5 hover:bg-sci-red/20 text-sci-dim hover:text-sci-red transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                        <div className="flex-1 font-mono text-[10px] text-sci-dim bg-black/40 px-2 py-1 truncate">
                          $ {template.command}
                        </div>
                        <button 
                          onClick={() => onSelect(template.command)}
                          className="px-2 py-1 bg-sci-cyan/10 text-sci-cyan text-[9px] font-bold uppercase tracking-tighter hover:bg-sci-cyan hover:text-black transition-all"
                        >
                          调用
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CyberPanel>
    </div>
  );
};
