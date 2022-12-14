import type {Comparator} from "@softwareventures/ordered";
import {compare as defaultCompare, equal as defaultEqual, reverse} from "@softwareventures/ordered";
import type {AsyncIterableLike} from "@softwareventures/async-iterable";
import {asyncIterable} from "@softwareventures/async-iterable";
import {hasProperty} from "unknown";
import {isNotNull} from "@softwareventures/nullable";

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

export function asyncDropWhileOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const before = async (): Promise<IteratorResult<T>> => {
        let element = await it.next();
        while (element.done !== true && (await predicate(element.value, i++))) {
            element = await it.next();
        }
        next = during;
        return element;
    };
    const during = async (): Promise<IteratorResult<T>> => it.next();
    let next = before;
    return {next: async () => next()};
}

export function asyncDropWhileOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncDropWhileOnce(iterator, predicate);
}

export function asyncDropUntilOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const before = async (): Promise<IteratorResult<T>> => {
        let element = await it.next();
        while (element.done !== true && !(await predicate(element.value, i++))) {
            element = await it.next();
        }
        next = during;
        return element;
    };
    const during = async (): Promise<IteratorResult<T>> => it.next();
    let next = before;
    return {next: async () => next()};
}

export function asyncDropUntilOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncDropUntilOnce(iterator, predicate);
}

export async function asyncEqualOnce<T>(
    a: AsyncIteratorLike<T>,
    b: AsyncIteratorLike<T>,
    elementsEqual: (a: T, b: T) => boolean | Promise<boolean> = defaultEqual
): Promise<boolean> {
    const ait = asyncIterator(a);
    const bit = asyncIterator(b);
    let [aElement, bElement] = await Promise.all([ait.next(), bit.next()] as const);
    while (
        aElement.done !== true &&
        bElement.done !== true &&
        (await elementsEqual(aElement.value, bElement.value))
    ) {
        [aElement, bElement] = await Promise.all([ait.next(), bit.next()] as const);
    }
    return aElement.done === true && bElement.done === true;
}

export function asyncEqualOnceFn<T>(
    b: AsyncIteratorLike<T>,
    elementsEqual: (a: T, b: T) => boolean | Promise<boolean> = defaultEqual
): (a: AsyncIteratorLike<T>) => Promise<boolean> {
    return async a => asyncEqualOnce(a, b, elementsEqual);
}

export async function asyncNotEqualOnce<T>(
    a: AsyncIteratorLike<T>,
    b: AsyncIteratorLike<T>,
    elementsEqual: (a: T, b: T) => boolean | Promise<boolean> = defaultEqual
): Promise<boolean> {
    return !(await asyncEqualOnce(a, b, elementsEqual));
}

export function asyncNotEqualOnceFn<T>(
    b: AsyncIteratorLike<T>,
    elementsEqual: (a: T, b: T) => boolean | Promise<boolean> = defaultEqual
): (a: AsyncIteratorLike<T>) => Promise<boolean> {
    return async a => !(await asyncEqualOnce(a, b, elementsEqual));
}

export async function asyncPrefixMatchOnce<T>(
    a: AsyncIteratorLike<T>,
    b: AsyncIteratorLike<T>,
    elementsEqual: (a: T, b: T) => boolean | Promise<boolean> = defaultEqual
): Promise<boolean> {
    const ait = asyncIterator(a);
    const bit = asyncIterator(b);
    let [aElement, bElement] = await Promise.all([ait.next(), bit.next()] as const);
    while (
        aElement.done !== true &&
        bElement.done !== true &&
        (await elementsEqual(aElement.value, bElement.value))
    ) {
        [aElement, bElement] = await Promise.all([ait.next(), bit.next()] as const);
    }
    return bElement.done === true;
}

export function asyncMapOnce<T, U>(
    iterator: AsyncIteratorLike<T>,
    f: (element: T, index: number) => U
): AsyncIterator<U> {
    const it = asyncIterator(iterator);
    let i = 0;
    const done: IteratorResult<U> = {done: true, value: undefined};
    const during = async (): Promise<IteratorResult<U>> => {
        const element = await it.next();
        if (element.done === true) {
            next = after;
            return done;
        } else {
            return {value: f(element.value, i++)};
        }
    };
    const after = async (): Promise<IteratorResult<U>> => done;
    let next = during;
    return {next: async () => next()};
}

export function asyncMapOnceFn<T, U>(
    f: (element: T, index: number) => U
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<U> {
    return iterator => asyncMapOnce(iterator, f);
}

export function asyncFilterOnce<T, U extends T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => element is U
): AsyncIterator<U>;
export function asyncFilterOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T>;
export function asyncFilterOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    return {
        next: async () => {
            let element = await it.next();
            while (element.done !== true && !(await predicate(element.value, i++))) {
                element = await it.next();
            }
            return element;
        }
    };
}

export function asyncFilterOnceFn<T, U extends T>(
    predicate: (element: T, index: number) => element is U
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<U>;
export function asyncFilterOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T>;
export function asyncFilterOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncFilterOnce(iterator, predicate);
}

export function asyncExcludeOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    return {
        next: async () => {
            let element = await it.next();
            while (element.done !== true && (await predicate(element.value, i++))) {
                element = await it.next();
            }
            return element;
        }
    };
}

export function asyncExcludeOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncExcludeOnce(iterator, predicate);
}

export function asyncExcludeNullOnce<T>(
    iterator: AsyncIteratorLike<T | null | undefined>
): AsyncIterator<T> {
    return asyncFilterOnce(iterator, isNotNull);
}

export function asyncExcludeFirstOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 0;
    const before = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (element.done !== true && !(await predicate(element.value, i++))) {
            return element;
        }
        next = after;
        return it.next();
    };
    const after = async (): Promise<IteratorResult<T>> => it.next();
    let next = before;
    return {next: async () => next()};
}

export function asyncExcludeFirstOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncExcludeFirstOnce(iterator, predicate);
}

export function asyncRemoveOnce<T>(
    iterator: AsyncIteratorLike<T>,
    value: T | Promise<T>
): AsyncIterator<T> {
    return asyncExcludeOnce(iterator, async element => element === (await value));
}

export function asyncRemoveOnceFn<T>(
    value: T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncRemoveOnce(iterator, value);
}

export function asyncRemoveFirstOnce<T>(
    iterator: AsyncIteratorLike<T>,
    value: T | Promise<T>
): AsyncIterator<T> {
    return asyncExcludeFirstOnce(iterator, async element => element === (await value));
}

export function asyncRemoveFirstOnceFn<T>(
    value: T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncRemoveFirstOnce(iterator, value);
}

export async function asyncFoldOnce<T, U>(
    iterator: AsyncIteratorLike<T>,
    f: (accumulator: U, element: T, index: number) => U | Promise<U>,
    initial: U | Promise<U>
): Promise<U> {
    const it = asyncIterator(iterator);
    let [element, accumulator] = await Promise.all([it.next(), initial] as const);
    let i = 0;
    while (element.done !== true) {
        [accumulator, element] = await Promise.all([
            f(accumulator, element.value, i++),
            it.next()
        ] as const);
    }
    return accumulator;
}

export function asyncFoldOnceFn<T, U>(
    f: (accumulator: U, element: T, index: number) => U | Promise<U>,
    initial: U | Promise<U>
): (iterator: AsyncIteratorLike<T>) => Promise<U> {
    return async iterator => asyncFoldOnce(iterator, f, initial);
}

export async function asyncFold1Once<T>(
    iterator: AsyncIteratorLike<T>,
    f: (accumulator: T, element: T, index: number) => T | Promise<T>
): Promise<T> {
    const it = asyncIterator(iterator);
    const element = await it.next();

    if (element.done === true) {
        throw new TypeError("asyncFold1Once: empty AsyncIterator");
    }

    return asyncFoldOnce(
        it,
        async (accumulator, element, index) => f(accumulator, element, index + 1),
        element.value
    );
}

export function asyncFold1OnceFn<T>(
    f: (accumulator: T, element: T, index: number) => T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => Promise<T> {
    return async iterator => asyncFold1Once(iterator, f);
}

export async function asyncIndexOnce<T>(
    iterator: AsyncIteratorLike<T>,
    index: number | Promise<number>
): Promise<T | null> {
    const it = asyncIterator(iterator);
    const [i, e] = await Promise.all([index, it.next()] as const);

    if (i < 0 || !isFinite(i) || Math.floor(i) !== i) {
        throw new RangeError("illegal index");
    }

    let element = e;
    for (let j = 0; element.done !== true && j < i; ++j) {
        element = await it.next();
    }

    if (element.done === true) {
        return null;
    } else {
        return element.value;
    }
}

export function asyncIndexOnceFn<T>(
    index: number | Promise<number>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null> {
    return async iterator => asyncIndexOnce(iterator, index);
}

export async function asyncContainsOnce<T>(
    iterator: AsyncIteratorLike<T>,
    value: T | Promise<T>
): Promise<boolean> {
    const it = asyncIterator(iterator);
    const [v, e] = await Promise.all([value, it.next()] as const);
    let element = e;
    while (element.done !== true) {
        if (element.value === v) {
            return true;
        }
        element = await it.next();
    }
    return false;
}

export function asyncContainsOnceFn<T>(
    value: T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => Promise<boolean> {
    return async iterator => asyncContainsOnce(iterator, value);
}

export async function asyncIndexOfOnce<T>(
    iterator: AsyncIteratorLike<T>,
    value: T | Promise<T>
): Promise<number | null> {
    const it = asyncIterator(iterator);
    const [v, e] = await Promise.all([value, it.next()] as const);
    let element = e;
    for (let i = 0; element.done !== true; ++i) {
        if (element.value === v) {
            return i;
        }
        element = await it.next();
    }
    return null;
}

export function asyncIndexOfOnceFn<T>(
    value: T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => Promise<number | null> {
    return async iterator => asyncIndexOfOnce(iterator, value);
}

export async function asyncFindIndexOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): Promise<number | null> {
    const it = asyncIterator(iterator);
    let element = await it.next();
    for (let i = 0; element.done !== true; ++i) {
        if (await predicate(element.value, i)) {
            return i;
        }
        element = await it.next();
    }
    return null;
}

export function asyncFindIndexOnceFn<T>(
    predicate: (element: T, index: number) => boolean
): (iterator: AsyncIteratorLike<T>) => Promise<number | null> {
    return async iterator => asyncFindIndexOnce(iterator, predicate);
}

export async function asyncFindOnce<T, U extends T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => element is U
): Promise<U | null>;
export async function asyncFindOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): Promise<T | null>;
export async function asyncFindOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): Promise<T | null> {
    const it = asyncIterator(iterator);
    let element = await it.next();
    for (let i = 0; element.done !== true; ++i) {
        if (await predicate(element.value, i)) {
            return element.value;
        }
        element = await it.next();
    }
    return null;
}

export function asyncFindOnceFn<T, U extends T>(
    predicate: (element: T, index: number) => element is U
): (iterator: AsyncIteratorLike<T>) => Promise<U | null>;
export function asyncFindOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null>;
export function asyncFindOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null> {
    return async iterator => asyncFindOnce(iterator, predicate);
}

export async function asyncMaximumOnce<T extends string | number | boolean>(
    iterator: AsyncIteratorLike<T>
): Promise<T | null>;
export async function asyncMaximumOnce<T>(
    iterator: AsyncIteratorLike<T>,
    compare: Comparator<T>
): Promise<T | null>;
export async function asyncMaximumOnce<T>(
    iterator: AsyncIteratorLike<T>,
    compare?: Comparator<T>
): Promise<T | null> {
    return internalAsyncMaximumOnce(
        iterator,
        compare ?? (defaultCompare as unknown as Comparator<T>)
    );
}

export function asyncMaximumOnceFn<T>(
    compare: Comparator<T>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null> {
    return async iterator => internalAsyncMaximumOnce(iterator, compare);
}

async function internalAsyncMaximumOnce<T>(
    iterator: AsyncIteratorLike<T>,
    compare: Comparator<T>
): Promise<T | null> {
    const it = asyncIterator(iterator);
    let element = await it.next();

    if (element.done === true) {
        return null;
    }

    let max = element.value;
    element = await it.next();
    while (element.done !== true) {
        if (compare(element.value, max) > 0) {
            max = element.value;
        }
        element = await it.next();
    }

    return max;
}

export async function asyncMaximumByOnce<T>(
    iterator: AsyncIteratorLike<T>,
    select: (element: T, index: number) => number | Promise<number>
): Promise<T | null> {
    const it = asyncIterator(iterator);
    let element = await it.next();

    if (element.done === true) {
        return null;
    }

    let max = element.value;
    let maxBy: number;
    [maxBy, element] = await Promise.all([select(element.value, 0), it.next()] as const);
    for (let i = 1; element.done !== true; ++i) {
        const [by, next] = await Promise.all([select(element.value, i), it.next()] as const);
        if (by > maxBy) {
            max = element.value;
            maxBy = by;
        }
        element = next;
    }

    return max;
}

export function asyncMaximumByOnceFn<T>(
    select: (element: T, index: number) => number | Promise<number>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null> {
    return async iterator => asyncMaximumByOnce(iterator, select);
}

export async function asyncMinimumOnce<T extends string | number | boolean>(
    iterator: AsyncIteratorLike<T>
): Promise<T | null>;
export async function asyncMinimumOnce<T>(
    iterator: AsyncIteratorLike<T>,
    compare: Comparator<T>
): Promise<T | null>;
export async function asyncMinimumOnce<T>(
    iterator: AsyncIteratorLike<T>,
    compare?: Comparator<T>
): Promise<T | null> {
    return internalAsyncMaximumOnce(
        iterator,
        reverse(compare ?? (defaultCompare as unknown as Comparator<T>))
    );
}

export function asyncMinimumOnceFn<T>(
    compare: Comparator<T>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null> {
    return async iterator => internalAsyncMaximumOnce(iterator, reverse(compare));
}

export async function asyncMinimumByOnce<T>(
    iterator: AsyncIteratorLike<T>,
    select: (element: T, index: number) => number | Promise<number>
): Promise<T | null> {
    const it = asyncIterator(iterator);
    let element = await it.next();

    if (element.done === true) {
        return null;
    }

    let min = element.value;
    let minBy: number;
    [minBy, element] = await Promise.all([select(element.value, 0), it.next()] as const);
    for (let i = 1; element.done !== true; ++i) {
        const [by, next] = await Promise.all([select(element.value, i), it.next()] as const);
        if (by < minBy) {
            min = element.value;
            minBy = by;
        }
        element = next;
    }

    return min;
}

export function asyncMinimumByOnceFn<T>(
    select: (element: T, index: number) => number | Promise<number>
): (iterator: AsyncIteratorLike<T>) => Promise<T | null> {
    return async iterator => asyncMinimumByOnce(iterator, select);
}

export async function asyncSumOnce(iterator: AsyncIteratorLike<number>): Promise<number> {
    return asyncFoldOnce(iterator, (a, e) => a + e, 0);
}

export async function asyncProductOnce(iterator: AsyncIteratorLike<number>): Promise<number> {
    return asyncFoldOnce(iterator, (a, e) => a * e, 1);
}

export async function asyncAverageOnce(
    iterator: AsyncIteratorLike<number>
): Promise<number | null> {
    const [sum, count] = await asyncFoldOnce(
        iterator,
        ([sum], element, index) => [sum + element, index + 1],
        [0, 0]
    );
    return count === 0 ? null : sum / count;
}

export async function asyncAndOnce(iterator: AsyncIteratorLike<boolean>): Promise<boolean> {
    return (await asyncFindIndexOnce(iterator, element => !element)) == null;
}

export async function asyncOrOnce(iterator: AsyncIteratorLike<boolean>): Promise<boolean> {
    return (await asyncFindIndexOnce(iterator, element => element)) != null;
}

export async function asyncAnyOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): Promise<boolean> {
    return (await asyncFindIndexOnce(iterator, predicate)) != null;
}

export function asyncAnyOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => Promise<boolean> {
    return async iterator => asyncAnyOnce(iterator, predicate);
}

export async function asyncAllOnce<T>(
    iterator: AsyncIteratorLike<T>,
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): Promise<boolean> {
    return (
        (await asyncFindIndexOnce(
            iterator,
            async (element, index) => !(await predicate(element, index))
        )) == null
    );
}

export function asyncAllOnceFn<T>(
    predicate: (element: T, index: number) => boolean | Promise<boolean>
): (iterator: AsyncIteratorLike<T>) => Promise<boolean> {
    return async iterator => asyncAllOnce(iterator, predicate);
}

export function asyncConcatOnce<T>(
    iterators: AsyncIteratorLike<AsyncIteratorLike<T>>
): AsyncIterator<T> {
    const its = asyncIterator(iterators);
    const done: IteratorResult<T> = {done: true, value: undefined};
    const first = async (): Promise<IteratorResult<T>> => {
        const itElement = await its.next();
        if (itElement.done === true) {
            next = after;
            return done;
        } else {
            next = during(asyncIterator(itElement.value));
            return next();
        }
    };
    const during = (iterator: AsyncIterator<T>) => async (): Promise<IteratorResult<T>> => {
        let element = await iterator.next();
        while (element.done === true) {
            const itElement = await its.next();
            if (itElement.done === true) {
                next = after;
                return done;
            } else {
                const iterator = asyncIterator(itElement.value);
                next = during(iterator);
                element = await iterator.next();
            }
        }

        return element;
    };
    const after = async (): Promise<IteratorResult<T>> => done;
    let next = first;
    return {next: async () => next()};
}

export function asyncPrependOnce<T>(
    a: AsyncIteratorLike<T>
): (b: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return b => asyncConcatOnce([a, b]);
}

export function asyncAppendOnce<T>(
    b: AsyncIteratorLike<T>
): (a: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return a => asyncConcatOnce([a, b]);
}

export function asyncConcatMapOnce<T, U>(
    iterator: AsyncIteratorLike<T>,
    f: (element: T, index: number) => AsyncIteratorLike<U>
): AsyncIterator<U> {
    return asyncConcatOnce(asyncMapOnce(iterator, f));
}

export function asyncConcatMapOnceFn<T, U>(
    f: (element: T, index: number) => AsyncIteratorLike<U>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<U> {
    return iterator => asyncConcatMapOnce(iterator, f);
}

export async function asyncNoneNullOnce<T>(
    iterator: AsyncIteratorLike<T | null | undefined>
): Promise<T[] | null> {
    const array: T[] = [];
    const it = asyncIterator(iterator);
    let element = await it.next();
    while (element.done !== true) {
        if (element.value == null) {
            return null;
        } else {
            array.push(element.value);
        }
        element = await it.next();
    }
    return array;
}

export function asyncScanOnce<T, U>(
    iterator: AsyncIteratorLike<T>,
    f: (accumulator: U, element: T, index: number) => U | Promise<U>,
    initial: U
): AsyncIterator<U> {
    const it = asyncIterator(iterator);
    let i = 0;
    const during = (accumulator: U) => async (): Promise<IteratorResult<U>> => {
        const element = await it.next();
        if (element.done === true) {
            next = after;
            return after();
        } else {
            const value = await f(accumulator, element.value, i++);
            next = during(value);
            return {value};
        }
    };
    const after = async (): Promise<IteratorResult<U>> => ({done: true, value: undefined});
    let next = during(initial);
    return {next: async () => next()};
}

export function asyncScanOnceFn<T, U>(
    f: (accumulator: U, element: T, index: number) => U | Promise<U>,
    initial: U
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<U> {
    return iterator => asyncScanOnce(iterator, f, initial);
}

export function asyncScan1Once<T>(
    iterator: AsyncIteratorLike<T>,
    f: (accumulator: T, element: T, index: number) => T | Promise<T>
): AsyncIterator<T> {
    const it = asyncIterator(iterator);
    let i = 1;
    const first = async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (element.done === true) {
            next = after;
            return after();
        } else {
            next = during(element.value);
            return {value: element.value};
        }
    };
    const during = (accumulator: T) => async (): Promise<IteratorResult<T>> => {
        const element = await it.next();
        if (element.done === true) {
            next = after;
            return after();
        } else {
            const value = await f(accumulator, element.value, i++);
            next = during(value);
            return {value};
        }
    };
    const after = async (): Promise<IteratorResult<T>> => ({done: true, value: undefined});
    let next = first;
    return {next: async () => next()};
}

export function asyncScan1OnceFn<T>(
    f: (accumulator: T, element: T, index: number) => T | Promise<T>
): (iterator: AsyncIteratorLike<T>) => AsyncIterator<T> {
    return iterator => asyncScan1Once(iterator, f);
}

export function asyncPairwiseOnce<T>(
    iterator: AsyncIteratorLike<T>
): AsyncIterator<readonly [T, T]> {
    const it = asyncIterator(iterator);
    const before = async (): Promise<IteratorResult<readonly [T, T]>> => {
        const element = await it.next();
        if (element.done === true) {
            next = after;
            return after();
        } else {
            next = during(element.value);
            return next();
        }
    };
    const during = (previous: T) => async (): Promise<IteratorResult<readonly [T, T]>> => {
        const element = await it.next();
        if (element.done === true) {
            next = after;
            return after();
        } else {
            next = during(element.value);
            return {value: [previous, element.value]};
        }
    };
    const after = async (): Promise<IteratorResult<readonly [T, T]>> => ({
        done: true,
        value: undefined
    });
    let next = before;
    return {next: async () => next()};
}

export function asyncZipOnce<T, U>(
    a: AsyncIteratorLike<T>,
    b: AsyncIteratorLike<U>
): AsyncIterator<readonly [T, U]> {
    const ait = asyncIterator(a);
    const bit = asyncIterator(b);
    const during = async (): Promise<IteratorResult<readonly [T, U]>> => {
        const [aElement, bElement] = await Promise.all([ait.next(), bit.next()] as const);
        if (aElement.done === true || bElement.done === true) {
            next = after;
            return after();
        } else {
            return {value: [aElement.value, bElement.value]};
        }
    };
    const after = async (): Promise<IteratorResult<readonly [T, U]>> => ({
        done: true,
        value: undefined
    });
    let next = during;
    return {next: async () => next()};
}

export function asyncZipOnceFn<T, U>(
    b: AsyncIteratorLike<U>
): (a: AsyncIteratorLike<T>) => AsyncIterator<readonly [T, U]> {
    return a => asyncZipOnce(a, b);
}

export async function asyncKeyByOnce<TKey, TElement>(
    iterator: AsyncIteratorLike<TElement>,
    f: (element: TElement, index: number) => TKey | Promise<TKey>
): Promise<Map<TKey, readonly TElement[]>> {
    const it = asyncIterator(iterator);
    const map = new Map<TKey, TElement[]>();
    for (
        let i = 0, element = await it.next();
        element.done !== true;
        ++i, element = await it.next()
    ) {
        const key = await f(element.value, i);
        const entries = map.get(key) ?? [];
        map.set(key, [...entries, element.value]);
    }
    return map;
}

export function asyncKeyByOnceFn<TKey, TElement>(
    f: (element: TElement, index: number) => TKey | Promise<TKey>
): (iterator: AsyncIteratorLike<TElement>) => Promise<Map<TKey, readonly TElement[]>> {
    return async iterator => asyncKeyByOnce(iterator, f);
}

export async function asyncKeyFirstByOnce<TKey, TElement>(
    iterator: AsyncIteratorLike<TElement>,
    f: (element: TElement, index: number) => TKey | Promise<TKey>
): Promise<Map<TKey, TElement>> {
    const it = asyncIterator(iterator);
    const map = new Map<TKey, TElement>();
    for (
        let i = 0, element = await it.next();
        element.done !== true;
        ++i, element = await it.next()
    ) {
        const key = await f(element.value, i);
        if (!map.has(key)) {
            map.set(key, element.value);
        }
    }
    return map;
}

export function asyncKeyFirstByOnceFn<TKey, TElement>(
    f: (element: TElement, index: number) => TKey | Promise<TKey>
): (iterator: AsyncIteratorLike<TElement>) => Promise<Map<TKey, TElement>> {
    return async iterator => asyncKeyFirstByOnce(iterator, f);
}

export async function asyncKeyLastByOnce<TKey, TElement>(
    iterator: AsyncIteratorLike<TElement>,
    f: (element: TElement, index: number) => TKey | Promise<TKey>
): Promise<Map<TKey, TElement>> {
    const it = asyncIterator(iterator);
    const map = new Map<TKey, TElement>();
    for (
        let i = 0, element = await it.next();
        element.done !== true;
        ++i, element = await it.next()
    ) {
        map.set(await f(element.value, i), element.value);
    }
    return map;
}

export function asyncKeyLastByOnceFn<TKey, TElement>(
    f: (element: TElement, index: number) => TKey | Promise<TKey>
): (iterator: AsyncIteratorLike<TElement>) => Promise<Map<TKey, TElement>> {
    return async iterator => asyncKeyLastByOnce(iterator, f);
}

export async function asyncMapKeyByOnce<TKey, TElement, TNewElement>(
    iterator: AsyncIteratorLike<TElement>,
    f: (
        element: TElement,
        index: number
    ) => readonly [TKey, TNewElement] | Promise<readonly [TKey, TNewElement]>
): Promise<Map<TKey, readonly TNewElement[]>> {
    const it = asyncIterator(iterator);
    const map = new Map<TKey, readonly TNewElement[]>();
    for (
        let i = 0, element = await it.next();
        element.done !== true;
        ++i, element = await it.next()
    ) {
        const [key, value] = await f(element.value, i);
        const entries = map.get(key) ?? [];
        map.set(key, [...entries, value]);
    }
    return map;
}

export function asyncMapKeyByOnceFn<TKey, TElement, TNewElement>(
    f: (
        element: TElement,
        index: number
    ) => readonly [TKey, TNewElement] | Promise<readonly [TKey, TNewElement]>
): (iterator: AsyncIteratorLike<TElement>) => Promise<Map<TKey, readonly TNewElement[]>> {
    return async iterator => asyncMapKeyByOnce(iterator, f);
}

export async function asyncMapKeyFirstByOnce<TKey, TElement, TNewElement>(
    iterator: AsyncIteratorLike<TElement>,
    f: (
        element: TElement,
        index: number
    ) => readonly [TKey, TNewElement] | Promise<readonly [TKey, TNewElement]>
): Promise<Map<TKey, TNewElement>> {
    const it = asyncIterator(iterator);
    const map = new Map<TKey, TNewElement>();
    for (
        let i = 0, element = await it.next();
        element.done !== true;
        ++i, element = await it.next()
    ) {
        const [key, value] = await f(element.value, i);
        if (!map.has(key)) {
            map.set(key, value);
        }
    }
    return map;
}

export function asyncMapKeyFirstByOnceFn<TKey, TElement, TNewElement>(
    f: (
        element: TElement,
        index: number
    ) => readonly [TKey, TNewElement] | Promise<readonly [TKey, TNewElement]>
): (iterator: AsyncIteratorLike<TElement>) => Promise<Map<TKey, TNewElement>> {
    return async iterator => asyncMapKeyFirstByOnce(iterator, f);
}

export async function asyncMapKeyLastByOnce<TKey, TElement, TNewElement>(
    iterator: AsyncIteratorLike<TElement>,
    f: (
        element: TElement,
        index: number
    ) => readonly [TKey, TNewElement] | Promise<readonly [TKey, TNewElement]>
): Promise<Map<TKey, TNewElement>> {
    const it = asyncIterator(iterator);
    const map = new Map<TKey, TNewElement>();
    for (
        let i = 0, element = await it.next();
        element.done !== true;
        ++i, element = await it.next()
    ) {
        const [key, value] = await f(element.value, i);
        map.set(key, value);
    }
    return map;
}

export function asyncMapKeyLastByOnceFn<TKey, TElement, TNewElement>(
    f: (
        element: TElement,
        index: number
    ) => readonly [TKey, TNewElement] | Promise<readonly [TKey, TNewElement]>
): (iterator: AsyncIteratorLike<TElement>) => Promise<Map<TKey, TNewElement>> {
    return async iterator => asyncMapKeyLastByOnce(iterator, f);
}
