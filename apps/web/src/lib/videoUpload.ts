import { useEffect, useState } from "react";
import { api } from "./api.js";
import { queryClient } from "../main.js";

export interface VideoUploadJob {
  id: number;
  title: string;
  status: "uploading" | "success" | "error";
  error?: string;
}

let jobs: VideoUploadJob[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
function emit() {
  for (const l of listeners) l();
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
  jobs = [...jobs, { id, title: input.title, status: "uploading" }];
  emit();

  (async () => {
    try {
      const form = new FormData();
      form.append("file", input.videoFile);
      const videoUrl = (await api.post<{ url: string }>("/videos/upload", form)).data.url;

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
      jobs = jobs.map((j) => (j.id === id ? { ...j, status: "success" } : j));
      emit();
    } catch {
      jobs = jobs.map((j) => (j.id === id ? { ...j, status: "error", error: "Video yuklashda xatolik yuz berdi" } : j));
      emit();
    } finally {
      setTimeout(() => {
        jobs = jobs.filter((j) => j.id !== id);
        emit();
      }, 4000);
    }
  })();
}
