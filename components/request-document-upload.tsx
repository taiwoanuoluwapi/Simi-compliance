"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

export function RequestDocumentUpload({ requestId }: { requestId: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function upload(file?: File) {
    if (!file) return;
    setMessage("");
    if (!ACCEPTED.includes(file.type) || file.size > MAX_BYTES) {
      setMessage("Choose a PDF, JPG or PNG file up to 10 MB.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Please sign in again before uploading.");
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
      const path = `${user.id}/${requestId}/${crypto.randomUUID()}-${safeName}`;
      const { error: uploadError } = await supabase.storage.from("request-documents").upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw uploadError;
      const { error: metadataError } = await supabase.from("request_documents").insert({
        request_id: requestId,
        uploaded_by: user.id,
        storage_bucket: "request-documents",
        storage_path: path,
        original_filename: file.name.slice(0, 255),
        mime_type: file.type,
        file_size_bytes: file.size,
      });
      if (metadataError) throw metadataError;
      setMessage("Document uploaded securely.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="upload-box"><label>Upload requested document<input type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={(event) => upload(event.target.files?.[0])}/></label><small>Private upload · PDF, JPG or PNG · Maximum 10 MB</small>{busy && <p>Uploading securely…</p>}{message && <p role="status">{message}</p>}</div>;
}
