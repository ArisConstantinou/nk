import type {ExperienceCleanup, FrameScheduler} from './types';

type QueueName = 'reads' | 'writes';

export class RafFrameScheduler implements FrameScheduler {
  #reads = new Set<() => void>();
  #writes = new Set<() => void>();
  #frame = 0;

  read(callback: () => void) {
    return this.#schedule('reads', callback);
  }

  write(callback: () => void) {
    return this.#schedule('writes', callback);
  }

  cancelAll() {
    if (this.#frame) cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#reads.clear();
    this.#writes.clear();
  }

  #schedule(queueName: QueueName, callback: () => void): ExperienceCleanup {
    const queue = queueName === 'reads' ? this.#reads : this.#writes;
    queue.add(callback);
    if (!this.#frame) this.#frame = requestAnimationFrame(() => this.#flush());
    return () => queue.delete(callback);
  }

  #flush() {
    this.#frame = 0;
    const reads = [...this.#reads];
    const writes = [...this.#writes];
    this.#reads.clear();
    this.#writes.clear();
    for (const callback of reads) callback();
    for (const callback of writes) callback();
    if ((this.#reads.size || this.#writes.size) && !this.#frame) this.#frame = requestAnimationFrame(() => this.#flush());
  }
}
