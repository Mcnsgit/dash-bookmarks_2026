import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, FileUp, AlertTriangle, CheckCircle, Loader2, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api.js';

export default function ImportView() {
  const qc = useQueryClient();
  const [file, setFile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [opts, setOpts] = useState({ skipDuplicates: true, fetchMetadata: false, captureScreenshots: false });

  const analyze = useMutation({
    mutationFn: () => api.upload('/import/analyze', file),
    onSuccess: (d) => { setAnalysis(d); toast.success('Analyzed'); },
    onError: (e) => toast.error(e.message || 'Failed to analyze'),
  });

  const commit = useMutation({
    mutationFn: () => api.post('/import/commit', {
      list: analysis.list,
      options: { ...opts, source: file?.name?.toLowerCase().includes('chrome') ? 'chrome' : 'upload', analysis: analysis.analysis },
    }),
    onSuccess: (d) => {
      toast.success(`Imported ${d.imported}, skipped ${d.skipped}, duplicates ${d.duplicates}`);
      setAnalysis(null); setFile(null);
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
      qc.invalidateQueries({ queryKey: ['folders'] });
      qc.invalidateQueries({ queryKey: ['stats'] });
      qc.invalidateQueries({ queryKey: ['import-history'] });
    },
    onError: (e) => toast.error(e.message || 'Failed to import'),
  });

  const { data: history = [] } = useQuery({ queryKey: ['import-history'], queryFn: () => api.get('/import/history') });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold">Import</h1>
      <p className="text-sm text-ink-500 mb-5">Import bookmarks from Chrome, Firefox, Safari, Edge (HTML) or JSON.</p>

      {!analysis && (
        <div className="card p-6">
          <label className="flex flex-col items-center gap-3 border-2 border-dashed border-ink-200 dark:border-ink-700 rounded-xl p-10 cursor-pointer hover:bg-ink-50 dark:hover:bg-ink-800/50">
            <FileUp className="w-8 h-8 text-ink-400" />
            <div className="text-sm">{file ? <span className="font-medium">{file.name}</span> : 'Click to select an HTML or JSON file'}</div>
            <input type="file" className="hidden" accept=".html,.json,.htm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <span className="text-xs text-ink-400">Netscape HTML, Chrome JSON, or generic JSON array</span>
          </label>
          <div className="mt-4 flex justify-end">
            <button className="btn-primary" disabled={!file || analyze.isPending} onClick={() => analyze.mutate()}>
              {analyze.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing…</> : <><Upload className="w-4 h-4" /> Analyze file</>}
            </button>
          </div>
        </div>
      )}

      {analysis && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Total"            value={analysis.analysis.total} icon={BarChart3} />
            <Stat label="Folders"          value={analysis.analysis.folders.length} />
            <Stat label="Tags"             value={analysis.analysis.tags.length} />
            <Stat label="Top domain"       value={analysis.analysis.domains[0]?.domain || '—'} hint={analysis.analysis.domains[0]?.count} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Stat label="Duplicates in file" value={analysis.duplicates.duplicates_in_file} warn />
            <Stat label="Already in library" value={analysis.duplicates.duplicates_in_db}   warn />
            <Stat label="Title near-dupes"   value={analysis.duplicates.title_near_duplicates} />
          </div>

          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-medium">Top domains ({analysis.analysis.domains.length})</summary>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {analysis.analysis.domains.map((d) => (
                <div key={d.domain} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-md px-2 py-1">
                  <span className="truncate">{d.domain}</span><span className="text-ink-400">{d.count}</span>
                </div>
              ))}
            </div>
          </details>
          <details className="card p-4">
            <summary className="cursor-pointer text-sm font-medium">Folders ({analysis.analysis.folders.length})</summary>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-xs">
              {analysis.analysis.folders.map((f) => (
                <div key={f.name} className="flex items-center justify-between border border-ink-100 dark:border-ink-700 rounded-md px-2 py-1">
                  <span className="truncate">{f.name}</span><span className="text-ink-400">{f.count}</span>
                </div>
              ))}
            </div>
          </details>

          <div className="card p-4">
            <h3 className="text-sm font-semibold mb-3">Import options</h3>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={opts.skipDuplicates}     onChange={(e) => setOpts({ ...opts, skipDuplicates: e.target.checked })} />
                Skip duplicates already in library
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={opts.fetchMetadata}      onChange={(e) => setOpts({ ...opts, fetchMetadata: e.target.checked })} />
                Fetch fresh metadata (title, description, OG image)
                <span className="text-xs text-ink-400">— slower</span>
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={opts.captureScreenshots} onChange={(e) => setOpts({ ...opts, captureScreenshots: e.target.checked })} />
                Capture screenshots
                <span className="text-xs text-ink-400">— much slower, requires screenshot service</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button className="btn-soft" onClick={() => setAnalysis(null)}>Cancel</button>
            <button className="btn-primary" disabled={commit.isPending} onClick={() => commit.mutate()}>
              {commit.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Importing…</> : <><CheckCircle className="w-4 h-4" /> Import {analysis.analysis.total} bookmarks</>}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-semibold mb-2">Recent imports</h2>
          <div className="card divide-y divide-ink-100 dark:divide-ink-700">
            {history.slice(0, 10).map((h) => (
              <div key={h.id} className="px-4 py-2 flex items-center gap-3 text-sm">
                <div className="text-ink-400">{new Date(h.created_at).toLocaleString()}</div>
                <div className="font-medium">{h.source}</div>
                <div className="text-ink-500 ml-auto">
                  {h.imported_count} imported, {h.skipped_count} skipped, {h.duplicate_count} duplicates
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn, icon: Icon }) {
  return (
    <div className={`card p-3 flex items-center gap-3 ${warn && value > 0 ? 'border-amber-300' : ''}`}>
      {Icon && <Icon className="w-4 h-4 text-ink-400" />}
      {warn && value > 0 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
      <div>
        <div className="text-xs uppercase tracking-wider text-ink-400">{label}</div>
        <div className="text-lg font-semibold">{value} {hint && <span className="text-xs text-ink-400 font-normal">({hint})</span>}</div>
      </div>
    </div>
  );
}
