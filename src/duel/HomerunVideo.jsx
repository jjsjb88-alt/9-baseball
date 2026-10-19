import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import homerPoster from '../../assets/production-art/homer-video-v1/poster.jpg';
import { getBgmVolume, isBgmPlaying, setBgmVolume } from './bgm.js';
import './homerun-video.css';

export const HOMER_VIDEO_URL = 'https://raw.githubusercontent.com/jjsjb88-alt/9-baseball/1b207e16d25b62412467ffe26ea5830e5a170485/assets/production-art/homer-video-v1/homer-v1.mp4';
const NO_PROGRESS_MS = 8000;
const INITIAL_LOAD_MS = 30000;
const MAX_PLAY_MS = 45000;

export function isHomerVideoEligible({ version, grade, reduced } = {}) {
  return Number(version) === 10 && ['homer', 'grand-slam'].includes(grade) && !reduced;
}

function focusables(root) {
  return [...(root?.querySelectorAll('button:not(:disabled), a[href], video[tabindex]') || [])]
    .filter(node => !node.hasAttribute('hidden'));
}

function restoreTarget(opener) {
  if (opener?.isConnected && opener !== document.body && opener !== document.documentElement && typeof opener.focus === 'function') return opener;
  return document.querySelector('[data-testid="bp-next"]') || document.querySelector('[data-testid="bp-swing"]');
}

/** Full-screen, one-shot video overlay. The caller owns the gameplay lock and keys it per shot. */
export default function HomerunVideo({ sound = false, onFinish = () => {} }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const finishRef = useRef(onFinish);
  const doneRef = useRef(false);
  const [forcedMuted, setForcedMuted] = useState(false);
  const [status, setStatus] = useState('');
  finishRef.current = onFinish;

  const finish = useCallback((reason) => {
    if (doneRef.current) return;
    doneRef.current = true;
    finishRef.current?.(reason);
  }, []);

  useEffect(() => {
    const root = document.getElementById('root');
    const opener = document.activeElement;
    const previousInert = root?.inert;
    const previousAriaHidden = root?.getAttribute('aria-hidden');
    if (root) {
      root.inert = true;
      root.setAttribute('aria-hidden', 'true');
    }

    const initial = dialogRef.current?.querySelector('button:not(:disabled)');
    initial?.focus();

    let bgmWasPlaying = false;
    let previousVolume;
    try {
      bgmWasPlaying = isBgmPlaying();
      if (bgmWasPlaying) {
        previousVolume = getBgmVolume();
        setBgmVolume(previousVolume * 0.3);
      }
    } catch { /* Audio must never block the cutscene. */ }

    const handleKey = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation?.();
        finish('skip');
        return;
      }
      if (event.key !== 'Tab') return;
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      const items = focusables(dialogRef.current);
      if (!items.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey, true);

    let lastTime = 0;
    let lastProgressAt = Date.now();
    const startedAt = Date.now();
    let watchdog;
    const startWatchdog = () => {
      if (watchdog) clearInterval(watchdog);
      watchdog = setInterval(() => {
        const video = videoRef.current;
        if (!video || doneRef.current) return;
        if (Number.isFinite(video.currentTime) && video.currentTime > lastTime + 0.05) {
          lastTime = video.currentTime;
          lastProgressAt = Date.now();
        }
        if (Date.now() - startedAt >= MAX_PLAY_MS) finish('timeout');
        else if (lastTime === 0 && Date.now() - startedAt >= INITIAL_LOAD_MS) finish('load-timeout');
        else if (lastTime > 0 && Date.now() - lastProgressAt >= NO_PROGRESS_MS) finish('stalled');
      }, 1000);
    };

    const video = videoRef.current;
    let disposed = false;
    const playVideo = () => {
      if (!video || doneRef.current || disposed) return;
      startWatchdog();
      let result;
      try { result = video.play(); }
      catch (error) { result = Promise.reject(error); }
      Promise.resolve(result).catch(error => {
        if (disposed || doneRef.current) return;
        if (error?.name === 'NotAllowedError' && !video.muted) {
          video.muted = true;
          setForcedMuted(true);
          setStatus('브라우저 자동 재생 정책에 따라 무음으로 재생합니다.');
          let fallback;
          try { fallback = video.play(); }
          catch (fallbackError) { fallback = Promise.reject(fallbackError); }
          Promise.resolve(fallback).catch(() => {
            if (!disposed) finish('play-rejected');
          });
        } else {
          finish('play-rejected');
        }
      });
    };
    playVideo();

    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        video?.pause?.();
        finish('hidden');
      } else if (!doneRef.current) {
        lastProgressAt = Date.now();
        playVideo();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      window.removeEventListener('keydown', handleKey, true);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (watchdog) clearInterval(watchdog);
      // Pause after marking this effect disposed so media events/promises cannot finish a stale shot.
      try { video?.pause?.(); } catch {}
      if (root) {
        root.inert = !!previousInert;
        if (previousAriaHidden == null) root.removeAttribute('aria-hidden');
        else root.setAttribute('aria-hidden', previousAriaHidden);
      }
      try {
        if (bgmWasPlaying && previousVolume != null) setBgmVolume(previousVolume);
      } catch {}
      restoreTarget(opener)?.focus?.();
    };
  }, [finish]);

  if (typeof document === 'undefined' || !document.body) return null;
  return createPortal(
    <div className="bp-homer-video" ref={dialogRef} role="dialog" aria-modal="true" aria-label="홈런 시네마틱">
      <video
        ref={videoRef}
        className="bp-homer-video__media"
        src={HOMER_VIDEO_URL}
        poster={homerPoster}
        playsInline
        muted={!sound || forcedMuted}
        preload="none"
        onEnded={() => finish('ended')}
        onError={() => finish('error')}
      />
      <div className="bp-homer-video__controls">
        {status && <p className="bp-homer-video__status" role="status">{status}</p>}
        <button type="button" className="bp-homer-video__skip" onClick={() => finish('skip')}>건너뛰기</button>
      </div>
    </div>,
    document.body
  );
}

/** Standalone, non-persistent showcase with explicit play/replay and sound controls. */
export function HomerunVideoPreview() {
  const [playing, setPlaying] = useState(false);
  const [sound, setSound] = useState(false);
  const [replay, setReplay] = useState(0);
  const base = import.meta.env.BASE_URL || '/';
  return (
    <main className="bp-homer-preview">
      <a className="bp-homer-preview__back" href={base}>← 9ZONE 홈으로</a>
      <h1>홈런 시네마틱 미리보기</h1>
      <p>14초 홈런 영상 · 재생 기록은 저장되지 않습니다.</p>
      <div className="bp-homer-preview__actions">
        <button type="button" onClick={() => { setReplay(value => value + 1); setPlaying(true); }}>{playing ? '다시 보기' : '재생'}</button>
        <button type="button" aria-pressed={sound} onClick={() => setSound(value => !value)}>{sound ? '소리 켜짐' : '소리 꺼짐'}</button>
      </div>
      {playing && <HomerunVideo key={replay} sound={sound} onFinish={() => setPlaying(false)} />}
    </main>
  );
}
