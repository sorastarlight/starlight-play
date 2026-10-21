CREATE OR REPLACE FUNCTION private.streamlink_level_up_slice(p_content_build text, p_form_id integer, p_level integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'pg_catalog'
AS $function$
  WITH form AS (
    SELECT learnset_version_group AS vg, learnset_status
    FROM private.ref_forms WHERE content_build = p_content_build AND form_id = p_form_id
  ),
  eligible AS (
    SELECT DISTINCT ON (l.move_id) l.move_id, l.level, l.sort_order, m.slug, m.pp, f.vg
    FROM form f
    JOIN private.ref_learnsets l ON l.content_build = p_content_build AND l.form_id = p_form_id
     AND l.version_group = f.vg AND l.method = 'level-up' AND l.level <= p_level
    JOIN private.ref_moves m ON m.content_build = p_content_build AND m.move_id = l.move_id
    WHERE f.learnset_status = 'resolved' AND f.vg IS NOT NULL
    ORDER BY l.move_id, l.level DESC, l.sort_order DESC
  ),
  ranked AS (
    SELECT eligible.*,
           row_number() OVER (ORDER BY level, sort_order, move_id) AS rn,
           count(*) OVER () AS n
    FROM eligible
  ),
  last4 AS (SELECT * FROM ranked WHERE rn > n - 4)
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'moveId', move_id, 'pp', pp, 'ppMax', pp, 'method', 'level-up', 'versionGroup', vg, 'name', slug
  ) ORDER BY level, sort_order, move_id), '[]'::jsonb)
  FROM last4;
$function$
