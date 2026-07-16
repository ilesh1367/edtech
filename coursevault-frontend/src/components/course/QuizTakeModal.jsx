import React, { useState, useEffect } from 'react';
import { X, Loader } from 'lucide-react';
import { fetchAPI } from '../../services/api.js';

export default function QuizTakeModal({ quizId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!quizId) return;
    setLoading(true);
    setResult(null);
    setAnswers({});
    fetchAPI(`/quiz/${quizId}`)
      .then((data) => {
        setQuiz(data.quiz);
        setQuestions(data.questions);
      })
      .catch((err) => setError(err.message || 'Failed to load quiz'))
      .finally(() => setLoading(false));
  }, [quizId]);

  if (!quizId) return null;

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetchAPI(`/quiz/${quizId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers }),
      });
      setResult(res);
    } catch (err) {
      alert(err.message || 'Failed to submit quiz');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-xl bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[8px_8px_0px_0px_#111] max-h-[90vh]">
        <div className="flex justify-between items-center p-5 border-b-[3px] border-black bg-[#F9E076]">
          <h3 className="font-black text-xl uppercase line-clamp-1">{quiz?.title || 'Quiz'}</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 border-2 border-black bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            <X size={18} strokeWidth={3} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-5">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 font-bold text-gray-500">
              <Loader className="animate-spin text-[#F26B4D]" size={28} strokeWidth={3} />
              Loading quiz...
            </div>
          )}

          {error && !loading && <p className="text-red-500 font-bold text-center py-8">{error}</p>}

          {!loading && !error && result && (
            <div className="text-center py-8">
              <p className="text-5xl font-black mb-2">{result.score}%</p>
              <p className="font-bold text-gray-600">
                {result.correct} / {result.total} correct
              </p>
            </div>
          )}

          {!loading && !error && !result && questions.map((q, idx) => (
            <div key={q.id} className="border-2 border-black rounded-xl p-4">
              <p className="font-bold mb-3">{idx + 1}. {q.question_text}</p>
              <div className="flex flex-col gap-2">
                {q.options.map((opt, oIndex) => (
                  <label key={oIndex} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === oIndex}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: oIndex }))}
                    />
                    <span className="font-medium">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {!loading && !error && !result && questions.length > 0 && (
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              className="bg-[#A7E2D1] border-[3px] border-black rounded-xl py-3 font-black shadow-[4px_4px_0px_0px_#111] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#111] transition-all disabled:opacity-40"
            >
              {submitting ? 'Submitting...' : 'Submit Answers'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}