# Remotion Video

Standalone Remotion project for previewing and rendering short data-driven
videos. The default composition is `SocialMetrics`, a 10 second 1920x1080 video
at 30fps that displays a title, keyword, views, likes, and comments.

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run remotion:dev
```

**Render video**

```console
npm run remotion:render
```

**Preview alias**

```console
npm run remotion:preview
```

## Data

The sample values live in `src/sample-data.ts`. Replace those values or pass
input props during rendering when wiring in collected data later.

Rendered MP4 output is written to `out/social-metrics.mp4`.
Rendering uses one worker by default so it remains reliable on machines with
limited memory.

## Docs

Get started with Remotion by reading the
[fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

Note that some organizations need a Remotion company license. Read the
[license terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
