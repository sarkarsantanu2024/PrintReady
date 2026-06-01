import { DEFAULT_LAYOUT, type IdCardHeader, type IdCardLayout } from './layout';

/**
 * Persists the header branding (logo + company text + colours) so the client
 * uploads the logo just once. It survives reloads and "Start over" via
 * localStorage. The logo is stored as its data URL; the PNG bytes used for the
 * PDF embed are reconstructed from that on load.
 */
const KEY = 'printready:idcard-branding:v1';

/** Everything in the header except the runtime-only PNG bytes. */
type StoredBranding = Omit<IdCardHeader, 'logoPng'>;

export function loadBranding(): IdCardLayout {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const saved = JSON.parse(raw) as Partial<StoredBranding>;
    const logoDataUrl = saved.logoDataUrl ?? null;
    return {
      ...DEFAULT_LAYOUT,
      header: {
        ...DEFAULT_LAYOUT.header,
        ...saved,
        logoDataUrl,
        logoPng: logoDataUrl ? dataUrlToBytes(logoDataUrl) : null,
      },
    };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function saveBranding(layout: IdCardLayout): void {
  try {
    // logoPng (Uint8Array) is not JSON-serialisable and is rebuilt from the
    // data URL on load, so drop it before persisting.
    const { logoPng: _omit, ...rest } = layout.header;
    void _omit;
    window.localStorage.setItem(KEY, JSON.stringify(rest));
  } catch {
    /* quota or serialization failure — branding just won't persist this session */
  }
}

function dataUrlToBytes(dataUrl: string): Uint8Array | null {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  try {
    const bin = atob(dataUrl.slice(comma + 1));
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}
