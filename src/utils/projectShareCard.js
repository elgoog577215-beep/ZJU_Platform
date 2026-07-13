export const getProjectShareCardUrl = (project) => {
  const id = String(project?.id || '').trim();
  if (!id) return project?.cover_url || project?.images?.[0] || '';
  const version = encodeURIComponent(String(project?.updated_at || project?.created_at || '1'));
  return `/api/projects/${encodeURIComponent(id)}/share-card.png?v=${version}`;
};
