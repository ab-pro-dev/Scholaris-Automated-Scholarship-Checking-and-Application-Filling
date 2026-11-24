'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Camera,
  ShieldCheck,
  Clock,
} from 'lucide-react';

interface PortalPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshotUrl?: string | null;
  scholarshipTitle: string;
  portalUrl?: string | null;
  captureDate?: string | null;
}

export function PortalPreviewModal({
  isOpen,
  onClose,
  screenshotUrl,
  scholarshipTitle,
  portalUrl,
  captureDate,
}: PortalPreviewModalProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
                <Camera className="w-3.5 h-3.5" /> Portal Form Snapshot
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3 h-3" /> Stopped Short of Final Submit
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 truncate max-w-xl">
              {scholarshipTitle}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.2))}
              className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-500 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.0, z + 0.2))}
              className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-2 text-slate-600 hover:text-slate-950 hover:bg-slate-200 rounded-lg transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <div className="w-px h-6 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-6 bg-slate-100 flex items-center justify-center min-h-[400px]">
          {screenshotUrl ? (
            <div
              className="transition-transform duration-100 origin-top shadow-lg border border-slate-300 rounded-xl overflow-hidden bg-white max-w-full"
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={screenshotUrl}
                alt="Scholarship portal preview snapshot"
                className="w-full h-auto object-contain block"
              />
            </div>
          ) : (
            <div className="text-center p-8 bg-white border border-slate-200 rounded-2xl max-w-md shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                <Camera className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900">
                No Preview Screenshot Available Yet
              </h4>
              <p className="text-xs text-slate-500">
                A high-resolution screenshot will be captured automatically by the browser worker as soon as form filling begins.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Snapshot captured via Chromium worker sandbox • Values filled based on verified mappings.
            </span>
          </div>

          {portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Open Official Portal <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
