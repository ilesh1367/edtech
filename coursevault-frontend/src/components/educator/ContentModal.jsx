import React, { useState, useEffect } from 'react';
import { X, UploadCloud } from 'lucide-react';
import Button from '../ui/Button.jsx';
import { fetchAPI } from '../../services/api.js';

export default function ContentModal({ isOpen, onClose, moduleId, folderId, onSave, initialTab = 'video' }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDescription('');
      setFile(null);
      setPreview(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isVideo = initialTab === 'video';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file to upload.");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);
      formData.append('preview', preview);
      formData.append('content_type', isVideo ? 'video' : 'pdf');

      if (folderId) {
        formData.append('folder_id', folderId);
      }

      const endpoint = isVideo
        ? `/content/upload-video?moduleId=${moduleId}`
        : `/content/upload?moduleId=${moduleId}`;

      await fetchAPI(endpoint, {
        method: 'POST',
        body: formData,
      });

      onSave();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to upload content');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#F4DFD8] border-[3px] border-black rounded-2xl flex flex-col shadow-[8px_8px_0px_0px_#111]">

        <div className="flex justify-between items-center p-4 border-b-[3px] border-black bg-white rounded-t-xl">
          <h3 className="font-bold text-xl uppercase">Add {isVideo ? 'Video' : 'PDF'}</h3>
          <button onClick={onClose} className="w-8 h-8 border-[3px] border-black bg-[#F26B4D] rounded-full flex items-center justify-center font-bold hover:scale-110 transition-transform">
            <X size={16} strokeWidth={3} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 bg-white rounded-b-xl">
          <div>
            <label className="font-bold text-sm ml-1 mb-1 block">Title</label>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#F4F4F4] border-2 border-black rounded-xl px-4 py-2 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#F26B4D]"
              placeholder="e.g. Chapter 1 Introduction"
            />
          </div>

          <div>
            <label className="font-bold text-sm ml-1 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full bg-[#F4F4F4] border-2 border-black rounded-xl px-4 py-2 font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#F26B4D]"
            />
          </div>

          <div>
            <label className="font-bold text-sm ml-1 mb-1 block">File</label>
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-black border-dashed rounded-xl cursor-pointer bg-[#F4F4F4] hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <UploadCloud className="w-8 h-8 mb-2 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500 font-bold">
                  {file ? file.name : <span className="text-black">Click to select {isVideo ? 'Video' : 'PDF'}</span>}
                </p>
                <p className="text-xs text-gray-500">
                  {isVideo ? 'MP4, WebM (Max 500MB)' : 'PDF only (Max 50MB)'}
                </p>
              </div>
              <input
                type="file"
                className="hidden"
                accept={isVideo ? "video/*" : "application/pdf"}
                onChange={(e) => setFile(e.target.files[0])}
              />
            </label>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              type="checkbox"
              id="preview"
              checked={preview}
              onChange={(e) => setPreview(e.target.checked)}
              className="w-5 h-5 border-2 border-black rounded cursor-pointer accent-[#F26B4D]"
            />
            <label htmlFor="preview" className="font-bold text-sm cursor-pointer select-none">
              Mark as Free Preview
            </label>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border-[3px] border-black rounded-xl font-bold hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <Button
              type="submit"
              variant="primary"
              disabled={isUploading}
              className="py-2"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}