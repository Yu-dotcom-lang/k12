import { useState } from "react";
import { ChevronDown, HelpCircle, Sparkles, TrendingUp } from "lucide-react";
import { topWeakPoints } from "../utils/lessonWhy.js";

const STAGE_LABELS = {
  PRIMARY_LOWER: "小学低年级",
  PRIMARY_UPPER: "小学高年级",
  JUNIOR_HIGH: "初中",
  SENIOR_HIGH: "高中",
};

function formatGradeLabel(profile) {
  const stage = STAGE_LABELS[profile?.schoolStage] || "";
  const grade = Number(profile?.grade);
  const numbers = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
  if (Number.isInteger(grade) && grade >= 1 && grade <= 12) {
    const prefix = grade <= 6 ? "小学" : grade <= 9 ? "初中" : "高中";
    return `${prefix}${numbers[grade - 1]}年级`;
  }
  return stage;
}

/**
 * 工作台顶部画像摘要（需求 §4.1B）：学生是谁、水平如何、为什么安排此任务。
 * 数据全部来自现成接口，缺哪块就少显示哪块，不阻塞工作台。
 */
export function WorkspaceProfileBar({ profileData, why, currentTopicTitle }) {
  const [whyOpen, setWhyOpen] = useState(false);
  const { profile, mastery, interests, ready } = profileData || {};
  const weak = topWeakPoints(mastery, 3);
  const rows = (Array.isArray(mastery) ? mastery : []).filter((item) => Number.isFinite(item?.masteryPercent));
  const average = rows.length
    ? Math.round(rows.reduce((sum, item) => sum + item.masteryPercent, 0) / rows.length)
    : null;

  return (
    <section className={`workspace-profile-bar${whyOpen ? " why-open" : ""}`} aria-label="学习画像摘要">
      <div className="workspace-profile-main">
        <span className="workspace-profile-avatar"><Sparkles size={16} /></span>
        <div className="workspace-profile-facts">
          <strong>{formatGradeLabel(profile) || "我的学习画像"}</strong>
          <div className="workspace-profile-chips">
            {(Array.isArray(interests) ? interests.slice(0, 3) : []).map((interest) => (
              <em key={interest}>{interest}</em>
            ))}
            {average !== null && (
              <span className="workspace-mastery"><TrendingUp size={13} />平均掌握 {average}%</span>
            )}
            {weak.map((item) => (
              <span className="workspace-weak" key={item.knowledgeCode || item.topic}>
                薄弱·{item.topic || item.knowledgeCode} {Math.round(item.masteryPercent)}%
              </span>
            ))}
            {!ready && <span className="workspace-profile-loading">画像读取中…</span>}
          </div>
        </div>
      </div>
      <button
        className="workspace-why-toggle"
        type="button"
        aria-expanded={whyOpen}
        onClick={() => setWhyOpen((open) => !open)}
      >
        <HelpCircle size={15} />
        为什么安排此任务
        <ChevronDown size={14} className="workspace-why-caret" />
      </button>
      {whyOpen && (
        <div className="workspace-why-panel" role="note">
          <strong>{currentTopicTitle ? `当前任务：${currentTopicTitle}` : "还没开始上课"}</strong>
          <p>{why}</p>
          <small>依据你的练习掌握度、知识图谱前置关系和学习画像生成，会随学习进展自动更新。</small>
        </div>
      )}
    </section>
  );
}
