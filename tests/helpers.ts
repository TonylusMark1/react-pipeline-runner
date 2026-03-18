import { act } from '@testing-library/react'

import type * as Types from '../src/types'

//

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function flushPromises(): Promise<void> {
  await act(async () => {
    await delay(0);
  });
}

export async function advanceTime(ms: number): Promise<void> {
  await act(async () => {
    await delay(ms);
  });
}

//

export function createSyncStep(tracker: string[], label: string): Types.PipelineAction {
  return () => {
    tracker.push(label);
  };
}

export function createAsyncStep(
  tracker: string[],
  label: string,
  delayMs: number = 10
): Types.PipelineAction {
  return async (signal?: AbortSignal) => {
    await delay(delayMs);

    if (signal?.aborted)
      return;

    tracker.push(label);
  };
}

export function createFailingStep(
  tracker: string[],
  label: string,
  errorMessage: string = 'Step failed'
): Types.PipelineAction {
  return () => {
    tracker.push(label);
    throw new Error(errorMessage);
  };
}

export function createAsyncFailingStep(
  tracker: string[],
  label: string,
  delayMs: number = 10,
  errorMessage: string = 'Step failed'
): Types.PipelineAction {
  return async (signal?: AbortSignal) => {
    await delay(delayMs);

    if (signal?.aborted)
      return;

    tracker.push(label);
    throw new Error(errorMessage);
  };
}

export function createAbortAwareStep(
  tracker: string[],
  label: string,
  delayMs: number = 50
): Types.PipelineAction {
  return async (signal?: AbortSignal) => {
    tracker.push(`${label}:start`);

    await delay(delayMs);

    if (signal?.aborted) {
      tracker.push(`${label}:aborted`);
      return;
    }

    tracker.push(`${label}:end`);
  };
}
