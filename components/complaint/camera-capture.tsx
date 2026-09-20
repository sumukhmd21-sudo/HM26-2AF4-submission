"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Upload, Loader2, RotateCcw, Check, MessageSquare } from "lucide-react";
import type { ImageAnalysisResult } from "@/lib/types";

export function CameraCapture({
  draftId,
  complaintText,
  onUploading,
  onProcessing,
  onValid,
  onInvalid,
  onSkip,
  onCancel,
}: {
  draftId: string;
  complaintText: string;
  onUploading: () => void;
  onProcessing: () => void;
  onValid: (
    imageId: string,
    analysis: ImageAnalysisResult,
    title: string,
    description: string,
    categoryId?: string,
    subcategoryId?: string,
    previewUrl?: string
  ) => void;
  onInvalid: (reason: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraDenied, setCameraDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const start = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        const v = videoRef.current;
        // Some browsers (Safari especially) require `muted` to be set on
        // the element BEFORE `srcObject` is attached, or playback is
        // blocked and the frame stays black.
        v.muted = true;
        v.setAttribute("muted", "");
        v.setAttribute("playsinline", "true");
        v.setAttribute("autoplay", "");
        v.srcObject = stream;
        // `play()` can reject on Safari if the page hasn't had a user
        // gesture yet — the autoPlay attribute handles this in most cases,
        // but we still try-and-swallow to avoid marking the camera denied.
        try {
          await v.play();
        } catch {
          // Ignore — the autoplay attribute will take over once the
          // user has interacted with the page (e.g. tapped this button).
        }
      }
      setOpen(true);
    } catch {
      setCameraDenied(true);
      setError(
        "Camera access was denied or is unavailable. You can upload a photo from your device instead, or describe the issue without a photo."
      );
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setOpen(false);
  };

  useEffect(() => () => stop(), []);

  const capture = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) {
      setError("Camera is not ready yet. Please try again in a moment.");
      return;
    }
    // Some browsers report videoWidth/Height as 0 if the first frame
    // hasn't decoded yet. Fall back to the element's intrinsic size.
    const w = v.videoWidth || v.clientWidth || 640;
    const h = v.videoHeight || v.clientHeight || 480;
    if (w === 0 || h === 0) {
      setError("Camera frame not ready — please tap Capture again.");
      return;
    }
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) {
      setError("Couldn't access the canvas. Try uploading instead.");
      return;
    }
    ctx.drawImage(v, 0, 0, w, h);
    const blob: Blob | null = await new Promise((res) =>
      c.toBlob((b) => res(b), "image/jpeg", 0.85)
    );
    if (!blob) {
      setError("Couldn't capture the frame. Try uploading instead.");
      return;
    }
    setPreview(blob);
    stop();
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setPreview(f);
  };

  const retake = () => setPreview(null);

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    onUploading();
    try {
      const fd = new FormData();
      fd.append("file", preview, "photo.jpg");
      fd.append("draftId", draftId);
      const upRes = await fetch("/api/images/upload", { method: "POST", body: fd });
      const up = await upRes.json();
      if (!upRes.ok) throw new Error(up.error ?? "IMAGE_UPLOAD_ERROR");
      onProcessing();
      const ar = await fetch("/api/complaints/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId, imageId: up.imageId }),
      });
      const aj = await ar.json();
      if (!ar.ok) throw new Error(aj.error ?? "AI_FAILURE");
      const a: ImageAnalysisResult = aj.analysis;
      if (!a.imageValid || !a.problemVisible) {
        onInvalid("IMAGE_IRRELEVANT");
        return;
      }
      if (a.retakeRecommended) {
        onInvalid("IMAGE_LOW_QUALITY");
        return;
      }
      onValid(
        up.imageId,
        a,
        aj.final.title,
        aj.final.description,
        aj.categoryId,
        aj.subcategoryId,
        URL.createObjectURL(preview)
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-medium">Take a photo of the problem</h2>
      <p className="mt-1 text-sm text-white/60">
        Capture a clear image showing the issue. We'll analyze the photo and fill in the complaint for you — no typing needed.
      </p>

      {!open && !preview && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="btn-primary" onClick={start}>
            <Camera className="h-4 w-4" /> Open Camera
          </button>
          <label className="btn-ghost cursor-pointer">
            <Upload className="h-4 w-4" /> Upload from Device
            <input type="file" accept="image/*" className="hidden" onChange={onFile} />
          </label>
          <button className="btn-ghost" onClick={onSkip}>
            <MessageSquare className="h-4 w-4" /> Describe without a photo
          </button>
        </div>
      )}

      {open && (
        <div className="mt-5 space-y-3">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="aspect-video w-full rounded-xl border border-white/10 bg-black"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex justify-center gap-2">
            <button className="btn-primary" onClick={capture}>
              Capture
            </button>
            <button className="btn-ghost" onClick={stop}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {preview && (
        <div className="mt-5 space-y-3">
          <img
            src={URL.createObjectURL(preview)}
            alt="Captured evidence"
            className="aspect-video w-full rounded-xl border border-white/10 object-cover"
          />
          <div className="flex justify-center gap-2">
            <button className="btn-ghost" onClick={retake}>
              <RotateCcw className="h-4 w-4" /> Retake
            </button>
            <button className="btn-primary" disabled={busy} onClick={confirm}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Analyze this photo
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
          {cameraDenied && (
            <div className="flex justify-center">
              <button className="btn-ghost" onClick={onSkip}>
                <MessageSquare className="h-4 w-4" /> Describe without a photo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
