'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Bold, Italic, List, Code, Eye, Edit3, Trash2, Plus, 
  Sparkles, Save, BookOpen, Quote, Heading1, Heading2, CheckSquare,
  Folder, FolderOpen, Check
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  updatedAt: string;
}

const FOLDERS = ['All', 'Work', 'Personal', 'Archive', 'Templates'];

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedFolder, setSelectedFolder] = useState('All');
  
  // Editor view states
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [savedToast, setSavedToast] = useState(false);
  
  // Load notes on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('cs_notes');
    if (savedNotes) {
      const parsed = JSON.parse(savedNotes);
      setNotes(parsed);
      if (parsed.length > 0) {
        selectNote(parsed[0]);
      }
    } else {
      setNotes([]);
      localStorage.setItem('cs_notes', JSON.stringify([]));
    }
  }, []);

  const selectNote = (note: Note) => {
    setSelectedNote(note);
    setTitleInput(note.title);
    setContentInput(note.content);
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: `note-${Date.now()}`,
      title: 'Untitled Document',
      content: '# Untitled Note\n\nType here...',
      folder: selectedFolder === 'All' ? 'Work' : selectedFolder,
      updatedAt: new Date().toISOString()
    };
    
    const updated = [newNote, ...notes];
    setNotes(updated);
    selectNote(newNote);
    localStorage.setItem('cs_notes', JSON.stringify(updated));
  };

  const handleDeleteNote = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = notes.filter(n => n.id !== id);
    setNotes(filtered);
    localStorage.setItem('cs_notes', JSON.stringify(filtered));
    
    if (selectedNote?.id === id) {
      if (filtered.length > 0) {
        selectNote(filtered[0]);
      } else {
        setSelectedNote(null);
        setTitleInput('');
        setContentInput('');
      }
    }
  };

  const handleSave = () => {
    if (!selectedNote) return;

    const updatedNotes = notes.map(n => {
      if (n.id === selectedNote.id) {
        return {
          ...n,
          title: titleInput,
          content: contentInput,
          updatedAt: new Date().toISOString()
        };
      }
      return n;
    });

    setNotes(updatedNotes);
    localStorage.setItem('cs_notes', JSON.stringify(updatedNotes));
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleMoveNoteFolder = (noteId: string, folderName: string) => {
    const updatedNotes = notes.map(n => {
      if (n.id === noteId) {
        return { ...n, folder: folderName };
      }
      return n;
    });
    setNotes(updatedNotes);
    localStorage.setItem('cs_notes', JSON.stringify(updatedNotes));
    if (selectedNote?.id === noteId) {
      setSelectedNote(prev => prev ? { ...prev, folder: folderName } : null);
    }
  };

  // Simple Markdown Parser regex converter
  const parseMarkdown = (markdownText: string) => {
    let html = markdownText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-slate-800 mt-4 mb-2 tracking-tight border-b border-slate-100 pb-1.5">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-extrabold text-slate-800 mt-4 mb-2 tracking-tight">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-700 mt-3 mb-1 tracking-tight">$1</h3>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-indigo-650 bg-indigo-50/50 px-4 py-2 rounded-r-xl italic text-slate-650 my-4">$1</blockquote>');

    // Code Blocks
    html = html.replace(/\`\`\`([\s\S]*?)\`\`\`/gim, '<pre class="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-indigo-650 my-4 overflow-x-auto"><code>$1</code></pre>');
    html = html.replace(/\`([^\`]+)\`/gim, '<code class="bg-slate-105 border border-slate-200/60 text-indigo-650 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');

    // Checkboxes
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 text-xs text-slate-400 my-1"><input type="checkbox" checked disabled class="rounded border-slate-200 bg-slate-50 text-indigo-600 focus:ring-0" /> <span class="line-through">$1</span></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 text-xs text-slate-650 my-1"><input type="checkbox" disabled class="rounded border-slate-200 bg-slate-50 text-indigo-600 focus:ring-0" /> <span>$1</span></div>');

    // Lists
    html = html.replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-xs text-slate-600 ml-2 my-1">$1</li>');

    // Bold / Italic
    html = html.replace(/\*\*([^\*]+)\*\*/gim, '<strong class="font-extrabold text-slate-900">$1</strong>');
    html = html.replace(/\*([^\*]+)\*/gim, '<em class="italic text-slate-600">$1</em>');

    // Newlines / Paragraphs
    html = html.split('\n').map(line => {
      if (line.trim().startsWith('<h') || line.trim().startsWith('<li') || line.trim().startsWith('<blockquote') || line.trim().startsWith('<pre') || line.trim().startsWith('<div') || line.trim() === '') {
        return line;
      }
      return `<p class="text-xs leading-relaxed text-slate-600 my-2">${line}</p>`;
    }).join('\n');

    return html;
  };

  const handleShortcut = (type: 'bold' | 'italic' | 'h1' | 'h2' | 'list' | 'code' | 'quote' | 'todo') => {
    const textarea = document.getElementById('note-textarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selected = text.substring(start, end);
    
    let replacement = '';
    switch (type) {
      case 'bold':
        replacement = `**${selected || 'bold text'}**`;
        break;
      case 'italic':
        replacement = `*${selected || 'italic text'}*`;
        break;
      case 'h1':
        replacement = `\n# ${selected || 'Header 1'}`;
        break;
      case 'h2':
        replacement = `\n## ${selected || 'Header 2'}`;
        break;
      case 'list':
        replacement = `\n- ${selected || 'List item'}`;
        break;
      case 'code':
        replacement = `\`\`\`javascript\n${selected || '// code here'}\n\`\`\``;
        break;
      case 'quote':
        replacement = `\n> ${selected || 'Blockquote'}`;
        break;
      case 'todo':
        replacement = `\n- [ ] ${selected || 'Todo item'}`;
        break;
    }

    setContentInput(text.substring(0, start) + replacement + text.substring(end));
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + replacement.length, start + replacement.length);
    }, 50);
  };

  const filteredNotes = notes.filter(n => {
    if (selectedFolder === 'All') return true;
    return n.folder === selectedFolder;
  });

  return (
    <div className="flex h-full bg-[#F8FAFC]">
      
      {/* 1. Left Document Sidebar */}
      <div className="w-64 border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 h-full">
        <div>
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
                <FileText className="w-4.5 h-4.5 text-indigo-650" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-slate-800">Notebooks</span>
            </div>
            
            <button 
              onClick={handleCreateNote}
              className="w-6 h-6 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-650 transition-colors border border-transparent hover:border-slate-200"
              title="Create note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Folders List */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-100">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1 block">Folders</span>
            <div className="space-y-0.5">
              {FOLDERS.map(folder => {
                const isSelected = selectedFolder === folder;
                const count = folder === 'All' ? notes.length : notes.filter(n => n.folder === folder).length;
                return (
                  <button
                    key={folder}
                    onClick={() => setSelectedFolder(folder)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-all ${
                      isSelected 
                        ? 'bg-indigo-50 text-indigo-650' 
                        : 'text-slate-650 hover:bg-slate-50 hover:text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSelected ? (
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      ) : (
                        <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      )}
                      <span className="truncate">{folder}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-slate-100 text-slate-500 rounded-md px-1.5 py-0.5">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes list */}
          <div className="p-3 space-y-1 overflow-y-auto max-h-[300px] scrollbar-thin">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 mb-1 block">Documents</span>
            {filteredNotes.length === 0 ? (
              <p className="text-[10px] text-slate-400 px-2 italic py-2">No documents in {selectedFolder}.</p>
            ) : (
              filteredNotes.map(note => {
                const isSelected = selectedNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left transition-all cursor-pointer group border ${
                      isSelected 
                        ? 'bg-white border-indigo-150 text-indigo-900 shadow-xs' 
                        : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50 border-transparent'
                    }`}
                  >
                    <span className="text-xs font-bold truncate flex-1 pr-2">{note.title}</span>
                    <button 
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-650 animate-pulse" /> Workspace Notebook
          </span>
        </div>
      </div>

      {/* 2. Right Editor Workspace */}
      <div className="flex-1 flex flex-col justify-between h-full bg-[#F8FAFC] relative">
        {selectedNote ? (
          <>
            {/* Header bar */}
            <div className="p-4 border-b border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs shrink-0">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={e => setTitleInput(e.target.value)}
                  placeholder="Document Title"
                  className="bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none focus:ring-0 max-w-xs focus:bg-slate-50 rounded px-1"
                />
                
                {/* Folder Select Dropdown */}
                <select
                  value={selectedNote.folder}
                  onChange={e => handleMoveNoteFolder(selectedNote.id, e.target.value)}
                  className="text-[10px] font-bold bg-slate-100 border-none rounded-lg text-slate-600 py-1 px-2 focus:ring-0 cursor-pointer"
                >
                  {FOLDERS.filter(f => f !== 'All').map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 gap-0.5">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeTab === 'edit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Write
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Render
                  </button>
                </div>

                <button 
                  onClick={handleSave}
                  className="px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>

            {/* Note Body viewport */}
            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
              {activeTab === 'edit' ? (
                <div className="h-full flex flex-col max-w-4xl mx-auto w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm p-5">
                  {/* Styling Tool Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3 mb-4 text-slate-400">
                    <button onClick={() => handleShortcut('bold')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('italic')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('h1')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="H1 Header"><Heading1 className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('h2')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="H2 Header"><Heading2 className="w-4 h-4" /></button>
                    <span className="w-px h-5 bg-slate-200 mx-1" />
                    <button onClick={() => handleShortcut('list')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="Bullet List"><List className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('todo')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="Todo Checklist"><CheckSquare className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('quote')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="Blockquote"><Quote className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('code')} className="p-1.5 hover:bg-slate-50 hover:text-slate-800 rounded-lg transition-colors" title="Code Block"><Code className="w-4 h-4" /></button>
                  </div>

                  <textarea
                    id="note-textarea"
                    value={contentInput}
                    onChange={e => setContentInput(e.target.value)}
                    placeholder="Type markdown syntax here..."
                    className="flex-1 w-full bg-transparent border-none text-slate-800 text-xs placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-none font-mono leading-relaxed"
                  />
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full bg-white border border-slate-200/80 rounded-2xl shadow-sm p-8 prose prose-slate select-text leading-relaxed markdown-preview">
                  <div dangerouslySetInnerHTML={{ __html: parseMarkdown(contentInput) }} />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center bg-[#F8FAFC]">
            <EmptyState
              icon={FileText}
              title="No document active"
              description="Create a new workspace note or select an existing document from the sidebar list to start writing."
              actionLabel="Create Note"
              onActionClick={handleCreateNote}
            />
          </div>
        )}
        
        {/* Saved Toast Popup */}
        {savedToast && (
          <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-fadeIn z-50">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>Document saved successfully</span>
          </div>
        )}
      </div>

    </div>
  );
}
