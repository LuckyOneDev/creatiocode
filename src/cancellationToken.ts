// https://gist.github.com/bakerface/492c631c6aa23e915bde9243252b52f4
export type CancellationSubscriber = (err: Error) => void;
export type Unsubscribe = () => void;

export interface CancellationToken {
  subscribe(subscriber: CancellationSubscriber): Unsubscribe;
}

export class CancellationError extends Error {
  public readonly name = "CancellationError";
  public readonly message = "The operation was cancelled";
}

export class CancellationTokenSource {
  private _cancellation: Error | undefined;
  private _subscribers: CancellationSubscriber[] = [];

  public subscribe(subscriber: CancellationSubscriber) {
    if (this._cancellation) {
      subscriber(this._cancellation);
    } else {
      this._subscribers.push(subscriber);
    }

    return () => {
      this._subscribers = this._subscribers.filter(s => s !== subscriber);
    };
  }

  public cancel(err: Error = new CancellationError()) {
    this._cancellation = err;
    this._subscribers.splice(0).forEach(subscriber => subscriber(err));
  }
}

export const None: CancellationToken = new CancellationTokenSource();