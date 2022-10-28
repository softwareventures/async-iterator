import type {AsyncIterableLike} from "@softwareventures/async-iterable";

export type AsyncIteratorLike<T> =
    | AsyncIterator<T>
    | Iterator<T | Promise<T>>
    | Promise<AsyncIterator<T>>
    | Promise<Iterator<T | Promise<T>>>
    | AsyncIterableLike<T>;
