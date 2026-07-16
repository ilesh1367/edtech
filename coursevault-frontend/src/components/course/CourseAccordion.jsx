import React, { useState, useEffect } from 'react';
import { Video, FileText, HelpCircle, Plus, Edit, Trash2, FilePlus } from 'lucide-react';
import { formatSize } from '../../utils/format';
import { fetchAPI } from '../../services/api.js';
import InlineVideoPlayer from './InlineVideoPlayer.jsx';
import QuizModal from '../educator/QuizModal.jsx';
import QuizTakeModal from './QuizTakeModal.jsx';

const TABS = [
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
  const videos = contents.filter((c) => c.content_type === 'video');
  const pdfs = contents.filter((c) => c.content_type !== 'video');

  const [activeTab, setActiveTab] = useState('video');
  const [expandedVideoId, setExpandedVideoId] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [quizzesLoaded, setQuizzesLoaded] = useState(false);
  const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
  const [takingQuizId, setTakingQuizId] = useState(null);

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

  useEffect(() => {
    if (isOpen && activeTab === 'quiz' && !quizzesLoaded) loadQuizzes();
  }, [isOpen, activeTab, quizzesLoaded]);

  const handleDeleteContent = async (e, contentId) => {
    e.stopPropagation(); 
    if (!window.confirm('Are you sure you want to delete this content item?')) return;
    try {
      await fetchAPI(`/content/${contentId}`, { method: 'DELETE' });
      if (onRefreshCurriculum) {
        onRefreshCurriculum();
      } else {
        window.location.reload();
      }
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
            <div className="flex gap-2 px-6 pt-4">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 border-2 border-black rounded-lg font-bold text-sm shadow-[2px_2px_0px_0px_#111] transition-all ${
                    activeTab === key ? 'bg-[#F26B4D] text-white' : 'bg-white hover:bg-gray-100'
                  }`}
                >
                  <Icon size={14} strokeWidth={3} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-6">
              {/* VIDEOS TAB */}
              {activeTab === 'video' && (
                videos.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 italic">No videos in this module.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {videos.map((content) => (
                      <div key={content.id} className="border-b border-gray-200 last:border-0 pb-3">
                        <div
                          className="flex justify-between items-center cursor-pointer"
                          onClick={() => setExpandedVideoId((prev) => (prev === content.id ? null : content.id))}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-[#87CEFA]">
                              <Video size={18} />
                            </div>
                            <h4 className="font-bold text-lg">{content.title}</h4>
                          </div>
                          <div className="flex items-center gap-3">
                            {content.preview && <span className="bg-[#F26B4D] text-black text-[10px] font-black px-2 py-0.5 border-2 border-black rounded uppercase">Preview</span>}
                            <button className="bg-white border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111]">
                              {expandedVideoId === content.id ? 'Close' : 'Watch'}
                            </button>
                            {isCreator && (
                              <button
                                title="Delete Video"
                                onClick={(e) => handleDeleteContent(e, content.id)}
                                className="w-9 h-9 flex items-center justify-center bg-red-400 border-2 border-black rounded-md hover:scale-105 transition-transform"
                              >
                                <Trash2 size={14} strokeWidth={3} />
                              </button>
                            )}
                          </div>
                        </div>
                        {expandedVideoId === content.id && (
                          <InlineVideoPlayer content={content} courseId={courseId} isEnrolled={isEnrolled} />
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* PDFS TAB */}
              {activeTab === 'pdf' && (
                pdfs.length === 0 ? (
                  <p className="text-sm text-gray-500 py-4 italic">No PDFs in this module.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {pdfs.map((content) => (
                      <div key={content.id} className="flex justify-between items-center border-b border-gray-200 last:border-0 pb-3">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full border-2 border-black flex items-center justify-center bg-[#F9E076]">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg leading-none mb-1">{content.title}</h4>
                            <p className="text-sm font-medium text-gray-500">PDF • {formatSize(content.file_size_bytes)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {content.preview && <span className="bg-[#F26B4D] text-black text-[10px] font-black px-2 py-0.5 border-2 border-black rounded uppercase">Preview</span>}
                          <button
                            onClick={() => onContentClick(content)}
                            className="bg-white border-2 border-black rounded-lg px-4 py-2 font-bold text-sm shadow-[2px_2px_0px_0px_#111] hover:bg-[#A7E2D1] transition-all"
                          >
                            Read
                          </button>
                          {isCreator && (
                            <button
                              title="Delete PDF"
                              onClick={(e) => handleDeleteContent(e, content.id)}
                              className="w-9 h-9 flex items-center justify-center bg-red-400 border-2 border-black rounded-md hover:scale-105 transition-transform"
                            >
                              <Trash2 size={14} strokeWidth={3} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
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