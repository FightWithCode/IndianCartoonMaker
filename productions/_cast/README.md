# Shared cast

`naukars.json` holds distinct supporting characters (servants, guards, an accountant, a priest) that any story can use.

To use them, copy the entries you need into a storyboard's `characters` list (or load the file, as `jadui-chakki-aur-do-bhai/build/board.mjs` does). When a film using them is rendered, the studio saves them to `data/library.json`, after which any storyboard can refer to them by name alone.

## Looks you can set on any character

| Field | Values | Use |
| --- | --- | --- |
| `build` | `slim`, `regular`, `stout` | Body width. The head is not stretched. |
| `jewelry` | `none`, `simple`, `gold` | `gold`: necklace with a pendant, bangles, a ring, earrings, a turban brooch and plume, and for women a nose ring and forehead pendant. `simple`: thin glass bangles. |
| `trim` | a hex colour | Gold border at the hem, collar and front, with brocade dots. Makes clothes look rich. |
| `shawl` | a hex colour | A stole over the shoulders with an end hanging in front. |
| `patches`, `mud` | `true` | Patched clothes with a frayed hem; clay-stained clothes. For the poor. |
| `barefoot` | `true` | No shoes. |
| `beard` | `none`, `short`, `full`, `white` | |
| `tilak` | `none`, `red`, `sandal` | Forehead mark. |
| `veil` | `true` | A sari pallu pulled over the head. |
| `hair` | adds `topi` (a white cap) and `bald` to the existing styles | |

An actor can also lie down: set `stance` to `lie` (the head goes to the side opposite the way the actor faces). Pair it with the `quilt` and `pillow` props.

## Other files

`mystics.json` holds holy and magical figures (for now the white-bearded hermit साधु बाबा, who hands Madhav the magic hand-mill in *Jadui Chakki*). Use it the same way as `naukars.json`.
