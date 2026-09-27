import { useEffect, useState } from "react";
import { BookOpenCheck, ChevronRight, Presentation, Sparkles } from "lucide-react";
import { coursewareApi } from "../api/client.js";
import { COURSEWARE_MIME, CoursewarePlayer } from "../components/CoursewarePlayer.jsx";

const STAGE_LABELS = {
  lower_primary: "小学低年级",
  upper_primary: "小学高年级",
  middle_school: "初中",
  high_school: "高中",
};

/** 学生端已发布课件列表：点开即进入互动课件播放器。 */
export function CoursewaresPage({ session, requireLogin }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    coursewareApi.listPublished()
      .then((data) => {
        if (alive) setItems(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (alive) setError(err.message || "课件加载失败，请稍后再试");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  async function openCourseware(item) {
    setError("");
    try {
      const detail = item.document
        ? item
        : await coursewareApi.getPublished(item.coursewareId);
      if (detail?.document?.slides?.length) {
        setActive(detail);
      } else {
        setError("这份课件暂时打不开，请稍后再试");
      }
    } catch (err) {
      setError(err.message || "课件加载失败，请稍后再试");
    }
  }

  if (active) {
    return (
      <div className="page inner-page coursewares-page">
        <button className="button ghost back-button" type="button" onClick={() => setActive(null)}>
          <ChevronRight size={16} style={{ transform: "rotate(180deg)" }} /> 返回课件列表
        </button>
        <CoursewarePlayer
          artifact={{ kind: "COURSEWARE", mimeType: COURSEWARE_MIME, payload: active.document }}
        />
      </div>
    );
  }

  return (
    <div className="page inner-page coursewares-page">
      <header className="page-header">
        <p className="eyebrow"><Sparkles size={14} /> 老师审核过的 AI 课件</p>
        <h1>AI 课件</h1>
        <p className="page-subtitle">点开课件，跟小智一页一页学，还能边学边答题。</p>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? (
        <p className="page-loading">正在整理课件书架...</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <BookOpenCheck size={36} />
          <p>老师还没有发布课件，先去别处逛逛吧～</p>
        </div>
      ) : (
        <div className="courseware-grid">
          {items.map((item) => (
            <article className="courseware-card" key={item.coursewareId}>
              <div className="courseware-card-icon"><Presentation size={22} /></div>
              <h2>{item.title}</h2>
              <p className="courseware-card-meta">
                {STAGE_LABELS[item.stage] || "全学段"} · {item.slideCount} 页
              </p>
              <button
                className="button primary"
                type="button"
                onClick={() => (session ? openCourseware(item) : requireLogin(() => openCourseware(item)))}
              >
                开始学习 <ChevronRight size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
