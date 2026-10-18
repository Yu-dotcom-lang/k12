import { useEffect, useState } from "react";
import { BookOpenCheck, ChevronRight, ClipboardCheck, Presentation, ShieldCheck, Sparkles } from "lucide-react";
import { coursewareApi } from "../api/client.js";
import { AuthGateShowcase } from "../components/AuthGateShowcase.jsx";
import { ExperiencePageHeader } from "../components/ExperiencePageHeader.jsx";
import { COURSEWARE_MIME, CoursewarePlayer } from "../components/CoursewarePlayer.jsx";
import { EXPERIENCE, experienceForSchoolStage } from "../experience/experience.js";

const STAGE_LABELS = {
  lower_primary: "小学低年级",
  upper_primary: "小学高年级",
  middle_school: "初中",
  high_school: "高中",
};

// 课件学段与学习档案学段的对应关系：有档案且与当前体验匹配时只看本学段，无档案（评委浏览）分组全展示。
const COURSEWARE_STAGE_ORDER = [
  { key: "lower_primary", label: "小学低年级", profileStage: "PRIMARY_LOWER" },
  { key: "upper_primary", label: "小学高年级", profileStage: "PRIMARY_UPPER" },
  { key: "middle_school", label: "初中", profileStage: "JUNIOR_HIGH" },
  { key: "high_school", label: "高中", profileStage: "SENIOR_HIGH" },
];

/** 学生端已发布课件列表：按学段分组书架，点开即进入互动课件播放器。 */
export function CoursewaresPage({ session, requireLogin, experience = EXPERIENCE.TEEN, learningProfile }) {
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

  const profileStage = learningProfile?.schoolStage;
  const profileMatches = Boolean(profileStage && experienceForSchoolStage(profileStage) === experience);
  const stageGroups = COURSEWARE_STAGE_ORDER
    .filter((group) => !profileMatches || group.profileStage === profileStage)
    .map((group) => ({ ...group, items: items.filter((item) => item.stage === group.key) }))
    .filter((group) => group.items.length);
  // 档案学段暂无课件时不留空书架：提示"整理中"并展示其他学段的已发布课件（如实标注学段）。
  const showOtherStages = profileMatches && stageGroups.length === 0;
  const visibleGroups = showOtherStages
    ? COURSEWARE_STAGE_ORDER
      .map((group) => ({ ...group, items: items.filter((item) => item.stage === group.key) }))
      .filter((group) => group.items.length)
    : stageGroups;
  const generalItems = items.filter((item) => !COURSEWARE_STAGE_ORDER.some((group) => group.key === item.stage));

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
        <>
          {showOtherStages && (
            <div className="stage-scope-banner" role="status">
              <span><BookOpenCheck size={17} /></span>
              <div><strong>「{STAGE_LABELS[COURSEWARE_STAGE_ORDER.find((group) => group.profileStage === profileStage)?.key] || "本学段"}」课件整理中</strong><p>先看其他学段已发布的课件，老师发布新课件后会出现在这里。</p></div>
            </div>
          )}
          {visibleGroups.map((group) => {
            const strictMode = profileMatches && !showOtherStages;
            return (
            <section className="courseware-stage-group" key={group.key} aria-label={`${group.label}课件`}>
              <header className="courseware-stage-head">
                <p className="eyebrow">{strictMode ? group.label : `${group.label}阶段`}</p>
                <h2>{strictMode ? "本学段课件书架" : `${group.label} · 适合这一学段的课件`}</h2>
                <small>{group.items.length} 份</small>
              </header>
              <div className="courseware-grid">
                {group.items.map((item) => (
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
            </section>
            );
          })}
          {generalItems.length > 0 && (
            <section className="courseware-stage-group" aria-label="全学段课件">
              <header className="courseware-stage-head">
                <p className="eyebrow">全学段</p>
                <h2>适合所有学段的课件</h2>
                <small>{generalItems.length} 份</small>
              </header>
              <div className="courseware-grid">
                {generalItems.map((item) => (
                  <article className="courseware-card" key={item.coursewareId}>
                    <div className="courseware-card-icon"><Presentation size={22} /></div>
                    <h2>{item.title}</h2>
                    <p className="courseware-card-meta">全学段 · {item.slideCount} 页</p>
                    <button className="button primary" type="button" onClick={() => openCourseware(item)}>
                      开始学习 <ChevronRight size={15} />
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
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
