---
title: "Declarative NixOS Containers & WireGuard Mesh Notes"
date: 2026-11-07T09:00:00+07:00
categories: ["Infrastructure", "NixOS"]
tags: ["nix", "wireguard", "linux", "containers"]
pin: true
description: "Quick reference for spinning up lightweight declarative NixOS containers over a point-to-point WireGuard mesh."
---

Keeping infrastructure reproducible across bare-metal nodes doesn't require a full Kubernetes control plane when declarative `containers.<name>` in NixOS handles isolation with zero overhead.

## Network Topology

Each host exposes a `/32` WireGuard peer inside `10.100.0.0/24` and routes container subnets over the tunnel interface.

| Node | WireGuard IP | Container Subnet | Role |
|------|--------------|------------------|------|
| `id-jkt-01` | `10.100.0.1` | `10.200.1.0/24` | Edge ingress |
| `sg-sin-01` | `10.100.0.2` | `10.200.2.0/24` | Core services |

## NixOS Configuration

```nix
{ config, pkgs, ... }: {
  networking.wireguard.interfaces.wg0 = {
    ips = [ "10.100.0.1/24" ];
    listenPort = 51820;
    privateKeyFile = "/run/secrets/wg0.key";
  };

  containers.metrics = {
    autoStart = true;
    privateNetwork = true;
    hostAddress = "10.200.1.1";
    localAddress = "10.200.1.2";
    config = { config, pkgs, ... }: {
      services.prometheus.enable = true;
      system.stateVersion = "25.05";
    };
  };
}
```

## Verification

Check handshake latency and container veth routing:

```bash
sudo wg show wg0
ip route show table main
```

> Tip: Press `/` anywhere on this blog to search across notes by title, summary, or tag.
