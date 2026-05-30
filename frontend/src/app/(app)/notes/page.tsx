'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, Bold, Italic, List, Code, Eye, Edit3, Trash2, Plus, 
  Sparkles, Save, BookOpen, Quote, Heading1, Heading2, CheckSquare 
} from 'lucide-react';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';

interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Editor view states
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  
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
    alert('Note saved successfully.');
  };

  // Simple Markdown Parser regex converter
  const parseMarkdown = (markdownText: string) => {
    let html = markdownText
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-black text-white mt-4 mb-2 tracking-tight border-b border-slate-900 pb-1.5">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-xl font-extrabold text-slate-100 mt-4 mb-2 tracking-tight">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold text-slate-200 mt-3 mb-1 tracking-tight">$1</h3>');

    // Blockquotes
    html = html.replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-purple-500 bg-purple-500/5 px-4 py-2 rounded-r-xl italic text-slate-400 my-4">$1</blockquote>');

    // Code Blocks
    html = html.replace(/\`\`\`([\s\S]*?)\`\`\`/gim, '<pre class="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-purple-300 my-4 overflow-x-auto"><code>$1</code></pre>');
    html = html.replace(/\`([^\`]+)\`/gim, '<code class="bg-slate-900 border border-slate-850 text-indigo-400 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');

    // Checkboxes
    html = html.replace(/^- \[x\] (.*$)/gim, '<div class="flex items-center gap-2 text-xs text-slate-400 my-1"><input type="checkbox" checked disabled class="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0" /> <span class="line-through">$1</span></div>');
    html = html.replace(/^- \[ \] (.*$)/gim, '<div class="flex items-center gap-2 text-xs text-slate-300 my-1"><input type="checkbox" disabled class="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-0" /> <span>$1</span></div>');

    // Lists
    html = html.replace(/^- (.*$)/gim, '<li class="list-disc list-inside text-xs text-slate-300 ml-2 my-1">$1</li>');

    // Bold / Italic
    html = html.replace(/\*\*([^\*]+)\*\*/gim, '<strong class="font-extrabold text-white">$1</strong>');
    html = html.replace(/\*([^\*]+)\*/gim, '<em class="italic text-slate-300">$1</em>');

    // Newlines / Paragraphs
    html = html.split('\n').map(line => {
      if (line.trim().startsWith('<h') || line.trim().startsWith('<li') || line.trim().startsWith('<blockquote') || line.trim().startsWith('<pre') || line.trim().startsWith('<div') || line.trim() === '') {
        return line;
      }
      return `<p class="text-xs leading-relaxed text-slate-300 my-2">${line}</p>`;
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

  return (
    <div className="flex h-[calc(100vh-130px)] md:h-[calc(100vh-100px)] border border-slate-900 rounded-3xl bg-slate-950/20 backdrop-blur-2xl overflow-hidden shadow-2xl">
      
      {/* 1. Left Document Sidebar */}
      <div className="w-64 border-r border-slate-900 bg-slate-950/45 flex flex-col justify-between shrink-0 h-full">
        <div>
          <div className="p-4 border-b border-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <FileText className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white">Documents</span>
            </div>
            
            <button 
              onClick={handleCreateNote}
              className="w-5 h-5 rounded-full hover:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white"
              title="Create note"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Notes list */}
          <div className="p-3 space-y-1 overflow-y-auto max-h-[420px] scrollbar-thin">
            {notes.length === 0 ? (
              <p className="text-[10px] text-slate-600 px-2 italic">No notes created.</p>
            ) : (
              notes.map(note => {
                const isSelected = selectedNote?.id === note.id;
                return (
                  <button
                    key={note.id}
                    onClick={() => selectNote(note)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-tr from-blue-600/10 to-purple-600/10 border border-blue-500/20 text-white' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="text-xs font-bold truncate flex-1 pr-2">{note.title}</span>
                    <button 
                      onClick={(e) => handleDeleteNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-4 border-t border-slate-900 bg-slate-950/20">
          <span className="text-[9px] text-slate-500 uppercase tracking-widest font-black flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Collaborative Spaces
          </span>
        </div>
      </div>

      {/* 2. Right Editor Workspace */}
      <div className="flex-1 flex flex-col justify-between h-full bg-[#070913]/35">
        {selectedNote ? (
          <>
            {/* Header bar */}
            <div className="p-4 border-b border-slate-900 bg-slate-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                placeholder="Document Title"
                className="bg-transparent border-none text-sm font-black text-white focus:outline-none focus:ring-0 max-w-sm"
              />

              <div className="flex items-center gap-2">
                <div className="flex p-1 bg-slate-900/60 rounded-xl border border-slate-850 gap-0.5">
                  <button
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                      activeTab === 'edit' ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Write
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
                      activeTab === 'preview' ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Render
                  </button>
                </div>

                <button 
                  onClick={handleSave}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
              </div>
            </div>

            {/* Note Body viewport */}
            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin">
              {activeTab === 'edit' ? (
                <div className="h-full flex flex-col justify-between">
                  {/* Styling Tool Toolbar */}
                  <div className="flex flex-wrap items-center gap-2 border-b border-slate-950 pb-2 mb-3 text-slate-500">
                    <button onClick={() => handleShortcut('bold')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('italic')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('h1')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="H1 Header"><Heading1 className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('h2')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="H2 Header"><Heading2 className="w-4 h-4" /></button>
                    <span className="w-px h-4 bg-slate-900" />
                    <button onClick={() => handleShortcut('list')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="Bullet List"><List className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('todo')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="Todo Checklist"><CheckSquare className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('quote')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="Blockquote"><Quote className="w-4 h-4" /></button>
                    <button onClick={() => handleShortcut('code')} className="p-1 hover:bg-slate-905 hover:text-white rounded" title="Code Block"><Code className="w-4 h-4" /></button>
                  </div>

                  <textarea
                    id="note-textarea"
                    value={contentInput}
                    onChange={e => setContentInput(e.target.value)}
                    placeholder="Type markdown syntax here..."
                    className="flex-1 w-full bg-transparent border-none text-slate-200 text-xs placeholder:text-slate-650 focus:outline-none focus:ring-0 resize-none font-mono leading-relaxed"
                  />
                </div>
              ) : (
                <div 
                  className="prose prose-invert max-w-none text-xs text-slate-200 select-text leading-relaxed markdown-preview"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(contentInput) }}
                />
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <EmptyState
              icon={FileText}
              title="No document active"
              description="Create a new workspace note or select an existing document from the sidebar list to start writing."
              actionLabel="Create Note"
              onActionClick={handleCreateNote}
            />
          </div>
        )}
      </div>

    </div>
  );
}
