// Do not statically import the app. Playgama must finish SDK initialization before the browser requests the engine.
import { version } from '../package.json';

type BootstrapBridge = { engine: string; gameVersion: string; isInitialized?: boolean; initialize(): Promise<void> };
const host = window as Window & { bridge?: BootstrapBridge; playgamaBridge?: BootstrapBridge; warzarBootIssue?: (message?: string) => void; warzarBridgeReady?: boolean };
const status = document.getElementById('wz-start-status')!;
const shell = document.getElementById('wz-start')!;
const retry = document.getElementById('wz-start-retry') as HTMLButtonElement;
retry.onclick = () => location.reload();
function cannotStart(message?: string) {
  shell.classList.remove('hand-off');
  status.textContent = message || 'The game could not start. Please try again.';
  retry.hidden = false;
}
host.warzarBootIssue = cannotStart;
// A slow SDK gets a retry action, not an unsafe fallback to an empty local save.
const slow = setTimeout(() => { status.textContent = 'Still getting the game ready…'; retry.hidden = false; }, 12000);
async function boot() {
  try {
    const bridge = host.bridge || host.playgamaBridge;
    if (!bridge) throw new Error('Playgama Bridge is missing');
    bridge.engine = 'javascript';
    bridge.gameVersion = version;
    if (!bridge.isInitialized) await bridge.initialize();
    host.warzarBridgeReady = true;
    await import('./main');
  } catch (_) { cannotStart(); }
  finally { clearTimeout(slow); }
}
void boot();
