import json
import re
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from k12_agent_runtime.domain.llm import ChatModel
from k12_agent_runtime.domain.llm.models import ChatMessage, ChatRequest

_ALLOWED_STAGES = {"lower_primary", "upper_primary", "middle_school", "high_school"}
_FENCE_PATTERN = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


class QuizQuestion(BaseModel):
    stem: str
    options: list[str] = Field(min_length=2, max_length=6)
    answer: int = 0
    explanation: str = ""


class QuizDocument(BaseModel):
    title: str = ""
    questions: list[QuizQuestion] = Field(min_length=1, max_length=10)


class GenerateQuizUseCase:
    """按学段口吻出一组随堂练习题；学生端直接可练，不依赖教师发布。"""

    def __init__(self, chat_model: ChatModel | None, max_questions: int = 8) -> None:
        self._chat_model = chat_model
        self._max_questions = max_questions

    async def execute(
        self,
        topic: str,
        stage: str = "lower_primary",
        count: int = 5,
        source_text: str | None = None,
    ) -> dict[str, Any]:
        if self._chat_model is None:
            raise ValueError("大模型尚未配置，暂时不能出题")
        normalized_topic = " ".join((topic or "").split())
        if not normalized_topic:
            raise ValueError("请告诉小智要练习的主题")
        normalized_stage = stage if stage in _ALLOWED_STAGES else "lower_primary"
        count = min(max(int(count or 5), 3), self._max_questions)
        excerpt = " ".join((source_text or "").split())[:2000]
        messages = self._build_prompt(normalized_topic, normalized_stage, count, excerpt)
        last_error: Exception | None = None
        for _ in range(2):
            raw = (
                await self._chat_model.complete(
                    ChatRequest(messages=messages, json_response=True, max_output_tokens=2_500)
                )
            ).content
            try:
                return self._validate(raw)
            except (ValueError, ValidationError) as error:
                last_error = error
        raise ValueError(f"出题结果不合法：{last_error}")

    def _build_prompt(self, topic: str, stage: str, count: int, excerpt: str) -> tuple[ChatMessage, ...]:
        if stage == "lower_primary":
            tone = (
                "做题的是小学低年级孩子：题干和选项都用儿童口吻，句子短，贴近生活；"
                "explanation 用鼓励的语气讲一句为什么。"
            )
        elif stage in {"middle_school", "high_school"}:
            tone = "做题的是中学生：题目严谨准确，可考概念辨析与简单应用，explanation 讲清要点。"
        else:
            tone = "做题的是小学高年级学生：题目生动准确，贴近生活与课堂示例。"
        system = (
            "你是K12平台的AI出题老师。根据主题和可选的课文内容出一组选择题，只输出JSON，不要输出任何解释文字。"
            'JSON结构：{"title": str, "questions": [{"stem": str, "options": [str, str, str, str], '
            '"answer": int（正确选项下标，从0开始）, "explanation": str}]}。'
            f"出{count}道题；题目之间不重复，由易到难；每题4个选项，只有1个正确答案。"
            f"{tone}"
        )
        user = f"练习主题：{topic}"
        if excerpt:
            user = f"{user}\n课文内容（优先围绕它出题）：{excerpt}"
        return (
            ChatMessage(role="system", content=system),
            ChatMessage(role="user", content=user),
        )

    def _validate(self, raw: str) -> dict[str, Any]:
        document = QuizDocument.model_validate(self._extract_json(raw))
        for question in document.questions:
            if not 0 <= question.answer < len(question.options):
                question.answer = 0
            if len("".join(question.options).strip()) < 1:
                raise ValueError("选项内容为空")
        return document.model_dump(exclude_none=True)

    @staticmethod
    def _extract_json(raw: str) -> dict[str, Any]:
        text = (raw or "").strip()
        fenced = _FENCE_PATTERN.search(text)
        if fenced:
            text = fenced.group(1)
        start, end = text.find("{"), text.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("模型没有返回JSON")
        data = json.loads(text[start : end + 1])
        if not isinstance(data, dict):
            raise ValueError("出题JSON结构不正确")
        return data
