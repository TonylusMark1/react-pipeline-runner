import { describe, it, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - autorun option', () => {
  it('does not start automatically by default', async () => {
    const tracker: string[] = [];

    renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step'),
    ]));

    await Helpers.advanceTime(50);

    expect(tracker).toEqual([]);
  });

  it('starts automatically with autorun: true', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [Helpers.createSyncStep(tracker, 'step')],
      { autorun: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step']);
  });

  it('executes all steps with autorun', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [
        Helpers.createSyncStep(tracker, 'step1'),
        Helpers.createSyncStep(tracker, 'step2'),
        Helpers.createSyncStep(tracker, 'step3'),
      ],
      { autorun: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step3']);
  });

  it('handles async steps with autorun', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [
        Helpers.createAsyncStep(tracker, 'step1', 10),
        Helpers.createAsyncStep(tracker, 'step2', 10),
      ],
      { autorun: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2']);
  });

  it('sets state to running immediately with autorun', async () => {
    const { result } = renderHook(() => usePipeline(
      [Helpers.createAsyncStep([], 'step', 100)],
      { autorun: true }
    ));

    expect(result.current.state).toBe('running');
  });

  it('handles errors with autorun', async () => {
    const { result } = renderHook(() => usePipeline(
      [Helpers.createFailingStep([], 'step')],
      { autorun: true }
    ));

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBeInstanceOf(Error);
  });

  it('does not autorun with autorun: false', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline(
      [Helpers.createSyncStep(tracker, 'step')],
      { autorun: false }
    ));

    await Helpers.advanceTime(50);

    expect(result.current.state).toBe('idle');
    expect(tracker).toEqual([]);
  });

  it('does not autorun with undefined options', async () => {
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
