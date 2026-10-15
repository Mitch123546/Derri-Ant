# Derri-Ant concept dashboard

An interactive, browser-only prototype for a connected outdoor pesticide spraying system.

## What the demo includes

- Several selectable test devices with independent tank levels and schedules
- One-time and repeating treatment scheduling
- Live test-spray simulation (`1 second = 1 simulated minute`)
- Tank consumption modeled at **5% per 10 minutes**
- Local browser persistence with `localStorage`
- Responsive white and light-green interface
- Clear safety and prototype-only messaging

## Run locally

Serve the repository with any static web server, or open `index.html` directly in a modern browser.

For example:

```bash
npx serve .
```

## Hardware integration path

This repository does not directly control pesticide equipment. A production system would need an authenticated backend, device provisioning, signed commands, telemetry, weather and safety interlocks, physical emergency shutoff support, audit logging, and compliance review. The browser UI should never send actuator commands directly to an Arduino or other field controller.

## Prototype notice

All values are simulated and stored only in the browser. This concept is not a pesticide application recommendation.

