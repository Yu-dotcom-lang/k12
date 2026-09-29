// 「为什么安排此任务」的可解释文案（需求 §5.3）。
// 只基于真实数据（掌握度/薄弱前置/兴趣）组织句子，缺数据的部分不编。

const WEAK_THRESHOLD = 70;

export function topWeakPoints(mastery = [], limit = 3) {
  return (Array.isArray(mastery) ? mastery : [])
    .filter((item) => Number.isFinite(item?.masteryPercent) && item.masteryPercent < WEAK_THRESHOLD)
    .sort((a, b) => a.masteryPercent - b.masteryPercent)
    .slice(0, limit);
}

export function averageMastery(mastery = []) {
  const rows = (Array.isArray(mastery) ? mastery : []).filter(
    (item) => Number.isFinite(item?.masteryPercent),
  );
  if (!rows.length) return null;
  return Math.round(rows.reduce((sum, item) => sum + item.masteryPercent, 0) / rows.length);
}

function labelOf(item) {
  return item?.topic || item?.title || item?.knowledgeCode || item?.code || "这个知识点";
}

/**
 * 生成一句「为什么安排此任务」。优先级：薄弱点 > 前置缺口 > 兴趣 > 兜底。
 * @param {object} input
 * @param {string} [input.topicTitle] 当前任务主题名（可空=还没开课）
 * @param {Array}  [input.mastery]    练习掌握度 [{topic, masteryPercent}]
 * @param {Array}  [input.gaps]       当前主题的薄弱前置 [{title/code, masteryPercent}]（服务端只回薄弱项）
 * @param {Array}  [input.interests]  画像兴趣标签
 */
export function buildLessonWhy({ topicTitle, mastery = [], gaps = [], interests = [] } = {}) {
  const weak = topWeakPoints(mastery, 1)[0] || null;
  const gap = (Array.isArray(gaps) ? gaps : [])[0] || null;
  const topicPart = topicTitle ? `「${topicTitle}」` : "";

  if (weak && gap && labelOf(gap) !== labelOf(weak)) {
    return `根据最近练习，「${labelOf(weak)}」还没掌握牢（${Math.round(weak.masteryPercent)}%）；它又是学${topicPart}的前置，先补它，后面就顺了。`;
  }
  if (gap) {
    return `学${topicPart}之前要先懂「${labelOf(gap)}」，所以先安排这一步，补牢再往前。`;
  }
  if (weak && topicTitle) {
    return `根据最近练习，「${labelOf(weak)}」还没掌握牢（${Math.round(weak.masteryPercent)}%），先把它补牢，再学${topicPart}就更稳。`;
  }
  if (weak) {
    return `根据最近练习，「${labelOf(weak)}」还没掌握牢（${Math.round(weak.masteryPercent)}%），建议先复习它。`;
  }
  if (topicTitle && Array.isArray(interests) && interests.length) {
    return `结合你的兴趣（${interests.slice(0, 2).join("、")}），安排${topicPart}正合适。`;
  }
  if (topicTitle) {
    return `${topicPart}和你的学段匹配，小智会按你的进度来讲。`;
  }
  return "先从左侧挑一个主题开始；小智会按你的学段和薄弱点来安排讲法。";
}
