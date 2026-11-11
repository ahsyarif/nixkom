---
title: "Canceling Stale Fetch Requests in React with AbortController"
date: 2026-11-05T14:30:00+07:00
categories: ["Frontend"]
tags: ["frontend", "react", "typescript", "performance"]
description: "Notes on preventing out-of-order state updates and wasted network bandwidth on rapid input changes."
---

When a search input or filter tab triggers a `fetch` inside `useEffect`, rapid changes can resolve out of order: an older, slower request finishes after the latest one and overwrites state with stale data. Wiring an `AbortController` into the effect cleanup cancels the in-flight request at the browser network layer before the next one starts.

## `useEffect` with `AbortController` Cleanup

```tsx
import { useEffect, useState } from "react";

export function useSearchResults<T>(query: string) {
	const [data, setData] = useState<T[]>([]);

	useEffect(() => {
		if (!query.trim()) {
			setData([]);
			return;
		}

		const controller = new AbortController();

		fetch(`/api/search?q=${encodeURIComponent(query)}`, {
			signal: controller.signal,
		})
			.then((res) => res.json())
			.then((items: T[]) => setData(items))
			.catch((err: unknown) => {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.error(err);
			});

		return () => controller.abort();
	}, [query]);

	return data;
}
```

## Checklist

- Always ignore `err.name === "AbortError"` in the `.catch()` block so normal user typing does not trigger error boundaries or toast alerts.
- Pair `AbortController` with a 150–250 ms input debounce so fast keystrokes do not open and abort a TCP/H2 stream on every character.
- For one-shot timeout limits without manual cleanup, pass `signal: AbortSignal.timeout(5000)` or combine both signals via `AbortSignal.any([controller.signal, AbortSignal.timeout(5000)])`.
