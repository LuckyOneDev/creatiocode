type Callback<T> = () => Promise<T>

export type AsyncQueue<T = void> = {
  push: (task: Callback<T>) => Promise<T>
  flush: () => Promise<void>
  size: number
}

/**
 * Ensures that each callback pushed onto the queue is executed in series.
 * Such a quetie 😻
 * @param opts.dedupeConcurrent If dedupeConcurrent is `true` it ensures that if multiple
 * tasks are pushed onto the queue while there is an active task, only the
 * last one will be executed, once the active task has completed.
 * e.g. in the below example, only 0 and 3 will be executed.
 * ```
 * const queue = createAsyncQueue({ dedupeConcurrent: true })
 * queue.push(async () => console.log(0)) // returns 0
 * queue.push(async () => console.log(1)) // returns 3
 * queue.push(async () => console.log(2)) // returns 3
 * queue.push(async () => console.log(3)) // returns 3
 * ```
 * */
export function createAsyncQueue<T = void>(opts = { dedupeConcurrent: false }): AsyncQueue<T> {
  const { dedupeConcurrent } = opts
  let queue: Callback<T>[] = []
  let running: Promise<void> | undefined
  let nextPromise = new DeferredPromise<T>()
  const push = (task: Callback<T>) => {
    let taskPromise = new DeferredPromise<T>()
    if (dedupeConcurrent) {
      queue = []
      if (nextPromise.started) nextPromise = new DeferredPromise<T>()
      taskPromise = nextPromise
    }
    queue.push(() => {
      taskPromise.started = true
      task().then(taskPromise.resolve).catch(taskPromise.reject)
      return taskPromise.promise
    })
    if (!running) running = start()
    return taskPromise.promise
  }
  const start = async () => {
    while (queue.length) {
      const task = queue.shift()!
      await task().catch(() => {})
    }
    running = undefined
  }
  return {
    push,
    flush: () => running || Promise.resolve(),
    get size() {
      return queue.length
    },
  }
}

export const createAsyncQueues = <T = void>(opts = { dedupeConcurrent: false }) => {
  const queues: { [queueId: string]: AsyncQueue<T> } = {}
  const push = (queueId: string, task: Callback<T>) => {
    if (!queues[queueId]) queues[queueId] = createAsyncQueue<T>(opts)
    return queues[queueId].push(task)
  }
  const flush = (queueId: string) => {
    if (!queues[queueId]) queues[queueId] = createAsyncQueue<T>(opts)
    return queues[queueId].flush()
  }
  return { push, flush }
}

class DeferredPromise<T = void, E = any> {
  started = false
  resolve: (x: T | PromiseLike<T>) => void = () => {}
  reject: (x: E) => void = () => {}
  promise: Promise<T>

  constructor() {
    this.promise = new Promise<T>((res, rej) => {
      this.resolve = res
      this.reject = rej
    })
  }
}
