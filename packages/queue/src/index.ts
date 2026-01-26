import type {
  Job,
  Processor,
  Queue,
  QueueOptions,
  Worker,
  WorkerOptions,
} from "bullmq";
import { Queue as BullQueue, Worker as BullWorker } from "bullmq";

import { getRedisWorkerClient } from "@getblitz/redis";

const DEFAULT_PREFIX = "getblitz";

export function createQueue<T>(
  name: string,
  options?: Omit<QueueOptions, "connection">,
): Queue<T> {
  return new BullQueue(name, {
    connection: getRedisWorkerClient(),
    prefix: DEFAULT_PREFIX,
    ...options,
  });
}

export function createWorker<T, R = unknown, N extends string = string>(
  name: string,
  processor: Processor<T, R, N>,
  options?: Omit<WorkerOptions, "connection">,
): Worker<T, R, N> {
  return new BullWorker(name, processor, {
    connection: getRedisWorkerClient(),
    prefix: DEFAULT_PREFIX,
    ...options,
  });
}

export { type Job };
