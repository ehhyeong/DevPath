export default function MeetingVolumeSlider({ label, value, onChange, dark = false }: {
  label: string; value: number; onChange: (value: number) => void; dark?: boolean
}) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3">
      <span className={`text-xs font-bold ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{label}</span>
      <label className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${dark ? 'border-gray-600 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700'}`}>
        <input type="number" min={0} max={200} step={1} aria-label={`${label} 수치`} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-11 bg-transparent p-0! text-right text-xs! outline-none" />%
      </label>
    </div>
    <input aria-label={label} type="range" min={0} max={200} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="block h-5 w-full cursor-pointer accent-[#00c471]" />
    <div className="flex justify-between text-[10px] text-gray-400"><span>0%</span><span>100%</span><span>200%</span></div>
  </div>
}
