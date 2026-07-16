import React, { useState, useEffect } from 'react';
import { Video, FileText, HelpCircle, Plus, Edit, Trash2, FilePlus, Folder, FolderPlus, ChevronRight, ChevronDown } from 'lucide-react';
import { formatSize } from '../../utils/format';
import { fetchAPI } from '../../services/api.js';
import InlineVideoPlayer from './InlineVideoPlayer.jsx';
import QuizModal from '../educator/QuizModal.jsx';
import QuizTakeModal from './QuizTakeModal.jsx';

const TABS = [
  { key: 'folder', label: 'Folders', icon: Folder },
  { key: 'video', label: 'Videos', icon: Video },
  { key: 'pdf', label: 'PDFs', icon: FileText },
  { key: 'quiz', label: 'Quizzes', icon: HelpCircle },
];

export default function CourseAccordion({
  module,
  isOpen,
  onToggle,
  onContentClick,
  isCreator,
  onAddContent,
  onAddPDF,
  onEditModule,
  onDeleteModule,
  courseId,
  isEnrolled,
  onRefreshCurriculum,
}) {
  const contents = module.contents || [];
  
  // Filter for standalone content (not in a folder)
  const standaloneVideos = contents.filter((c) => c.content_type === 'video' && !c.folder_id);
  const standalonePdfs = contents.filter((c) => c.content_type !== 'video' && !c.folder_id);

  const [activeTab, setActiveTab] = useState('folder');
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  
  // Quiz State
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [takingQuizId, setTakingQuizId] = useState(null);

  // Folder State
  const [folders, setFolders] = useState([]);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [expandedFolderId, setExpandedFolderId] = useState(null);
  
  // Bulk Move State
  const [selectedContentIds, setSelectedContentIds] = useState([]);
  const [targetFolderId, setTargetFolderId] = useState('');

  // --- Data Fetching ---
  const loadQuizzes = async () => {
    try {
      const data = await fetchAPI(`/quiz/module/${module.id}`);
      setQuizzes(data.quizzes || []);
    } catch (_) {
      setQuizzes([]);
    } finally {
      setQuizzesLoaded(true);
    }
  };

  const loadFolders = async () => {
    try {
      const data = await fetchAPI(`/content/folders/${module.id}`);
      setFolders(data.folders || []);
    } catch (_) {
      setFolders([]);
    } finally {
      setFoldersLoaded(true);
    }
  };

  useEffect(() => {
    if (isOpen) {
      if (activeTab === 'quiz' && !quizzesLoaded) loadQuizzes();
      if (!foldersLoaded) loadFolders();
    }
  }, [isOpen, activeTab, quizzesLoaded, foldersLoaded]);

  // --- Folder Actions ---
  const handleCreateFolder = async () => {
    const title = window.prompt("Enter folder name:");
    if (!title) return;
    try {
      await fetchAPI('/content/folder', {
        method: 'POST',
        body: JSON.stringify({ module_id: module.id, title })
      });
      loadFolders();
    } catch (err) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleEditFolder = async (e, folderId, currentTitle) => {
    e.stopPropagation();
    const newTitle = window.prompt("Enter new folder name:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      await fetchAPI(`/content/folder/${folderId}`, {
        method: 'PUT',
        body: JSON.stringify({ title: newTitle })
      });
      loadFolders();
    } catch (err) {
      alert(err.message || 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (e, folderId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this folder? Contents will NOT be deleted, they will return to the main tabs.")) return;
    try {
      await fetchAPI(`/content/folder/${folderId}`, { method: 'DELETE' });
      loadFolders();
      if (onRefreshCurriculum) onRefreshCurriculum();
    } catch (err) {
      alert(err.message || 'Failed to delete folder');
    }
  };

  const toggleContentSelection = (id) => {
    setSelectedContentIds(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const handleBulkMove = async () => {
    if (selectedContentIds.length === 0 || !targetFolderId) return;
    try {
      await fetchAPI(`/content/bulk-move`, {
        method: 'PUT',
        body: JSON.stringify({
          content_ids: selectedContentIds,
          folder_id: targetFolderId === 'none' ? null : targetFolderId
        })
      });
      setSelectedContentIds([]);
      setTargetFolderId('');
      if (onRefreshCurriculum) onRefreshCurriculum();
      else window.location.reload();
    } catch (err) {
      alert(err.message || 'Failed to move items');
    }
  };

  // --- Content Actions ---
  const handleDeleteContent = async (e, contentId) => {
    e.stopPropagation(); 
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      await fetchAPI(`/content/${contentId}`, { method: 'DELETE' });
      if (onRefreshCurriculum) onRefreshCurriculum();
      else window.location.reload();
    } catch (err) {
      alert(err.message || 'Failed to delete content');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Delete this quiz?')) return;
    try {
      await fetchAPI(`/quiz/${quizId}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      alert(err.message || 'Failed to delete quiz');
    }
  };

  // --- Render Helpers ---
  const renderContentItem = (content) => {
    const isVideo = content.content_type === 'video';
    const isSelected = selectedContentIds.includes(content.id);

    return (
      <div key={content.id} className={`border-b border-gray-200 last:border-0 pb-3 mb-3 ${isSelected ? 'bg-blue-50/50 rounded-lg p-2' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            {isCreator && (
              <input 
                type="checkbox" 
                className="w-5 h-5 border-2 border-black rounded cursor-pointer accent-[#F26B4D]"
                checked={isSelected}
                onChange={() => toggleContentSelection(content.id)}
              />
            )}
            <div className={`w-10 h-10 rounded-full border-2 border-black flex items-center justify-center ${isVideo ? 'bg-[#87CEFA]' : 'bg-[#F9E076]'}`}>
              {isVideo ? <Video size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h4 className="font-bold text-lg leading-none mb-1">{content.title}</h4>
              {!isVideo && <p className="text-sm font-medium text-gray-500">PDF • {formatSize(content.file_size_bytes)}</p>}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {content.preview && <span className="bg-[#F26B4D] text-black text-[10px] font-black px-2 py-0.5 border-2 border-black rounded uppercase">Preview</span>}
            
            {isVideo ? (
              <button 
                onClick={() => setExpandedVideoId(prev => prev === content.id ? null : content.id)}
                className="bg-white border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111] hover:bg-gray-50"
              >
                {expandedVideoId === content.id ? 'Close' : 'Watch'}
              </button>
            ) : (
              <button
                onClick={() => onContentClick(content)}
                className="bg-white border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111] hover:bg-[#A7E2D1] transition-all"
              >
                Read
              </button>
            )}

            {isCreator && (
              <button
                title="Delete Asset"
                onClick={(e) => handleDeleteContent(e, content.id)}
                className="w-9 h-9 flex items-center justify-center bg-red-400 border-2 border-black rounded-md hover:scale-105 transition-transform"
              >
                <Trash2 size={14} strokeWidth={3} />
              </button>
            )}
          </div>
        </div>
        {isVideo && expandedVideoId === content.id && (
          <div className="mt-4">
            <InlineVideoPlayer content={content} courseId={courseId} isEnrolled={isEnrolled} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_#111]">
      <div
        className="p-6 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <h3 className="font-bold text-xl flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#F4DFD8] border-2 border-black flex items-center justify-center text-sm">
            {isOpen ? '-' : '+'}
          </div>
          {module.title}
        </h3>

        <div className="flex items-center gap-3">
          {isCreator && (
            <div className="flex gap-2">
              <button title="Add Video" onClick={(e) => { e.stopPropagation(); onAddContent(module.id); }} className="w-8 h-8 flex items-center justify-center bg-[#87CEFA] border-2 border-black rounded-md hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_#000]">
                <Video size={14} strokeWidth={3} />
              </button>
              <button title="Add PDF" onClick={(e) => { e.stopPropagation(); onAddPDF(module.id); }} className="w-8 h-8 flex items-center justify-center bg-[#A7E2D1] border-2 border-black rounded-md hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_#000]">
                <FilePlus size={14} strokeWidth={3} />
              </button>
              <button title="Edit Module" onClick={(e) => { e.stopPropagation(); onEditModule(module); }} className="w-8 h-8 flex items-center justify-center bg-[#F9E076] border-2 border-black rounded-md hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_#000]">
                <Edit size={14} strokeWidth={3} />
              </button>
              <button title="Delete Module" onClick={(e) => { e.stopPropagation(); onDeleteModule(module.id); }} className="w-8 h-8 flex items-center justify-center bg-red-400 border-2 border-black rounded-md hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_#000]">
                <Trash2 size={14} strokeWidth={3} />
              </button>
            </div>
          )}
          <span className="font-bold text-gray-500 text-sm ml-2">{contents.length} Items</span>
        </div>
      </div>

      <div className={`module-content ${isOpen ? 'open' : ''}`}>
        <div className="module-inner">
          <div className="border-t-2 border-black bg-gray-50">
            
            {/* Tab bar */}
            <div className="flex gap-2 px-6 pt-4 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_#111] transition-all whitespace-nowrap ${
                    activeTab === key ? 'bg-[#F26B4D] text-white' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <Icon size={14} strokeWidth={3} />
                  {label}
                </button>
              ))}
            </div>

            {/* Bulk Action Bar */}
            {selectedContentIds.length > 0 && isCreator && activeTab !== 'quiz' && (
              <div className="bg-[#A7E2D1] border-2 border-black p-3 rounded-lg flex items-center justify-between shadow-[2px_2px_0px_0px_#111] mx-6 mt-6 animate-in fade-in zoom-in duration-200">
                <span className="font-bold">{selectedContentIds.length} items selected</span>
                <div className="flex gap-2">
                  <select 
                    className="border-2 border-black rounded-lg px-3 py-1.5 font-bold bg-white text-sm outline-none focus:ring-2 focus:ring-[#F26B4D]"
                    value={targetFolderId}
                    onChange={(e) => setTargetFolderId(e.target.value)}
                  >
                    <option value="" disabled>Select destination...</option>
                    <option value="none">Remove from Folder (Main Tab)</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{f.title}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleBulkMove}
                    className="bg-[#F9E076] border-2 border-black rounded-lg px-4 py-1.5 font-bold text-sm hover:scale-105 transition-transform"
                  >
                    Move Here
                  </button>
                </div>
              </div>
            )}

            <div className="p-6">
              
              {/* FOLDERS TAB */}
              {activeTab === 'folder' && (
                <div className="flex flex-col gap-4">
                  {isCreator && (
                    <button
                      onClick={handleCreateFolder}
                      className="self-start flex items-center gap-2 bg-[#F9E076] border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111] hover:scale-[1.02] transition-transform mb-2"
                    >
                      <FolderPlus size={16} strokeWidth={3} /> Create Folder
                    </button>
                  )}
                  
                  {!foldersLoaded ? (
                    <p className="text-sm text-gray-500 italic">Loading folders...</p>
                  ) : folders.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No folders created in this module.</p>
                  ) : (
                    folders.map((folder) => {
                      const folderContents = contents.filter(c => c.folder_id === folder.id);
                      const isExpanded = expandedFolderId === folder.id;
                      return (
                        <div key={folder.id} className="border-2 border-black rounded-xl bg-white overflow-hidden shadow-[2px_2px_0px_0px_#111]">
                          <div 
                            className="bg-[#F4F4F4] p-4 flex justify-between items-center cursor-pointer hover:bg-gray-200 transition-colors"
                            onClick={() => setExpandedFolderId(isExpanded ? null : folder.id)}
                          >
                            <div className="flex items-center gap-3">
                              {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                              <Folder size={20} className="text-[#F26B4D] fill-current" />
                              <h4 className="font-bold text-lg">{folder.title}</h4>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold bg-white border-2 border-black px-2 py-1 rounded-md">
                                {folderContents.length} Items
                              </span>
                              {isCreator && (
                                <div className="flex gap-2">
                                  <button 
                                    onClick={(e) => handleEditFolder(e, folder.id, folder.title)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded-md hover:bg-[#F9E076] transition-colors"
                                  >
                                    <Edit size={14} strokeWidth={3} />
                                  </button>
                                  <button 
                                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-black rounded-md hover:bg-red-400 transition-colors"
                                  >
                                    <Trash2 size={14} strokeWidth={3} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-4 bg-white border-t-2 border-black flex flex-col gap-2">
                              {folderContents.length === 0 ? (
                                <p className="text-sm text-gray-500 italic p-2">Folder is empty. Select items from Videos/PDFs to move them here.</p>
                              ) : (
                                folderContents.map(renderContentItem)
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* VIDEOS TAB */}
              {activeTab === 'video' && (
                standaloneVideos.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 italic">No standalone videos. Check your folders!</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {standaloneVideos.map(renderContentItem)}
                  </div>
                )
              )}

              {/* PDFS TAB */}
              {activeTab === 'pdf' && (
                standalonePdfs.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 italic">No standalone PDFs. Check your folders!</p>
                ) : (
                  <div className="flex flex-col gap-1">
                    {standalonePdfs.map(renderContentItem)}
                  </div>
                )
              )}

              {/* QUIZZES TAB */}
              {activeTab === 'quiz' && (
                <div className="flex flex-col gap-3">
                  {isCreator && (
                    <button
                      onClick={() => setIsQuizModalOpen(true)}
                      className="self-start flex items-center gap-2 bg-[#F9E076] border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111] hover:scale-[1.02] transition-transform"
                    >
                      <Plus size={14} strokeWidth={3} /> Create Quiz
                    </button>
                  )}

                  {!quizzesLoaded ? (
                    <p className="text-sm text-gray-500 py-4 italic">Loading quizzes...</p>
                  ) : quizzes.length === 0 ? (
                    <p className="text-sm text-gray-500 py-4 italic">No quizzes in this module yet.</p>
                  ) : (
                    quizzes.map((quiz) => (
                      <div key={quiz.id} className="flex justify-between items-center border-b border-gray-200 last:border-0 pb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-[#F4DFD8]">
                            <HelpCircle size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg leading-none mb-1">{quiz.title}</h4>
                            <p className="text-sm font-medium text-gray-500">{quiz.question_count} question{quiz.question_count === 1 ? '' : 's'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => setTakingQuizId(quiz.id)}
                            className="bg-white border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111] hover:bg-[#A7E2D1] transition-all"
                          >
                            Take Quiz
                          </button>
                          {isCreator && (
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="w-9 h-9 flex items-center justify-center bg-red-400 border-2 border-black rounded-md hover:scale-105 transition-transform"
                            >
                              <Trash2 size={14} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuizModal
        isOpen={isQuizModalOpen}
        onClose={() => setIsQuizModalOpen(false)}
        moduleId={module.id}
        onSave={() => { setQuizzesLoaded(false); loadQuizzes(); }}
      />
      {takingQuizId && (
        <QuizTakeModal quizId={takingQuizId} onClose={() => setTakingQuizId(null)} />
      )}
    </div>
  );
}