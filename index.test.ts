import type {ExecutionContext} from "ava";
import test from "ava";
import {
    asyncInitialOnce,
    asyncIterator,
    asyncLastOnce,
    asyncPushOnce,
    asyncTailOnce,
    asyncToArrayOnce,
    asyncUnshiftOnce
} from "./index";

test("asyncIterator(empty)", async t => {
    t.true((await asyncIterator([]).next()).done);
});

async function* asyncGenerator123(): AsyncIterable<number> {
    yield Promise.resolve(1);
    yield Promise.resolve(2);
    yield Promise.resolve(3);
}

function* generator123(): Iterable<number> {
    yield 1;
    yield 2;
    yield 3;
}

// eslint-disable-next-line sonarjs/no-identical-functions
function* promiseGenerator123(): Iterable<Promise<number>> {
    yield Promise.resolve(1);
    yield Promise.resolve(2);
    yield Promise.resolve(3);
}

async function verify123(t: ExecutionContext, it: AsyncIterator<number>): Promise<void> {
    const r1 = await it.next();
    t.false(r1.done);
    t.is(r1.value, 1);
    const r2 = await it.next();
    t.false(r2.done);
    t.is(r2.value, 2);
    const r3 = await it.next();
    t.false(r3.done);
    t.is(r3.value, 3);
    const r4 = await it.next();
    t.true(r4.done);
    t.is(r4.value, undefined);
}

test("asyncIterator(AsyncIterator<T>)", async t => {
    await verify123(t, asyncIterator(asyncGenerator123()[Symbol.asyncIterator]()));
});

test("asyncIterator(Iterator<T>)", async t => {
    await verify123(t, asyncIterator(generator123()[Symbol.iterator]()));
});

test("asyncIterator(Iterator<Promise<T>>)", async t => {
    await verify123(t, asyncIterator(promiseGenerator123()[Symbol.iterator]()));
});

test("asyncIterator(Promise<AsyncIterator<T>>)", async t => {
    await verify123(t, asyncIterator(Promise.resolve(asyncGenerator123()[Symbol.asyncIterator]())));
});

test("asyncIterator(Promise<Iterator<T>>)", async t => {
    await verify123(t, asyncIterator(Promise.resolve(generator123()[Symbol.iterator]())));
});

test("asyncIterator(Promise<Iterator<Promise<T>>>)", async t => {
    await verify123(t, asyncIterator(Promise.resolve(promiseGenerator123()[Symbol.iterator]())));
});

test("asyncIterator(AsyncIterable<T>)", async t => {
    await verify123(t, asyncIterator(asyncGenerator123()));
});

test("asyncIterator(Iterable<T>)", async t => {
    await verify123(t, asyncIterator(generator123()));
});

test("asyncIterator(Iterable<Promise<T>>)", async t => {
    await verify123(t, asyncIterator(promiseGenerator123()));
});

test("asyncIterator(Promise<AsyncIterable<T>>)", async t => {
    await verify123(t, asyncIterator(Promise.resolve(asyncGenerator123())));
});

test("asyncIterator(Promise<Iterable<T>>", async t => {
    await verify123(t, asyncIterator(Promise.resolve(generator123())));
});

test("asyncIterator(Promise<Iterable<Promise<T>>>)", async t => {
    await verify123(t, asyncIterator(Promise.resolve(promiseGenerator123())));
});

test("asyncTailOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncTailOnce(asyncIterator([1, 2, 3, 4]))), [2, 3, 4]);
    t.deepEqual(await asyncToArrayOnce(asyncTailOnce(asyncIterator([1]))), []);
    t.deepEqual(await asyncToArrayOnce(asyncTailOnce(asyncIterator([]))), []);
});

test("asyncPushOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncPushOnce(asyncIterator([1, 2, 3]), 4)), [1, 2, 3, 4]);
    t.deepEqual(await asyncToArrayOnce(asyncPushOnce(asyncIterator([]), 4)), [4]);
});

test("asyncUnshiftOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncUnshiftOnce(asyncIterator([1, 2, 3]), 4)),
        [4, 1, 2, 3]
    );
    t.deepEqual(await asyncToArrayOnce(asyncUnshiftOnce(asyncIterator([]), 4)), [4]);
});

test("asyncInitialOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncInitialOnce(asyncIterator([1, 2, 3, 4]))), [1, 2, 3]);
    t.deepEqual(await asyncToArrayOnce(asyncInitialOnce(asyncIterator([1]))), []);
    t.deepEqual(await asyncToArrayOnce(asyncInitialOnce(asyncIterator([]))), []);
});

test("asyncLastOnce", async t => {
    t.is(await asyncLastOnce(asyncIterator([])), null);
    t.is(await asyncLastOnce(asyncIterator([1, 2, 3])), 3);
});
