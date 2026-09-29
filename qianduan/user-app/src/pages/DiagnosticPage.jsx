import { ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, RefreshCcw, Sparkles, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { diagnosticsApi } from "../api/client.js";
import { ExperiencePageHeader } from "../components/ExperiencePageHeader.jsx";
import { EXPERIENCE } from "../experience/experience.js";

const STAGE_OPTIONS = [
  ["lower_primary", "小学低年级"],
  ["upper_primary", "小学高年级"],
  ["middle_school", "初中"],
  ["high_school", "高中"],
];
const INTEREST_OPTIONS = ["机器人", "画画", "音乐", "体育运动", "动物大自然", "太空科学", "讲故事", "玩游戏", "编程", "数学谜题"];

const STAGE_BY_PROFILE = {
  PRIMARY_LOWER: "lower_primary",
  PRIMARY_UPPER: "upper_primary",
  JUNIOR_HIGH: "middle_school",
  SENIOR_HIGH: "high_school",
};

/**
 * 首次学情诊断：6 道分层选择题 + 兴趣收集，服务端判分后生成初始画像
 * （各类别掌握、优势/薄弱、推荐起点），并写入学习证据。
 */
export function DiagnosticPage({ session, requireLogin, navigate, experience = EXPERIENCE.TEEN, schoolStage, onProfileRefresh }) {
  const primary = experience === EXPERIENCE.PRIMARY;
  const [stage, setStage] = useState(STAGE_BY_PROFILE[schoolStage] || (primary ? "lower_primary" : "middle_school"));
  const [phase, setPhase] = useState("intro"); // intro | paper | submitting | result
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [interests, setInterests] = useState([]);
  const [result, setResult] = useState(null);
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    let active = true;
    diagnosticsApi.latest()
      .then((value) => { if (active) setExisting(value); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  async function startDiagnosis() {
    if (!session) {
      requireLogin();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const items = await diagnosticsApi.paper(stage);
      setQuestions(Array.isArray(items) ? items : []);
      setAnswers({});
      setPhase("paper");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitDiagnosis() {
    if (questions.some((question) => !answers[question.id])) {
      setError(primary ? "还有小题没选完，选完再交哦" : "请回答全部题目后再提交");
      return;
    }
    setPhase("submitting");
    setError("");
    try {
      const value = await diagnosticsApi.submit({
        stage,
        answers: questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })),
        interests,
      });
      setResult(value);
      setExisting(value);
      setPhase("result");
      onProfileRefresh?.();
    } catch (requestError) {
      setError(requestError.message);
      setPhase("paper");
    }
  }

  function toggleInterest(item) {
    setInterests((current) => (current.includes(item)
      ? current.filter((value) => value !== item)
      : [...current, item].slice(0, 5)));
  }

  return (
    <div className="page inner-page diagnostic-page">
      <ExperiencePageHeader
        experience={experience}
        eyebrow={<><Target size={14} />{primary ? "小智了解你" : "LEARNING DIAGNOSTIC"}</>}
        title={primary ? "做个小诊断，让小智更懂你" : "首次学情诊断，生成专属画像"}
        description={primary
          ? "回答 6 道小题，告诉小智你喜欢什么。小智会知道从哪里开始陪你学最合适。"
          : "6 道分层题目覆盖核心知识类别，完成后生成初始画像：优势、薄弱点与推荐起点，都会写进学习档案与证据链。"}
        imageKey="science"
        note={primary ? "没有分数压力，凭感觉选就好" : "形成性引导，不计入正式成绩"}
      />

      {!session ? (
        <section className="empty-state">
          <Target size={28} />
          <h2>登录后开始诊断</h2>
          <p>诊断结果属于个人学习数据，需要登录后生成。</p>
          <button className="button primary" type="button" onClick={() => requireLogin()}>立即登录</button>
        </section>
      ) : phase === "result" && result ? (
        <ResultView result={result} primary={primary} navigate={navigate} onRetry={() => { setResult(null); setPhase("intro"); }} />
      ) : phase === "paper" ? (
        <section className="diagnostic-workspace">
          <div className="diagnostic-questions">
            {questions.map((question, index) => (
              <fieldset key={question.id}>
                <legend>
                  <small>第 {index + 1} 题 · {question.categoryTitle}</small>
                  <strong>{question.prompt}</strong>
                </legend>
                {question.options.map((option) => (
                  <label key={option.id} className={answers[question.id] === option.id ? "checked" : ""}>
                    <input
                      type="radio"
                      name={`diag-${question.id}`}
                      checked={answers[question.id] === option.id}
                      onChange={() => setAnswers({ ...answers, [question.id]: option.id })}
                    />
                    <span>{option.text}</span>
                  </label>
                ))}
              </fieldset>
            ))}
          </div>
          <aside className="diagnostic-side">
            <section className="diagnostic-interests">
              <header><Sparkles size={16} /><strong>{primary ? "你喜欢什么？选 1-5 个" : "兴趣方向（选 1-5 个，可选）"}</strong></header>
              <div className="diagnostic-interest-chips">
                {INTEREST_OPTIONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={interests.includes(item) ? "active" : ""}
                    onClick={() => toggleInterest(item)}
                  >{item}</button>
                ))}
              </div>
            </section>
            <button className="button primary diagnostic-submit" type="button" onClick={submitDiagnosis} disabled={phase === "submitting"}>
              <ClipboardCheck size={16} />{primary ? "交卷，看看我的画像" : "提交并生成画像"}
            </button>
            <p className="diagnostic-note">提交后立即生成画像，并写入学习证据；诊断是形成性引导，不计入正式成绩。</p>
          </aside>
        </section>
      ) : (
        <section className="diagnostic-intro-card">
          {existing && (
            <p className="diagnostic-existing">
              <CheckCircle2 size={15} />你已完成过一次诊断（{(existing.scorePercent ?? 0)} 分 · {formatDateTime(existing.createdTime)}），可以重新做更新画像。
            </p>
          )}
          <h2>{primary ? "先选一选你在哪个学段" : "选择当前学段"}</h2>
          <div className="diagnostic-stage-row">
            {STAGE_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={stage === value ? "active" : ""}
                onClick={() => setStage(value)}
              >{label}</button>
            ))}
          </div>
          <button className="button primary" type="button" onClick={startDiagnosis} disabled={loading}>
            {loading ? <LoaderCircle size={16} /> : <Sparkles size={16} />}
            {loading ? "正在出题" : primary ? "开始诊断" : "开始诊断（约 2 分钟）"}
          </button>
          <p className="diagnostic-note">
            {primary ? "6 道小题，答案没有对错压力，小智想更了解你。" : "题目覆盖人工智能概论、机器学习、算法等核心类别，用于生成初始画像与推荐起点。"}
          </p>
        </section>
      )}
      {error && <p className="page-error" role="alert">{error}</p>}
    </div>
  );
}

function ResultView({ result, primary, navigate, onRetry }) {
  return (
    <section className="diagnostic-result">
      <div className="diagnostic-result-banner">
        <span><TrendingUp size={22} /></span>
        <div>
          <small>我的学习画像 · {STAGE_OPTIONS.find(([value]) => value === result.stage)?.[1] || result.stage}</small>
          <h2>{primary
            ? `答对了 ${result.correctCount}/${result.totalQuestions} 题，小智认识你啦！`
            : `总体掌握 ${result.scorePercent}%（答对 ${result.correctCount}/${result.totalQuestions}）`}</h2>
          <p>{primary
            ? "以后小智会按这份画像给你挑课程、出题目。画像会随着你的学习不断更新。"
            : "画像由服务端判分生成，已写入学习证据链，会随练习与对话持续更新。"}</p>
        </div>
      </div>

      <div className="diagnostic-result-grid">
        <section className="diagnostic-categories">
          <h3>各类别掌握</h3>
          {result.categories.map((category) => (
            <article key={category.categoryCode}>
              <header><strong>{category.categoryTitle}</strong><span>{category.correct}/{category.total} · {category.percent}%</span></header>
              <div className="progress-track" role="progressbar" aria-label={`${category.categoryTitle}掌握参考`}
                aria-valuemin="0" aria-valuemax="100" aria-valuenow={category.percent}>
                <span style={{ width: `${Math.min(100, Math.max(0, category.percent))}%` }} />
              </div>
            </article>
          ))}
        </section>
        <aside className="diagnostic-profile-side">
          <section className="diagnostic-strengths">
            <h3><CheckCircle2 size={15} />优势</h3>
            {result.strengths.length ? (
              <div className="diagnostic-chip-row">
                {result.strengths.map((item) => <span className="diagnostic-chip tone-good" key={item}>{item}</span>)}
              </div>
            ) : <p>继续保持，第一次诊断都是起点。</p>}
          </section>
          <section className="diagnostic-weaknesses">
            <h3><Target size={15} />建议加强</h3>
            {result.weaknesses.length ? result.weaknesses.map((item) => (
              <p key={item.categoryTitle}>{item.categoryTitle} · {item.percent}%</p>
            )) : <p>本次全对！可以直接进入拓展主题。</p>}
          </section>
          <section className="diagnostic-recommend">
            <h3><Sparkles size={15} />推荐起点</h3>
            <p>{result.recommendedStart?.knowledgeCode || "完成更多练习后生成"}</p>
            <button className="button primary" type="button" onClick={() => navigate("ai-studio")}>
              {primary ? "让小智带我学" : "去 AI 学习台开始"}<ArrowRight size={15} />
            </button>
            <button className="text-button" type="button" onClick={() => navigate("progress")}>查看学习报告</button>
          </section>
        </aside>
      </div>
      <button className="text-button diagnostic-redo" type="button" onClick={onRetry}>
        <RefreshCcw size={14} />重新诊断（以最新一次为准）
      </button>
    </section>
  );
}

function formatDateTime(value) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}
