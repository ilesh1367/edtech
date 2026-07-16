import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, GraduationCap, ChevronRight, Layers } from 'lucide-react';
import CourseCard from '../components/course/CourseCard.jsx';
import Button from '../components/ui/Button.jsx';
import CourseModal from '../components/educator/CourseModal.jsx';
import { fetchAPI } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function EducatorDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);

  // When null -> the modal creates a brand-new top-level course (same as
  // the "Create New Course" button). When set to a course id -> the modal
  // creates a course linked to that course as its parent (row's "+ Add
  // Course" button).
  const [modalParentId, setModalParentId] = useState(null);

  // Tracks which single top-level course row is currently expanded.
  // null = nothing expanded.
  const [selectedCourseId, setSelectedCourseId] = useState(null);

  const loadMyCourses = () => {
    setIsLoading(true);
    fetchAPI('/courses')
      .then(data => {
        // Show courses created by this user
        const myCourses = (data.courses || []).filter(c => c.educator_id === user?.id || c.isCreator);
        setCourses(myCourses);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Dashboard error", err);
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadMyCourses();
  }, []);

  // Only courses with no parent are shown as their own row on the
  // dashboard. Sub-courses (created via a row's "+ Add Course") stay
  // nested under their parent and are rendered only when that parent
  // is expanded.
  const topLevelCourses = courses.filter(c => !c.parent_course_id);

  // Dynamically looks up every course linked to a given parent id.
  // No hardcoded names/ids — purely relationship-driven.
  const getChildCourses = (parentId) =>
    courses.filter(c => c.parent_course_id === parentId);

  // If the currently selected top-level course disappears (deleted /
  // list refreshed and no longer contains it), clear the selection so we
  // never render a stale/ghost card.
  useEffect(() => {
    if (selectedCourseId && !topLevelCourses.some(c => c.id === selectedCourseId)) {
      setSelectedCourseId(null);
    }
  }, [courses, selectedCourseId]); // eslint-disable-line react-hooks/exhaustive-deps

  const publishedCount = topLevelCourses.filter(c => c.status === 'published').length;

  // Toggle behaviour: clicking "View" on the already-open course closes it,
  // clicking a different course's "View" switches to that one instead.
  const handleToggleView = (courseId) => {
    setSelectedCourseId(prev => (prev === courseId ? null : courseId));
  };

  const openCreateModal = () => {
    setModalParentId(null);
    setIsCourseModalOpen(true);
  };

  const openAddModal = (parentId) => {
    setModalParentId(parentId);
    setIsCourseModalOpen(true);
  };

  const closeModal = () => {
    setIsCourseModalOpen(false);
    setModalParentId(null);
  };

  const selectedCourse = topLevelCourses.find(c => c.id === selectedCourseId) || null;
  const selectedChildCourses = selectedCourse ? getChildCourses(selectedCourse.id) : [];

  // Extracts a numeric class value from a title like "9th Class",
  // "10th Class", "12th Class Physics" etc. Returns null if no
  // class-number pattern is found. Purely pattern-based, no hardcoded
  // course names/IDs.
  const getClassNumber = (title = '') => {
    const match = title.match(/(\d+)\s*(?:st|nd|rd|th)?\s*Class/i);
    return match ? parseInt(match[1], 10) : null;
  };

  // Courses whose title matches "Nth Class..." are sorted numerically
  // (9, 10, 11, 12, ...) and shown first. Every other course keeps
  // appearing after them, in alphabetical order for a stable, predictable
  // list. Fully dynamic — works no matter how many/which courses exist.
  const sortedCourses = [...topLevelCourses].sort((a, b) => {
    const numA = getClassNumber(a.title);
    const numB = getClassNumber(b.title);

    if (numA !== null && numB !== null) return numA - numB;
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return (a.title || '').localeCompare(b.title || '');
  });

  return (
    <div className="pb-20 animate-in fade-in slide-in-from-bottom-5 duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
                <h1 className="text-4xl font-bold tracking-tight mb-1 flex items-center gap-3">
                    <GraduationCap size={40} className="text-[#F26B4D]" /> Educator Console
                </h1>
                <p className="text-gray-600 font-bold">Manage your curriculum and track student engagement.</p>
            </div>
            <Button variant="accent" onClick={openCreateModal} className="py-3 px-8 text-base border-[3px]">
                <Plus size={20} className="mr-2 inline" /> Create New Course
            </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="bg-[#87CEFA] border-[3px] border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_#111]">
                <div className="text-5xl font-black mb-1">{topLevelCourses.length}</div>
                <div className="font-bold text-black uppercase text-sm tracking-widest">Total Courses</div>
            </div>
            <div className="bg-[#F9E076] border-[3px] border-black rounded-2xl p-6 shadow-[8px_8px_0px_0px_#111]">
                <div className="text-5xl font-black mb-1">{publishedCount}</div>
                <div className="font-bold text-black uppercase text-sm tracking-widest">Live Courses</div>
            </div>
        </div>
        
        <h2 className="text-3xl font-bold mb-8 tracking-tight">Your Courses</h2>

        {isLoading ? (
          <div className="text-center font-bold text-gray-400 py-20">Loading Dashboard...</div>
        ) : topLevelCourses.length === 0 ? (
          <div className="bg-white border-[3px] border-black border-dashed rounded-3xl p-16 text-center">
              <p className="text-gray-500 font-bold text-xl mb-6">No courses found in your library.</p>
              <Button variant="primary" onClick={openCreateModal}>Get Started</Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {sortedCourses.map((course) => {
              const isSelected = course.id === selectedCourseId;
              const childCount = getChildCourses(course.id).length;
              return (
                <div key={course.id} className="w-full">
                  {/* Row: name + Add Course + View, dynamically rendered per course */}
                  <div
                    className={`flex items-center justify-between bg-white border-[3px] border-black rounded-2xl px-6 py-4 shadow-[6px_6px_0px_0px_#111] transition-all
                      ${isSelected ? 'ring-2 ring-[#F26B4D]' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-black text-lg truncate">{course.title}</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-1 rounded-full shrink-0">
                        {course.status || 'draft'}
                      </span>
                      {childCount > 0 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-[#A7E2D1] border border-black px-2 py-1 rounded-full shrink-0">
                          <Layers size={10} /> {childCount} added
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <button
                        onClick={() => openAddModal(course.id)}
                        className="flex items-center gap-1 font-bold text-sm border-2 border-black rounded-full px-3 py-1.5 bg-[#F9E076] hover:bg-[#f5d84a] transition-colors shadow-[2px_2px_0px_0px_#111]"
                      >
                        <Plus size={16} strokeWidth={3} /> Add Course
                      </button>
                      <button
                        onClick={() => handleToggleView(course.id)}
                        className="flex items-center gap-1 font-bold underline decoration-2 underline-offset-4 hover:text-[#F26B4D] transition-colors"
                      >
                        {isSelected ? 'Hide' : 'View'}
                        <ChevronRight
                          size={18}
                          className={`transition-transform ${isSelected ? 'rotate-90' : ''}`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Only render the detailed card(s) for the course that's currently selected:
                      the parent's own card plus every course linked to it. */}
                  {isSelected && selectedCourse && (
                    <div className="mt-6 mb-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16 items-start">
                      <CourseCard
                        course={selectedCourse}
                        index={0}
                        isMyLearning={false}
                        onClick={(id) => navigate(`/course/${id}`)}
                      />
                      {selectedChildCourses.map((child, i) => (
                        <CourseCard
                          key={child.id}
                          course={child}
                          index={i + 1}
                          isMyLearning={false}
                          onClick={(id) => navigate(`/course/${id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <CourseModal 
            isOpen={isCourseModalOpen} 
            onClose={closeModal} 
            onSave={loadMyCourses}
            parentCourseId={modalParentId}
        />
    </div>
  );
}