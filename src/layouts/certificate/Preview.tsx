import type { CertificateData } from './schema';

interface CertificatePreviewProps {
  data: CertificateData;
  scale?: number;
}

const W_MM = 297;
const H_MM = 210;
const PX_PER_MM = 2.5;

export function CertificatePreview({ data, scale = 1 }: CertificatePreviewProps) {
  const w = W_MM * PX_PER_MM * scale;
  const h = H_MM * PX_PER_MM * scale;

  return (
    <div
      style={{ width: w, height: h }}
      className="relative overflow-hidden rounded-lg border-[6px] border-double border-amber-700/70 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-10 text-slate-900 shadow-md"
    >
      <div className="flex h-full flex-col items-center text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-amber-700">
          Certificate of Completion
        </p>
        <p className="mt-2 text-[10px] uppercase tracking-widest text-slate-500">
          Awarded by {data.organization || 'Organisation'}
        </p>

        <div className="my-6 h-px w-1/3 bg-amber-700/40" />

        <p className="text-[12px] uppercase tracking-wider text-slate-500">
          This is to certify that
        </p>
        <p
          className="mt-3 text-[36px] font-bold text-amber-800"
          style={{ fontFamily: '"Cormorant Garamond", "Times New Roman", serif' }}
        >
          {data.recipient_name || 'Recipient Name'}
        </p>

        <p className="mx-auto mt-4 max-w-[60%] text-[10px] leading-relaxed text-slate-600">
          {data.body}
        </p>

        <p className="mt-3 text-[14px] font-semibold italic text-slate-700">
          “{data.course_title || 'Course / Award Title'}”
        </p>

        <div className="mt-auto grid w-full grid-cols-3 items-end gap-6 text-left">
          <div>
            <p className="text-[8px] uppercase tracking-wide text-slate-500">Issued</p>
            <p className="text-[10px] font-semibold">{data.issued_date || '—'}</p>
          </div>
          <div className="text-center">
            {data.signature_image ? (
              <img
                src={data.signature_image}
                alt="Signature"
                className="mx-auto h-10 object-contain"
              />
            ) : (
              <div className="h-10" />
            )}
            <div className="mx-auto h-px w-2/3 bg-slate-400" />
            <p className="mt-1 text-[8px] font-semibold uppercase">
              {data.signatory_name || 'Signatory'}
            </p>
            <p className="text-[7px] text-slate-500">{data.signatory_title}</p>
          </div>
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-wide text-slate-500">Serial</p>
            <p className="text-[10px] font-semibold">{data.serial || '—'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
