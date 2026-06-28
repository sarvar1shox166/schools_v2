import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Video kurslar detali hozircha ishlatilmaydi — asosiy sahifaga yo'naltiriladi
export default function VideoCourseDetailPage() {
  const navigate = useNavigate();
  useEffect(() => { navigate("/admin/video-courses", { replace: true }); }, []);
  return null;
}
