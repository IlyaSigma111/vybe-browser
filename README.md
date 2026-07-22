# vybe

Keyboard-driven browser with trapezoid tabs. Built with Tauri.

## Install

Download the latest release from [GitHub Pages](https://ilyasigma111.github.io/vybe-browser/) or from [Releases](https://github.com/IlyaSigma111/vybe-browser/releases).

```bash
vybe
```

## Keybindings

| Key | Action |
|-----|--------|
| `o` | Open URL |
| `O` | Open URL in new tab |
| `j` / `k` | Scroll down / up |
| `h` / `l` | Back / Forward |
| `gg` / `G` | Go to top / bottom |
| `t` | New tab |
| `q` | Close tab |
| `J` / `K` | Next / Previous tab |
| `r` | Reload |
| `:` | Command mode |
| `/` | Search |
| `?` | Help |
| `yy` | Copy URL |
| `1-9` | Go to tab N |

## Build from source

```bash
npm install
npx tauri build
```

## Tech stack

- [Tauri](https://tauri.app) — native shell
- Rust — backend
- HTML/CSS/JS — frontend
