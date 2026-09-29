// The schedule remains the source of truth. This predicate also protects public
// work projections outside the event page, including project cards and profiles.
// Callers pass constant SQL aliases, never request input.
const resultsPublishedSql = (workAlias) => `NOT EXISTS (
    SELECT 1 FROM settings publication,
        json_each(CASE WHEN json_valid(publication.value) THEN publication.value ELSE '{}' END, '$.events') event
    WHERE publication.key = 'hackathon_schedule_config'
      AND json_extract(event.value, '$.results.competitionSlug') =
          (SELECT slug FROM competitions WHERE id = ${workAlias}.competition_id)
      AND json_extract(event.value, '$.navigation.resultsVisible') = 0
)`;
module.exports = { resultsPublishedSql };
