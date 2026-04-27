import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

interface TaskLink {
  url: string;
  label: string;
  action: 'new_tab' | 'download';
}

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: any;
  onSubmit: (data: any) => void;
}

const TaskModal = ({ isOpen, onClose, initialData, onSubmit }: TaskModalProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState(1);
  const [links, setLinks] = useState<TaskLink[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setPriority(initialData.priority || 1);
        setLinks(initialData.links || []);
      } else {
        setTitle('');
        setDescription('');
        setPriority(1);
        setLinks([]);
      }
      // Prevent scrolling when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [initialData, isOpen]);

  const addLink = () => {
    setLinks([...links, { label: '', url: '', action: 'new_tab' }]);
  };

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const updateLink = (index: number, field: keyof TaskLink, value: string) => {
    const newLinks = [...links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setLinks(newLinks);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      priority: Number(priority),
      links,
    });
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
          >
            <header className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {initialData ? 'Edit Mission' : 'New Mission'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Mission Title</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all text-gray-900 bg-gray-50"
                  placeholder="What is your objective?"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">Briefing (Description)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all h-32 text-gray-900 bg-gray-50 resize-none"
                  placeholder="Provide more context for this mission..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Priority Level</label>
                <div className="flex gap-3">
                  {[1, 2, 3].map((p) => (
                    <label key={p} className="flex-1 cursor-pointer">
                      <input
                        type="radio"
                        name="priority"
                        value={p}
                        checked={priority === p}
                        onChange={(e) => setPriority(Number(e.target.value))}
                        className="sr-only peer"
                      />
                      <div className={`text-center py-3 rounded-xl border-2 transition-all font-black text-xs uppercase tracking-widest ${
                        p === 3 ? 'border-rose-100 bg-rose-50 text-rose-400 peer-checked:bg-rose-500 peer-checked:border-rose-500 peer-checked:text-white' :
                        p === 2 ? 'border-amber-100 bg-amber-50 text-amber-400 peer-checked:bg-amber-500 peer-checked:border-amber-500 peer-checked:text-white' :
                        'border-emerald-100 bg-emerald-50 text-emerald-400 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 peer-checked:text-white'
                      }`}>
                        {p === 3 ? 'High' : p === 2 ? 'Med' : 'Low'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Support Assets (Links)</label>
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-xs flex items-center gap-1.5 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={14} /> Add Asset
                  </button>
                </div>
                
                <div className="space-y-3">
                  {links.map((link, idx) => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={idx} 
                      className="p-4 bg-gray-50 rounded-2xl border-2 border-gray-100 space-y-3"
                    >
                      <div className="flex gap-2">
                        <input
                          placeholder="Link Label (e.g. Documentation)"
                          value={link.label}
                          onChange={(e) => updateLink(idx, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 rounded-xl outline-none text-gray-900 bg-white focus:border-blue-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          placeholder="URL (https://...)"
                          value={link.url}
                          onChange={(e) => updateLink(idx, 'url', e.target.value)}
                          className="flex-[2] px-3 py-2 text-sm border-2 border-gray-200 rounded-xl outline-none text-gray-900 bg-white focus:border-blue-300"
                        />
                        <select
                          value={link.action}
                          onChange={(e) => updateLink(idx, 'action', e.target.value as any)}
                          className="flex-1 px-2 py-2 text-sm border-2 border-gray-200 rounded-xl outline-none text-gray-900 bg-white focus:border-blue-300 font-bold"
                        >
                          <option value="new_tab">Tab</option>
                          <option value="download">File</option>
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  {links.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl">
                      <p className="text-sm text-gray-400 font-medium italic">No support assets linked to this mission.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white pb-2 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 px-4 rounded-2xl border-2 border-gray-100 font-bold text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 px-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-95"
                >
                  {initialData ? 'Commit Changes' : 'Launch Mission'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default TaskModal;
