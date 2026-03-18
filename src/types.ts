export type PipelineAction = (signal?: AbortSignal) => Promise<unknown> | unknown;

export interface PipelineStepWithId {
  id: string;
  action: PipelineAction;
}

export type PipelineStep = PipelineAction | PipelineStepWithId;

//

export interface PipelineOptions {
  autostart?: boolean;
}

//

export type PipelineState = 'idle' | 'running' | 'failed' | 'completed';

export type StepState = 'running' | 'failed';

//

export interface CurrentStatus<TIds extends string | undefined> {
  index: number;
  id: TIds;
  state: StepState;
  error: unknown | undefined;
}

//

export interface PipelineMethods {
  start: () => boolean;
  stop: () => boolean;
  resume: () => boolean;
}

export type PipelineIdle = PipelineMethods & {
  state: 'idle';
  current: undefined;
}

export type PipelineRunning<TIds extends string | undefined> = PipelineMethods & {
  state: 'running';
  current: CurrentStatus<TIds>;
}

export type PipelineFailed<TIds extends string | undefined> = PipelineMethods & {
  state: 'failed';
  current: CurrentStatus<TIds>;
}

export type PipelineCompleted = PipelineMethods & {
  state: 'completed';
  current: undefined;
}

export type PipelineResult<TIds extends string | undefined> =
  | PipelineIdle
  | PipelineRunning<TIds>
  | PipelineFailed<TIds>
  | PipelineCompleted;

//

export type ExtractStepId<T> = T extends { id: infer Id extends string } ? Id : undefined;

export type ExtractAllIds<T extends readonly PipelineStep[]> = ExtractStepId<T[number]>;
