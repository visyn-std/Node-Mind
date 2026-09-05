import React from 'react';
import {
  X,
  Download,
  FileText,
  FileImage,
  File,
  ZoomIn,
  ZoomOut,
  Maximize2,
  HardDrive,
} from 'lucide-react';
import { MindNode } from '../types';

interface FileViewerModalProps {
  node: MindNode | null;
  onClose: () => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({ node, onClose }) => {
  const [zoomLevel, setZoomLevel] = React.useState(1);

  if (!node || (!node.fileData && node.nodeType !== 'file' && node.nodeType !== 'folder')) {
    return null;
  }

  const fileData = node.fileData;
  const isImage = fileData?.isImage || (fileData?.type && fileData.type.startsWith('image/'));
  const isFolder = node.nodeType === 'folder';

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-[#19B5FE] flex items-center justify-center shrink-0 border border-sky-100">
              {isImage ? (
                <FileImage className="w-4 h-4" />
              ) : isFolder ? (
                <HardDrive className="w-4 h-4" />
              ) : (
                <File className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm truncate">
                {fileData?.name || node.title}
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{isFolder ? 'Folder' : fileData?.type || 'Attachment'}</span>
                <span>•</span>
                <span>{formatFileSize(fileData?.size)}</span>
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            {fileData?.url && (
              <a
                href={fileData.url}
                download={fileData.name}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#19B5FE] hover:bg-[#1499d6] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body Preview Area */}
        <div className="flex-1 overflow-auto bg-slate-50/70 p-6 flex items-center justify-center min-h-[360px] max-h-[65vh] relative select-none">
          {isImage && (fileData?.previewUrl || fileData?.url) ? (
            <div className="flex flex-col items-center justify-center max-w-full max-h-full">
              <div
                style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
                className="flex items-center justify-center"
              >
                <img
                  src={fileData.previewUrl || fileData.url}
                  alt={fileData.name}
                  className="max-h-[55vh] max-w-full object-contain rounded-lg border border-slate-200 shadow-md bg-white"
                />
              </div>

              {/* Image Zoom Control floating toolbar */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-full px-3 py-1 shadow-md flex items-center gap-2 text-xs font-mono text-slate-700">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                  className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <span>{Math.round(zoomLevel * 100)}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                  className="p-1 hover:bg-slate-100 rounded-full cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5 text-slate-600" />
                </button>
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1 hover:bg-slate-100 rounded-full cursor-pointer ml-1"
                  title="Reset 100%"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                </button>
              </div>
            </div>
          ) : (
            /* Document / Folder preview card */
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs max-w-md w-full text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-[#19B5FE] border border-sky-100 flex items-center justify-center mx-auto">
                {isFolder ? (
                  <HardDrive className="w-8 h-8" />
                ) : (
                  <FileText className="w-8 h-8" />
                )}
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-base break-all">
                  {fileData?.name || node.title}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {isFolder
                    ? `Folder contains ${fileData?.itemCount || 0} sub-items`
                    : `Format: ${fileData?.type || 'Generic attachment'} • Size: ${formatFileSize(
                        fileData?.size
                      )}`}
                </p>
              </div>

              {node.note && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs text-slate-700 font-mono">
                  {node.note}
                </div>
              )}

              {fileData?.url && (
                <a
                  href={fileData.url}
                  download={fileData.name}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#19B5FE] hover:bg-[#1499d6] text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>Download file</span>
                </a>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-between text-xs text-slate-500">
          <span>Press <strong>Esc</strong> or click Close to exit</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
