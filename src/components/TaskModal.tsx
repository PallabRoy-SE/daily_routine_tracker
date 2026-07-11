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

// Material Outlined Input Helper
interface MaterialInputProps {
  id: string;
  label: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  min?: string | number;
  autoFocus?: boolean;
}

const MaterialInput = ({
  id,
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  min,
  autoFocus = false,
}: MaterialInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = (value !== undefined && value !== null && value !== '') || type === 'date';

  return (
    <div className="relative w-full mt-2">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        min={min}
        autoFocus={autoFocus}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="peer block w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-transparent rounded-xl border-2 border-gray-205 dark:border-[#2D2D2D] focus:border-[#00E5FF] dark:focus:border-[#00E5FF] outline-none transition-all duration-200"
      />
      <label
        htmlFor={id}
        className={`absolute left-3 transition-all duration-200 pointer-events-none font-bold
          ${isFocused || hasValue
            ? 'top-0 -translate-y-2.5 scale-90 px-1.5 text-xs text-[#00E5FF] bg-white dark:bg-[#1E1E1E]'
            : 'top-3 scale-100 text-sm text-gray-400 dark:text-gray-500'
          }`}
      >
        {label}
      </label>
    </div>
  );
};

// Material Outlined Textarea Helper
interface MaterialTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  required?: boolean;
}

const MaterialTextarea = ({
  id,
  label,
  value,
  onChange,
  required = false,
}: MaterialTextareaProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = value !== undefined && value !== null && value !== '';

  return (
    <div className="relative w-full mt-2">
      <textarea
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="peer block w-full px-4 py-3 text-sm text-gray-900 dark:text-gray-100 bg-transparent rounded-xl border-2 border-gray-205 dark:border-[#2D2D2D] focus:border-[#00E5FF] dark:focus:border-[#00E5FF] outline-none transition-all duration-200 h-24 resize-none"
      />
      <label
        htmlFor={id}
        className={`absolute left-3 transition-all duration-200 pointer-events-none font-bold
          ${isFocused || hasValue
            ? 'top-0 -translate-y-2.5 scale-90 px-1.5 text-xs text-[#00E5FF] bg-white dark:bg-[#1E1E1E]'
            : 'top-3 scale-100 text-sm text-gray-400 dark:text-gray-500'
          }`}
      >
        {label}
      </label>
    </div>
  );
};

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
        <motion.div
          key="task-modal-wrapper"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4"
        >
          {/* Overlay */}
          <motion.div
            key="task-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            key="task-modal-container"
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#1E1E1E] w-full max-w-lg md:max-w-xl mx-2 md:mx-0 rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh] relative z-10 border border-gray-155 dark:border-[#2D2D2D]/60"
          >
            <header className="px-4 py-3 md:px-6 md:py-4.5 border-b border-gray-100 dark:border-[#2D2D2D]/60 flex items-center justify-between bg-white dark:bg-[#1E1E1E]">
              <h2 className="text-lg md:text-xl font-black text-gray-900 dark:text-white tracking-tight">
                {initialData ? 'Edit Mission' : 'Launch New Mission'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-[#121212] rounded-full text-gray-400 dark:text-gray-550 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
              {/* Mission Title Input */}
              <MaterialInput
                id="title"
                label="Mission Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />

              {/* Briefing (Description) Textarea */}
              <MaterialTextarea
                id="description"
                label="Briefing (Description)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {/* Priority Radio Buttons */}
              <div className="pt-1">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-555 mb-2.5 uppercase tracking-wider">Priority Level</label>
                <div className="flex gap-2 md:gap-3">
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
                      <div className={`text-center py-2.5 md:py-3 rounded-xl border-2 transition-all font-black text-xs uppercase tracking-widest ${
                        p === 3 ? 'border-rose-100 dark:border-rose-950/20 bg-rose-50/50 dark:bg-rose-950/10 text-rose-500 peer-checked:bg-rose-500 peer-checked:border-rose-500 dark:peer-checked:bg-rose-600 dark:peer-checked:border-rose-600 peer-checked:text-white' :
                        p === 2 ? 'border-amber-100 dark:border-amber-950/20 bg-amber-50/50 dark:bg-amber-950/10 text-amber-500 peer-checked:bg-amber-500 peer-checked:border-amber-500 dark:peer-checked:bg-amber-600 dark:peer-checked:border-amber-600 peer-checked:text-white' :
                        'border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-500 peer-checked:bg-emerald-500 peer-checked:border-emerald-500 dark:peer-checked:bg-emerald-600 dark:peer-checked:border-emerald-600 peer-checked:text-white'
                      }`}>
                        {p === 3 ? 'High' : p === 2 ? 'Med' : 'Low'}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Schedule Date Input */}
              <div className="pt-1">
                <label className="block text-[10px] font-black text-gray-400 dark:text-gray-555 mb-2.5 uppercase tracking-wider">Schedule Mission</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setScheduledDate(getTodayStr())}
                    className={`flex-1 py-2 md:py-2.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
                      scheduledDate === getTodayStr()
                        ? 'border-[#00E5FF] bg-cyan-50/10 text-[#00E5FF]'
                        : 'border-gray-150 dark:border-[#2D2D2D] bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#121212]'
                    }`}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setScheduledDate(getTomorrowStr())}
                    className={`flex-1 py-2 md:py-2.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
                      scheduledDate === getTomorrowStr()
                        ? 'border-[#00E5FF] bg-cyan-50/10 text-[#00E5FF]'
                        : 'border-gray-150 dark:border-[#2D2D2D] bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#121212]'
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
                    className={`flex-1 py-2 md:py-2.5 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
                      scheduledDate !== getTodayStr() && scheduledDate !== getTomorrowStr()
                        ? 'border-[#00E5FF] bg-cyan-50/10 text-[#00E5FF]'
                        : 'border-gray-150 dark:border-[#2D2D2D] bg-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#121212]'
                    }`}
                  >
                    Pick Date
                  </button>
                </div>

                {(scheduledDate !== getTodayStr() && scheduledDate !== getTomorrowStr() || !scheduledDate) && (
                  <MaterialInput
                    id="scheduledDate"
                    label="Target Date"
                    type="date"
                    value={scheduledDate}
                    min={getTodayStr()}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                )}
              </div>

              {/* Time Limit Input */}
              <div className="pt-1">
                <MaterialInput
                  id="timeLimit"
                  label="Time Limit (Minutes - Optional)"
                  type="number"
                  min="1"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value)))}
                />
                <p className="mt-1 text-[10px] text-gray-405 dark:text-gray-550 font-bold uppercase tracking-tight">
                  If no limit is set, the mission can take as much time as needed.
                </p>
              </div>

              {/* Asset Links Inputs */}
              <div className="pt-1">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-[10px] font-black text-gray-400 dark:text-gray-555 uppercase tracking-wider">Support Assets (Links)</label>
                  <button
                    type="button"
                    onClick={addLink}
                    className="text-xs flex items-center gap-1.5 bg-blue-55 dark:bg-blue-950/30 text-blue-600 dark:text-[#00E5FF] px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors border border-blue-100/50 dark:border-blue-900/30 cursor-pointer"
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
                      className="p-3 md:p-4 bg-gray-50/50 dark:bg-[#121212] rounded-2xl border-2 border-gray-150 dark:border-[#2D2D2D] space-y-3 md:space-y-4 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Asset #{idx + 1}</span>
                        <button
                          type="button"
                          onClick={() => removeLink(idx)}
                          className="text-gray-400 hover:text-red-555 p-1 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                        <MaterialInput
                          id={`link-label-${idx}`}
                          label="Label (e.g. Wiki)"
                          value={link.label}
                          onChange={(e) => updateLink(idx, 'label', e.target.value)}
                        />
                        <MaterialInput
                          id={`link-url-${idx}`}
                          label="URL (https://...)"
                          value={link.url}
                          onChange={(e) => updateLink(idx, 'url', e.target.value)}
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Action Type:</label>
                        <select
                          value={link.action}
                          onChange={(e) => updateLink(idx, 'action', e.target.value as any)}
                          className="px-2 py-0.5 text-xs border border-gray-255 dark:border-[#2D2D2D] rounded-lg outline-none text-gray-800 dark:text-gray-250 bg-white dark:bg-[#1E1E1E] focus:border-[#00E5FF] dark:focus:border-[#00E5FF] font-bold"
                        >
                          <option value="new_tab">Open in New Tab</option>
                          <option value="download">Download File</option>
                        </select>
                      </div>
                    </motion.div>
                  ))}
                  {links.length === 0 && (
                    <div className="text-center py-5 border-2 border-dashed border-gray-200 dark:border-[#2D2D2D]/60 rounded-2xl">
                      <p className="text-xs text-gray-400 dark:text-gray-550 font-bold uppercase tracking-wide">No support assets linked.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex gap-3 sticky bottom-0 bg-white dark:bg-[#1E1E1E] pb-2 mt-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 px-4 rounded-2xl border border-gray-205 dark:border-[#2D2D2D] font-bold text-gray-555 dark:text-gray-450 hover:bg-gray-50 dark:hover:bg-[#121212] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-3 px-4 rounded-2xl bg-blue-600 text-white font-extrabold text-xs uppercase tracking-widest hover:bg-blue-700 shadow-md shadow-blue-200/50 dark:shadow-none transition-all active:scale-95 cursor-pointer"
                >
                  {initialData ? 'Commit Changes' : 'Launch Mission'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default TaskModal;
