import { Bot, ChevronDown, Code2, ClipboardCheck, GraduationCap, PlayCircle, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TeachingAssistantChat } from "../components/TeachingAssistantChat.jsx";
import { PrimaryLearningGuide } from "../components/PrimaryLearningGuide.jsx";
import { ExperiencePageHeader } from "../components/ExperiencePageHeader.jsx";
import { topicsByCategory } from "../data/teachingTopics.js";
import { primaryChatStarters } from "../data/primaryChatPictures.js";
import { EXPERIENCE } from "../experience/experience.js";

const RAIL_MIN = 220;
const RAIL_MAX = 440;
const RAIL_DEFAULT = 280;
// 中学端首屏热门问题：让 hero 不再只有一行标题，点一下就能开始提问。
// 小学端改用图画开场卡（primaryChatStarters），认字不多也能挑。
const QUICK_QUESTIONS = [
  "什么是机器学习？",
  "推荐算法怎么懂我？",
  "大模型是怎么工作的？",
  "学 AI 需要什么基础？",
];
export function AiStudioPage({
  session,
  displayName,
  requireLogin,
  navigate,
  draftRequest,
  onDraftConsumed,
  onPracticeRecorded,
  experience = EXPERIENCE.TEEN,
  schoolStage,
}) {
  const [activeTopicId, setActiveTopicId] = useState(null);
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [seedPrompt, setSeedPrompt] = useState(null);
  const [railWidth, setRailWidth] = useState(RAIL_DEFAULT);
  const dragging = useRef(false);
  const layoutRef = useRef(null);
  const clearSeed = useCallback(() => setSeedPrompt(null), []);
  const primary = experience === EXPERIENCE.PRIMARY;
  const topicGroups = primary ? [] : topicsByCategory("teen");

  useEffect(() => {
    if (!draftRequest || !session) return;
    if (draftRequest.prompt) {
      setSeedPrompt({
        prompt: draftRequest.prompt,
        preferDeterministic: Boolean(draftRequest.preferDeterministic),
        topicId: draftRequest.topicId,
      });
      onDraftConsumed?.();
      return;
    }
    if (draftRequest.topic) {
      setSeedPrompt({
        prompt: `请继续讲解${draftRequest.topic}，并给我一道新的练习题。`,
        preferDeterministic: false,
      });
      onDraftConsumed?.();
    }
  }, [draftRequest, session, onDraftConsumed]);

  useEffect(() => {
    function onMove(event) {
      if (!dragging.current || !layoutRef.current) return;
      const left = layoutRef.current.getBoundingClientRect().left;
      const next = Math.min(RAIL_MAX, Math.max(RAIL_MIN, event.clientX - left));
      setRailWidth(next);
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.classList.remove("ai-studio-resizing");
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  function toggleCategory(categoryId) {
    setOpenCategoryId((current) => (current === categoryId ? null : categoryId));
  }

  function pickTopic(topic) {
    requireLogin(() => {
      if (topic.route) {
        navigate(topic.route);
        return;
      }
      setActiveTopicId(topic.id);
      setOpenCategoryId(topic.category);
      setSeedPrompt({
        prompt: topic.prompt,
        topicId: topic.id,
        preferDeterministic: true,
      });
    });
  }

  function askPrimaryTopic(topic) {
    requireLogin(() => {
      setSeedPrompt({
        prompt: `我想继续学习「${topic}」。请用适合小学生的短句和生活例子讲解，再给我一个小挑战。`,
        preferDeterministic: false,
      });
    });
  }

  function askQuickQuestion(question) {
    requireLogin(() => {
      setSeedPrompt({
        prompt: `请给我讲讲：${question}`,
        preferDeterministic: false,
      });
    });
  }

  // 图画开场卡：孩子点图不点字；带上目录里的 topicCode，回答和证据都落在课程知识点上。
  function askStarter(starter) {
    requireLogin(() => {
      setSeedPrompt({
        prompt: starter.question,
        topicCode: starter.topicCode,
        preferDeterministic: true,
      });
    });
  }

  function startResize(event) {
    event.preventDefault();
    dragging.current = true;
    document.body.classList.add("ai-studio-resizing");
  }

  return (
    <div className="page inner-page ai-studio-page">
      <ExperiencePageHeader
        experience={experience}
        eyebrow={primary ? "小智陪伴课堂" : "云端研究学院 · AI 学习台"}
        title={primary ? "问问小智" : "AI 学习台"}
        description={primary ? "挑一个好奇的问题，小智会用故事、例子和小挑战陪你学会它。" : "选择左侧主题开始学习；右侧对话窗可随时提问、看讲解与小测。"}
        imageKey="assistant"
      >
        {primary ? (
          <div className="hero-starter-row" aria-label="挑一张喜欢的图画，点一下就开始和小智聊">
            {primaryChatStarters.map((starter) => (
              <button key={starter.id} type="button" className="primary-starter-card" onClick={() => askStarter(starter)}>
                <img src={starter.image} alt="" loading="lazy" />
                <strong>{starter.label}</strong>
                <small>{starter.question}</small>
              </button>
            ))}
          </div>
        ) : (
          <div className="hero-question-row" aria-label="热门问题，点击即可向小智提问">
            <span className="hero-question-label"><Sparkles size={13} />大家都在问</span>
            {QUICK_QUESTIONS.map((question) => (
              <button key={question} type="button" className="hero-question-chip" onClick={() => askQuickQuestion(question)}>
                {question}
              </button>
            ))}
          </div>
        )}
        <div className="ai-studio-hero-actions">
          <button
            className="button secondary"
            type="button"
            onClick={() => requireLogin(() => navigate(primary ? "visual-code-lab" : "code-lab"))}
          >
            <Code2 size={16} />
            {primary ? "去图形编程" : "打开编程实验"}
          </button>
        </div>
      </ExperiencePageHeader>

      <div
        className="ai-studio-layout"
        ref={layoutRef}
        style={{ gridTemplateColumns: `${railWidth}px 6px minmax(0, 1fr)` }}
      >
        {primary ? (
          <PrimaryLearningGuide session={session} navigate={navigate} onAskTopic={askPrimaryTopic} schoolStage={schoolStage} requireLogin={requireLogin} />
        ) : <aside className="ai-topic-rail" aria-label="推荐学习主题">
          <div className="ai-topic-rail-head">
            <Bot size={16} />
            <strong>主题目录</strong>
          </div>
          <p className="ai-topic-note">点击分类标签展开，再选择主题。</p>

          <div className="ai-topic-groups" role="list">
            {topicGroups.map((group) => {
              const expanded = openCategoryId === group.id;
              const panelId = `topic-panel-${group.id}`;
              return (
                <section
                  key={group.id}
                  className={`ai-topic-group tone-${group.tone} ${expanded ? "open" : ""}`}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="ai-topic-tag"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => toggleCategory(group.id)}
                  >
                    <span className="tone-dot" aria-hidden="true" />
                    <span className="ai-topic-tag-copy">
                      <strong>{group.label}</strong>
                      <small>{group.blurb} · {group.topics.length} 个主题</small>
                    </span>
                    <ChevronDown size={16} className="ai-topic-chevron" aria-hidden="true" />
                  </button>
                  {expanded && (
                    <ul id={panelId}>
                      {group.topics.map((topic) => (
                        <li key={topic.id}>
                          <button
                            type="button"
                            className={activeTopicId === topic.id ? "active" : ""}
                            onClick={() => pickTopic(topic)}
                          >
                            <strong>{topic.label}</strong>
                            <span>{topic.hint}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>

          <div className="ai-topic-foot">
            <p>同一时间只展开一个分类；自由提问仍可在右侧输入。</p>
          </div>
        </aside>}

        <div
          className="ai-studio-resizer"
          role="separator"
          aria-orientation="vertical"
          aria-label="拖动调节对话区宽度"
          aria-valuemin={RAIL_MIN}
          aria-valuemax={RAIL_MAX}
          aria-valuenow={railWidth}
          tabIndex={0}
          onMouseDown={startResize}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              setRailWidth((value) => Math.max(RAIL_MIN, value - 16));
            }
            if (event.key === "ArrowRight") {
              event.preventDefault();
              setRailWidth((value) => Math.min(RAIL_MAX, value + 16));
            }
          }}
        />

        <div className="ai-studio-main">
          {!session ? (
            <section className="ai-studio-gate">
              <span className="ai-studio-gate-icon"><Bot size={24} /></span>
              <h2>{primary ? "登录后，小智就能陪你学啦" : "登录后开始 AI 通识学习"}</h2>
              <p>{primary ? "小智会按你的学段来讲，还能陪你做课堂小测、安排下一步。" : "登录后可按学段讲解、播放动画/步骤，并保存课堂小测结果。"}</p>
              <button className="button primary" type="button" onClick={() => requireLogin()}>
                登录学习台
              </button>
              <div className="ai-studio-gate-features">
                <article>
                  <GraduationCap size={17} />
                  <strong>按学段讲解</strong>
                  <span>{primary ? "一年级有一年级的讲法，不会太难" : "内容深度跟随你的学习档案自动调整"}</span>
                </article>
                <article>
                  <PlayCircle size={17} />
                  <strong>动画与步骤演示</strong>
                  <span>{primary ? "看动画、跟着一步步动手做" : "抽象概念用动画和分步演示讲清楚"}</span>
                </article>
                <article>
                  <ClipboardCheck size={17} />
                  <strong>课堂小测记录</strong>
                  <span>{primary ? "做完小测，小智帮你安排复习" : "小测成绩自动归档到学习报告"}</span>
                </article>
              </div>
            </section>
          ) : (
            <TeachingAssistantChat
              session={session}
              displayName={displayName}
              onRequireLogin={() => requireLogin()}
              onPracticeRecorded={onPracticeRecorded}
              navigate={navigate}
              variant="page"
              activeTopicId={activeTopicId}
              onTopicChange={setActiveTopicId}
              seedPrompt={seedPrompt}
              onSeedConsumed={clearSeed}
              agentCode={primary ? "lower-primary-tutor" : "teaching-assistant"}
            />
          )}
        </div>
      </div>
    </div>
  );
}
