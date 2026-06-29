import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { Upload, X, Image as ImageIcon, Video as VideoIcon, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { uploadToCloudinary, cloudinaryConfigured, blurredThumbnail, type UploadedAsset } from "@/lib/cloudinary";

export const Route = createFileRoute("/_authenticated/creator-studio/upload")({
  component: UploadPage,
});

type AccessType = "free" | "subscribers" | "ppv";

type PendingFile = {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  uploaded?: UploadedAsset;
  error?: string;
};

function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [access, setAccess] = useState<AccessType>("free");
  const [price, setPrice] = useState(199);
  const [isFeatured, setIsFeatured] = useState(false);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const configured = cloudinaryConfigured();

  function onPick(list: FileList | null) {
    if (!list) return;
    const newOnes: PendingFile[] = Array.from(list).slice(0, 10).map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newOnes]);
    // Start uploads
    newOnes.forEach(async (pf) => {
      try {
        const uploaded = await uploadToCloudinary(pf.file, (pct) =>
          setFiles((prev) => prev.map((x) => (x.id === pf.id ? { ...x, progress: pct } : x))),
        );
        setFiles((prev) => prev.map((x) => (x.id === pf.id ? { ...x, uploaded, progress: 100 } : x)));
      } catch (err: any) {
        setFiles((prev) => prev.map((x) => (x.id === pf.id ? { ...x, error: err.message } : x)));
      }
    });
  }

  function removeFile(id: string) {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }

  async function handlePublish() {
    if (!user) return;
    if (files.length === 0) return toast.error("Adiciona pelo menos um ficheiro");
    if (!title.trim()) return toast.error("Adiciona um título");
    const uploaded = files.filter((f) => f.uploaded);
    if (uploaded.length !== files.length) return toast.error("Aguarda o fim dos uploads");

    setSubmitting(true);
    try {
      const media_urls = uploaded.map((f) => f.uploaded!.url);
      const media_types = uploaded.map((f) => f.uploaded!.type);
      const thumbnail_url = access === "free" ? null : blurredThumbnail(media_urls[0]);

      const { error } = await supabase.from("posts").insert({
        creator_id: user.id,
        title,
        description,
        media_urls,
        media_types,
        thumbnail_url,
        access,
        price: access === "ppv" ? price : 0,
        is_featured: isFeatured,
      });
      if (error) throw error;
      toast.success("Publicação criada!");
      navigate({ to: "/creator-studio/posts" });
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Publicar conteúdo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Imagens ou vídeos, até 10 ficheiros por publicação.</p>
      </div>

      {!configured && (
        <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <div className="font-semibold">Cloudinary ainda não está configurado</div>
            <div className="mt-1 text-muted-foreground">
              Define <code className="rounded bg-card px-1">VITE_CLOUDINARY_CLOUD_NAME</code> e <code className="rounded bg-card px-1">VITE_CLOUDINARY_UPLOAD_PRESET</code> (preset não-assinado) no <code className="rounded bg-card px-1">.env</code>.
            </div>
          </div>
        </div>
      )}

      {/* Drag & drop */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files); }}
        className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card px-6 py-12 text-center hover:border-primary hover:bg-card/80"
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="mt-3 text-sm font-medium">Arrasta ficheiros ou clica para escolher</div>
        <div className="mt-1 text-xs text-muted-foreground">JPG, PNG, WEBP, MP4 — até 10 ficheiros</div>
        <input ref={inputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => onPick(e.target.files)} />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <div key={f.id} className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-card">
              {f.file.type.startsWith("video") ? (
                <div className="flex h-full w-full items-center justify-center bg-muted"><VideoIcon className="h-8 w-8 text-muted-foreground" /></div>
              ) : (
                <img src={f.previewUrl} alt="" className="h-full w-full object-cover" />
              )}
              <button onClick={() => removeFile(f.id)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100">
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-white">
                {f.error ? <span className="text-destructive">{f.error}</span>
                  : f.uploaded ? <span className="text-success">✓ {f.uploaded.type}</span>
                  : <span>A enviar… {f.progress}%</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000}
            className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary" />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-muted-foreground">Tipo de acesso</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { key: "free", label: "Gratuito", icon: ImageIcon },
              { key: "subscribers", label: "Subscritores", icon: ImageIcon },
              { key: "ppv", label: "Pay-per-view", icon: ImageIcon },
            ] as const).map(({ key, label }) => (
              <button key={key} onClick={() => setAccess(key)}
                className={`rounded-lg border px-3 py-3 text-sm font-medium transition ${access === key ? "border-primary bg-primary/10 text-primary" : "border-border bg-input hover:bg-secondary"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {access === "ppv" && (
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Preço (créditos)</label>
            <input type="number" min={100} step={50} value={price} onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-sm outline-none focus:ring-2 ring-primary" />
            <p className="mt-1 text-xs text-muted-foreground">≈ ${(price / 100).toFixed(2)}</p>
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="h-4 w-4 accent-primary" />
          Destacar no perfil
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => navigate({ to: "/creator-studio/posts" })} className="rounded-lg border border-border px-4 py-2.5 text-sm">Cancelar</button>
        <button onClick={handlePublish} disabled={submitting}
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
          {submitting ? "A publicar…" : "Publicar"}
        </button>
      </div>
    </div>
  );
}
