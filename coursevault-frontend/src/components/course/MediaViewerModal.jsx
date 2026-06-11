import React, { useState, useEffect, useRef } from 'react';
import { X, Loader } from 'lucide-react';
import { fetchAPI } from '../../services/api.js';

export default function MediaViewerModal({ content, courseId, isEnrolled, onClose }) {
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [savedPosition, setSavedPosition] = useState(0);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!content) return;
    setLoading(true);
    setStreamUrl(null);
    setPdfUrl(null);
    setError(null);

    const initMedia = async () => {
      try {
        if (content.content_type === 'video') {
          const streamData = await fetchAPI(`/content/${content.id}/stream`);
          if (streamData.hlsUrl) {
            const token = localStorage.getItem('token');
            setStreamUrl(`${window.location.origin}${streamData.hlsUrl}&token=${token}`);
          }
          if (courseId && isEnrolled) {
            try {
              const progressData = await fetchAPI(`/video/progress/${content.id}`);
              if (progressData.hasProgress) {
                setSavedPosition(parseFloat(progressData.position));
              }
            } catch (_) {}
          }
        } else if (content.content_type === 'pdf') {
          const token = localStorage.getItem('token');
          setPdfUrl(`${import.meta.env.VITE_API_URL}/content/${content.id}/pdf?token=${token}`);
        }
      } catch (err) {
        console.error('Failed to load media', err);
        if (err.message?.includes('not enrolled') || err.message?.includes('Access denied')) {
          setError('You need to enroll in this course to access this content.');
        } else {
          setError(err.message || 'Failed to load content');
        }
      } finally {
        setLoading(false);
      }
    };

    initMedia();
  }, [content, courseId, isEnrolled]);

  const saveProgressToDB = async (trigger = 'Interval') => {
    if (!content || content.content_type !== 'video') return;
    if (!courseId || !isEnrolled || !videoRef.current) return;
    const currentPos = Math.round(videoRef.current.currentTime);
    if (currentPos <= 0) return;

    try {
      await fetchAPI('/video/progress', {
        method: 'POST',
        body: JSON.stringify({ contentId: content.id, courseId, position: currentPos }),
      });
    } catch (err) {
      console.error(`Save failed [${trigger}]:`, err.message);
    }
  };

  useEffect(() => {
    if (!content || content.content_type !== 'video' || !courseId || !isEnrolled) return;

    const intervalId = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) saveProgressToDB('Interval');
    }, 5000);

    return () => {
      clearInterval(intervalId);
      saveProgressToDB('Modal Close');
    };
  }, [content, courseId, isEnrolled]);

  const handleLoadedMetadata = () => {
    if (videoRef.current && savedPosition > 0) {
      videoRef.current.currentTime = savedPosition;
    }
  };

  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#FDF1E9]/90 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-white border-[3px] border-black rounded-[24px] shadow-[8px_8px_0px_0px_#111] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b-[3px] border-black bg-[#A7E2D1]">
          <h3 className="font-black text-xl tracking-tight uppercase line-clamp-1">
            {content.title}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 border-[3px] border-black bg-[#F26B4D] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[2px_2px_0px_0px_#111]"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>
        <div className="flex-1 bg-[#F4F4F4] relative overflow-hidden flex items-center justify-center min-h-[60vh]">
          {loading && (
            <div className="flex flex-col items-center justify-center font-bold text-gray-500 gap-3">
              <Loader className="animate-spin text-[#F26B4D]" size={40} strokeWidth={3} />
              Loading Media...
            </div>
          )}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center font-bold text-red-500 gap-3 p-8 text-center">
              <p>Failed to load content.</p>
              <p className="text-sm font-normal text-gray-500">{error}</p>
            </div>
          )}
          {!loading && !error && content.content_type === 'video' && streamUrl && (
            <video
              ref={videoRef}
              controls
              autoPlay
              className="w-full h-full max-h-[75vh] object-contain bg-black"
              onLoadedMetadata={handleLoadedMetadata}
            >
              <source src={streamUrl} type="application/vnd.apple.mpegurl" />
              Your browser does not support HTML video playback.
            </video>
          )}
          {!loading && !error && content.content_type === 'pdf' && pdfUrl && (
            <iframe
              src={pdfUrl}
              title={content.title}
              className="w-full bg-white"
              style={{ height: '75vh', border: 'none' }}
            />
          )}
        </div>
      </div>
    </div>
  );
}