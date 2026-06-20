import React, { useState, useEffect, useRef } from 'react';
import { X, Loader } from 'lucide-react';
import { fetchAPI } from '../../services/api.js';
import Hls from 'hls.js';

export default function MediaViewerModal({ content, courseId, isEnrolled, onClose }) {
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [error, setError] = useState(null);
  const [savedPosition, setSavedPosition] = useState(0);
  
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // 1. MAIN MEDIA FETCH HOOK
  useEffect(() => {
    if (!content) return;
    setLoading(true);
    setStreamUrl(null);
    setPdfUrl(null);
    setError(null);

    const initMedia = async () => {
      try {
        // FIX: Ensure robust string checking
        const type = content.content_type?.toLowerCase() || '';

        if (type.includes('video')) {
          const streamData = await fetchAPI(`/content/${content.id}/stream?courseId=${courseId || ''}`);
          
          let initialPos = 0;
          if (courseId && isEnrolled) {
            try {
              const progressData = await fetchAPI(`/video/progress/${content.id}`);
              if (progressData.hasProgress) {
                initialPos = parseFloat(progressData.position);
                setSavedPosition(initialPos);
              }
            } catch (_) {}
          }

          if (streamData.hlsUrl) {
            const token = localStorage.getItem('token');
            const backendDomain = import.meta.env.VITE_API_URL 
              ? import.meta.env.VITE_API_URL.replace('/api', '') 
              : 'http://localhost:3000';
            
            setStreamUrl(`${backendDomain}${streamData.hlsUrl}&token=${token}`);
          }

        // FIX: Broaden the catch net for PDFs and Documents
        } else if (type.includes('pdf') || type.includes('document')) {
          const token = localStorage.getItem('token');
          const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

          const response = await fetch(`${baseUrl}/content/${content.id}/pdf?courseId=${courseId || ''}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || 'Failed to fetch PDF');
          }

          const rawBlob = await response.blob();
          
          // Debugging Trap
          console.log("📥 DOWNLOADED PDF DATA:");
          console.log("Size:", rawBlob.size, "bytes");
          console.log("Type:", rawBlob.type);

          const pdfBlob = new Blob([rawBlob], { type: 'application/pdf' });
          const objectUrl = URL.createObjectURL(pdfBlob);
          setPdfUrl(objectUrl);
        } else {
          // FIX: Prevent silent failures. If the type is completely unknown, yell at us!
          throw new Error(`Unknown content type received from database: "${content.content_type}"`);
        }
      } catch (err) {
        console.error('Failed to load media:', err);
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    initMedia();
  }, [content, courseId, isEnrolled]);

  // 2. THE HLS.JS STREAMING HOOK
  useEffect(() => {
    const type = content?.content_type?.toLowerCase() || '';
    if (!streamUrl || !videoRef.current || !type.includes('video')) return;

    if (Hls.isSupported()) {
      const hls = new Hls({ maxMaxBufferLength: 30 });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (savedPosition > 0) videoRef.current.currentTime = savedPosition;
        videoRef.current.play().catch(e => console.log("Auto-play blocked:", e));
      });

      return () => {
        hls.destroy();
      };
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      videoRef.current.src = streamUrl;
      videoRef.current.addEventListener('loadedmetadata', () => {
        if (savedPosition > 0) videoRef.current.currentTime = savedPosition;
        videoRef.current.play().catch(e => console.log("Auto-play blocked:", e));
      });
    }
  }, [streamUrl, savedPosition, content]);

  // 3. VIDEO PROGRESS HOOK
  const saveProgressToDB = async (trigger = 'Interval') => {
    const type = content?.content_type?.toLowerCase() || '';
    if (!content || !type.includes('video')) return;
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
    const type = content?.content_type?.toLowerCase() || '';
    if (!content || !type.includes('video') || !courseId || !isEnrolled) return;

    const intervalId = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) saveProgressToDB('Interval');
    }, 5000);

    return () => {
      clearInterval(intervalId);
      saveProgressToDB('Modal Close');
    };
  }, [content, courseId, isEnrolled]);

  // 4. PDF MEMORY CLEANUP HOOK
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  if (!content) return null;
  
  const type = content.content_type?.toLowerCase() || '';
  const isVideo = type.includes('video');
  const isPdf = type.includes('pdf') || type.includes('document');

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
          
          {!loading && !error && isVideo && streamUrl && (
            <video
              ref={videoRef}
              controls
              className="w-full h-full max-h-[75vh] object-contain bg-black"
            />
          )}
          
          {!loading && !error && isPdf && pdfUrl && (
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