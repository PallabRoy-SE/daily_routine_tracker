import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2 } from 'lucide-react';

const getTodayStr = () => {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const offset = d.getTimezoneOffset();
  const localDate = new Date(d.getTime() - (offset * 60 * 1000));
  return localDate.toISOString().split('T')[0];
};

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
  const [timeLimit, setTimeLimit] = useState<number | ''>('');
  const [links, setLinks] = useState<TaskLink[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setTitle(initialData.title || '');
        setDescription(initialData.description || '');
        setPriority(initialData.priority || 1);
        setTimeLimit(initialData.time_limit !== undefined && initialData.time_limit !== null ? initialData.time_limit : '');
        setLinks(initialData.links || []);
        setScheduledDate(initialData.scheduled_date || getTodayStr());
      } else {
        setTitle('');
        setDescription('');
        setPriority(1);
        setTimeLimit('');
        setLinks([]);
        setScheduledDate(getTodayStr());
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
    const finalDate = scheduledDate || getTodayStr();
    if (finalDate < getTodayStr()) {
      alert('Cannot schedule a mission for a past date.');
      return;
    }
    onSubmit({
      title,
      description,
      priority: Number(priority),
      time_limit: timeLimit === '' ? null : Number(timeLimit),
      links,
      scheduled_date: finalDate,
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
            className="bg-white dark:bg-gray-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative z-10"
          >
            <header className="px-6 py-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {initialData ? 'Edit Mission' : 'New Mission'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-400 dark:text-gray-500 transition-colors"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Mission Title</label>
                <input
                  required
                  autoFocus
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900"
                  placeholder="What is your objective?"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Briefing (Description)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all h-32 text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 resize-none"
                  placeholder="Provide more context for this mission..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Priority Level</label>
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
                        p === 3 ? 'border-rose-100 dark:border-rose-950/20 bg-rose-50 dark:bg-rose-950/10 text-rose-400 peer-checked:bg-rose-500 peer-checked:border-rose-500 dark:peer-checked:bg-rose-600 dark:peer-checked:border-rose-600 peer-checked:text-white' :
                        p === 2 ? 'border-amber-100 dark:border-amber-950/20 bg-amber-50 dark:bg-amber-950/10 text-amber-400 peer-checked:bg-amber-500 peer-checked:border-amber-500 dark:peer-checked:bg-amber-600 dark:peer-checked:border-amber-600 peer-checked:text-white' :
                        'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50 dark:bg-emerald-950/10 text-emerald-400 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-600 dark:peer-checked:border-emerald-600 peer-checked:text-white'
                      }`}>
                        {p === 3 ? 'High' : p === 2 ? 'Med' : 'Low'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Schedule Mission</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setScheduledDate(getTodayStr())}
                    className={`flex-1 py-2.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
                      scheduledDate === getTodayStr()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledDate(getTomorrowStr())}
                    className={`flex-1 py-2.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
                      scheduledDate === getTomorrowStr()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (scheduledDate === getTodayStr() || scheduledDate === getTomorrowStr()) {
                        setScheduledDate('');
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
                      scheduledDate !== getTodayStr() && scheduledDate !== getTomorrowStr()
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                        : 'border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    Pick Date
                  </button>
                </div>

                {(scheduledDate !== getTodayStr() && scheduledDate !== getTomorrowStr() || !scheduledDate) && (
                  <input
                    type="date"
                    value={scheduledDate}
                    min={getTodayStr()}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">Time Limit (Minutes - Optional)</label>
                <input
                  type="number"
                  min="1"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value)))}
                  className="w-full px-4 py-3 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-blue-500 dark:focus:border-blue-500 outline-none transition-all text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900"
                  placeholder="e.g., 30, 60. Leave empty for no limit"
                />
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">If no limit is set, the mission can take as much time as needed.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Support Assets (Links)</label>
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-xs flex items-center gap-1.5 bg-blue-55 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
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
                      className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-2 border-gray-100 dark:border-gray-700 space-y-3"
                    >
                      <div className="flex gap-2">
                        <input
                          placeholder="Link Label (e.g. Documentation)"
                          value={link.label}
                          onChange={(e) => updateLink(idx, 'label', e.target.value)}
                          className="flex-1 px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-blue-300 dark:focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 p-2 rounded-xl transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          placeholder="URL (https://...)"
                          value={link.url}
                          onChange={(e) => updateLink(idx, 'url', e.target.value)}
                          className="flex-[2] px-3 py-2 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-blue-300 dark:focus:border-blue-500"
                        />
                        <select
                          value={link.action}
                          onChange={(e) => updateLink(idx, 'action', e.target.value as any)}
                          className="flex-1 px-2 py-2 text-sm border-2 border-gray-200 dark:border-gray-700 rounded-xl outline-none text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 focus:border-blue-300 dark:focus:border-blue-500 font-bold"
                        >
                          <option value="new_tab">Tab</option>
                          <option value="download">File</option>
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  {links.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                      <p className="text-sm text-gray-400 dark:text-gray-550 font-medium italic">No support assets linked to this mission.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-gray-800 pb-2 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-4 px-4 rounded-2xl border-2 border-gray-100 dark:border-gray-700 font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-4 px-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95"
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
