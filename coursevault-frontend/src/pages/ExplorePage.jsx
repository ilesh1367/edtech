import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Microscope } from 'lucide-react';
import CourseCard from '../components/course/CourseCard';
import { fetchAPI } from '../services/api';

export default function ExplorePage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Track which parent course (e.g. "Class 12") is currently clicked
  const [selectedParentId, setSelectedParentId] = useState(null);

  useEffect(() => {
    fetchAPI('/courses')
      .then(data => {
        setCourses(data.courses || []);
        setIsLoading(false);
      })
      .catch(err => {
        console.error("Failed to load courses", err);
        setIsLoading(false);
      });
  }, []);

  // Extracts a numeric class value from a title like "9th Class", "10th Class"
  // Used only as a tie-breaker when two courses share the same display_order.
  const getClassNumber = (title = '') => {
    const match = title.match(/(\d+)\s*(?:st|nd|rd|th)?\s*Class/i);
    return match ? parseInt(match[1], 10) : null;
  };

  // Same ordering rule as the educator dashboard: display_order (the
  // mentor's manually arranged priority) decides the position first, so
  // any reordering the mentor does is reflected here automatically.
  const compareCourses = (a, b) => {
    const orderA = a.display_order ?? 0;
    const orderB = b.display_order ?? 0;
    if (orderA !== orderB) return orderA - orderB;

    const numA = getClassNumber(a.title);
    const numB = getClassNumber(b.title);
    if (numA !== null && numB !== null) return numA - numB;
    if (numA !== null) return -1;
    if (numB !== null) return 1;
    return (a.title || '').localeCompare(b.title || '');
  };

  // 1. Get ONLY the main categories (no parent), sorted by mentor priority
  const topLevelCourses = courses
    .filter(c => !c.parent_course_id)
    .sort(compareCourses);

  // 2. Get ONLY the subjects for the currently selected category, also
  //    sorted by the mentor's priority for that class.
  const childCourses = selectedParentId
    ? courses.filter(c => c.parent_course_id === selectedParentId).sort(compareCourses)
    : [];

  // Find the selected parent object to display its title dynamically
  const selectedParentCourse = courses.find(c => c.id === selectedParentId);

  return (
    <>
      <header className="relative pt-10 pb-20 text-center flex flex-col items-center justify-center">
        <div className="absolute top-0 left-10 text-black animate-float-icon">
            <Bot size={40} strokeWidth={1.5} />
        </div>
        <div className="absolute top-10 right-20 text-black animate-float-icon" style={{ animationDelay: '1s' }}>
            <Microscope size={40} strokeWidth={1.5} />
        </div>

        <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight relative z-10 max-w-4xl">
          Educational content <br /> for curious minds.
        </h1>
      </header>

      <div className="pb-20">
        {isLoading ? (
          <div className="text-center text-gray-500 font-bold py-10">Loading courses...</div>
        ) : courses.length === 0 ? (
          <div className="text-center text-gray-500 font-bold py-10">No courses published yet.</div>
        ) : (
          <>
            {!selectedParentId ? (
              /* =========================================
                 VIEW 1: SHOW PARENT CATEGORIES ONLY
                 ========================================= */
              <>
                <h2 className="text-4xl font-bold tracking-tight mb-8">All Classes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16 items-start animate-in fade-in zoom-in-95 duration-300">
                  {topLevelCourses.map((course, index) => (
                    <CourseCard
                      key={course.id}
                      course={course}
                      index={index}
                      isMyLearning={false}
                      // Set state to drill down into the folder instead of navigating
                      onClick={() => setSelectedParentId(course.id)}
                    />
                  ))}
                </div>
              </>
            ) : (
              /* =========================================
                 VIEW 2: SHOW SUBJECTS INSIDE CATEGORY
                 ========================================= */
              <div className="animate-in slide-in-from-right-8 fade-in duration-300">

                {/* Navigation Header */}
                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                  <button
                    onClick={() => setSelectedParentId(null)}
                    className="flex items-center gap-2 bg-white border-2 border-black rounded-lg px-4 py-2 font-bold hover:bg-[#F9E076] transition-colors shadow-[2px_2px_0px_0px_#111] self-start"
                  >
                    ← Back to All Classes
                  </button>
                  <h2 className="text-3xl font-black">
                    {selectedParentCourse?.title} Subjects
                  </h2>
                </div>

                {/* The Subjects Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-16 items-start">
                  {childCourses.length === 0 ? (
                    <div className="col-span-full bg-white border-2 border-dashed border-black rounded-xl p-12 text-center text-gray-500 font-bold text-lg shadow-[4px_4px_0px_0px_#111]">
                      No subjects published in this class yet.
                    </div>
                  ) : (
                    childCourses.map((child, i) => (
                      <CourseCard
                        key={child.id}
                        course={child}
                        index={i}
                        isMyLearning={false}
                        // Clicking a child actually navigates to the course viewer!
                        onClick={(id) => navigate(`/course/${id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}