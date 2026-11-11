/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef } from 'react';
import {
  Film,
  Download,
  Share2,
  X,
  Sparkles,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Video,
} from 'lucide-react';
import { BirthdayProfile, StudioConfig } from '../types.ts';
import { audioEngine } from '../utils/audio.ts';
import { renderStudioCanvas } from '../utils/canvasRenderer.ts';
import {
  SAFARI_TOTAL_DURATION,
  TRAIN_TOTAL_DURATION,
  JUNGLE_SAFARI_VIDEO,
  THEME_VIDEOS,
  getThemeTotalDuration,
} from '../constants/presets.ts';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BirthdayProfile;
  config: StudioConfig;
  customUploadedImage: HTMLImageElement | null;
}

export default function ExportModal({
  isOpen,
  onClose,
  profile,
  config,
  customUploadedImage,
}: ExportModalProps) {
  const isVideoTheme = true;
  const isSafari = profile.themeId === 'jungle_safari';

  const [clipMode, setClipMode] = useState<'full_video' | 'intro_clip' | 'venue_clip' | 'blessing_clip' | 'snapshot'>('full_video');
  const [resolution, setResolution] = useState<'1080p' | '720p'>('1080p');
  const [isExporting, setIsExporting] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [statusText, setStatusText] = useState('');
  const [showQrCode, setShowQrCode] = useState(false);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const abortRef = useRef(false);

  if (!isOpen) return null;

  const currentVideoSrc = profile.videoSource || THEME_VIDEOS[profile.themeId] || JUNGLE_SAFARI_VIDEO;

  const handleDownloadDirectVideo = () => {
    const a = document.createElement('a');
    a.href = currentVideoSrc;
    a.download = `${profile.name || (profile.gender === 'boy' ? 'Leo' : 'Aneira')}_1st_Birthday_${profile.themeId}_Pixar_3D.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const getClipTimeRange = () => {
    if (isSafari) {
      switch (clipMode) {
        case 'intro_clip':
          return { start: 0, duration: 10, title: 'Safari Jeep & Baby Lion Reel' };
        case 'venue_clip':
          return { start: 10, duration: 8, title: 'Jungle Invitation Board Reel' };
        case 'blessing_clip':
          return { start: 18, duration: 19.14, title: 'Venue & Family Blessings Reel' };
        default:
          return { start: 0, duration: SAFARI_TOTAL_DURATION, title: 'Full 3D Jungle Safari Invitation' };
      }
    } else {
      const themeDur = getThemeTotalDuration(profile.themeId);
      switch (clipMode) {
        case 'intro_clip':
          return { start: 0, duration: 4, title: '3D Pixar Baby Milestone Reel' };
        case 'venue_clip':
          return { start: 4, duration: 4, title: 'Theme Invitation Board Reel' };
        case 'blessing_clip':
          return { start: 8, duration: 7, title: 'Venue & Family Blessings Reel' };
        default:
          return { start: 0, duration: themeDur, title: 'Full 3D Pixar Baby Invitation' };
      }
    }
  };

  const handleExportHDVideo = async () => {
    if (clipMode === 'snapshot') {
      handleExportSnapshot();
      return;
    }

    setIsExporting(true);
    setProgressPercent(0);
    setDownloadUrl(null);
    setRecordedBlob(null);
    abortRef.current = false;
    setStatusText('Preparing Full HD canvas frames & mixed audio stream...');

    const clip = getClipTimeRange();
    const fps = 30;
    const totalFrames = Math.round(clip.duration * fps);

    let renderW = 1080;
    let renderH = 1920;

    if (resolution === '1080p') {
      if (config.aspectRatio === '9:16') {
        renderW = 1080;
        renderH = 1920;
      } else if (config.aspectRatio === '1:1') {
        renderW = 1080;
        renderH = 1080;
      } else {
        renderW = 1920;
        renderH = 1080;
      }
    } else {
      if (config.aspectRatio === '9:16') {
        renderW = 720;
        renderH = 1280;
      } else if (config.aspectRatio === '1:1') {
        renderW = 720;
        renderH = 720;
      } else {
        renderW = 1280;
        renderH = 720;
      }
    }

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = renderW;
    offscreenCanvas.height = renderH;
    const ctx = offscreenCanvas.getContext('2d');

    if (!ctx) {
      alert('Could not initialize canvas context');
      setIsExporting(false);
      return;
    }

    const canvasStream = offscreenCanvas.captureStream(fps);
    const audioDestination = audioEngine.getAudioStreamDestination();

    let combinedStream: MediaStream = canvasStream;
    if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
      combinedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);
    }

    // Start audio sync
    audioEngine.syncPlayback(clip.start, true, config.musicTheme, config.babyVoice);

    let mimeType = 'video/mp4';
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(combinedStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined,
        videoBitsPerSecond: resolution === '1080p' ? 6500000 : 3500000,
      });
    } catch (e) {
      console.warn('MediaRecorder init fallback', e);
      recorder = new MediaRecorder(combinedStream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    recorder.onstop = () => {
      audioEngine.stopMusic();
      audioEngine.stopVoice();
      const finalType = recorder.mimeType || 'video/mp4';
      const blob = new Blob(chunks, { type: finalType });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setRecordedBlob(blob);
      setIsExporting(false);
      setProgressPercent(100);
      setStatusText('✨ HD Video with Baby Voiceover rendered and ready for download!');
    };

    let videoEl: HTMLVideoElement | null = null;
    if (isVideoTheme) {
      videoEl = document.createElement('video');
      videoEl.src = currentVideoSrc;
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = true;
      videoEl.currentTime = clip.start;
      await new Promise<void>((res) => {
        videoEl!.onloadeddata = () => res();
        videoEl!.onerror = () => res();
        setTimeout(res, 800);
      });
    }

    recorder.start(250);

    let frame = 0;
    const processNextFrame = () => {
      if (abortRef.current) {
        recorder.stop();
        audioEngine.stopMusic();
        audioEngine.stopVoice();
        if (videoEl) {
          videoEl.pause();
          videoEl.src = '';
        }
        setIsExporting(false);
        return;
      }

      const frameTime = clip.start + frame / fps;

      if (config.babyVoice?.audioUrl) {
        audioEngine.syncPlayback(frameTime, true, config.musicTheme === 'none' ? 'none' : config.musicTheme, config.babyVoice);
      } else {
        audioEngine.syncPlayback(frameTime, true, config.musicTheme, config.babyVoice);
      }

      if (videoEl) {
        const vidDur = videoEl.duration || 15;
        const targetVidTime = frameTime % vidDur;
        if (Math.abs(videoEl.currentTime - targetVidTime) > 0.05) {
          videoEl.currentTime = targetVidTime;
        }
      }

      renderStudioCanvas(
        ctx,
        renderW,
        renderH,
        frameTime,
        profile,
        config,
        customUploadedImage,
        videoEl
      );

      frame++;
      const percent = Math.round((frame / totalFrames) * 100);
      setProgressPercent(percent);
      setStatusText(`Encoding frame ${frame} of ${totalFrames} (${percent}%)...`);

      if (frame < totalFrames) {
        setTimeout(processNextFrame, 1000 / fps);
      } else {
        setTimeout(() => {
          recorder.stop();
          if (videoEl) {
            videoEl.pause();
            videoEl.src = '';
          }
        }, 350);
      }
    };

    processNextFrame();
  };

  const handleExportSnapshot = () => {
    const height = config.aspectRatio === '9:16' ? 1920 : config.aspectRatio === '1:1' ? 1080 : 608;
    const c = document.createElement('canvas');
    c.width = 1080;
    c.height = height;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    renderStudioCanvas(ctx, 1080, height, 0, profile, config, customUploadedImage);
    const a = document.createElement('a');
    a.download = `${profile.name || 'Baby'}_1st_Birthday_HD_Card.png`;
    a.href = c.toDataURL('image/png');
    a.click();
    setStatusText('Downloaded high-resolution photo card!');
  };

  const handleDownloadFile = () => {
    if (!downloadUrl) return;
    const a = document.createElement('a');
    a.href = downloadUrl;
    const ext = recordedBlob?.type.includes('mp4') ? 'mp4' : 'webm';
    a.download = `${profile.name || 'Baby'}_1st_Birthday_HD_${clipMode}.${ext}`;
    a.click();
  };

  const handleShareMobile = async () => {
    if (!recordedBlob) return;
    const ext = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
    const fileName = `${profile.name || 'Baby'}_1st_Birthday_HD.${ext}`;
    const file = new File([recordedBlob], fileName, { type: recordedBlob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `${profile.name}'s 1st Birthday 3D Video`,
          text: `You're invited to ${profile.name}'s 1st Birthday! Watch our magical 3D video invitation with baby's custom voice!`,
        });
        setShareSuccess('✨ Shared successfully!');
        setTimeout(() => setShareSuccess(null), 3000);
        return;
      } catch (err: any) {
        if (err.name !== 'AbortError') console.log('Share canceled or error', err);
      }
    }

    const shareText = `🎉 You are invited to celebrate the 1st Birthday of ${profile.name || 'our little star'}!\n📅 Date: ${profile.date}\n⏰ Time: ${profile.time}\n📍 Venue: ${profile.venueName}, ${profile.venueAddress}\n\nWith love,\n${profile.parentsNames}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, '_blank');
  };

  const appUrl = typeof window !== 'undefined' ? window.location.href : '';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-stone-900 border border-stone-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl text-stone-200 flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-pink-500 via-rose-500 to-amber-500 text-white shadow-md">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Download Video to Phone (HD)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  📱 Mobile Ready
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Export 1080p Full HD video with Fairytale music & Baby Voiceover for WhatsApp, Instagram & TikTok.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              abortRef.current = true;
              audioEngine.stopMusic();
              audioEngine.stopVoice();
              onClose();
            }}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Mode Selection */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-stone-300">Choose Clip to Export:</span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setClipMode('full_video')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                clipMode === 'full_video'
                  ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md'
                  : 'bg-stone-800/60 border-stone-700/60 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span>Full 3D Video</span>
              <span className="block text-[10px] text-pink-300 mt-0.5">
                {isSafari ? '37s Safari' : `${getThemeTotalDuration(profile.themeId)}s Pixar Video`}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setClipMode('intro_clip')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                clipMode === 'intro_clip'
                  ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md'
                  : 'bg-stone-800/60 border-stone-700/60 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span>Arrival & Star</span>
              <span className="block text-[10px] text-stone-400 mt-0.5">10-11s Reel</span>
            </button>

            <button
              type="button"
              onClick={() => setClipMode('venue_clip')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                clipMode === 'venue_clip'
                  ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md'
                  : 'bg-stone-800/60 border-stone-700/60 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span>Date & Venue</span>
              <span className="block text-[10px] text-stone-400 mt-0.5">15s Short</span>
            </button>

            <button
              type="button"
              onClick={() => setClipMode('blessing_clip')}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                clipMode === 'blessing_clip'
                  ? 'bg-pink-600/30 border-pink-500 text-white font-bold shadow-md'
                  : 'bg-stone-800/60 border-stone-700/60 text-stone-300 hover:bg-stone-800'
              }`}
            >
              <span>Blessing Card</span>
              <span className="block text-[10px] text-stone-400 mt-0.5">12s Closing</span>
            </button>
          </div>
        </div>

        {/* Resolution Selection */}
        <div className="flex items-center justify-between p-3 bg-stone-950/60 rounded-xl border border-stone-800 text-xs">
          <span className="font-semibold text-stone-300">Video Quality:</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setResolution('1080p')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                resolution === '1080p'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              1080p Full HD
            </button>
            <button
              type="button"
              onClick={() => setResolution('720p')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                resolution === '720p'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              720p HD (Faster)
            </button>
          </div>
        </div>

        {/* Progress & Encoding State */}
        {isExporting && (
          <div className="flex flex-col gap-2 p-4 bg-stone-950/80 rounded-2xl border border-pink-500/30 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
                <span>{statusText}</span>
              </span>
              <span className="font-mono font-bold text-pink-400">{progressPercent}%</span>
            </div>
            <div className="w-full bg-stone-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Download Ready Banner */}
        {downloadUrl && (
          <div className="flex flex-col gap-3 p-4 bg-emerald-950/40 rounded-2xl border border-emerald-500/40 text-stone-200 animate-in fade-in">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Video successfully rendered in HD!</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleDownloadFile}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Video File</span>
              </button>

              <button
                type="button"
                onClick={handleShareMobile}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 active:scale-95 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>Share via WhatsApp / Phone</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQrCode(!showQrCode)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 transition-all cursor-pointer"
              >
                <QrCode className="w-4 h-4 text-amber-300" />
                <span>Scan QR for Phone</span>
              </button>
            </div>

            {/* QR Code section */}
            {showQrCode && (
              <div className="flex flex-col items-center gap-2 p-3 bg-stone-950 rounded-xl border border-stone-800 text-center animate-fade-in mt-1">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" />
                  <span>Scan with Phone Camera to Open Directly</span>
                </span>
                <div className="p-2 bg-white rounded-xl shadow-md">
                  <img src={qrCodeUrl} alt="Phone QR code" className="w-36 h-36" />
                </div>
                <span className="text-[10px] text-stone-400">
                  Point your iPhone or Android camera at the code to access this video on mobile.
                </span>
              </div>
            )}
          </div>
        )}

        {isVideoTheme && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span className="text-stone-300">
                Download the pristine original 3D Pixar master video ({profile.themeId.replace('_', ' ')}):
              </span>
            </div>
            <button
              type="button"
              onClick={handleDownloadDirectVideo}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
            >
              Direct MP4
            </button>
          </div>
        )}

        {shareSuccess && (
          <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{shareSuccess}</span>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => {
              abortRef.current = true;
              audioEngine.stopMusic();
              audioEngine.stopVoice();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
          >
            Close
          </button>
          {!downloadUrl && (
            <button
              onClick={handleExportHDVideo}
              disabled={isExporting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white text-xs font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isExporting ? 'Exporting HD Video...' : 'Render & Download in HD'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
