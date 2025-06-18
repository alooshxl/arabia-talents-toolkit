import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Youtube, FileText, Languages, CheckCircle } from 'lucide-react';

const tasks = [
  { id: 1, name: 'Fetching video details...', icon: <Youtube size={18} /> },
  { id: 2, name: 'Scanning for transcripts...', icon: <FileText size={18} /> },
  { id: 3, name: 'Loading transcript data...', icon: <Languages size={18} /> },
  { id: 4, name: 'Summarizing with AI (Arabic)...', icon: <Sparkles size={18} /> },
  { id: 5, name: 'Summarizing with AI (English)...', icon: <Sparkles size={18} /> },
  { id: 6, name: 'Finalizing summary...', icon: <CheckCircle size={18} /> },
];

const SummaryLoader = ({ progress, currentTask }) => {
  const activeTaskIndex = tasks.findIndex(task => task.name === currentTask);

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-card border rounded-lg shadow-lg">
      <div className="text-center mb-4">
        <h2 className="text-xl font-semibold text-primary">Working on Your Summary...</h2>
        <p className="text-sm text-muted-foreground">This may take a few moments.</p>
      </div>

      <div className="space-y-2 mb-4">
        {tasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0.5, x: -20 }}
            animate={{
              opacity: index <= activeTaskIndex ? 1 : 0.5,
              x: index <= activeTaskIndex ? 0 : -10
            }}
            transition={{ duration: 0.3 }}
            className={`flex items-center p-2 rounded-md ${
              index === activeTaskIndex ? 'bg-primary/10 text-primary font-semibold' :
              index < activeTaskIndex ? 'bg-green-500/10 text-green-600' :
              'bg-muted/50'
            }`}
          >
            {index < activeTaskIndex ? <CheckCircle size={18} className="mr-2 text-green-500" /> : React.cloneElement(task.icon, { className: `mr-2 ${index === activeTaskIndex ? 'animate-pulse' : ''}`})}
            <span>{task.name}</span>
          </motion.div>
        ))}
      </div>

      {progress > 0 && (
        <div className="w-full bg-muted rounded-full h-2.5 mb-2">
          <motion.div
            className="bg-primary h-2.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">
        {currentTask || "Initializing..."} ({Math.round(progress)}%)
      </p>
    </div>
  );
};

export default SummaryLoader;
