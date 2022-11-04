import type {AsyncIterableLike} from "@softwareventures/async-iterable";
import {hasProperty} from "unknown";
import {asyncIterable} from "@softwareventures/async-iterable";

export type AsyncIteratorLike<T> =
    | AsyncIterator<T>
    | Iterator<T | Promise<T>>
    | Promise<AsyncIterator<T>>
    | Promise<Iterator<T | Promise<T>>>
    | AsyncIterableLike<T>;

export function asyncIterator<T>(iterator: AsyncIteratorLike<T>): AsyncIterator<T> {
    return hasProperty(iterator, Symbol.asyncIterator)
        ? iterator[Symbol.asyncIterator]()
        : hasProperty(iterator, Symbol.iterator)
        ? asyncIterable(iterator)[Symbol.asyncIterator]()
        : hasProperty(iterator, "then")
        ? fromPromiseOfIteratorLike(iterator)
        : fromSimpleIterator(iterator);
}

type SimpleAsyncIteratorLike<T> = AsyncIterator<T> | Iterator<T | Promise<T>>;

function fromSimpleIterator<T>(iterator: SimpleAsyncIteratorLike<T>): AsyncIterator<T> {
    return {
        next: async (): Promise<IteratorResult<T>> => {
            const n = await iterator.next();
            if (n.done === true) {
                return {done: true, value: undefined};
            } else {
                return {value: await n.value};
            }
        }
    };
}

type SimpleAsyncIteratorOrIterable<T> =
    | SimpleAsyncIteratorLike<T>
    | AsyncIterable<T>
    | Iterable<T | Promise<T>>;

function fromSimpleIteratorOrIterable<T>(
    iterator: SimpleAsyncIteratorOrIterable<T>
): AsyncIterator<T> {
    return hasProperty(iterator, Symbol.asyncIterator)
        ? iterator[Symbol.asyncIterator]()
        : hasProperty(iterator, Symbol.iterator)
        ? asyncIterable(iterator)[Symbol.asyncIterator]()
        : fromSimpleIterator(iterator);
}

type PromiseOfAsyncIteratorLike<T> =
    | Promise<AsyncIterator<T>>
    | Promise<Iterator<T | Promise<T>>>
    | Promise<AsyncIterable<T>>
    | Promise<Iterable<T | Promise<T>>>;

function fromPromiseOfIteratorLike<T>(iterator: PromiseOfAsyncIteratorLike<T>): AsyncIterator<T> {
    let next = async (): Promise<IteratorResult<T>> => {
        const it = iterator.then(it => fromSimpleIteratorOrIterable(it));
        const internal = async (): Promise<IteratorResult<T>> => (await it).next();
        next = internal;
        return internal();
    };
    return {next: async () => next()};
}

export async function asyncToArrayOnce<T>(iterator: AsyncIteratorLike<T>): Promise<T[]> {
    const it = asyncIterator(iterator);
    const array: T[] = [];
    let element = await it.next();
    while (element.done !== true) {
        array.push(element.value);
        element = await it.next();
    }
    return array;
}

export async function asyncToSetOnce<T>(iterator: AsyncIteratorLike<T>): Promise<Set<T>> {
    const it = asyncIterator(iterator);
    const set = new Set<T>();
    let element = await it.next();
    while (element.done !== true) {
        set.add(element.value);
        element = await it.next();
    }
    return set;
}

export async function asyncFirstOnce<T>(iterator: AsyncIteratorLike<T>): Promise<T | null> {
    const it = asyncIterator(iterator);
    const element = await it.next();
    if (element.done === true) {
        return null;
    } else {
        return element.value;
    }
}

export function asyncTailOnce<T>(iterator: AsyncIteratorLike<T>): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    const tail = it.next().then(() => it);
    return fromPromiseOfIteratorLike(tail);
}

export function asyncPushOnce<T>(
    iterator: AsyncIteratorLike<T>,
    value: T | Promise<T>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let next = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (element.done === true) {
            next = async () => Promise.resolve({done: true, value: undefined});
            return {value: await value};
        } else {
            return element;
        }
    };
    return {next: async () => next()};
}

export function asyncPushOnceFn<T>(
    value: T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncPushOnce(iterator, value);
}

export function asyncUnshiftOnce<T>(
    iterator: AsyncIteratorLike<T>,
    value: T | Promise<T>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let next = async (): Promise<IteratorResult<T>> => {
        next = async () => it.next();
        return {value: await value};
    };
    return {next: async () => next()};
}

export function asyncUnshiftOnceFn<T>(
    value: T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncUnshiftOnce(iterator, value);
}

export function asyncInitialOnce<T>(iterator: AsyncIteratorLike<T>): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let prev = it.next();
    return {
        next: async () => {
            const [element, result] = await prev.then(async () => {
                const result = prev;
                prev = it.next();
                return [await prev, await result] as const;
            });
            return element.done === true ? element : result;
        }
    };
}

export async function asyncLastOnce<T>(iterator: AsyncIteratorLike<T>): Promise<T | null> {
    const it = asyncIterator(iterator);
    let last = await it.next();
    if (last.done === true) {
        return null;
    }
    let element = await it.next();
    while (element.done !== true) {
        last = element;
        element = await it.next();
    }
    return last.value;
}

export async function asyncOnlyOnce<T>(iterator: AsyncIteratorLike<T>): Promise<T | null> {
    const it = asyncIterator(iterator);
    const first = await it.next();
    if (first.done === true) {
        return null;
    }
    const second = await it.next();
    if (second.done === true) {
        return first.value;
    } else {
        return null;
    }
}

export async function asyncEmptyOnce<T>(iterator: AsyncIteratorLike<T>): Promise<boolean> {
    return (await asyncIterator(iterator).next()).done === true;
}

export async function asyncNotEmptyOnce<T>(iterator: AsyncIteratorLike<T>): Promise<boolean> {
    return (await asyncIterator(iterator).next()).done !== true;
}

export function asyncSliceOnce<T>(
    iterator: AsyncIteratorLike<T>,
    start: number | Promise<number> = 0,
    end: number | Promise<number> = Infinity
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const done: IteratorResult<T> = {done: true, value: undefined};
    const first = async (): Promise<IteratorResult<T>> => {
        if ((await end) <= (await start)) {
            next = after;
            return done;
        } else {
            next = before;
            return before();
        }
    };
    const before = async (): Promise<IteratorResult<T>> => {
        let element = await it.next();
        const s = await start;
        while (i++ < s && element.done !== true) {
            element = await it.next();
        }

        if (element.done === true) {
            next = after;
            return done;
        } else {
            next = during;
            return element;
        }
    };
    const during = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (i++ < (await end) && element.done !== true) {
            return element;
        } else {
            next = after;
            return done;
        }
    };
    const after = async (): Promise<IteratorResult<T>> => done;
    let next = first;
    return {next: async () => next()};
}

export function asyncSliceOnceFn<T>(
    start: number | Promise<number>,
    end: number | Promise<number> = Infinity
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncSliceOnce(iterator, start, end);
}

export function asyncTakeOnce<T>(
    iterator: AsyncIteratorLike<T>,
    count: number | Promise<number>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const done: IteratorResult<T> = {done: true, value: undefined};
    const during = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        const c = await count;
        if (i++ < c && element.done !== true) {
            return element;
        } else {
            next = after;
            return done;
        }
    };
    const after = async (): Promise<IteratorResult<T>> => done;
    let next = during;
    return {next: async () => next()};
}

export function asyncTakeOnceFn<T>(
    count: number | Promise<number>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncTakeOnce(iterator, count);
}

export function asyncDropOnce<T>(
    iterator: AsyncIteratorLike<T>,
    count: number | Promise<number>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const before = async (): Promise<IteratorResult<T>> => {
        let element = await it.next();
        const c = await count;
        while (i++ < c && element.done !== true) {
            element = await it.next();
        }

        next = during;
        return element;
    };
    const during = async (): Promise<IteratorResult<T>> => it.next();
    let next = before;
    return {next: async () => next()};
}

export function asyncDropOnceFn<T>(
    count: number | Promise<number>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncDropOnce(iterator, count);
}

export function asyncTakeWhileOnce<T, U extends T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => element is U
): AsyncIterator<T>;
export function asyncTakeWhileOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T>;
export function asyncTakeWhileOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const done: IteratorResult<T> = {done: true, value: undefined};
    const during = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (element.done !== true && (await predicate(element.value, i++))) {
            return element;
        } else {
            next = after;
            return done;
        }
    };
    const after = async (): Promise<IteratorResult<T>> => done;
    let next = during;
    return {next: async () => next()};
}

export function asyncTakeWhileOnceFn<T, U extends T>(
    predicate: (element: T, index: number) => element is U
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<U>;
export function asyncTakeWhileOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T>;
export function asyncTakeWhileOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncTakeWhileOnce(iterator, predicate);
}

export function asyncTakeUntilOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const done: IteratorResult<T> = {done: true, value: undefined};
    const during = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (element.done !== true && !(await predicate(element.value, i++))) {
            return element;
        } else {
            next = after;
            return done;
        }
    };
    const after = async (): Promise<IteratorResult<T>> => done;
    let next = during;
    return {next: async () => next()};
}

export function asyncTakeUntilOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncTakeUntilOnce(iterator, predicate);
}
