import { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, Cpu, Command, Box, FileText } from 'lucide-react';

export function Terminal({ logs }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin custom-scrollbar">
      {logs.map((log) => {
        const isJarvis = log.sender === 'J.A.R.V.I.S';
        const isSystem = log.sender === 'SYS';
        const isUser = log.sender === 'USR';
        const isCommand = log.sender === 'CMD';
        const isOutput = log.sender === 'OUT';

        let icon = <TerminalIcon className="w-3 h-3" />;
        let bubbleClass = "bg-slate-900/40 border-slate-800 text-slate-300";
        let senderClass = "text-slate-500";

        if (isJarvis) {
          icon = <Cpu className="w-3 h-3" />;
          bubbleClass = "bg-accent-500/5 border-accent-500/20 text-accent-100";
          senderClass = "text-accent-400";
        } else if (isSystem) {
          icon = <Box className="w-3 h-3" />;
          bubbleClass = log.type === 'error' ? "bg-red-500/5 border-red-500/20 text-red-200" : "bg-accent-900/10 border-accent-900/20 text-slate-400 opacity-80";
          senderClass = log.type === 'error' ? "text-red-400" : "text-accent-700";
        } else if (isUser) {
          icon = <FileText className="w-3 h-3" />;
          bubbleClass = "bg-slate-800/40 border-slate-700 text-accent-300";
          senderClass = "text-accent-500";
        } else if (isCommand) {
          icon = <Command className="w-3 h-3" />;
          bubbleClass = "bg-purple-500/5 border-purple-500/20 text-purple-200 font-mono italic";
          senderClass = "text-purple-400";
        } else if (isOutput) {
          icon = <Box className="w-3 h-3" />;
          bubbleClass = "bg-blue-500/5 border-blue-500/20 text-blue-200 font-mono text-[10px]";
          senderClass = "text-blue-400";
        }

        return (
          <div key={log.id} className="group animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`flex items-center gap-2 mb-1 px-1 ${senderClass} font-mono text-[10px] uppercase tracking-widest`}>
              {icon}
              <span>{log.sender}</span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto text-[8px]">{log.timestamp}</span>
            </div>
            <div className={`p-3 rounded-lg border backdrop-blur-sm ${bubbleClass} shadow-lg transition-all hover:bg-opacity-20`}>
              <p className="break-words whitespace-pre-wrap leading-relaxed">
                {isOutput || isCommand ? (
                  <code className="block overflow-x-auto py-1">{log.text}</code>
                ) : log.text}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
