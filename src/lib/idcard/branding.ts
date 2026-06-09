import { DEFAULT_LAYOUT, type IdCardHeader, type IdCardLayout } from './layout';
import { DEFAULT_LOGO_DATA_URL } from './defaultLogo';

/**
 * Persists the header branding (logo + company text + colours) in localStorage.
 * The client's logo (DEFAULT_LOGO_DATA_URL) is baked in as the permanent
 * default, so it appears without any upload; uploading a different logo
 * overrides it. The PNG bytes used for the PDF embed are reconstructed from the
 * data URL on load.
 */
const KEY = 'printready:idcard-branding:v1';

/** Everything in the header except the runtime-only PNG bytes. */
type StoredBranding = Omit<IdCardHeader, 'logoPng'>;

/** DEFAULT_LAYOUT with the permanent client logo applied. */
function defaultWithLogo(): IdCardLayout {
  if (!DEFAULT_LOGO_DATA_URL) return DEFAULT_LAYOUT;
  return {
    ...DEFAULT_LAYOUT,
    header: {
      ...DEFAULT_LAYOUT.header,
      logoDataUrl: DEFAULT_LOGO_DATA_URL,
      logoPng: dataUrlToBytes(DEFAULT_LOGO_DATA_URL),
    },
  };
}

export function loadBranding(): IdCardLayout {
  const base = defaultWithLogo();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return base;
    const saved = JSON.parse(raw) as Partial<StoredBranding>;
    // Fall back to the baked-in logo when none was explicitly uploaded.
    const logoDataUrl = saved.logoDataUrl ?? DEFAULT_LOGO_DATA_URL;
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
    return base;
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
