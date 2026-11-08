---
title: "Go TCP Socket Tuning on Linux 6.x"
date: 2026-11-05T14:30:00+07:00
categories: ["Systems"]
tags: ["go", "linux", "networking", "performance"]
description: "Notes on TCP_NODELAY, SO_REUSEPORT, and epoll behavior for low-latency Go services."
---

Go enables `TCP_NODELAY` by default on `net.TCPConn`, disabling Nagle's algorithm out of the box. When tail latency spikes under bursty writes, check socket buffer sizing and `SO_REUSEPORT` listener sharding.

## Setting `SO_REUSEPORT` via `ListenConfig`

```go
package main

import (
	"context"
	"net"
	"syscall"
)

func listenReusePort(addr string) (net.Listener, error) {
	lc := net.ListenConfig{
		Control: func(network, address string, c syscall.RawConn) error {
			return c.Control(func(fd uintptr) {
				_ = syscall.SetsockoptInt(int(fd), syscall.SOL_SOCKET, syscall.SO_REUSEPORT, 1)
			})
		},
	}
	return lc.Listen(context.Background(), "tcp", addr)
}
```

## Kernel Sysctl Checklist

- `net.core.somaxconn = 4096`
- `net.ipv4.tcp_tw_reuse = 1`
- `net.ipv4.tcp_slow_start_after_idle = 0`
