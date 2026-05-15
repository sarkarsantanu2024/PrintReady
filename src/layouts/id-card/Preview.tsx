import { QRCodeSVG } from 'qrcode.react';
import type { IdCardData } from './schema';

interface IdCardPreviewProps {
  data: IdCardData;
  /** Display scale: 1 = real-world mm at 3.78 px/mm CSS. */
  scale?: number;
}

const CARD_W_MM = 85.6;
const CARD_H_MM = 54;
const PX_PER_MM = 3.78;

export function IdCardPreview({ data, scale = 2 }: IdCardPreviewProps) {
  const w = CARD_W_MM * PX_PER_MM * scale;
  const h = CARD_H_MM * PX_PER_MM * scale;

  return (
    <div
      style={{ width: w, height: h }}
      className="relative overflow-hidden rounded-lg bg-white text-slate-900 shadow-md"
    >
      {/* Top color band */}
      <div
        className="absolute inset-x-0 top-0 h-1/4 bg-primary"
        aria-hidden
      />
      <div className="relative z-10 flex h-full">
        {/* Left: photo */}
        <div className="w-[35%] p-2.5">
          <div className="mt-6 aspect-square w-full overflow-hidden rounded-md bg-slate-200">
            {data.photo ? (
              // eslint-disable-next-line jsx-a11y/img-redundant-alt
              <img src={data.photo} alt="Photo" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[8px] text-slate-500">
                Photo
              </div>
            )}
          </div>
        </div>

        {/* Right: details */}
        <div className="flex-1 p-2 pt-1">
          <p className="text-[7px] font-bold uppercase tracking-wider text-white">
            {data.org_name || 'Organisation'}
          </p>
          <div className="mt-2.5">
            <p className="text-[10px] font-bold leading-tight">
              {data.full_name || 'Full Name'}
            </p>
            <p className="text-[7px] font-medium uppercase text-slate-500">
              {data.designation || 'Designation'}
            </p>
          </div>
          <div className="mt-1.5 space-y-0.5 text-[6.5px] text-slate-700">
            <p>
              <span className="font-semibold">ID:</span> {data.id_number || '—'}
            </p>
            {data.department && (
              <p>
                <span className="font-semibold">Dept:</span> {data.department}
              </p>
            )}
            {data.blood_group && (
              <p>
                <span className="font-semibold">Blood:</span> {data.blood_group}
              </p>
            )}
            {data.valid_until && (
              <p>
                <span className="font-semibold">Valid:</span> {data.valid_until}
              </p>
            )}
          </div>
          <div className="absolute bottom-1.5 right-1.5">
            <QRCodeSVG
              value={data.qr_data || data.id_number || ' '}
              size={Math.round(14 * scale)}
              level="M"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
