}

function getOrCreateSessionId(session) {
  const key = sessionKey(session?.userId || session?.username || session?.user?.username);
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;
  const created = `code-coach-${Date.now().toString(36)}`;
  sessionStorage.setItem(key, created);