import { useEffect, useState } from "react";
import { BookOpenCheck, ChevronRight, ClipboardCheck, Presentation, ShieldCheck, Sparkles } from "lucide-react";
import { coursewareApi } from "../api/client.js";
import { AuthGateShowcase } from "../components/AuthGateShowcase.jsx";
import { ExperiencePageHeader } from "../components/ExperiencePageHeader.jsx";
import { COURSEWARE_MIME, CoursewarePlayer } from "../components/CoursewarePlayer.jsx";
import { EXPERIENCE } from "../experience/experience.js";

const STAGE_LABELS = {
  lower_primary: "小学低年级",
  upper_primary: "小学高年级",
  middle_school: "初中",
  high_school: "高中",
};

/** 学生端已发布课件列表：点开即进入互动课件播放器。 */
export function CoursewaresPage({ session, requireLogin, experience = EXPERIENCE.TEEN }) {
  const primary = experience === EXPERIENCE.PRIMARY;
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
      <ExperiencePageHeader
        experience={experience}
        eyebrow={primary ? "小智课件书架" : "老师审核过的 AI 课件"}
        title="AI 课件"
        description={primary
          ? "点开课件，跟小智一页一页学，还能边学边答题。"
          : "由老师用 AI 生成并审核发布的互动课件，边看边答，学完即测。"}
        imageKey="courses"
      >
        <ul className="courseware-hero-points" aria-label="课件亮点">
          <li><Presentation size={14} />翻页互动课堂</li>
          <li><ClipboardCheck size={14} />随堂小题即练</li>
          <li><ShieldCheck size={14} />老师审核后发布</li>
        </ul>
      </ExperiencePageHeader>
      {error && session && <p className="form-error" role="alert">{error}</p>}
      {error && !session && (
        <AuthGateShowcase
          icon={Presentation}
          title="登录后查看完整课件书架"
          description="课件由老师用 AI 生成并审核发布；登录后可以打开课件边学边答题。"
          features={[
            { icon: Sparkles, title: "AI 生成 · 老师审核", text: "每份课件都经过老师审核后才发布。" },
            { icon: BookOpenCheck, title: "一页一页跟着学", text: "图、文、例子分页讲解，像翻绘本一样。" },
            { icon: ClipboardCheck, title: "边学边答", text: "课件里的小测当场作答，即时反馈。" },
          ]}
          onLogin={() => requireLogin()}
        />
      )}
      {loading ? (
        <p className="page-loading">正在整理课件书架...</p>
      ) : !error && items.length === 0 ? (
        <div className="empty-state">
          <BookOpenCheck size={36} />
          <p>老师还没有发布课件，先去别处逛逛吧～</p>
        </div>
      ) : !error && items.length > 0 && (
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
                onClick={() => openCourseware(item)}
              >
                开始学习 <ChevronRight size={15} />
              </button>
            </article>
          ))}
        </div>
      )}
      {!loading && !error && items.length > 0 && (
        <footer className="auth-gate-features courseware-shelf-note">
          <article>
            <ShieldCheck size={17} />
            <strong>老师审核过</strong>
            <span>AI 生成的课件，老师逐页审核后才发布。</span>
          </article>
          <article>
            <BookOpenCheck size={17} />
            <strong>一页一页跟着学</strong>
            <span>图、文、例子分页讲解，随时回看。</span>
          </article>
          <article>
            <ClipboardCheck size={17} />
            <strong>边学边答</strong>
            <span>课件里的小测当场作答，马上知道对错。</span>
          </article>
        </footer>
      )}
    </div>
  );
}
