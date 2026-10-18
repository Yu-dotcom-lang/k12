      danger: true,
      confirmLabel: force ? "强制删除" : "确认删除",
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeletingPoint(true);
        try {
          await knowledgeGraphApi.deletePoint(code, { force });
          notify("已删除");
          setSelectedCode("");
          setPointModal(null);
          await load({ force: true, quiet: true });
        } catch (error) {
          if (!force && /强制|引用|CONFLICT|409/i.test(String(error.message || ""))) {
            setConfirmDialog({
              title: "无法直接删除",
              description: `${error.message}。是否强制删除？`,
              danger: true,
              confirmLabel: "强制删除",
              onConfirm: () => removeSelectedPoint({ force: true }),
            });
          } else {
            notify(error.message, "error");
          }
        } finally {
          setDeletingPoint(false);
        }
      },
    });
  }

  async function reviewChapter(chapter, { quiet = false } = {}) {
    if (!isAdmin || !chapter) return null;
    const key = `${chapter.courseId}-${chapter.chapterId}`;
    const codes = chapter.knowledgeCodes || [];
    if (!codes.length) {
      if (!quiet) notify("该章节尚未绑定知识点", "error");
      return null;
    }
    setReviewingChapterKey(key);
    try {
      const result = await knowledgeGraphApi.reviewAlignment({
        title: chapter.title,
        content: chapter.description,
        knowledgeCodes: codes,
      });
      setReviewByChapter((current) => ({
        ...current,
        [key]: { chapterKey: key, chapter, ...result },
      }));
      if (!quiet) notify(result.summary || "审查完成");
      return result;
    } catch (error) {
      if (!quiet) notify(error.message, "error");
      throw error;
    } finally {
      setReviewingChapterKey((current) => (current === key ? "" : current));
    }
  }

  async function runBatchReview(chapters) {
    const targets = (chapters || []).filter((chapter) => (chapter.knowledgeCodes || []).length);
    if (!targets.length) {
      notify("当前筛选下没有可审查的章节", "error");
      return;
    }
    setBatchReviewing(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const chapter of targets) {
        try {
          await reviewChapter(chapter, { quiet: true });
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      if (fail) {
        notify(`批量审查完成：成功 ${ok}，失败 ${fail}`, "error");
      } else {
        notify(`批量审查完成：共 ${ok} 个章节`);
      }
    } finally {
      setBatchReviewing(false);
      setReviewingChapterKey("");
    }
  }

  function askBatchReview(chapters, { phrase = "批量审查", title = "确认批量审查？" } = {}) {
    if (!isAdmin || batchReviewing || catalogBusy) return;
    const targets = (chapters || []).filter((chapter) => (chapter.knowledgeCodes || []).length);
    if (!targets.length) {
      notify("当前没有可审查的章节", "error");
      return;
    }
    openConfirmDialog({
      title,
      description: `将对 ${targets.length} 个已绑定章节逐一审查，结果会显示在各章节下方。`,
      danger: true,
      requirePhrase: phrase,
      confirmLabel: "开始审查",
      onConfirm: async () => {
        closeConfirmDialog();
        await runBatchReview(targets);
      },
    });
  }

  function chapterKeyOf(chapter) {
    return `${chapter.courseId}-${chapter.chapterId}`;