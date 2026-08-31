# Analisis UX/UI de stepbro.site (app money)

Documento de analisis de estructura de diseno (no arquitectura) del frontend de
`https://stepbro.site/apps/money/#/`. Informacion extraida del HTML, CSS y design
tokens de la aplicacion.

## Identidad de marca

Tema basado en **Material Design 3 (MD3)** con una paleta **verde** personalizada
(en lugar del violeta por defecto de Material).

### Paleta principal (tema verde)

| Token (MD3) | Dark | Light |
|-------------|------|-------|
| `background` | `#0c160d` | `#f1fded` |
| `on-background` | `#dae6d6` | `#141e14` |
| `primary` | `#ffffff` | `#006e2c` |
| `on-primary` | `#003913` | `#ffffff` |
| `primary-container` | `#00f46b` | `#4dff7e` |
| `on-primary-container` | `#004a1b` | `#00521f` |
| `inverse-primary` | `#006e2c` | `#00e563` |
| `secondary` | `#7adb88` | `#006e2c` |
| `secondary-container` | `#006a2a` | `#9afda6` |
| `tertiary` | `#ffffff` | `#006972` |
| `tertiary-container` | `#4be8f9` | `#7ef1ff` |
| `error` | `#ffb4ab` | `#ba1a1a` |
| `surface-tint` | `#00e563` | `#006e2c` |

### Tema OLED alternativo (archivos `oled.css` / `theme.dark-oled.css`)

Tema de alto contraste casi negro.

- Dark: fondo `#000000`, surface-tint `#9fb8e4` (azulado), primary `#ffffff`,
  outline `#7e8088`.
- Light: fondo `#fbf9fc`, primary `#000000`.

### Tipografias

- **DM Sans**: fuente principal, declarada via `--app-main-font`.
- **Geist Mono** y **DM Mono**: para numeros y codigo. El input de OTP/codigo usa
  `letter-spacing: 8px`.
- **Material Symbols Rounded**: iconografia (con variaciones `font-variation-settings`).

### Gradientes

- Arcoiris animado en texto (light `#ff6b8a… #d2a6ff` / dark `#b00020… #6f2dbd`).
- Gradiente primario: `linear-gradient(120deg, primary → primary-container → secondary → …)`.

## Sistema de diseno

### Escala tipografica (MD3, 15 roles)

| Rol | font-size | line-height | letter-spacing |
|-----|-----------|-------------|----------------|
| display-large | 57px | 64px | -0.25px |
| display-medium | 45px | 52px | 0 |
| display-small | 36px | 44px | 0 |
| headline-large | 32px | 40px | 0 |
| headline-medium | 28px | 36px | 0 |
| headline-small | 24px | 32px | 0 |
| title-large | 22px | 28px | 0 |
| title-medium | 16px | 24px | 0.15px |
| title-small | 14px | 20px | 0.10px |
| body-large | 16px | 24px | 0.5px |
| body-medium | 14px | 20px | 0.25px |
| body-small | 12px | 16px | 0.4px |
| label-large | 14px | 20px | 0.10px |
| label-medium | 12px | 16px | 0.5px |
| label-small | 11px | 16px | 0.5px |

Notas:

- El total de dinero (`money-total`) usa `font-size: 57px` (46px en movil).
- Los tokens de `font-weight` estan definidos con un `px` de mas (`400px`) — un bug
  que el navegador ignora.

### Espaciado

Sin variables de espacio. Se usan utilidades numericas:

- `.gap-0 … gap-64` (4, 8, 16, 24, 32, 40, 48, 56, 64)
- Padding base de `16px` en vistas, gap de `8px` en grids.
- Toast: `--sbt-edge-offset: 16px`, `--sbt-gap: 10px`, `--sbt-padding: 12px 16px`.

### Bordes redondeados

Sin variables; valores aplicados inline: 8, 12, 16, 18, 20, 24, 32, 40, 48, 64, 999px.

- Tarjetas: `48px` (`grid-card`), `40px` (`card.style-detailed`), `18px` (`account-total-card`).
- Nav pill: `40px`, contenedor bottom bar: `64px`.
- Modal: `32px`, chips: `16-24px`.

### Sombras

- Patron "hairline Material": `0 0 0 .5px var(--md-sys-color-surface-container-highest)`.
- Glow de marca: `0 0 32px -10px var(--md-sys-color-primary-container)`.

## Componentes clave

- **Card**: `.grid-card` (radio 48px), `.account-total-card` (18px, fondo translucido).
- **Botones**: `.nav-button` con 5 estilos; el boton activo usa fondo
  `primary-container` + glow.
- **Navegacion responsive**: 5 estilos — sidebar (40px), pill (40px), bottom bar
  flotante con `backdrop-filter: blur`, etc.
- **Modal**: `.modal-window` (32px, max 600px, variante 1200px).
- **Toasts**: sistema `sbt` con variantes success/warning/error/info.
- **Tablas / Inputs**: `table.style-1` (16px), `.setup-input` (24px).

## Animacion y layout

### Easing y transiciones

- Material: `cubic-bezier(0,0,.5,1)`.
- Overshoot bouncy: `.38,.49,0,2` y `.34,1.45,.5,1`.
- 28 keyframes: `shake`, `blob-move`, `shimmer`, `text-rainbow-flow`, `mic-pulse`.

### Layout

- `.main-grid`: 2 columnas.
- `.items-container`: auto-fill `minmax(260px, 1fr)`, gap `8px`.
- Safe-area insets: `env(safe-area-inset-top/bottom)` para movil.
- Breakpoints: `680px` (principal movil), `380px` / `390px` (small).

### Theming

- Solo `prefers-color-scheme` (light/dark) + `prefers-reduced-motion`.
- Tercer modo neutro para overlays translucidos usando `color-mix(in srgb, …)`.
