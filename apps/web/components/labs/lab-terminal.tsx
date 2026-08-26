'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Play, Trash2, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { fetchTerminalStatus, executeTerminalCommand, type TerminalStatus } from '../../lib/api/terminal-api';

interface LabTerminalProps {
  labSlug: string;
  sessionId: string;
  token: string;
}

interface TerminalHistoryEntry {
  id: string;
  type: 'command' | 'stdout' | 'stderr' | 'banner' | 'system';
  content: string;
  cwd?: string;
}

export function LabTerminal({ labSlug, sessionId, token }: LabTerminalProps) {
  const [status, setStatus] = useState<TerminalStatus | null>(null);
  const [history, setHistory] = useState<TerminalHistoryEntry[]>([]);
  const [inputCommand, setInputCommand] = useState('');
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [cwd, setCwd] = useState('');

  const terminalEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialisation du terminal
  const initTerminal = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const initialStatus = await fetchTerminalStatus(labSlug, sessionId, token);
      setStatus(initialStatus);
      setIsConnected(true);
      setHistory([
        {
          id: 'banner',
          type: 'banner',
          content: initialStatus.banner,
        },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de se connecter au terminal.');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && token) {
      void initTerminal();
    }
  }, [sessionId, token, labSlug]);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [history]);

  const handleRunCommand = async (commandToRun?: string) => {
    const cmd = (commandToRun !== undefined ? commandToRun : inputCommand).trim();
    if (!cmd || isLoading) return;

    if (cmd === 'clear') {
      setHistory([]);
      setInputCommand('');
      setHistoryIndex(-1);
      return;
    }

    // Ajouter la commande dans l'historique visuel
    const cmdEntry: TerminalHistoryEntry = {
      id: `cmd-${Date.now()}`,
      type: 'command',
      content: cmd,
      cwd,
    };

    setHistory((prev) => [...prev, cmdEntry]);
    setCommandHistory((prev) => [...prev, cmd]);
    setHistoryIndex(-1);
    setInputCommand('');
    setIsLoading(true);

    try {
      const result = await executeTerminalCommand(labSlug, sessionId, cmd, token);
      setCwd(result.cwd);

      const newEntries: TerminalHistoryEntry[] = [];
      if (result.stdout) {
        newEntries.push({
          id: `out-${Date.now()}`,
          type: 'stdout',
          content: result.stdout,
        });
      }
      if (result.stderr) {
        newEntries.push({
          id: `err-${Date.now()}`,
          type: 'stderr',
          content: result.stderr,
        });
      }

      setHistory((prev) => [...prev, ...newEntries]);
    } catch (err: unknown) {
      setHistory((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          type: 'stderr',
          content: err instanceof Error ? err.message : 'Erreur d\'exécution.',
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void handleRunCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInputCommand(commandHistory[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInputCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setInputCommand(commandHistory[nextIndex]);
      }
    }
  };

  const quickCommands = ['help', 'ls -la', 'pwd', 'ip a', 'ip route', 'ping 192.168.1.254', 'systemctl status bind9', 'ss -tuln'];

  return (
    <div
      role="region"
      aria-label="Terminal de lab interactif"
      className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-xl border border-slate-300 dark:border-slate-800 shadow-xl overflow-hidden font-mono text-sm"
    >
      {/* Barre de titre du terminal */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-100 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <Terminal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-300">
            {status?.prompt.split(':')[0] || 'student@opensio-lab'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-500">({cwd ? `~/${cwd}` : '~'})</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="hidden sm:inline">Simulation Sécurisée</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {isConnected ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Connecté
              </span>
            ) : (
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" /> Déconnecté
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setHistory([])}
            title="Effacer le terminal"
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => void initTerminal()}
            title="Réinitialiser la connexion"
            className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Barre de commandes rapides */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-300 dark:border-slate-800/80 overflow-x-auto text-xs">
        <span className="text-slate-500 dark:text-slate-500 shrink-0 mr-1 font-sans font-medium text-[11px]">Raccourcis :</span>
        {quickCommands.map((cmd) => (
          <button
            key={cmd}
            type="button"
            onClick={() => void handleRunCommand(cmd)}
            disabled={isLoading || !isConnected}
            className="px-2 py-0.5 bg-white dark:bg-slate-800/90 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded border border-slate-300 dark:border-slate-700/50 transition-colors whitespace-nowrap disabled:opacity-50 cursor-pointer text-xs"
          >
            {cmd}
          </button>
        ))}
      </div>

      {/* Zone d'affichage des logs (Console Terminal) */}
      <div
        className="flex-1 p-4 bg-slate-950 overflow-y-auto space-y-2 select-text"
        onClick={() => inputRef.current?.focus()}
      >
        {error && (
          <div className="p-3 bg-red-950/50 border border-red-800 rounded text-red-300 text-xs">
            {error}
          </div>
        )}

        {history.map((entry) => {
          if (entry.type === 'banner') {
            return (
              <pre key={entry.id} className="text-emerald-400/90 whitespace-pre-wrap leading-relaxed text-xs">
                {entry.content}
              </pre>
            );
          }
          if (entry.type === 'command') {
            return (
              <div key={entry.id} className="flex items-center gap-2 text-slate-200">
                <span className="text-emerald-400 font-bold select-none">
                  student@opensio-lab:{entry.cwd ? `~/${entry.cwd}` : '~'}$
                </span>
                <span className="text-white font-medium">{entry.content}</span>
              </div>
            );
          }
          if (entry.type === 'stderr') {
            return (
              <pre key={entry.id} className="text-red-400 whitespace-pre-wrap pl-4 border-l-2 border-red-500/50 py-0.5">
                {entry.content}
              </pre>
            );
          }
          return (
            <pre key={entry.id} className="text-slate-300 whitespace-pre-wrap pl-2 leading-relaxed">
              {entry.content}
            </pre>
          );
        })}

        {/* Ligne de prompt active */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-emerald-400 font-bold select-none whitespace-nowrap">
            student@opensio-lab:{cwd ? `~/${cwd}` : '~'}$
          </span>
          <input
            ref={inputRef}
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || !isConnected}
            placeholder={isConnected ? 'Tapez une commande (ex: help, ip a)...' : 'En attente de connexion...'}
            className="flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-600 focus:ring-0 text-sm font-mono"
            autoFocus
          />
          <button
            type="button"
            onClick={() => void handleRunCommand()}
            disabled={!inputCommand.trim() || isLoading || !isConnected}
            className="p-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded transition-colors"
          >
            <Play className="w-3 h-3 fill-current" />
          </button>
        </div>

        <div ref={terminalEndRef} />
      </div>
    </div>
  );
}
