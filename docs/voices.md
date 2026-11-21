# Voices in Gaon Studio

Speech comes from your local VoiceStudio. A line is voiced in one of three ways, in this order:

1. **A recording** attached to the line (`audio`). It is used as-is.
2. **A saved VoiceStudio profile** set on the character (`voice`: a profile name or ID). Profiles are real reference voices, so they sound the most natural and the most consistent.
3. **A designed voice**: OmniVoice builds a voice from comma-separated tags in the character's `voiceStyle`, plus a fixed seed. The same tags and seed always give the same voice, so a character sounds identical in every episode.

Run `python productions/banjar-teela-part-1/build/voicelab.py` to audition candidates. It synthesises one test line per voice, measures its pitch and transcribes it back to confirm it is intelligible. WAVs land in `data/banjar-teela-part-1-work/lab/` so you can listen.

## The cast for *Banjar Teela* (बंजर टीले की लाल मिट्टी)

| Character | Voice | Settings | Pitch heard in the audition |
| --- | --- | --- | --- |
| कथावाचक (narrator) | profile **Rahul** | speed 0.95, a little slower for sad or tender lines | 130 Hz, low and slow |
| जानकी (Janaki, 38) | profile **Juhi** | fallback tags: `female, middle-aged, moderate pitch` | 238 Hz, warm |
| छोटू (Chhotu, 11) | designed | `male, child, high pitch` | 244 Hz |
| गाँव के बुज़ुर्ग (village elders) | designed | `male, elderly, moderate pitch` (Part 1 line recorded with seed 52061) | 195 Hz |
| सेठ धनीराम | designed | `male, middle-aged, low pitch` | 157 Hz, firm |
| मास्टर जी | designed | `male, elderly, moderate pitch` | |

Part 1 only has the narrator and one elder speaking, and both were pre-recorded by `build/record.py`. The other characters speak in the next parts. For a designed voice the studio derives the seed from the character's name, so each stays the same person from one episode to the next.

The narrator is the part the script is most particular about ("slow, grave and emotional"). Rahul was chosen because it is the lowest of the voices auditioned and delivers more slowly than the designed ones at the same speed setting. If you prefer another, change the `N` entry in `VOICES` in `build/record.py` and re-run it. Only the changed lines are re-recorded.

## Adding more voices

**More designed voices (no setup).** Change the tags or the seed. Tags that work well:

| Axis | Values |
| --- | --- |
| gender | `male`, `female` |
| age | `child`, `young adult`, `middle-aged`, `elderly` |
| pitch | `very low pitch`, `low pitch`, `moderate pitch`, `high pitch` |

A different seed with the same tags gives a different person of the same kind. For example, three village women can share `female, middle-aged, low pitch` with seeds `48389`, `48391` and `48397`.

**A signature voice (a saved profile).** In VoiceStudio, create a profile from a clean reference recording of the voice you want: one speaker, no music or background noise, roughly 10 to 30 seconds of natural speech. Follow VoiceStudio's own instructions for the exact steps. Once saved, it appears under **List VoiceStudio profiles** in the studio. Set the character's `voice` to the profile's name or ID. Use only voices you have the right to use.

**Good storytelling voices to add.** A narrator who sounds like a grandparent telling a story: an `elderly, low pitch` profile, recorded slowly and warmly. A second, lighter narrator for comic episodes. A distinct, gentler voice for a child's inner thoughts.

## Pacing and emotion

- `speed` on a dialogue line runs from 0.6 to 1.6. Narration reads best at 0.88 to 0.95; sad or tender lines slower still.
- `emotion` (`sad`, `angry`, `funny`, `worried`, `happy`, `surprised`) changes the speaking speed a little and the character's expression. It does not change the voice itself.
- `spoken` overrides the pronunciation without changing the caption. Write numbers out in words (`३८` becomes `अड़तीस`) so they are read correctly.
