/* Shared licensed sample bank: default/dev, standalone and Playgama use the same mastered MP3 bytes. */
import manifest from './audio-playgama/manifest.json';
import assetMap from './audio-playgama/urls.js';
(window.WZ ||= {}).AudioBank = { manifest, urls: assetMap };
