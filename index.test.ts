import type {ExecutionContext} from "ava";
import test from "ava";
import {
    asyncAllOnce,
    asyncAndOnce,
    asyncAnyOnce,
    asyncAppendOnce,
    asyncAverageOnce,
    asyncConcatMapOnce,
    asyncConcatOnce,
    asyncContainsOnce,
    asyncDropOnce,
    asyncDropUntilOnce,
    asyncDropWhileOnce,
    asyncEmptyOnce,
    asyncEqualOnce,
    asyncExcludeFirstOnce,
    asyncExcludeNullOnce,
    asyncExcludeOnce,
    asyncFilterOnce,
    asyncFindIndexOnce,
    asyncFindOnce,
    asyncFold1Once,
    asyncFoldOnce,
    asyncIndexOfOnce,
    asyncIndexOnce,
    asyncInitialOnce,
    asyncIterator,
    asyncLastOnce,
    asyncMapOnce,
    asyncMaximumByOnce,
    asyncMaximumOnce,
    asyncMinimumByOnce,
    asyncMinimumOnce,
    asyncNoneNullOnce,
    asyncNotEmptyOnce,
    asyncNotEqualOnce,
    asyncOnlyOnce,
    asyncOrOnce,
    asyncPrefixMatchOnce,
    asyncPrependOnce,
    asyncPushOnce,
    asyncRemoveFirstOnce,
    asyncRemoveOnce,
    asyncScanOnce,
    asyncSliceOnce,
    asyncSumOnce,
    asyncTailOnce,
    asyncTakeOnce,
    asyncTakeUntilOnce,
    asyncTakeWhileOnce,
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

test("asyncOnlyOnce", async t => {
    t.is(await asyncOnlyOnce(asyncIterator([])), null);
    t.is(await asyncOnlyOnce(asyncIterator([4])), 4);
    t.is(await asyncOnlyOnce(asyncIterator([3, 4, 5])), null);
});

test("asyncEmptyOnce", async t => {
    t.is(await asyncEmptyOnce(asyncIterator([])), true);
    t.is(await asyncEmptyOnce(asyncIterator([1])), false);
    t.is(await asyncEmptyOnce(asyncIterator([1, 2, 3])), false);
});

test("asyncNotEmptyOnce", async t => {
    t.is(await asyncNotEmptyOnce(asyncIterator([])), false);
    t.is(await asyncNotEmptyOnce(asyncIterator([1])), true);
    t.is(await asyncNotEmptyOnce(asyncIterator([1, 2, 3])), true);
});

test("asyncSliceOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncSliceOnce(asyncIterator([1, 2, 3, 4]), 1)), [2, 3, 4]);
    t.deepEqual(
        await asyncToArrayOnce(asyncSliceOnce(asyncIterator([1, 2, 3, 4, 5]), 1, 4)),
        [2, 3, 4]
    );
    t.deepEqual(await asyncToArrayOnce(asyncSliceOnce(asyncIterator([1, 2, 3]), 2)), [3]);
    t.deepEqual(await asyncToArrayOnce(asyncSliceOnce(asyncIterator([1, 2, 3]), 0, 2)), [1, 2]);
    t.deepEqual(await asyncToArrayOnce(asyncSliceOnce(asyncIterator([]), 3, 5)), []);
    t.deepEqual(await asyncToArrayOnce(asyncSliceOnce(asyncIterator([1, 2, 3]), 2, 0)), []);
    t.deepEqual(await asyncToArrayOnce(asyncSliceOnce(asyncIterator([1, 2, 3]), 1, 1)), []);
});

test("asyncTakeOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncTakeOnce(asyncIterator([]), 3)), []);
    t.deepEqual(await asyncToArrayOnce(asyncTakeOnce(asyncIterator([1, 2]), 3)), [1, 2]);
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeOnce(asyncIterator([1, 2, 3, 4, 5]), 3)),
        [1, 2, 3]
    );
    t.deepEqual(await asyncToArrayOnce(asyncTakeOnce(asyncIterator([1, 2, 3, 4, 5]), 0)), []);
});

test("asyncDropOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncDropOnce(asyncIterator([]), 3)), []);
    t.deepEqual(await asyncToArrayOnce(asyncDropOnce(asyncIterator([1, 2]), 3)), []);
    t.deepEqual(await asyncToArrayOnce(asyncDropOnce(asyncIterator([1, 2, 3, 4, 5]), 3)), [4, 5]);
    t.deepEqual(
        await asyncToArrayOnce(asyncDropOnce(asyncIterator([1, 2, 3, 4, 5]), 0)),
        [1, 2, 3, 4, 5]
    );
});

test("asyncTakeWhileOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncTakeWhileOnce(asyncIterator([]), (_, i) => i < 3)), []);
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeWhileOnce(asyncIterator([1, 2]), (_, i) => i < 3)),
        [1, 2]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeWhileOnce(asyncIterator([1, 2, 3, 4, 5]), (_, i) => i < 3)),
        [1, 2, 3]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeWhileOnce(asyncIterator([1, 2, 3, 4, 5]), () => false)),
        []
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncTakeWhileOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), e => e < 4)
        ),
        [1, 2, 3]
    );
});

test("asyncTakeUntilOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeUntilOnce(asyncIterator([]), (_, i) => i >= 3)),
        []
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeUntilOnce(asyncIterator([1, 2]), (_, i) => i >= 3)),
        [1, 2]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncTakeUntilOnce(asyncIterator([1, 2, 3, 4, 5]), (_, i) => i >= 3)
        ),
        [1, 2, 3]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncTakeUntilOnce(asyncIterator([1, 2, 3, 4, 5]), () => true)),
        []
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncTakeUntilOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), e => e >= 4)
        ),
        [1, 2, 3]
    );
});

test("asyncDropWhileOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncDropWhileOnce(asyncIterator([]), (_, i) => i < 3)), []);
    t.deepEqual(
        await asyncToArrayOnce(asyncDropWhileOnce(asyncIterator([1, 2]), (_, i) => i < 3)),
        []
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncDropWhileOnce(asyncIterator([1, 2, 3, 4, 5]), (_, i) => i < 3)),
        [4, 5]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncDropWhileOnce(asyncIterator([1, 2, 3, 4, 5]), () => false)),
        [1, 2, 3, 4, 5]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncDropWhileOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), e => e < 4)
        ),
        [4, 3, 2, 1]
    );
});

test("asyncDropUntilOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncDropUntilOnce(asyncIterator([]), (_, i) => i >= 3)),
        []
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncDropUntilOnce(asyncIterator([1, 2]), (_, i) => i >= 3)),
        []
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncDropUntilOnce(asyncIterator([1, 2, 3, 4, 5]), (_, i) => i >= 3)
        ),
        [4, 5]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncDropUntilOnce(asyncIterator([1, 2, 3, 4, 5]), () => true)),
        [1, 2, 3, 4, 5]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncDropUntilOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), e => e >= 4)
        ),
        [4, 3, 2, 1]
    );
});

test("asyncEqualOnce", async t => {
    t.true(await asyncEqualOnce(asyncIterator([1, 2, 3]), asyncIterator([1, 2, 3])));
    t.false(await asyncEqualOnce(asyncIterator([1, 2, 3]), asyncIterator([1, 2, 3, 4])));
    t.false(await asyncEqualOnce(asyncIterator([1, 2, 3, 4]), asyncIterator([1, 2, 3])));
    t.false(await asyncEqualOnce(asyncIterator([1, 3, 3]), asyncIterator([1, 2, 3])));
    t.true(
        await asyncEqualOnce(
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])]),
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])]),
            asyncEqualOnce
        )
    );
    t.false(
        await asyncEqualOnce(
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])]),
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])])
        )
    );
});

test("asyncNotEqualOnce", async t => {
    t.false(await asyncNotEqualOnce(asyncIterator([1, 2, 3]), asyncIterator([1, 2, 3])));
    t.true(await asyncNotEqualOnce(asyncIterator([1, 2, 3]), asyncIterator([1, 2, 3, 4])));
    t.true(await asyncNotEqualOnce(asyncIterator([1, 2, 3, 4]), asyncIterator([1, 2, 3])));
    t.true(await asyncNotEqualOnce(asyncIterator([1, 3, 3]), asyncIterator([1, 2, 3])));
    t.false(
        await asyncNotEqualOnce(
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])]),
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])]),
            asyncEqualOnce
        )
    );
    t.true(
        await asyncNotEqualOnce(
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])]),
            asyncIterator([asyncIterator([1, 2]), asyncIterator([3, 4])])
        )
    );
});

test("asyncPrefixMatchOnce", async t => {
    t.true(await asyncPrefixMatchOnce(asyncIterator([]), asyncIterator([])));
    t.true(await asyncPrefixMatchOnce(asyncIterator([1, 2, 3]), asyncIterator([])));
    t.true(await asyncPrefixMatchOnce(asyncIterator([1, 2, 3, 4]), asyncIterator([1, 2])));
    t.false(await asyncPrefixMatchOnce(asyncIterator([1, 3, 4]), asyncIterator([1, 2])));
    t.false(await asyncPrefixMatchOnce(asyncIterator([]), asyncIterator([1])));
});

test("asyncMapOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncMapOnce(asyncIterator([1, 2, 3]), e => e + 1)),
        [2, 3, 4]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncMapOnce(asyncIterator([1, 2, 3]), (e, i) => (i === 1 ? e * 10 : e))
        ),
        [1, 20, 3]
    );
});

test("asyncFilterOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncFilterOnce(asyncIterator([1, 2, 3]), e => e % 2 === 1)),
        [1, 3]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncFilterOnce(asyncIterator([1, 3, 2, 4, 5]), (_, i) => i % 2 === 0)
        ),
        [1, 2, 5]
    );
});

test("asyncExcludeOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncExcludeOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), n => n < 3)),
        [3, 4, 3]
    );
});

test("asyncExcludeNullOnce", async t => {
    t.deepEqual(await asyncToArrayOnce(asyncExcludeNullOnce(asyncIterator(["a", null, "b"]))), [
        "a",
        "b"
    ]);
});

test("asyncExcludeFirstOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(
            asyncExcludeFirstOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), n => n > 2)
        ),
        [1, 2, 4, 3, 2, 1]
    );
});

test("asyncRemoveOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncRemoveOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), 3)),
        [1, 2, 4, 2, 1]
    );
});

test("asyncRemoveFirstOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncRemoveFirstOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), 3)),
        [1, 2, 4, 3, 2, 1]
    );
});

test("asyncFoldOnce", async t => {
    t.is(await asyncFoldOnce(asyncIterator([1, 2, 3]), (a, e, i) => a + e * i, 0), 8);
});

test("asyncFold1Once", async t => {
    t.is(await asyncFold1Once(asyncIterator([1, 2, 3]), (a, e, i) => a + e * i), 9);
});

test("asyncIndexOnce", async t => {
    t.is(await asyncIndexOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), 2), 3);
    t.is(await asyncIndexOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), 7), null);
});

test("asyncContainsOnce", async t => {
    t.true(await asyncContainsOnce(asyncIterator([1, 2, 3]), 1));
    t.false(await asyncContainsOnce(asyncIterator([1, 2, 3]), 0));
});

test("asyncIndexOfOnce", async t => {
    t.is(await asyncIndexOfOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), 3), 2);
    t.is(await asyncIndexOfOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), 5), null);
});

test("asyncFindIndexOnce", async t => {
    t.is(await asyncFindIndexOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), n => n >= 3), 2);
});

test("asyncFindOnce", async t => {
    t.is(await asyncFindOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1]), n => n >= 3), 3);
});

test("asyncMaximumOnce", async t => {
    t.is(await asyncMaximumOnce(asyncIterator([1, 2, 3])), 3);
    t.is(await asyncMaximumOnce(asyncIterator([1, 2, 3, 4, 3, 2, 1])), 4);
    t.is(await asyncMaximumOnce(asyncIterator([])), null);
});

test("asyncMaximumByOnce", async t => {
    t.is(await asyncMaximumByOnce(asyncIterator(["1", "2", "3"]), Number), "3");
    t.is(await asyncMaximumByOnce(asyncIterator(["1", "2", "3", "4", "3", "2", "1"]), Number), "4");
    t.is(await asyncMaximumByOnce(asyncIterator([]), Number), null);
});

test("asyncMinimumOnce", async t => {
    t.is(await asyncMinimumOnce(asyncIterator([1, 2, 3])), 1);
    t.is(await asyncMinimumOnce(asyncIterator([2, 3, 4, 1, 2, 3])), 1);
    t.is(await asyncMinimumOnce(asyncIterator([])), null);
});

test("asyncMinimumByOnce", async t => {
    t.is(await asyncMinimumByOnce(asyncIterator(["1", "2", "3"]), Number), "1");
    t.is(await asyncMinimumByOnce(asyncIterator(["2", "3", "4", "1", "2", "3"]), Number), "1");
    t.is(await asyncMinimumByOnce(asyncIterator([]), Number), null);
});

test("asyncSumOnce", async t => {
    t.is(await asyncSumOnce(asyncIterator([1, 2, 3])), 6);
    t.is(await asyncSumOnce(asyncIterator([])), 0);
});

test("asyncAverageOnce", async t => {
    t.is(await asyncAverageOnce(asyncIterator([1, 2, 3])), 2);
    t.is(await asyncAverageOnce(asyncIterator([1, 2, 3, 2])), 2);
    t.is(await asyncAverageOnce(asyncIterator([])), null);
});

test("asyncAndOnce", async t => {
    t.true(await asyncAndOnce(asyncIterator([true, true, true])));
    t.false(await asyncAndOnce(asyncIterator([true, false, true])));
    t.true(await asyncAndOnce(asyncIterator([])));
});

test("asyncOrOnce", async t => {
    t.true(await asyncOrOnce(asyncIterator([true, false, true])));
    t.false(await asyncOrOnce(asyncIterator([false, false, false])));
    t.false(await asyncOrOnce(asyncIterator([])));
});

test("asyncAnyOnce", async t => {
    t.true(await asyncAnyOnce(asyncIterator([1, 2, 3]), e => e > 2));
    t.false(await asyncAnyOnce(asyncIterator([1, 2, 3]), e => e > 4));
});

test("asyncAllOnce", async t => {
    t.true(await asyncAllOnce(asyncIterator([1, 2, 3]), e => e < 4));
    t.false(await asyncAllOnce(asyncIterator([1, 2, 3]), e => e > 2));
});

test("asyncConcatOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(
            asyncConcatOnce(
                asyncIterator([
                    asyncIterator([1, 2]),
                    asyncIterator([]),
                    asyncIterator([3]),
                    asyncIterator([4, 5])
                ])
            )
        ),
        [1, 2, 3, 4, 5]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncConcatOnce(asyncIterator([asyncIterator([]), asyncIterator([])]))
        ),
        []
    );
});

test("asyncPrependOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(
            asyncPrependOnce(asyncIterator([1, 2, 3]))(asyncIterator([4, 5, 6]))
        ),
        [1, 2, 3, 4, 5, 6]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncPrependOnce(asyncIterator<number>([]))(asyncIterator([4, 5, 6]))
        ),
        [4, 5, 6]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncPrependOnce(asyncIterator([1, 2, 3]))(asyncIterator([]))),
        [1, 2, 3]
    );
});

test("asyncAppendOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncAppendOnce(asyncIterator([4, 5, 6]))(asyncIterator([1, 2, 3]))),
        [1, 2, 3, 4, 5, 6]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncAppendOnce(asyncIterator<number>([]))(asyncIterator([1, 2, 3]))
        ),
        [1, 2, 3]
    );
    t.deepEqual(
        await asyncToArrayOnce(asyncAppendOnce(asyncIterator([4, 5, 6]))(asyncIterator([]))),
        [4, 5, 6]
    );
});

test("asyncConcatMapOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(
            asyncConcatMapOnce(asyncIterator(["1,2,3", "4,5,6"]), s => s.split(","))
        ),
        ["1", "2", "3", "4", "5", "6"]
    );
});

test("asyncNoneNullOnce", async t => {
    t.deepEqual(await asyncNoneNullOnce(asyncIterator([1, 2, 3])), [1, 2, 3]);
    t.is(await asyncNoneNullOnce(asyncIterator([1, null, 3])), null);
    t.is(await asyncNoneNullOnce(asyncIterator([undefined, 2, 3])), null);
    t.deepEqual(await asyncNoneNullOnce(asyncIterator([])), []);
});

test("asyncScanOnce", async t => {
    t.deepEqual(
        await asyncToArrayOnce(asyncScanOnce(asyncIterator([1, 2, 3]), (a, e, i) => a + e * i, 0)),
        [0, 2, 8]
    );
    t.deepEqual(
        await asyncToArrayOnce(
            asyncScanOnce(asyncIterator(["a", "b", "c"]), (a, e, i) => `${a} ${i} ${e}`, "_")
        ),
        ["_ 0 a", "_ 0 a 1 b", "_ 0 a 1 b 2 c"]
    );
});
