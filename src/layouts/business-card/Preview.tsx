import { QRCodeSVG } from 'qrcode.react';
import { buildVCard, type BusinessCardData } from './schema';

interface BusinessCardPreviewProps {
  data: BusinessCardData;
  scale?: number;
}

const W_MM = 89;
const H_MM = 54;
const PX_PER_MM = 3.78;

export function BusinessCardPreview({ data, scale = 2 }: BusinessCardPreviewProps) {
  const w = W_MM * PX_PER_MM * scale;
  const h = H_MM * PX_PER_MM * scale;
  const qrValue = data.qr_enabled ? buildVCard(data) : '';

  return (
    <div
      style={{ width: w, height: h }}
      className="relative overflow-hidden rounded-lg bg-white p-3 text-slate-900 shadow-md"
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-bold leading-tight">
              {data.full_name || 'Full Name'}
            </p>
            <p className="text-[8px] font-medium uppercase text-slate-500">
              {data.title || 'Job Title'}
            </p>
          </div>
          {data.logo ? (
            // eslint-disable-next-line jsx-a11y/img-redundant-alt
            <img src={data.logo} alt="Logo" className="h-7 w-7 object-contain" />
          ) : null}
        </div>

        {/* Company stripe */}
        <div className="mt-2 border-t border-primary pt-1.5">
          <p className="text-[9px] font-bold text-primary">
            {data.company || 'Company Name'}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-auto flex items-end justify-between">
          <div className="space-y-0.5 text-[6.5px] text-slate-700">
            {data.email && <p>{data.email}</p>}
            {data.phone && <p>{data.phone}</p>}
            {data.website && <p>{data.website}</p>}
            {data.address && <p className="max-w-[60%] truncate">{data.address}</p>}
          </div>
          {data.qr_enabled && qrValue && (
            <QRCodeSVG value={qrValue} size={Math.round(16 * scale)} level="M" />
          )}
        </div>
      </div>
    </div>
  );
}
