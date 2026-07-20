import { useEffect, useState } from "react";
import { api } from "./api.js";
import { queryClient } from "../main.js";

export interface VideoUploadJob {
  id: number;
  title: string;
  status: "uploading" | "success" | "error" | "cancelled";
  error?: string;
  progressPct: number;
  loadedBytes: number;
  totalBytes: number;
}

let jobs: VideoUploadJob[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const controllers = new Map<number, AbortController>();

function emit() {
  for (const l of listeners) l();
}

function updateJob(id: number, patch: Partial<VideoUploadJob>) {
  jobs = jobs.map((j) => (j.id === id ? { ...j, ...patch } : j));
  emit();
}

export function useVideoUploadJobs() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const onChange = () => setTick((t) => t + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return jobs;
}

export function cancelVideoUpload(id: number) {
  controllers.get(id)?.abort();
}

function extractErrorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { error?: string } }; message?: string };
  return anyErr.response?.data?.error || "Video yuklashda xatolik yuz berdi";
}

export interface StartLessonUploadInput {
  courseId: string;
  title: string;
  videoFile: File;
  durationSeconds?: number;
  isEdit: boolean;
  editLessonId?: string;
}

export function startLessonUpload(input: StartLessonUploadInput) {
  const id = nextId++;
  const controller = new AbortController();
  controllers.set(id, controller);
  jobs = [...jobs, {
    id, title: input.title, status: "uploading",
    progressPct: 0, loadedBytes: 0, totalBytes: input.videoFile.size,
  }];
  emit();

  function finish(delayMs: number) {
    setTimeout(() => {
      jobs = jobs.filter((j) => j.id !== id);
      controllers.delete(id);
      emit();
    }, delayMs);
  }

  (async () => {
    try {
      const form = new FormData();
      form.append("file", input.videoFile);
      const videoUrl = (await api.post<{ url: string }>("/videos/upload", form, {
        signal: controller.signal,
        onUploadProgress: (e) => {
          const total = e.total ?? input.videoFile.size;
          const pct = total > 0 ? Math.min(100, Math.round((e.loaded / total) * 100)) : 0;
          updateJob(id, { progressPct: pct, loadedBytes: e.loaded, totalBytes: total });
        },
      })).data.url;

      if (input.isEdit && input.editLessonId) {
        await api.patch(`/videos/${input.editLessonId}`, {
          title: input.title, videoUrl, durationSeconds: input.durationSeconds,
        });
      } else {
        await api.post(`/video-courses/${input.courseId}/videos`, {
          title: input.title, videoUrl, durationSeconds: input.durationSeconds,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["video-course", input.courseId] });
      queryClient.invalidateQueries({ queryKey: ["video-courses"] });
      updateJob(id, { status: "success", progressPct: 100 });
      finish(4000);
    } catch (err) {
      if (controller.signal.aborted) {
        updateJob(id, { status: "cancelled" });
        finish(2500);
        return;
      }
      updateJob(id, { status: "error", error: extractErrorMessage(err) });
      finish(6000);
    }
  })();
}
