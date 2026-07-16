import React, { useState, useEffect, useRef } from 'react';
import { Loader } from 'lucide-react';
import Hls from 'hls.js';
import { fetchAPI } from '../../services/api.js';

export default function InlineVideoPlayer({ content, courseId, isEnrolled }) {
  const [loading, setLoading] = useState(true);
  const [streamUrl, setStreamUrl] = useState(null);
  const [error, setError] = useState(null);
  const [savedPosition, setSavedPosition] = useState(0);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const currentPosRef = useRef(0);

  const targetContentId = content?.id;

  useEffect(() => {
    if (!targetContentId) return;
    
    let cancelled = false;
    setLoading(true);
    setStreamUrl(null);
    setError(null);

    const init = async () => {
      try {
        if (!courseId) {
          throw new Error("Initializing content configurations... missing course parameter mappings.");
        }

        const streamData = await fetchAPI(`/content/${targetContentId}/stream?courseId=${courseId}`);

        let initialPos = 0;
        if (isEnrolled) {
          try {
            const progressData = await fetchAPI(`/video/progress/${targetContentId}`);
            if (progressData.hasProgress) initialPos = parseFloat(progressData.position);
          } catch (_) {}
        }

        if (cancelled) return;
        setSavedPosition(initialPos);
        currentPosRef.current = initialPos;

        if (streamData.hlsUrl) {
          const token = localStorage.getItem('token');
          const backendDomain = (import.meta && import.meta.env && import.meta.env.VITE_API_URL)
            ? import.meta.env.VITE_API_URL.replace('/api', '')
            : 'http://localhost:3000';
          setStreamUrl(`${backendDomain}${streamData.hlsUrl}&token=${token}`);
        } else {
          setError(streamData.message || 'Video processing has not completed yet.');
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to initialize system video pipelines.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    init();
    return () => { cancelled = true; };
  }, [targetContentId, courseId, isEnrolled]);

  useEffect(() => {
    if (!streamUrl || !videoRef.current) return;

    const videoEl = videoRef.current;
    const syncTime = () => {
      currentPosRef.current = videoEl.currentTime;
    };
    videoEl.addEventListener('timeupdate', syncTime);

    if (Hls.isSupported()) {
      const hls = new Hls({ maxMaxBufferLength: 30 });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(videoEl);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (savedPosition > 0) videoEl.currentTime = savedPosition;
      });

      return () => {
        videoEl.removeEventListener('timeupdate', syncTime);
        hls.destroy();
      };
    } else if (videoEl.canPlayType('application/vnd.apple.mpegurl')) {
      videoEl.src = streamUrl;
      
      const handleMetadata = () => {
        if (savedPosition > 0) videoEl.currentTime = savedPosition;
      };
      videoEl.addEventListener('loadedmetadata', handleMetadata);
      
      return () => {
        videoEl.removeEventListener('timeupdate', syncTime);
        videoEl.removeEventListener('loadedmetadata', handleMetadata);
      };
    }
  }, [streamUrl, savedPosition]);

  useEffect(() => {
    if (!targetContentId || !courseId || !isEnrolled) return;

    const saveProgress = async (positionToSave) => {
      const pos = Math.round(positionToSave);
      if (pos <= 0) return;
      try {
        await fetchAPI('/video/progress', {
          method: 'POST',
          body: JSON.stringify({ contentId: targetContentId, courseId, position: pos }),
        });
      } catch (_) {}
    };

    const intervalId = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        saveProgress(currentPosRef.current);
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      if (currentPosRef.current > 0) {
        saveProgress(currentPosRef.current);
      }
    };
  }, [targetContentId, courseId, isEnrolled]);

  if (!content || !content.id) return null;

  return (
    <div className="mt-3 bg-black border-[3px] border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_#000]">
      {loading && (
        <div className="flex flex-col items-center justify-center gap-2 text-white font-bold py-16">
          <Loader className="animate-spin text-[#F26B4D]" size={28} strokeWidth={3} />
          Assembling Media Manifests...
        </div>
      )}
      
      {error && !loading && (
        <div className="text-center text-[#F26B4D] font-black uppercase tracking-wide py-16 px-4 bg-zinc-900 border-b-2 border-black">
          ❌ {error}
        </div>
      )}
      
      {!loading && !error && streamUrl && (
        <video
          ref={videoRef}
          controls
          controlsList="nodownload"
          className="w-full max-h-[60vh] bg-black block outline-none"
        />
      )}
    </div>
  );
}