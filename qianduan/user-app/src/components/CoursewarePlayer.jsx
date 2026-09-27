import {
  ChevronLeft,
  ChevronRight,
  Square,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { speechApi } from "../api/client.js";
import { MarkdownContent } from "./MarkdownContent.jsx";

export const COURSEWARE_MIME = "application/vnd.k12.courseware.v1+json";

export function isCoursewareArtifact(artifact) {
  return artifact?.kind === "COURSEWARE"
    && artifact?.mimeType === COURSEWARE_MIME
    && Array.isArray(artifact?.payload?.slides)
    && artifact.payload.slides.length > 0;
}

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

/** AI 生成课件的互动播放器：翻页 + 内嵌答题 + 页面朗读。 */
export function CoursewarePlayer({ artifact }) {
  const slides = artifact?.payload?.slides || [];
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  function stopSpeaking() {
    audioRef.current?.pause();
    audioRef.current = null;
    setSpeaking(false);
  }

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => {
    stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  async function speak(text) {
    if (!text) return;
    if (speaking) {
      stopSpeaking();
      return;
    }
    try {
      const result = await speechApi.synthesize(String(text).slice(0, 800));
      const audio = new Audio(URL.createObjectURL(result.blob));
      audioRef.current = audio;
      setSpeaking(true);
      audio.onended = () => {
        audioRef.current = null;
        setSpeaking(false);
      };
      await audio.play();
    } catch {
      setSpeaking(false);
    }
  }

  if (!isCoursewareArtifact(artifact)) return null;
  const slide = slides[Math.min(index, slides.length - 1)];
  const picked = answers[index];
  const narrationText = slide.narration
    || slide.bullets?.join("。")
    || slide.points?.join("。")
    || [slide.title, slide.subtitle].filter(Boolean).join("，");

  return (
    <div className="courseware-player" data-testid="courseware-player">
      <header className="courseware-head">
        <span className="courseware-badge">AI课件</span>
        <strong>{artifact.title || artifact.payload.title}</strong>
        <span className="courseware-page">{index + 1}/{slides.length}</span>
      </header>
      <div className={`courseware-slide slide-${slide.type}`}>
        {slide.type === "cover" && (
          <div className="courseware-cover">
            <h3>{slide.title}</h3>
            {slide.subtitle && <p>{slide.subtitle}</p>}
            <button className="courseware-start" type="button" onClick={() => setIndex(1)}>
              开始学习
            </button>
          </div>
        )}
        {slide.type === "concept" && (
          <div>
            <h4>{slide.title}</h4>
            <ul className="courseware-bullets">
              {(slide.bullets || []).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
        {slide.type === "example" && (
          <div>
            {slide.title && <h4>{slide.title}</h4>}
            <MarkdownContent className="courseware-md">{slide.body}</MarkdownContent>
          </div>
        )}
        {slide.type === "quiz" && (
          <div>
            <h4>{slide.question}</h4>
            <div className="courseware-options">
              {(slide.options || []).map((option, i) => {
                const chosen = picked === i;
                const correct = slide.answer === i;
                const state = picked == null ? "" : correct ? " right" : chosen ? " wrong" : "";
                return (
                  <button
                    key={i}
                    type="button"
                    className={`courseware-option${state}`}
                    disabled={picked === slide.answer}
                    onClick={() => setAnswers((prev) => ({ ...prev, [index]: i }))}
                  >
                    <b>{OPTION_LABELS[i]}</b> {option}
                  </button>
                );
              })}
            </div>
            {picked != null && slide.explanation && (
              <p className={picked === slide.answer ? "courseware-right" : "courseware-wrong"}>
                {picked === slide.answer ? "答对啦！" : "再看看这个提示："}{slide.explanation}
              </p>
            )}
          </div>
        )}
        {slide.type === "summary" && (
          <div>
            {slide.title && <h4>{slide.title}</h4>}
            <ul className="courseware-bullets">
              {(slide.points || []).map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
        {slide.type !== "quiz" && narrationText && (
          <button
            className={`courseware-speak${speaking ? " speaking" : ""}`}
            type="button"
            onClick={() => speak(narrationText)}
            title={speaking ? "停止朗读" : "读给我听"}
          >
            {speaking ? <Square size={13} /> : <Volume2 size={14} />}
            {speaking ? "停止朗读" : "读给我听"}
          </button>
        )}
      </div>
      <footer className="courseware-nav">
        <button type="button" disabled={index === 0} onClick={() => setIndex((v) => Math.max(0, v - 1))}>
          <ChevronLeft size={14} /> 上一页
        </button>
        <span className="courseware-dots">
          {slides.map((_, i) => (
            <i key={i} className={i === index ? " on" : ""} onClick={() => setIndex(i)} />
          ))}
        </span>
        <button
          type="button"
          disabled={index >= slides.length - 1}
          onClick={() => setIndex((v) => Math.min(slides.length - 1, v + 1))}
        >
          下一页 <ChevronRight size={14} />
        </button>
      </footer>
    </div>
  );
}
