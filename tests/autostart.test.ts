import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - autostart option', () => {
  it('does not start automatically by default', async () => {
    const tracker: string[] = [];

    renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step'),
    ]));

    await Helpers.advanceTime(50);

    expect(tracker).toEqual([]);
  });

  it('starts automatically with autostart: true', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [Helpers.createSyncStep(tracker, 'step')],
      { autostart: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step']);
  });

  it('executes all steps with autostart', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [
        Helpers.createSyncStep(tracker, 'step1'),
        Helpers.createSyncStep(tracker, 'step2'),
        Helpers.createSyncStep(tracker, 'step3'),
      ],
      { autostart: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step3']);
  });

  it('handles async steps with autostart', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [
        Helpers.createAsyncStep(tracker, 'step1', 10),
        Helpers.createAsyncStep(tracker, 'step2', 10),
      ],
      { autostart: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2']);
  });

  it('sets state to running immediately with autostart', async () => {
    const { result } = renderHook(() => usePipeline(
      [Helpers.createAsyncStep([], 'step', 100)],
      { autostart: true }
    ));

    expect(result.current.state).toBe('running');
  });

  it('handles errors with autostart', async () => {
    const { result } = renderHook(() => usePipeline(
      [Helpers.createFailingStep([], 'step')],
      { autostart: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBeInstanceOf(Error);
  });

  it('does not autostart with autostart: false', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [Helpers.createSyncStep(tracker, 'step')],
      { autostart: false }
    ));

    await Helpers.advanceTime(50);

    expect(result.current.state).toBe('idle');
    expect(tracker).toEqual([]);
  });

  it('does not autostart with undefined options', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [Helpers.createSyncStep(tracker, 'step')],
      undefined
    ));

    await Helpers.advanceTime(50);

    expect(result.current.state).toBe('idle');
    expect(tracker).toEqual([]);
  });
});
