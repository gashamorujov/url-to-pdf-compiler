import { useRef, useState } from 'react';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  detecting: boolean;
}

export function UrlInput({ value, onChange, onAnalyze, detecting }: UrlInputProps) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const combined = [value.trim(), ...lines].filter(Boolean).join('\n');
    onChange(combined);
  };

  return (
    <section className="cyber-panel cyber-panel-corner relative px-0 py-0">
      <span className="cyber-panel-corner tl" />
      <span className="cyber-panel-corner tr" />
      <span className="cyber-panel-corner bl" />
      <span className="cyber-panel-corner br" />
      <div className="p-4 sm:p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-display text-sm font-bold uppercase tracking-widest text-cyan-300">Image URLs</span>
          <span className="text-[10px] uppercase tracking-widest text-cyan-500/60">// input</span>
        </div>
        <p className="mb-3 text-xs text-cyan-100/50">
          Paste one URL per line. Scrambled page numbers are auto-sorted. Drop a <code className="text-cyan-400">.txt</code> file too.
        </p>

        <div
          className={`relative overflow-hidden border transition ${dragging ? 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_24px_rgba(0,229,255,0.3)]' : 'border-cyan-500/25 bg-[#070a18]'}`}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
        >
          <textarea
            id="urls"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={'https://example.com/file.pdf?pageNumber=1\nhttps://example.com/file.pdf?pageNumber=3\nhttps://example.com/file.pdf?pageNumber=2'}
            className="h-48 w-full resize-y bg-transparent p-3 text-sm text-cyan-100 outline-none placeholder:text-cyan-100/25"
            spellCheck={false}
          />
          <span className="pointer-events-none absolute bottom-2 right-3 font-display text-[10px] uppercase tracking-widest text-cyan-500/50">
            ▮ rec
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={onAnalyze}
            disabled={detecting || value.trim().length === 0}
            className="cyber-btn cyber-btn-primary disabled:cursor-not-allowed disabled:opacity-40"
          >
            {detecting ? 'Analyzing…' : 'Analyze URLs'}
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="cyber-btn cyber-btn-ghost"
          >
            Import .txt
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
          <span className="ml-auto text-xs uppercase tracking-widest text-cyan-500/70">
            {value.trim().split(/\r?\n/).filter(Boolean).length} URLs detected
          </span>
        </div>
      </div>
    </section>
  );
}
