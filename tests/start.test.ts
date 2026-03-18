import { describe, it, expect } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

import { usePipeline } from '../src'
import * as Helpers from './helpers'

//

describe('usePipeline - start()', () => {
  it('executes sync steps sequentially', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep(tracker, 'step1'),
      Helpers.createSyncStep(tracker, 'step2'),
      Helpers.createSyncStep(tracker, 'step3'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step3']);
  });

  it('executes async steps sequentially', async () => {
    const tracker: string[] = [];

    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep(tracker, 'step1', 10),
      Helpers.createAsyncStep(tracker, 'step2', 10),
      Helpers.createAsyncStep(tracker, 'step3', 10),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step1', 'step2', 'step3']);
  });

  it('returns true when started successfully', () => {
    const { result } = renderHook(() => usePipeline([
      () => {},
    ]));

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.start();
    });

    expect(returnValue!).toBe(true);
  });

  it('returns false when already running', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    let secondReturnValue: boolean;

    act(() => {
      secondReturnValue = result.current.start();
    });

    expect(secondReturnValue!).toBe(false);
  });

  it('returns false when in failed state', async () => {
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
      returnValue = result.current.start();
    });

    expect(returnValue!).toBe(false);
  });

  it('can start again after completed', async () => {
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

    expect(tracker).toEqual(['step']);

    let returnValue: boolean;

    act(() => {
      returnValue = result.current.start();
    });

    expect(returnValue!).toBe(true);

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(tracker).toEqual(['step', 'step']);
  });

  it('sets state to running immediately', () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 100),
    ]));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('running');
  });

  it('sets state to completed when all steps finish', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep([], 'step1'),
      Helpers.createSyncStep([], 'step2'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });
  });

  it('sets current with step info while running', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createAsyncStep([], 'step', 50),
    ]));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('running');
    expect(result.current.current).toBeDefined();
    expect(result.current.current!.index).toBe(0);
    expect(result.current.current!.state).toBe('running');
  });

  it('tracks current step index during execution', async () => {
    const indices: number[] = [];

    const { result } = renderHook(() => usePipeline([
      async () => {
        await Helpers.delay(10);
      },
      async () => {
        await Helpers.delay(10);
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      if (result.current.current)
        indices.push(result.current.current.index);

      return result.current.state === 'completed';
    });

    expect(indices).toContain(0);
  });

  it('sets current to undefined when completed', async () => {
    const { result } = renderHook(() => usePipeline([
      Helpers.createSyncStep([], 'step'),
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(result.current.current).toBeUndefined();
  });

  it('handles empty steps array gracefully', async () => {
    const { result } = renderHook(() => usePipeline([]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });
  });

  it('passes abort signal to step function', async () => {
    let receivedSignal: AbortSignal | undefined;

    const { result } = renderHook(() => usePipeline([
      (signal) => {
        receivedSignal = signal;
      },
    ]));

    act(() => {
      result.current.start();
    });

    await waitFor(() => {
      expect(result.current.state).toBe('completed');
    });

    expect(receivedSignal).toBeInstanceOf(AbortSignal);
  });

  it('tracks step id when provided', async () => {
    const { result } = renderHook(() => usePipeline([
      { id: 'my-step', action: () => Helpers.delay(50) },
    ]));

    act(() => {
      result.current.start();
    });

    expect(result.current.state).toBe('running');
    expect(result.current.current!.id).toBe('my-step');
  });

  it('has undefined id for steps without id', async () => {
    const { result } = renderHook(() => usePipeline([
      () => Helpers.delay(50),
    ]));

    act(() => {
      result.current.start();
    });

    expect(result.current.current!.id).toBeUndefined();
  });
});
