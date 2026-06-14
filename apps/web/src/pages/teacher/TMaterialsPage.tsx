import { useRef, useState } from "react";
import { Card, Icon, PageHead } from "@chess-school/ui";
import { useAuthStore } from "../../lib/auth-store.js";
import { useDeleteMaterial, useGroups, useMaterials, useUploadMaterial } from "../../lib/queries.js";

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TMaterialsPage() {
  const { data: materials, isLoading } = useMaterials();
  const { data: groups } = useGroups();
  const upload = useUploadMaterial();
  const del = useDeleteMaterial();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const token = useAuthStore((s) => s.accessToken);

  const myGroups = groups ?? [];

  function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file || !title.trim()) return;
    upload.mutate(
      { title: title.trim(), groupId: groupId || undefined, file },
      {
        onSuccess: () => {
          setTitle("");
          setGroupId("");
          if (fileRef.current) fileRef.current.value = "";
        },
      }
    );
  }

  function download(id: string, fileName: string) {
    fetch(`/api/v1/materials/${id}/download`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      });
  }

  return (
    <div>
      <PageHead title="Dars materiallari" />

      <Card className="card-pad fade-up" style={{ marginBottom: "var(--gap)" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input className="inp" placeholder="Material nomi" value={title} onChange={(e) => setTitle(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          <select className="inp" value={groupId} onChange={(e) => setGroupId(e.target.value)} style={{ minWidth: 160 }}>
            <option value="">Guruh tanlanmagan</option>
            {myGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <input ref={fileRef} type="file" className="inp" />
          <button className="btn primary" onClick={handleUpload} disabled={upload.isPending}>
            <Icon name="archive" size={15} /> Yuklash
          </button>
        </div>
      </Card>

      <Card className="fade-up">
        <div style={{ overflowX: "auto" }}>
          <table className="tbl">
            <thead>
              <tr><th>Nomi</th><th>Guruh</th><th>Fayl</th><th>Hajmi</th><th>Sana</th><th></th></tr>
            </thead>
            <tbody>
              {materials?.map((m) => (
                <tr key={m.id}>
                  <td className="cell-main">{m.title}</td>
                  <td>{m.groupName ?? "—"}</td>
                  <td className="cell-sub">{m.fileName}</td>
                  <td className="tnum">{fmtSize(m.sizeBytes)}</td>
                  <td className="cell-sub">{new Date(m.createdAt).toLocaleDateString("uz-UZ")}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn sm" onClick={() => download(m.id, m.fileName)}>
                        <Icon name="download" size={14} />
                      </button>
                      <button className="btn sm" onClick={() => del.mutate(m.id)}>
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && (materials?.length ?? 0) === 0 && (
                <tr><td colSpan={6}><div className="empty"><Icon name="archive" size={28} /><div>Materiallar yo'q</div></div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
