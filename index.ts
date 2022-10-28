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
