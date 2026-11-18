/* Historical loader for the original offline-rendered bank. Neither current build imports this. */
import manifest from './audio/manifest.json';
const assets = import.meta.glob('./audio/*.mp3', { eager: true, query: '?url', import: 'default' });
const urls = Object.create(null);
for (const [path, url] of Object.entries(assets)) urls[path.slice('./audio/'.length, -'.mp3'.length)] = url;
(window.WZ ||= {}).AudioBank = { manifest, urls };
