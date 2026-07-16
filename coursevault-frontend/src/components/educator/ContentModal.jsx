import React, { useState, useRef, useEffect } from 'react';
import { X, UploadCloud, Check } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { fetchAPI } from '../../services/api.js';

export default function ContentModal({ isOpen, onClose, moduleId, onSave, initialTab }) {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState(false);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setTitle('');
      setDescription('');
      setPreview(false);
      setUploadProgress(0);
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const uploadWithProgress = (url, formData) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = localStorage.getItem('token'); 

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentage = Math.round((e.loaded * 100) / e.total);
          setUploadProgress(percentage);
          if (percentage === 100) {
            setStatusMessage('Server is processing & transcoding video into multi-resolutions...');
          } else {
            setStatusMessage(`Uploading: ${percentage}%`);
          }
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (err) {
            resolve({ success: true });
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            reject(new Error(errorData.error || 'Server upload handler failed.'));
          } catch (e) {
            reject(new Error('Server upload handler failed.'));
          }
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network upload error occurred.')));
      
      const baseAPI = (import.meta && import.meta.env && import.meta.env.VITE_API_URL) || 'http://localhost:3000/api';
      xhr.open('POST', `${baseAPI}${url}`);
      
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert("Please select a file to upload.");
    
    const MAX_MB = initialTab === 'video' ? 500 : 100;
    if (file.size > MAX_MB * 1024 * 1024) {
      return alert(`File too large. Maximum size is ${MAX_MB} MB for ${initialTab} uploads.`);
    }

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage('Initiating upload streams...');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('description', description || '');
    formData.append('content_type', initialTab || 'pdf'); 
    formData.append('preview', String(preview));

    try {
      const endpoint = initialTab === 'video' ? '/content/upload-video' : '/content/upload';
      
      const uploadRes = await uploadWithProgress(endpoint, formData);
      
      if (uploadRes && uploadRes.content) {
         await fetchAPI(`/modules/${moduleId}/content`, { 
            method: 'POST', 
            body: JSON.stringify({ content_id: uploadRes.content.id }) 
         });
         
         if (typeof onSave === 'function') onSave(); 
         if (typeof onClose === 'function') onClose();
      } else {
        throw new Error(uploadRes?.message || "Failed saving references.");
      }
    } catch (err) {
      alert(err.message || "Upload crashed. Check dev tools console.");
      console.error("Upload Error Tracking:", err);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-lg bg-white border-[3px] border-black rounded-2xl flex flex-col shadow-[8px_8px_0px_0px_#111]">
        
        <div className="flex justify-between items-center p-4 border-b-[3px] border-black bg-[#87CEFA]">
          <h3 className="font-black text-xl uppercase tracking-tight">
            Upload {initialTab === 'video' ? 'Video Lecture' : 'PDF Material'}
          </h3>
          <button 
            type="button"
            disabled={isUploading}
            onClick={onClose} 
            className="w-10 h-10 border-2 border-black bg-[#F26B4D] rounded-full flex items-center justify-center font-bold hover:scale-110 transition-transform shadow-[2px_2px_0px_0px_#000] disabled:opacity-50"
          >
            <X size={20} strokeWidth={3} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
          
          <div 
            onClick={() => !isUploading && fileInputRef.current?.click()} 
            className={`border-[3px] border-dashed border-black rounded-xl p-8 flex flex-col items-center bg-[#F4F4F4] transition-colors ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-[#F9E076]/10'}`}
          >
            <UploadCloud size={40} className="mb-2 text-black" />
            <p className="font-bold text-sm text-center line-clamp-1">
              {file ? file.name : `Click to Browse ${(initialTab || '').toUpperCase()}`}
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              disabled={isUploading}
              accept={initialTab === 'pdf' ? '.pdf' : 'video/*'} 
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} 
            />
          </div>

          <div className="flex flex-col gap-3">
            <input 
              type="text"
              required 
              disabled={isUploading}
              placeholder="Content Title (e.g. Introduction to Calculus)" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="w-full bg-[#F4F4F4] border-2 border-black rounded-xl px-4 py-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#F26B4D] transition-all disabled:opacity-60" 
            />
            
            <textarea 
              placeholder="Short Description (Optional)" 
              value={description} 
              disabled={isUploading}
              onChange={e => setDescription(e.target.value)} 
              rows={2}
              className="w-full bg-[#F4F4F4] border-2 border-black rounded-xl px-4 py-3 font-bold outline-none focus:shadow-[4px_4px_0px_0px_#F26B4D] transition-all resize-none disabled:opacity-60" 
            />
          </div>

          <div 
            onClick={() => !isUploading && setPreview(!preview)} 
            className={`border-2 border-black rounded-xl p-4 flex items-center justify-between transition-all ${preview ? 'bg-[#A7E2D1]' : 'bg-gray-50'} ${isUploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div>
              <span className="font-black text-sm block leading-none">FREE PREVIEW?</span>
              <span className="text-[10px] font-bold text-gray-600">Students can watch this without buying.</span>
            </div>
            <div className={`w-8 h-8 border-2 border-black rounded-lg flex items-center justify-center transition-colors ${preview ? 'bg-black text-white' : 'bg-white'}`}>
              {preview && <Check size={18} strokeWidth={4}/>}
            </div>
          </div>

          {isUploading && (
            <div className="border-[3px] border-black bg-[#FFFEE0] rounded-xl p-4 flex flex-col items-center shadow-[4px_4px_0px_0px_#000]">
              <div className="relative w-16 h-16 flex items-center justify-center bg-white border-2 border-black rounded-full">
                <div className="animate-spin absolute inset-1 border-4 border-transparent border-t-[#F26B4D] border-r-black rounded-full"></div>
                <span className="font-black text-xs text-black z-10">{uploadProgress}%</span>
              </div>
              <p className="text-center font-bold text-xs mt-3 text-black tracking-wide uppercase px-2">
                {statusMessage}
              </p>
            </div>
          )}

          <Button 
            type="submit" 
            variant="primary" 
            disabled={isUploading}
            className="py-4 border-[3px]"
          >
            {isUploading ? 'Upload Running...' : 'Confirm & Upload'}
          </Button>
        </form>
      </div>
    </div>
  );
}