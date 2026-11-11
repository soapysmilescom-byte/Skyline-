/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Volume2, VolumeX, Camera, Sparkles, Film, RotateCcw, Smile, Wand2, PartyPopper, Music } from 'lucide-react';
import { BirthdayProfile, StudioConfig } from '../types.ts';
import { audioEngine } from '../utils/audio.ts';
import { preloadStudioImages, renderStudioCanvas, addInteractiveParticle } from '../utils/canvasRenderer.ts';
import { getThemeScenes, getThemeTotalDuration, THEME_VIDEOS, JUNGLE_SAFARI_VIDEO } from '../constants/presets.ts';

interface VideoStudioProps {
  profile: BirthdayProfile;
  config: StudioConfig;
  onChangeConfig: (newConfig: Partial<StudioConfig>) => void;
  onOpenExporter: () => void;
}

export default function VideoStudio({
  profile,
  config,
  onChangeConfig,
  onOpenExporter,
}: VideoStudioProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const scenes = getThemeScenes(profile.themeId);
  const totalDuration = getThemeTotalDuration(profile.themeId);
  const videoSrc = profile.videoSource || THEME_VIDEOS[profile.themeId] || JUNGLE_SAFARI_VIDEO;
  const isVideoTheme = true;

  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [customPhotoImg, setCustomPhotoImg] = useState<HTMLImageElement | null>(null);
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);

  const animFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const currentTimeRef = useRef<number>(0);

  // Preload background images
  useEffect(() => {
    preloadStudioImages().then(() => {
      setAssetsLoaded(true);
    });
  }, []);

  // Preload custom uploaded photo
  useEffect(() => {
    if (profile.photoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setCustomPhotoImg(img);
      img.src = profile.photoUrl;
    } else {
      setCustomPhotoImg(null);
    }
  }, [profile.photoUrl]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Video element sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideoTheme) return;
    video.muted = isMuted;
    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isPlaying, isMuted, isVideoTheme, videoSrc]);

  // Audio engine playback sync
  useEffect(() => {
    if (isPlaying && config.babyVoice?.audioUrl) {
      audioEngine.syncPlayback(currentTimeRef.current, true, config.musicTheme === 'none' ? 'none' : config.musicTheme, config.babyVoice);
    } else if (isPlaying && assetsLoaded) {
      audioEngine.syncPlayback(currentTimeRef.current, true, config.musicTheme, config.babyVoice);
    } else {
      audioEngine.stopMusic();
      audioEngine.stopVoice();
    }

    return () => {
      audioEngine.stopMusic();
      audioEngine.stopVoice();
    };
  }, [isPlaying, config.musicTheme, config.babyVoice, assetsLoaded, isVideoTheme]);

  // Animation Loop
  const renderFrame = useCallback(
    (timestamp: number) => {
      const deltaSec = (timestamp - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = timestamp;

      if (isPlaying) {
        let nextTime = currentTimeRef.current + deltaSec;
        if (isVideoTheme && videoRef.current && !videoRef.current.paused && !videoRef.current.seeking) {
          nextTime = videoRef.current.currentTime;
        }

        if (nextTime >= totalDuration) {
          nextTime = 0;
          if (videoRef.current) {
            videoRef.current.currentTime = 0;
            videoRef.current.play().catch(() => {});
          }
          audioEngine.syncPlayback(0, true, config.musicTheme, config.babyVoice);
        }

        currentTimeRef.current = nextTime;
        setCurrentTime(nextTime);
      }

      // Update active scene index
      let sIdx = 0;
      for (let i = 0; i < scenes.length; i++) {
        const s = scenes[i];
        if (currentTimeRef.current >= s.startTime && currentTimeRef.current < s.startTime + s.duration) {
          sIdx = i;
          break;
        }
      }
      setActiveSceneIndex(sIdx);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderStudioCanvas(
            ctx,
            canvas.width,
            canvas.height,
            currentTimeRef.current,
            profile,
            config,
            customPhotoImg,
            videoRef.current
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(renderFrame);
    },
    [isPlaying, profile, config, customPhotoImg, isVideoTheme, scenes, totalDuration]
  );

  useEffect(() => {
    lastFrameTimeRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(renderFrame);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [renderFrame]);

  const togglePlay = async () => {
    await audioEngine.unlockAudio();
    const nextPlay = !isPlaying;
    setIsPlaying(nextPlay);
    if (videoRef.current) {
      if (nextPlay) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
    audioEngine.syncPlayback(currentTimeRef.current, nextPlay, config.musicTheme, config.babyVoice);
  };

  const handleRestart = async () => {
    await audioEngine.unlockAudio();
    currentTimeRef.current = 0;
    setCurrentTime(0);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      if (isPlaying) videoRef.current.play().catch(() => {});
    }
    audioEngine.syncPlayback(0, isPlaying, config.musicTheme, config.babyVoice);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    audioEngine.unlockAudio();
    const val = parseFloat(e.target.value);
    currentTimeRef.current = val;
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    audioEngine.syncPlayback(val, isPlaying, config.musicTheme, config.babyVoice);
  };

  const handleJumpScene = (scene: (typeof scenes)[0]) => {
    audioEngine.unlockAudio();
    currentTimeRef.current = scene.startTime;
    setCurrentTime(scene.startTime);
    if (videoRef.current) {
      videoRef.current.currentTime = scene.startTime;
    }
    audioEngine.syncPlayback(scene.startTime, isPlaying, config.musicTheme, config.babyVoice);
  };

  const toggleMuteAudio = () => {
    audioEngine.unlockAudio();
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    if (videoRef.current) {
      videoRef.current.muted = nextMute;
    }
    audioEngine.toggleMute();
  };

  // Interactive canvas tap/click handler
  const handleCanvasInteraction = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    audioEngine.unlockAudio();
    addInteractiveParticle(x, y, undefined, profile.themeId);
    audioEngine.playThemeSFX(profile.themeId);

    if (!isPlaying) {
      setIsPlaying(true);
      if (videoRef.current) videoRef.current.play().catch(() => {});
    }
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    handleCanvasInteraction(e.clientX, e.clientY);
  };

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      handleCanvasInteraction(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  // Interactive Action Pills
  const handleBabyGiggle = () => {
    audioEngine.unlockAudio();
    audioEngine.playBabyGiggle();
    const canvas = canvasRef.current;
    if (canvas) {
      addInteractiveParticle(canvas.width / 2, canvas.height * 0.45, '👶', profile.themeId);
    }
  };

  const handleMagicBurst = () => {
    audioEngine.unlockAudio();
    audioEngine.playMagicBurst();
    const canvas = canvasRef.current;
    if (canvas) {
      addInteractiveParticle(canvas.width / 2, canvas.height * 0.4, '✨', profile.themeId);
    }
  };

  const handlePartyCheer = () => {
    audioEngine.unlockAudio();
    audioEngine.playPartyCheer();
    const canvas = canvasRef.current;
    if (canvas) {
      addInteractiveParticle(canvas.width / 2, canvas.height * 0.5, '🎈', profile.themeId);
    }
  };

  const handleThemeSFX = () => {
    audioEngine.unlockAudio();
    audioEngine.playThemeSFX(profile.themeId);
    const canvas = canvasRef.current;
    if (canvas) {
      addInteractiveParticle(canvas.width / 2, canvas.height * 0.45, undefined, profile.themeId);
    }
  };

  const playTrainWhistle = () => {
    audioEngine.unlockAudio();
    audioEngine.playWhistle();
  };

  const downloadFrameSnapshot = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = `${profile.name || 'Baby'}_1st_Birthday_Invitation_Card.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const canvasDims =
    config.aspectRatio === '9:16'
      ? { width: 720, height: 1280 }
      : config.aspectRatio === '1:1'
      ? { width: 1080, height: 1080 }
      : { width: 1280, height: 720 };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto" ref={containerRef}>
      {/* Aspect Ratio & Quick Action Bar */}
      <div className="flex items-center justify-between w-full mb-3 px-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-stone-800/90 backdrop-blur-md p-1 rounded-xl border border-stone-700/60 shadow-inner">
          <button
            id="aspect-ratio-9-16"
            onClick={() => onChangeConfig({ aspectRatio: '9:16' })}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.aspectRatio === '9:16'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
            }`}
          >
            📱 9:16 Reel / Story
          </button>
          <button
            id="aspect-ratio-1-1"
            onClick={() => onChangeConfig({ aspectRatio: '1:1' })}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.aspectRatio === '1:1'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
            }`}
          >
            ⏹ 1:1 Feed
          </button>
          <button
            id="aspect-ratio-16-9"
            onClick={() => onChangeConfig({ aspectRatio: '16:9' })}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              config.aspectRatio === '16:9'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-md'
                : 'text-stone-400 hover:text-stone-200 hover:bg-stone-700/50'
            }`}
          >
            🖥 16:9 Wide
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="train-whistle-btn"
            onClick={playTrainWhistle}
            title="Play Train Whistle sound effect"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            🚂 Whistle!
          </button>

          <button
            id="save-snapshot-btn"
            onClick={downloadFrameSnapshot}
            title="Download high-resolution image card of this exact frame"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 hover:bg-stone-700 text-xs font-medium transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden sm:inline">Photo Card</span>
          </button>

          <button
            id="export-video-modal-btn"
            onClick={onOpenExporter}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white text-xs font-bold shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <Film className="w-3.5 h-3.5" />
            <span>Export HD Video</span>
          </button>
        </div>
      </div>

      {/* Interactive 3D Pixar Action Bar */}
      <div className="flex items-center justify-between w-full mb-3 px-2 flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider hidden sm:inline">
            ✨ Tap FX:
          </span>
          <button
            id="fx-baby-giggle-btn"
            onClick={handleBabyGiggle}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 border border-pink-500/40 text-xs font-semibold hover:bg-pink-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Trigger Baby Giggle sound & laughing emojis"
          >
            <Smile className="w-3.5 h-3.5 text-pink-400" />
            <span>👶 Giggle</span>
          </button>
          <button
            id="fx-magic-stars-btn"
            onClick={handleMagicBurst}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-semibold hover:bg-purple-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Trigger Magic Wand twinkle & star burst"
          >
            <Wand2 className="w-3.5 h-3.5 text-purple-400" />
            <span>✨ Sparkles</span>
          </button>
          <button
            id="fx-party-balloons-btn"
            onClick={handlePartyCheer}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Trigger Celebration Horn & party balloons"
          >
            <PartyPopper className="w-3.5 h-3.5 text-amber-400" />
            <span>🎈 Balloons</span>
          </button>
          <button
            id="fx-theme-sound-btn"
            onClick={handleThemeSFX}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/40 text-xs font-semibold hover:bg-sky-500/30 transition-all cursor-pointer shadow-sm active:scale-95"
            title="Trigger Theme sound effect"
          >
            <Music className="w-3.5 h-3.5 text-sky-400" />
            <span>🎶 Theme Sound</span>
          </button>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-pink-300/90 bg-pink-950/40 px-2.5 py-1 rounded-lg border border-pink-500/30">
          <span>👆 Tap video anytime to burst emojis & sound!</span>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative flex items-center justify-center w-full bg-stone-950/80 rounded-2xl p-2 sm:p-4 border border-stone-800 shadow-2xl backdrop-blur-xl">
        <div
          className="relative overflow-hidden rounded-xl bg-black shadow-2xl transition-all duration-300 border border-stone-800/80"
          style={{
            aspectRatio:
              config.aspectRatio === '9:16' ? '9/16' : config.aspectRatio === '1:1' ? '1/1' : '16/9',
            maxHeight: '68vh',
            maxWidth: '100%',
          }}
        >
          <canvas
            ref={canvasRef}
            width={canvasDims.width}
            height={canvasDims.height}
            className="w-full h-full object-contain cursor-pointer"
            onClick={handleCanvasClick}
            onTouchStart={handleCanvasTouch}
          />

          <video
            ref={videoRef}
            src={videoSrc}
            playsInline
            webkit-playsinline="true"
            crossOrigin="anonymous"
            preload="auto"
            muted={isMuted}
            className="hidden"
          />

          {/* 3D Pixar Animation Active Badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/65 backdrop-blur-md px-2.5 py-1 rounded-full border border-pink-500/40 text-[11px] font-medium text-pink-200 shadow-lg pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>🎬 3D Pixar Animation Loop Active</span>
          </div>

          {/* Pause overlay button */}
          {!isPlaying && (
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-pink-500/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-current ml-1" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Timeline Controls & Scrubber */}
      <div className="w-full mt-3 bg-stone-800/90 backdrop-blur-md rounded-2xl p-3 sm:p-4 border border-stone-700/70 shadow-lg">
        <div className="relative flex flex-col gap-1.5 w-full mb-2">
          <div className="flex items-center justify-between text-xs font-mono text-stone-400 px-1">
            <span className="text-pink-400 font-semibold">{formatTime(currentTime)}</span>
            <span>{formatTime(totalDuration)}</span>
          </div>
          <div className="relative flex items-center">
            <input
              id="timeline-scrub-input"
              type="range"
              min="0"
              max={totalDuration}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-stone-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
            />
          </div>

          {/* Scene shortcuts */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            {scenes.map((s, idx) => {
              const isActive = idx === activeSceneIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => handleJumpScene(s)}
                  className={`px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-all flex-shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-pink-500/30 text-pink-300 font-semibold border border-pink-500/50 shadow-sm'
                      : 'bg-stone-700/40 text-stone-400 hover:bg-stone-700 hover:text-stone-200'
                  }`}
                >
                  {idx + 1}. {s.title.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Playback buttons */}
        <div className="flex items-center justify-between pt-1 border-t border-stone-700/60">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-pink-600/20 active:scale-95"
            >
              {isPlaying ? (
                <>
                  <span className="w-2.5 h-2.5 bg-white rounded-xs" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play</span>
                </>
              )}
            </button>

            <button
              onClick={handleRestart}
              className="p-2 rounded-xl text-stone-300 hover:text-white hover:bg-stone-700/60 transition-all cursor-pointer"
              title="Restart from beginning"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              id="mute-audio-btn"
              onClick={toggleMuteAudio}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-stone-700/60 transition-all cursor-pointer text-xs"
              title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-4 h-4 text-rose-400" />
                  <span className="text-[11px] text-stone-400">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] text-stone-400">Audio On</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 text-stone-400 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] bg-stone-900/60 px-2 py-0.5 rounded-md border border-stone-700/50">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Scene {activeSceneIndex + 1}/{scenes.length}: {scenes[activeSceneIndex]?.title}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
