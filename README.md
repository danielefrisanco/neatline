# mapper

Generate standalone, CSS-themeable SVG maps from a region and a stylesheet.

No tile server, no fonts pipeline, no API key, no runtime model call.
Same input, byte-identical output.

```ts
import { mapper } from "mapper";

const map = mapper({
  region: "west-europe",
  projection: "conic-conformal",
  highlight: ["FR", "DE", "BE"],
});

await map.toFile("europe.svg", { theme: "minimal" });
```

## Status

Early. **Phase 0 (scaffold) is complete** — the package builds, tests, and
imports under both ESM and CJS. The public type surface is settled; no geometry
is resolved yet. Phase 1 (regions, projections, paths) is next.

See the build plan for what is in scope, what is reserved, and what is
deliberately out.

## Scripts

| | |
|---|---|
| `npm run check` | typecheck → test → build → verify exports |
| `npm run build` | dual ESM/CJS bundle plus types |
| `npm test` | vitest; SVG snapshots land in `test/__snapshots__/` as real `.svg` files |
| `npm run dev` | rebuild on change |

## License

MIT. Geometry comes from [Natural Earth](https://www.naturalearthdata.com/),
which is public domain and carries no attribution requirement.
