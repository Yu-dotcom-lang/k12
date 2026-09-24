import { ArrowRight, BarChart3, BookOpen, Camera, Cat, ChevronLeft, ChevronRight, ClipboardCheck, LoaderCircle, MessageCircle, Play, ScanSearch, Search, Sparkles, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { coursesApi } from "../api/client.js";
import { DailyLearningPlan } from "../components/DailyLearningPlan.jsx";
import { LearningRhythm } from "../components/LearningRhythm.jsx";
import { courses as fallbackCourses } from "../data/learningData.js";
import { courseMatchesLearningScope, EXPERIENCE } from "../experience/experience.js";
import { visualsFor } from "../experience/visualAssets.js";

const fallbackImageFor = (course, index) => fallbackCourses.find((item) => item.subject === course.subject)?.image
  || fallbackCourses[index % fallbackCourses.length].image;

export function HomePage({ session, displayName, navigate, requireLogin, onAskTopic, experience = EXPERIENCE.TEEN, schoolStage }) {
  const railRef = useRef(null);
  const [recommended, setRecommended] = useState([]);
  const [loading, setLoading] = useState(Boolean(session));
  const scrollCourses = (direction) => railRef.current?.scrollBy({ left: direction * 380, behavior: "smooth" });

  useEffect(() => {
    if (!session) {
      setRecommended([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    coursesApi.recommended(8)
      .then((list) => {
        if (!active) return;
        setRecommended(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (active) setRecommended([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [session]);

  const scopedRecommendations = recommended.filter((course) => (
    courseMatchesLearningScope(course.gradeLevel, schoolStage, experience)
  ));
  const scopedFallbackCourses = fallbackCourses.filter((course) => (
    courseMatchesLearningScope(course.grade, schoolStage, experience)
  ));
  const showcaseSource = scopedRecommendations.length ? scopedRecommendations : scopedFallbackCourses;
  const showcase = scopedRecommendations.length
    ? showcaseSource.map((course, index) => ({
      id: course.id,
      title: course.title,
      subject: course.subject,
      grade: course.gradeLevel,
      next: course.description?.trim()?.slice(0, 28) || "打开课程查看章节",
      image: course.coverUrl || fallbackImageFor(course, index),
    }))
    : showcaseSource;
  const primary = experience === EXPERIENCE.PRIMARY;
  const visuals = visualsFor(experience);

  return (
    <div className="page home-page">
      <aside className="home-side-rail home-side-rail-left" aria-label="今日学习入口">
        <img src={visuals.mascot} alt="" aria-hidden="true" />
        <small>{primary ? "今天去哪里探险？" : "今日学习入口"}</small>
        <strong>{primary ? "选一个喜欢的任务开始" : "保持清晰的学习节奏"}</strong>
        <button type="button" onClick={() => navigate("courses")}><BookOpen size={16} />{primary ? "探索课程" : "继续课程"}</button>
        <button type="button" onClick={() => navigate("tasks")}><ClipboardCheck size={16} />{primary ? "趣味任务" : "查看作业"}</button>
      </aside>

      <aside className="home-side-rail home-side-rail-right" aria-label="快捷学习工具">
        <img src={visuals.encouragement} alt="" aria-hidden="true" />
        <small>{primary ? "小智随时陪着你" : "快捷学习工具"}</small>
        <strong>{primary ? "遇到问题就来问我" : "从问题回到行动"}</strong>
        <button type="button" onClick={() => requireLogin(() => navigate("ai-studio"))}><MessageCircle size={16} />{primary ? "问问小智" : "打开 AI"}</button>
        <button type="button" onClick={() => navigate("progress")}><BarChart3 size={16} />{primary ? "我的成长" : "学习报告"}</button>
      </aside>

      {primary ? (
        <section className="primary-sky" aria-label="今日冒险">
          <div className="primary-sky-copy">
            <p className="eyebrow"><Sparkles size={14} />小学低年级 · AI 冒险乐园</p>
            <h1>今天去哪儿探险？</h1>
            <p>跟小智一起听故事、找线索、收集星星！</p>
          </div>
          <img className="primary-sky-art" src={visuals.mascot} alt="小智向你打招呼" />
        </section>
      ) : (
        <section className="teen-stage" aria-label="当前实验">
          <div className="teen-stage-copy">
            <p className="eyebrow teen-stage-eyebrow">AI 创想实验室 · 图像分类</p>
            <h1>让 AI 看见你眼中的世界</h1>
            <p>今天要解决的问题：AI 是怎么从一张照片里认出小猫的？</p>
            <div className="hero-actions">
              <button className="button teen-cta" type="button" onClick={() => requireLogin(() => navigate("cat-lesson"))}><Play size={17} />开启图像分类实验</button>
              <button className="text-button teen-stage-alt" type="button" onClick={() => onAskTopic?.({ title: "图像分类", code: "image-classification" })}>先看动画讲解<ArrowRight size={16} /></button>
            </div>
          </div>
          <div className="teen-pipeline" aria-label="图像分类过程示意">
            <span className="teen-pipe-node"><Camera size={20} />照片</span>
            <span className="teen-pipe-arrow" aria-hidden="true">→</span>
            <span className="teen-pipe-node"><ScanSearch size={20} />特征提取</span>
            <span className="teen-pipe-arrow" aria-hidden="true">→</span>
            <span className="teen-pipe-node"><Cat size={20} />预测：小猫</span>
          </div>
          <p className="teen-stage-note">上图为图像分类过程示意；你的实际进度以课程学习记录为准。</p>
        </section>
      )}

      {primary && (
        <section className="primary-quest" aria-label="今日冒险主任务">
          <article className="primary-quest-card">
            <div className="primary-quest-copy">
              <small>今日冒险主任务</small>
              <h2>AI 为什么能认出小猫？</h2>
              <p>像小侦探一样找线索，看看 AI 是怎么认出小猫的。</p>
              <button className="primary-cta" type="button" onClick={() => navigate("cat-lesson")}>开始今天的冒险<ArrowRight size={18} /></button>
            </div>
            <img src={visuals.heroStudent} alt="学生探险家插画" loading="lazy" />
          </article>
          <ol className="primary-map" aria-label="冒险地图">
            <li><button type="button" onClick={() => navigate("picture-books")}><span className="primary-map-step primary-map-step-blue"><BookOpen size={18} /></span><strong>听故事</strong><small>去互动绘本馆</small></button></li>
            <li><button type="button" onClick={() => navigate("cat-lesson")}><span className="primary-map-step primary-map-step-orange"><Search size={18} /></span><strong>找小猫</strong><small>完成小猫侦探课</small></button></li>
            <li><button type="button" onClick={() => navigate("progress")}><span className="primary-map-step primary-map-step-mint"><Star size={18} /></span><strong>收星星</strong><small>看看我的成长</small></button></li>
          </ol>
        </section>
      )}

      <DailyLearningPlan session={session} navigate={navigate} onAskTopic={onAskTopic} experience={experience} />

      {session && <LearningRhythm session={session} navigate={navigate} experience={experience} className="home-learning-rhythm" />}

      <section className="home-section course-showcase">
        <header className="section-heading"><div><p className="eyebrow">{primary ? "为你准备" : "推荐课程"}</p><h2>{primary ? "选择一场新的探索" : "从感兴趣的课程开始"}</h2><p>{session ? (primary ? "从故事、实验和图形化编程中认识人工智能。" : "覆盖学科基础、科学探究和编程创造。") : "登录后可查看平台已发布课程推荐。"}</p></div><div className="carousel-actions"><button className="icon-button" type="button" title="上一组课程" onClick={() => scrollCourses(-1)}><ChevronLeft size={18} /></button><button className="icon-button" type="button" title="下一组课程" onClick={() => scrollCourses(1)}><ChevronRight size={18} /></button></div></header>
        {session && loading ? (
          <div className="empty-state" style={{ minHeight: 180 }}><LoaderCircle className="spin" size={22} /><p>正在加载推荐课程</p></div>
        ) : (
          <div className="visual-course-rail" ref={railRef}>{showcase.map((course) => (
            <article className="visual-course-card" key={course.id || course.title}>
              <img src={course.image} alt={`${course.title}课程插画`} loading="lazy" />
              <div>
                <span>{course.subject} · {course.grade}</span>
                <h3>{course.title}</h3>
                <p>下一节：{course.next}</p>
                <button type="button" onClick={() => (course.id ? requireLogin(() => navigate(`courses/${course.id}`)) : requireLogin())}>
                  进入课程<ArrowRight size={15} />
                </button>
              </div>
            </article>
          ))}</div>
        )}
      </section>

      {primary ? (
        <section className="home-section home-shortcuts">
          <button type="button" onClick={() => requireLogin(() => navigate("ai-studio"))}><img src={visuals.ai} alt="" /><div><strong>问问小智</strong><p>有问题随时问，也可以听故事</p></div><ArrowRight size={18} /></button>
          <button type="button" onClick={() => navigate("courses")}><img src={visuals.courses} alt="" /><div><strong>继续探索</strong><p>回到上次学习的有趣知识</p></div><ArrowRight size={18} /></button>
          <button type="button" onClick={() => navigate("tasks")}><img src={visuals.tasks} alt="" /><div><strong>今日挑战</strong><p>完成老师布置的小任务</p></div><ArrowRight size={18} /></button>
          <button type="button" onClick={() => navigate("progress")}><img src={visuals.progress} alt="" /><div><strong>成长记录</strong><p>看看新进步和获得的成绩</p></div><ArrowRight size={18} /></button>
        </section>
      ) : (
        <>
          <section className="home-section teen-actions" aria-label="学习行动">
            <button type="button" onClick={() => requireLogin(() => navigate("ai-studio"))}><img src={visuals.ai} alt="" /><div><small>看懂原理</small><strong>AI 学习台讲解</strong><p>看动画、分步讲清图像分类的原理。</p></div><ArrowRight size={18} /></button>
            <button type="button" onClick={() => navigate("code-lab")}><img src={visuals.code} alt="" /><div><small>动手试</small><strong>代码实验室</strong><p>写几行代码，跑出真实的运行结果。</p></div><ArrowRight size={18} /></button>
            <button type="button" onClick={() => navigate("progress")}><img src={visuals.progress} alt="" /><div><small>看反馈</small><strong>学习报告</strong><p>查看知识点掌握度、错因和下一步建议。</p></div><ArrowRight size={18} /></button>
          </section>
          <section className="teen-challenge" aria-label="迁移挑战">
            <div>
              <small>迁移挑战</small>
              <strong>模型为什么会把两张相似图片分错？</strong>
              <p>带着你的猜想去找 AI 教练验证，看看判断依据藏在哪里。</p>
            </div>
            <button className="button ghost teen-challenge-cta" type="button" onClick={() => onAskTopic?.({ title: "模型为什么会把两张相似图片分错", code: "classification-errors" })}>去问 AI 教练<ArrowRight size={16} /></button>
          </section>
        </>
      )}
    </div>
  );
}
