// @vitest-environment happy-dom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const bgm = vi.hoisted(() => ({ volume: 0.4, playing: true, setBgmVolume: vi.fn(value => { bgm.volume = value; }) }));
vi.mock('../assets/production-art/homer-video-v1/poster.jpg', () => ({ default: '/poster.jpg' }));
vi.mock('../src/duel/bgm.js', () => ({
  getBgmVolume: () => bgm.volume,
  isBgmPlaying: () => bgm.playing,
  setBgmVolume: bgm.setBgmVolume
}));

import HomerunVideo, { HOMER_VIDEO_URL, HomerunVideoPreview, isHomerVideoEligible } from '../src/duel/HomerunVideo.jsx';

const playSpy = () => vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);

beforeEach(() => {
  bgm.volume = 0.4;
  bgm.playing = true;
  bgm.setBgmVolume.mockClear();
  playSpy();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('HomerunVideo eligibility', () => {
  it('pins the streamed MP4 to the canonical raw repository asset path', () => {
    expect(HOMER_VIDEO_URL).toMatch(/^https:\/\/raw\.githubusercontent\.com\/jjsjb88-alt\/9-baseball\/[a-f0-9]{40}\/assets\/production-art\/homer-video-v1\/homer-v1\.mp4$/);
  });

  it('allows only reduced-motion-safe V10 home runs and grand slams', () => {
    expect(isHomerVideoEligible({ version: 10, grade: 'homer', reduced: false })).toBe(true);
    expect(isHomerVideoEligible({ version: 10, grade: 'grand-slam', reduced: false })).toBe(true);
    expect(isHomerVideoEligible({ version: 10, grade: 'homer', reduced: true })).toBe(false);
    expect(isHomerVideoEligible({ version: 9, grade: 'homer', reduced: false })).toBe(false);
    expect(isHomerVideoEligible({ version: 10, grade: 'extra', reduced: false })).toBe(false);
  });
});

describe('HomerunVideo modal lifecycle', () => {
  it('isolates focus and finishes once on skip or Escape, restoring the opener and BGM volume', () => {
    document.body.innerHTML = '<div id="root"><button id="opener">Open</button></div>';
    const opener = document.getElementById('opener');
    opener.focus();
    const onFinish = vi.fn();
    render(<HomerunVideo sound onFinish={onFinish} />);
    expect(document.getElementById('root').inert).toBe(true);
    expect(document.getElementById('root').getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByRole('dialog', { name: '홈런 시네마틱' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '건너뛰기' }).ownerDocument.activeElement).toBe(screen.getByRole('button', { name: '건너뛰기' }));
    expect(document.querySelector('.bp-homer-video video').muted).toBe(false);
    expect(bgm.volume).toBe(0.12);

    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onFinish).toHaveBeenCalledOnce();
    expect(onFinish).toHaveBeenCalledWith('skip');
    cleanup();
    expect(document.getElementById('root').inert).toBe(false);
    expect(document.getElementById('root').hasAttribute('aria-hidden')).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(bgm.volume).toBe(0.4);
  });

  it('calls the callback once for ended, skip, Escape, and media errors', () => {
    const onFinish = vi.fn();
    const view = render(<HomerunVideo onFinish={onFinish} />);
    const video = document.querySelector('.bp-homer-video video');
    fireEvent.ended(video);
    fireEvent.click(screen.getByRole('button', { name: '건너뛰기' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onFinish).toHaveBeenCalledWith('ended');
    view.unmount();

    const onError = vi.fn();
    render(<HomerunVideo onFinish={onError} />);
    fireEvent.error(document.querySelector('.bp-homer-video video'));
    expect(onError).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledWith('error');
  });

  it('traps Tab focus and restores a fallback battle control when the opener is gone', () => {
    document.body.innerHTML = '<div id="root"></div><button data-testid="bp-next">Next</button>';
    const onFinish = vi.fn();
    render(<HomerunVideo onFinish={onFinish} />);
    const skip = screen.getByRole('button', { name: '건너뛰기' });
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(skip);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onFinish).toHaveBeenCalledWith('skip');
    cleanup();
    expect(document.activeElement).toBe(document.querySelector('[data-testid="bp-next"]'));
  });

  it('tries muted playback after NotAllowedError and releases on a second rejection', async () => {
    const blocked = Object.assign(new Error('blocked'), { name: 'NotAllowedError' });
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play')
      .mockRejectedValueOnce(blocked)
      .mockRejectedValueOnce(blocked);
    const onFinish = vi.fn();
    render(<HomerunVideo sound onFinish={onFinish} />);
    await waitFor(() => expect(onFinish).toHaveBeenCalledWith('play-rejected'));
    expect(play).toHaveBeenCalledTimes(2);
    expect(document.querySelector('.bp-homer-video video').muted).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/무음/);
  });

  it('releases immediately on a non-autoplay play failure and after a bounded playback stall', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new Error('decode'));
    const rejected = vi.fn();
    render(<HomerunVideo onFinish={rejected} />);
    await waitFor(() => expect(rejected).toHaveBeenCalledWith('play-rejected'));
    cleanup();

    vi.useFakeTimers();
    const stalled = vi.fn();
    render(<HomerunVideo onFinish={stalled} />);
    const video = document.querySelector('.bp-homer-video video');
    video.currentTime = 1;
    vi.advanceTimersByTime(1000);
    vi.advanceTimersByTime(8000);
    expect(stalled).toHaveBeenCalledTimes(1);
    expect(stalled).toHaveBeenCalledWith('stalled');
  });

  it('allows initial buffering longer than a playback stall but bounds loading', () => {
    vi.useFakeTimers();
    const finish = vi.fn();
    render(<HomerunVideo onFinish={finish} />);
    vi.advanceTimersByTime(8000);
    expect(finish).not.toHaveBeenCalled();
    vi.advanceTimersByTime(22000);
    expect(finish).toHaveBeenCalledWith('load-timeout');
  });

  it('pauses and releases when the page becomes hidden; unmount cleanup does not finish', () => {
    const finish = vi.fn();
    const view = render(<HomerunVideo onFinish={finish} />);
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    fireEvent(document, new Event('visibilitychange'));
    expect(finish).toHaveBeenCalledWith('hidden');
    view.unmount();
    expect(finish).toHaveBeenCalledTimes(1);
    delete document.visibilityState;
  });

  it('pauses on ordinary unmount without invoking onFinish', () => {
    const finish = vi.fn();
    const view = render(<HomerunVideo onFinish={finish} />);
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    view.unmount();
    expect(pause).toHaveBeenCalledOnce();
    expect(finish).not.toHaveBeenCalled();
  });
});

describe('HomerunVideoPreview', () => {
  it('offers play/replay and sound controls without writing localStorage', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');
    render(<HomerunVideoPreview />);
    expect(screen.getByRole('link', { name: /9ZONE 홈으로/ }).getAttribute('href')).toBe(import.meta.env.BASE_URL || '/');
    fireEvent.click(screen.getByRole('button', { name: '소리 꺼짐' }));
    expect(screen.getByRole('button', { name: '소리 켜짐' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '재생' }));
    expect(screen.getByRole('dialog', { name: '홈런 시네마틱' })).toBeTruthy();
    expect(write).not.toHaveBeenCalled();
  });
});
