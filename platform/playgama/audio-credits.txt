# WARZAR: Crate Rush · Audio credits (Playgama 1.0.0)

The 88 recorded and produced licensed MP3s are shared by development, the standalone HTML, and Playgama. The previous code-rendered WARZAR score and cues remain in the source tree for reference only; neither current build packages or plays them. The runtime only decodes and mixes compressed samples. No audio is fetched from a third-party origin.

| Material | Creator and license | Source |
|---|---|---|
| Empacotatron, menu version and main loop | Fupi · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Original FLAC menu and loop](https://opengameart.org/content/empacotatron) |
| Car Engine Loop 96kHz, 4s | qubodup · [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | [Original recording and normalized WAV](https://opengameart.org/content/car-engine-loop-96khz-4s) |
| Wind Whoosh Loop, edited from Loopable Dungeon Ambience | SketchMan3, after JaggedStone · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Whoosh](https://opengameart.org/content/wind-whoosh-loop) · [original ambience](https://opengameart.org/content/loopable-dungeon-ambience) |
| Interface Sounds, 50 RPG Sound Effects, Sci-Fi Sounds, 85 Short Music Jingles | Kenney (Kenney Vleugels) · [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) | [Interface](https://opengameart.org/content/interface-sounds) · [RPG](https://opengameart.org/content/50-rpg-sound-effects) · [Sci-Fi](https://opengameart.org/content/sci-fi-sounds) · [Jingles](https://opengameart.org/content/85-short-music-jingles) |

**Changes:** WAV/OGG/FLAC excerpts were trimmed, leveled and MP3 encoded. The motor recording was converted to mono, seam-blended and EQ'd in six matching bands for the in-game RPM mix. The wind was seam-blended, EQ'd and panned at runtime. The menu track has a short seam blend; on a mission the game crossfades to the separate music loop. Short effects were trimmed, pitch-adjusted where indicated, and faded. `src/game/audio-playgama/manifest.json` records the source filename and exact MP3 boundaries for every cut. The author links above are attribution, not a claim of endorsement or catalog acceptance. These credits ship in the upload ZIP and in an attribution comment at the end of the standalone HTML.

## Re-master if needed

No downloads are required for `npm ci && npm run build:playgama` after the code dependencies install; all **mastered** audio files are checked into source. To remake them offline with local copies, use the published downloads linked above and this directory layout outside the repo:

- `empacotatron_menu.flac`, `empacotatron_loop.flac`, `wind%20woosh%20loop.ogg` (literal `%20` in the local filename).
- Extract Kenney archives into `interface-sounds/Audio`, `sci-fi-sounds/Audio`, `rpg/OGG`, `85-short-music-jingles/OGG/jingles_STEEL` under the input directory.
- Extract `engine-loop.7z` into `engine/`, keeping the inner `engine-loop/engine-loop-1-normalized.wav`.
- Install Python 3/NumPy and FFmpeg with libmp3lame and FFprobe; run `python3 tools/master-playgama-audio.py /path/to/input`. Rebuild and run the archive tests; FFmpeg versions can yield different bytes. No audio generators are used by the mastering script.
