import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - resume()', () => {
  it('returns false when not in failed state', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.resume();
    });

    expect(returnValue!).toBe(false);
  });

  it('returns false when in idle state', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.resume();
    });

    expect(returnValue!).toBe(false);
    expect(result.current.state).toBe('idle');
  });

  it('returns false when in running state', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.resume();
    });

    expect(returnValue!).toBe(false);
  });

  it('returns false when in completed state', async () => {
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
      returnValue = result.current.resume();
    });

    expect(returnValue!).toBe(false);
  });

  it('returns true when resumed from failed state', async () => {
    let shouldFail = true;

    const { result } = renderHook(() => usePipeline([
      () => {
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

    shouldFail = false;
    let returnValue: boolean;

    act(() => {
      returnValue = result.current.resume();
    });

    expect(returnValue!).toBe(true);
  });

  it('retries the failed step', async () => {
    const tracker: string[] = [];
    let shouldFail = true;

    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step1'),
      () => {
        tracker.push('step2');

        if (shouldFail)
          throw new Error('fail');
      },
      Helpers.createSyncStep(tracker, 'step3'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(tracker).toEqual(['step1', 'step2']);

    shouldFail = false;

    act(() => {
      result.current.resume();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step2', 'step3']);
  });

  it('preserves error info until resume', async () => {
    const errorMessage = 'Custom error message';

    const { result } = renderHook(() => usePipeline([
      Helpers.createFailingStep([], 'step', errorMessage),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.error).toBeInstanceOf(Error);
    expect((result.current.current!.error as Error).message).toBe(errorMessage);
  });

  it('preserves step index until resume', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep([], 'step1'),
      Helpers.createSyncStep([], 'step2'),
      Helpers.createFailingStep([], 'step3'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.index).toBe(2);
  });

  it('continues from the failed index after resume', async () => {
    const tracker: string[] = [];
    let failCount = 0;

    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step1'),
      () => {
        tracker.push('step2');
        failCount++;

        if (failCount === 1)
          throw new Error('fail once');
      },
      Helpers.createSyncStep(tracker, 'step3'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    expect(result.current.current!.index).toBe(1);

    act(() => {
      result.current.resume();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step2', 'step3']);
  });

  it('can fail again after resume and be resumed again', async () => {
    let failCount = 0;

    const { result } = renderHook(() => usePipeline([
      () => {
        failCount++;

        if (failCount <= 2)
          throw new Error(`fail ${failCount}`);
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    act(() => {
      result.current.resume();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('failed');
    });

    act(() => {
      result.current.resume();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(failCount).toBe(3);
  });

  it('sets state to running when resumed', async () => {
    let shouldFail = true;

    const { result } = renderHook(() => usePipeline([
      async () => {
        await Helpers.delay(50);

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

    shouldFail = false;

    act(() => {
      result.current.resume();
    });

    expect(result.current.state).toBe('running');

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });
  });
});
