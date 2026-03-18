import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - stop()', () => {
  it('returns false when in idle state', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.stop();
    });

    expect(returnValue!).toBe(false);
  });

  it('returns true when stopped running pipeline', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.stop();
    });

    expect(returnValue!).toBe(true);
  });

  it('resets state to idle', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('running');

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe('idle');
  });

  it('resets current to undefined', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    expect(result.current.current).toBeDefined();

    act(() => {
      result.current.stop();
    });

    expect(result.current.current).toBeUndefined();
  });

  it('triggers abort signal', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createAbortAwareStep(tracker, 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    act(() => {
      result.current.stop();
    });

    await Helpers.advanceTime(150);

    expect(tracker).toContain('step:start');
    expect(tracker).toContain('step:aborted');
    expect(tracker).not.toContain('step:end');
  });

  it('prevents remaining steps from executing', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createAbortAwareStep(tracker, 'step1', 50),
      Helpers.createSyncStep(tracker, 'step2'),
      Helpers.createSyncStep(tracker, 'step3'),
    ]));

    act(() => {
      result.current.start();
    });

    await Helpers.advanceTime(10);

    act(() => {
      result.current.stop();
    });

    await Helpers.advanceTime(100);

    expect(tracker).toContain('step1:start');
    expect(tracker).not.toContain('step2');
    expect(tracker).not.toContain('step3');
  });

  it('allows start() to be called again after stop()', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    tracker.length = 0;

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step']);
  });

  it('returns true and resets to idle when called in failed state', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createFailingStep([], 'step'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.stop();
    });

    expect(returnValue!).toBe(true);
    expect(result.current.state).toBe('idle');
    expect(result.current.current).toBeUndefined();
  });

  it('allows start() after stop() from failed state', async () => {
    const tracker: string[] = [];
    let shouldFail = true;

    const { result } = renderHook(() => usePipeline([
      () => {
        tracker.push('step');

        if (shouldFail)
          throw new Error('fail');
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(tracker).toEqual(['step']);

    shouldFail = false;

    act(() => {
      result.current.stop();
    });

    expect(result.current.state).toBe('idle');

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step', 'step']);
  });

  it('returns false when called in completed state', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep([], 'step'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.stop();
    });

    expect(returnValue!).toBe(false);
  });
});
