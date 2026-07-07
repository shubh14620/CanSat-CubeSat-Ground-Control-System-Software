# Fonts Directory

The application uses **Google Fonts** loaded via CDN for zero-config setup:

- **Orbitron** — display / titles
- **Rajdhani** — body / UI text
- **JetBrains Mono** — monospaced telemetry values

## Offline Fallback

If you want to bundle fonts locally (e.g. for air-gapped mission environments), download the WOFF2 files here and swap the `<link>` in `index.html` for a local `@font-face` declaration in `style.css`:

```css
@font-face {
  font-family: 'Orbitron';
  src: url('assets/fonts/Orbitron-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

Download sources:
- Orbitron: https://fonts.google.com/specimen/Orbitron
- Rajdhani: https://fonts.google.com/specimen/Rajdhani
- JetBrains Mono: https://fonts.google.com/specimen/JetBrains+Mono
