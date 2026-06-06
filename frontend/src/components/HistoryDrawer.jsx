import React, { useState } from 'react';
import { X, Calendar, FileText, Download, ChevronDown, ChevronUp, History } from 'lucide-react';

function HistoryDrawer({ isOpen, onClose, historyList, onRefresh }) {
  const [expandedJdId, setExpandedJdId] = useState(null);

  const toggleJd = (id) => {
    if (expandedJdId === id) {
      setExpandedJdId(null);
    } else {
      setExpandedJdId(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 text-slate-800">
          
          {/* Header */}
          <div className="p-6 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center space-x-2">
              <History className="w-5 h-5 text-accent-500" />
              <h2 className="text-lg font-bold text-slate-800">Application History</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Refresh control status */}
          <div className="px-6 py-3 border-b border-slate-200/80 flex justify-between items-center text-xs bg-slate-50/50 text-slate-500 font-bold">
            <span>Showing {historyList.length} application{historyList.length !== 1 ? 's' : ''}</span>
            <button 
              onClick={onRefresh}
              className="text-accent-500 hover:text-accent-600 font-extrabold hover:underline"
            >
              Refresh Logs
            </button>
          </div>

          {/* List contents */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {historyList.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                <div className="p-3 bg-slate-50 text-slate-400 rounded-full border border-slate-200">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="max-w-xs space-y-1">
                  <h4 className="font-bold text-slate-800 text-sm">No history records</h4>
                  <p className="text-xs text-slate-500 font-semibold">
                    Once you generate resumes and cover letters, they will be logged here for easy access.
                  </p>
                </div>
              </div>
            ) : (
              historyList.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 bg-cyan-50/15 rounded-xl border border-cyan-100/80 shadow-sm space-y-3 hover:border-accent-400 transition-colors"
                >
                  {/* Company and Date */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{item.company_name}</h4>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1 font-bold">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Redownload controls */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold pt-1">
                    <a
                      href={`http://localhost:8000/download/${item.resume_filename}`}
                      download
                      className="flex items-center justify-center space-x-1 py-2 px-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-accent-600 border border-slate-200 hover:border-accent-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Resume</span>
                    </a>
                    <a
                      href={`http://localhost:8000/download/${item.coverletter_filename}`}
                      download
                      className="flex items-center justify-center space-x-1 py-2 px-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-accent-600 border border-slate-200 hover:border-accent-300 rounded-lg transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Cover Letter</span>
                    </a>
                  </div>

                  {/* Collapsible JD */}
                  {item.jd && (
                    <div className="border-t border-slate-200/60 pt-2.5">
                      <button
                        onClick={() => toggleJd(item.id)}
                        className="flex items-center justify-between w-full text-left text-xs font-bold text-slate-500 hover:text-primary-600 focus:outline-none"
                      >
                        <span>View Past JD</span>
                        {expandedJdId === item.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      
                      {expandedJdId === item.id && (
                        <div className="mt-2 text-xs text-slate-600 bg-white border border-slate-200 p-2.5 rounded-lg max-h-40 overflow-y-auto font-medium whitespace-pre-wrap select-all">
                          {item.jd}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default HistoryDrawer;
