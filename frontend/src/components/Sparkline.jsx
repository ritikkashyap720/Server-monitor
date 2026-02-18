import { useId } from 'react';

const POINTS = 48;

function Sparkline({ values, max = 100, color = '#34d399', height = 32, label }) {
  const gradId = 'grad-' + useId().replace(/[^a-zA-Z0-9]/g, '');

  if (!values || values.length < 2) {
    return (
      <div className="w-full min-h-[24px] rounded flex items-center justify-center overflow-hidden" style={{ height }} aria-label={label}>
        <span className="text-[11px] text-slate-500">No data yet</span>
      </div>
    );
  }

  const width = 100;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;
  const slice = values.slice(-POINTS);
  const minVal = Math.min(...slice);
  const maxVal = Math.max(...slice);
  const span = maxVal - minVal || 1;
  const scaleY = (v) => innerH - ((v - minVal) / span) * innerH + padding;
  const scaleX = (i) => padding + (i / (slice.length - 1)) * innerW;

  const pathD = slice
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(i)} ${scaleY(v)}`)
    .join(' ');

  const areaD = `${pathD} L ${scaleX(slice.length - 1)} ${innerH + padding} L ${scaleX(0)} ${innerH + padding} Z`;

  return (
    <div className="w-full min-h-[24px] rounded overflow-hidden flex-1 min-w-[60px] max-w-[120px]" style={{ height }} aria-label={label}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="w-full h-full block">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default Sparkline;
