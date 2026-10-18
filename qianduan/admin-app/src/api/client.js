import {
  clearKnowledgeGraphOverviewCache,
  readKnowledgeGraphOverviewCache,
  writeKnowledgeGraphOverviewCache,
} from "../utils/knowledgeGraphCache.js";

const SESSION_KEY = "k12-admin-session";

export function getSession() {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export async function api(path, options = {}) {
  const session = getSession();
  const { public: publicRequest = false, ...fetchOptions } = options;
  const response = await fetch(path, {
    ...fetchOptions,
    headers: {
      ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(!publicRequest && session?.accessToken ? { Authorization: `Bearer ${session.accessToken}`, "X-K12-Token": session.accessToken } : {}),
      ...options.headers,
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401) clearSession();
    const error = new Error(payload?.message || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return payload?.data;
}

const query = (values) => {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") params.set(key, value);
  });
  return params.toString();
};

export async function login(username, password) {
  const data = await api("/api/v1/iam/auth/login", {
    public: true,
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  const session = { ...data, loggedAt: Date.now() };
  saveSession(session);
  return session;
}

export const usersApi = {
  list: () => api("/api/v1/iam/users"),
  get: (id) => api(`/api/v1/iam/users/${id}`),
  create: (body) => api("/api/v1/iam/users", { method: "POST", body: JSON.stringify(body) }),
  update: (id, body) => api(`/api/v1/iam/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) => api(`/api/v1/iam/users/${id}`, { method: "DELETE" }),
  updateStatus: (id, status) => api(`/api/v1/iam/users/${id}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  resetPassword: (id, newPassword) => api(`/api/v1/iam/users/${id}/password`, { method: "PUT", body: JSON.stringify({ newPassword }) }),
  validateStudents: (userIds) => api("/api/v1/iam/users/students/validate", {
    method: "POST",
    body: JSON.stringify({ userIds }),
  }),
  students: () => api("/api/v1/iam/users/students"),
};

export const rolesApi = {
  list: () => api("/api/v1/iam/roles"),
  updatePermissions: (id, permissionCodes) => api(`/api/v1/iam/roles/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({ permissionCodes }),
  }),
};

export const coursesApi = {
  importBatch: (file) => { const body = new FormData(); body.append("file", file); return api("/api/v1/learning/courses/import", { method: "POST", body }); },
  list: () => api("/api/v1/learning/courses"),
  page: (filters = {}) => api(`/api/v1/learning/courses/page?${query(filters)}`),
  get: (id) => api(`/api/v1/learning/courses/${id}`),
  create: (body) => api("/api/v1/learning/courses", { method: "POST", body: JSON.stringify(body) }),
  uploadCover: (id, file) => { const body = new FormData(); body.append("file", file); return api(`/api/v1/learning/courses/${id}/cover`, { method: "POST", body }); },
  uploadContentImage: (id, file) => { const body = new FormData(); body.append("file", file); return api(`/api/v1/learning/courses/${id}/content-images`, { method: "POST", body }); },
  publish: (id) => api(`/api/v1/learning/courses/${id}/publish`, { method: "POST" }),
  update: (id, body) => api(`/api/v1/learning/courses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  remove: (id) => api(`/api/v1/learning/courses/${id}`, { method: "DELETE" }),
  chapters: (courseId) => api(`/api/v1/learning/courses/${courseId}/chapters`),
  chapter: (courseId, chapterId) => api(`/api/v1/learning/courses/${courseId}/chapters/${chapterId}`),
  createChapter: (courseId, body) => api(`/api/v1/learning/courses/${courseId}/chapters`, { method: "POST", body: JSON.stringify(body) }),
  updateChapter: (courseId, chapterId, body) => api(`/api/v1/learning/courses/${courseId}/chapters/${chapterId}`, { method: "PUT", body: JSON.stringify(body) }),
  removeChapter: (courseId, chapterId) => api(`/api/v1/learning/courses/${courseId}/chapters/${chapterId}`, { method: "DELETE" }),
  chapterCovers: (courseId, chapterId) => api(`/api/v1/learning/courses/${courseId}/chapters/${chapterId}/covers`),
  replaceChapterCovers: async (courseId, chapterId, knowledgeCodes) => {
    const result = await api(`/api/v1/learning/courses/${courseId}/chapters/${chapterId}/covers`, {
      method: "PUT",
      body: JSON.stringify({ knowledgeCodes }),
    });
    clearKnowledgeGraphOverviewCache();