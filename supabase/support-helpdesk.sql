-- Owner-approved helpdesk, initially disabled. Private storage; narrow actor-bound RPC.
BEGIN;
CREATE TABLE private.support_settings(id boolean PRIMARY KEY DEFAULT true CHECK(id),enabled boolean NOT NULL DEFAULT false,qa_player uuid);
INSERT INTO private.support_settings(id) VALUES(true);
CREATE TABLE private.support_tickets(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), case_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 player_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 category text NOT NULL CHECK(category IN ('account','linking','pokemon','inventory','pass','bug','store','other')),
 subcategory text NOT NULL CHECK(length(subcategory) BETWEEN 1 AND 80),subject text NOT NULL CHECK(length(subject) BETWEEN 5 AND 120),
 reference text NOT NULL DEFAULT '' CHECK(length(reference)<=100),
 state text NOT NULL DEFAULT 'open' CHECK(state IN ('open','waiting_staff','waiting_player','resolved','closed')),
 priority text NOT NULL DEFAULT 'normal' CHECK(priority IN ('low','normal','high','urgent')),
 assigned_staff_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 revision bigint NOT NULL DEFAULT 1,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),closed_at timestamptz);
CREATE TABLE private.support_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ticket_id uuid NOT NULL REFERENCES private.support_tickets(id) ON DELETE CASCADE,
 author uuid REFERENCES auth.users(id) ON DELETE SET NULL,internal boolean NOT NULL DEFAULT false,body text NOT NULL CHECK(length(body) BETWEEN 3 AND 5000),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE private.support_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),ticket_id uuid NOT NULL REFERENCES private.support_tickets(id) ON DELETE CASCADE,
 actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,action text NOT NULL,reason text NOT NULL CHECK(length(reason)<=1000),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE private.support_requests(actor uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,request_id uuid NOT NULL,
 ticket_id uuid NOT NULL REFERENCES private.support_tickets(id) ON DELETE CASCADE,payload jsonb NOT NULL,result jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(actor,request_id));
CREATE INDEX support_player_updated ON private.support_tickets(player_id,updated_at DESC,id DESC);
CREATE INDEX support_state_updated ON private.support_tickets(state,updated_at DESC,id DESC);
CREATE INDEX support_message_time ON private.support_messages(ticket_id,created_at,id);
CREATE INDEX support_message_author_time ON private.support_messages(author,created_at);
ALTER TABLE private.support_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.support_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.support_settings,private.support_tickets,private.support_messages,private.support_events,private.support_requests FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.support_actor() RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE actor uuid:=auth.uid();sid uuid;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 BEGIN sid:=(auth.jwt()->>'session_id')::uuid; EXCEPTION WHEN invalid_text_representation THEN sid:=NULL; END;
 IF NOT EXISTS(SELECT 1 FROM auth.sessions s JOIN auth.users u ON u.id=s.user_id WHERE s.id=sid AND s.user_id=actor
 AND (s.not_after IS NULL OR s.not_after>now()) AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now())) THEN
 RAISE EXCEPTION 'Sign in required' USING ERRCODE='42501'; END IF;
 RETURN actor;
END;$$;
REVOKE ALL ON FUNCTION private.support_actor() FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.support_summary(t private.support_tickets) RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('id',t.id,'caseNo',t.case_no,'playerId',t.player_id,'category',t.category,'subcategory',t.subcategory,'subject',t.subject,
 'reference',t.reference,'state',t.state,'priority',t.priority,'assignee',t.assigned_staff_id,'revision',t.revision,'createdAt',t.created_at,'updatedAt',t.updated_at,'closedAt',t.closed_at)
$$;
REVOKE ALL ON FUNCTION private.support_summary(private.support_tickets) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.support_call(p_action text,p_payload jsonb DEFAULT '{}'::jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
#variable_conflict use_variable
DECLARE actor uuid;staff boolean;ticket private.support_tickets;request_id uuid;old_request private.support_requests;body text;reason text;
 result jsonb;rows jsonb;total integer;more boolean;cursor_time timestamptz;cursor_id uuid;target uuid;desired text;new_priority text;assigned uuid;
 next_state text;limit_rows integer:=25;last_time timestamptz;last_id uuid;
BEGIN
 actor:=private.support_actor();
 IF p_payload->>'actorId' IS DISTINCT FROM actor::text THEN RAISE EXCEPTION 'Account changed' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object' OR octet_length(p_payload::text)>20000 THEN RAISE EXCEPTION 'Invalid support request' USING ERRCODE='22023'; END IF;
 staff:=coalesce(p_payload->>'mode','player')='staff';
 IF staff AND private.play_staff_role() IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM private.support_settings WHERE id AND enabled AND (qa_player IS NULL OR qa_player=actor OR staff)) THEN RETURN jsonb_build_object('state','disabled'); END IF;
 IF p_action NOT IN ('list','get','create','reply','transition','triage') THEN RAISE EXCEPTION 'Invalid action' USING ERRCODE='22023'; END IF;
 IF p_action='list' THEN
  IF length(coalesce(p_payload->>'query',''))>120 THEN RAISE EXCEPTION 'Search too long'; END IF;
  target:=nullif(p_payload->>'playerId','')::uuid;
  IF target IS NOT NULL AND NOT staff THEN RAISE EXCEPTION 'Not available' USING ERRCODE='42501'; END IF;
  cursor_time:=nullif(p_payload->>'cursorTime','')::timestamptz;cursor_id:=nullif(p_payload->>'cursorId','')::uuid;
  IF (cursor_time IS NULL)<>(cursor_id IS NULL) THEN RAISE EXCEPTION 'Invalid cursor'; END IF;
  SELECT count(*) INTO total FROM private.support_tickets t WHERE (staff OR t.player_id=actor) AND (target IS NULL OR t.player_id=target) AND t.state NOT IN ('resolved','closed');
  WITH page AS(SELECT t.* FROM private.support_tickets t WHERE (staff OR t.player_id=actor) AND (target IS NULL OR t.player_id=target)
   AND (coalesce(p_payload->>'state','')='' OR t.state=p_payload->>'state')
   AND (coalesce(p_payload->>'category','')='' OR t.category=p_payload->>'category')
   AND (NOT staff OR coalesce(p_payload->>'priority','')='' OR t.priority=p_payload->>'priority')
   AND (NOT staff OR coalesce(p_payload->>'assignee','')='' OR (p_payload->>'assignee'='me' AND t.assigned_staff_id=actor) OR (p_payload->>'assignee'='unassigned' AND t.assigned_staff_id IS NULL))
   AND (coalesce(p_payload->>'query','')='' OR position(lower(p_payload->>'query') in lower(t.subject))>0 OR t.case_no::text=p_payload->>'query')
   AND (cursor_time IS NULL OR (t.updated_at,t.id)<(cursor_time,cursor_id)) ORDER BY t.updated_at DESC,t.id DESC LIMIT 26)
  SELECT coalesce(jsonb_agg((CASE WHEN staff THEN private.support_summary(page) ELSE private.support_summary(page)-'assignee' END) ORDER BY updated_at DESC,id DESC),'[]'::jsonb) INTO rows FROM page;
  more:=jsonb_array_length(rows)>25;IF more THEN rows:=rows-25;END IF;
  RETURN jsonb_build_object('state','ready','tickets',rows,'openCount',total,'nextCursor',CASE WHEN more THEN jsonb_build_object('time',rows->24->>'updatedAt','id',rows->24->>'id') ELSE NULL END);
 END IF;
 IF p_action<>'create' THEN
  SELECT * INTO ticket FROM private.support_tickets WHERE id=(p_payload->>'ticketId')::uuid AND (staff OR player_id=actor) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Ticket unavailable' USING ERRCODE='42501'; END IF;
  IF staff AND EXISTS(SELECT 1 FROM private.support_settings WHERE qa_player IS NOT NULL AND qa_player<>ticket.player_id) THEN RAISE EXCEPTION 'Ticket unavailable' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_action='get' THEN
  cursor_time:=nullif(p_payload->>'cursorTime','')::timestamptz;cursor_id:=nullif(p_payload->>'cursorId','')::uuid;
  IF (cursor_time IS NULL)<>(cursor_id IS NULL) THEN RAISE EXCEPTION 'Invalid cursor'; END IF;
  WITH page AS(SELECT m.* FROM private.support_messages m WHERE ticket_id=ticket.id AND (staff OR NOT internal)
   AND (cursor_time IS NULL OR (created_at,id)<(cursor_time,cursor_id)) ORDER BY created_at DESC,id DESC LIMIT 26)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'author',CASE WHEN author=ticket.player_id THEN 'Trainer' ELSE 'Support' END,'internal',page.internal,'body',page.body,'createdAt',page.created_at) ORDER BY created_at DESC,id DESC),'[]'::jsonb) INTO rows FROM page;
  more:=jsonb_array_length(rows)>25;IF more THEN rows:=rows-25; END IF;
  RETURN jsonb_build_object('state','ready','ticket',CASE WHEN staff THEN private.support_summary(ticket) ELSE private.support_summary(ticket)-'assignee' END,'messages',rows,'events',CASE WHEN staff THEN (SELECT coalesce(jsonb_agg(jsonb_build_object('action',e.action,'reason',e.reason,'createdAt',e.created_at) ORDER BY e.created_at DESC),'[]'::jsonb) FROM (SELECT ev.action,ev.reason,ev.created_at FROM private.support_events ev WHERE ev.ticket_id=ticket.id ORDER BY ev.created_at DESC,ev.id DESC LIMIT 25) e) ELSE '[]'::jsonb END,'nextCursor',CASE WHEN more THEN jsonb_build_object('time',rows->24->>'createdAt','id',rows->24->>'id') ELSE NULL END);
 END IF;
 request_id:=(p_payload->>'requestUuid')::uuid;IF request_id IS NULL THEN RAISE EXCEPTION 'Request ID required'; END IF;
 -- Serialize per actor before idempotency and quotas. Ticket locks serialize revisions across actors.
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,814260020));
 SELECT * INTO old_request FROM private.support_requests r WHERE r.actor=actor AND r.request_id=request_id;
 -- Qualified aliases avoid PL/pgSQL identifier ambiguity.
 IF FOUND THEN
  IF old_request.payload IS DISTINCT FROM jsonb_build_object('action',p_action,'data',p_payload) THEN RAISE EXCEPTION 'Request changed' USING ERRCODE='22023'; END IF;
  RETURN old_request.result;
 END IF;
 body:=btrim(coalesce(p_payload->>'body',''));reason:=btrim(coalesce(p_payload->>'reason',''));
 IF p_action='create' THEN
  IF staff THEN RAISE EXCEPTION 'Players create their own tickets' USING ERRCODE='42501'; END IF;
  IF length(body)<20 OR length(body)>5000 THEN RAISE EXCEPTION 'Describe what happened in 20–5000 characters' USING ERRCODE='22023'; END IF;
  IF (SELECT count(*) FROM private.support_tickets WHERE player_id=actor AND state NOT IN ('resolved','closed'))>=5
   OR (SELECT count(*) FROM private.support_tickets WHERE player_id=actor AND created_at>now()-interval '1 hour')>=3
   OR (SELECT count(*) FROM private.support_tickets WHERE player_id=actor AND created_at>now()-interval '1 day')>=10 THEN RETURN jsonb_build_object('state','limited','retryAfter',3600); END IF;
  INSERT INTO private.support_tickets(player_id,category,subcategory,subject,reference) VALUES(actor,p_payload->>'category',btrim(p_payload->>'subcategory'),btrim(p_payload->>'subject'),btrim(coalesce(p_payload->>'reference',''))) RETURNING * INTO ticket;
  INSERT INTO private.support_messages(ticket_id,author,body) VALUES(ticket.id,actor,body);
 ELSE
  IF ticket.revision IS DISTINCT FROM (p_payload->>'expectedRevision')::bigint THEN RETURN jsonb_build_object('state','conflict'); END IF;
  IF staff AND (length(reason)<3 OR length(reason)>1000) THEN RAISE EXCEPTION 'Staff reason required' USING ERRCODE='22023'; END IF;
  IF p_action='reply' THEN
   IF length(body)<3 OR length(body)>5000 THEN RAISE EXCEPTION 'Reply must be 3–5000 characters' USING ERRCODE='22023'; END IF;
   IF NOT staff AND coalesce((p_payload->>'internal')::boolean,false) THEN RAISE EXCEPTION 'Not available' USING ERRCODE='42501'; END IF;
   IF (SELECT count(*) FROM private.support_messages WHERE author=actor AND created_at>now()-CASE WHEN staff THEN interval '1 hour' ELSE interval '10 minutes' END)>=(CASE WHEN staff THEN 60 ELSE 10 END) THEN RETURN jsonb_build_object('state','limited','retryAfter',600);END IF;
   IF NOT staff AND ticket.state IN ('resolved','closed') AND ticket.closed_at<now()-interval '7 days' THEN RAISE EXCEPTION 'Create a related ticket to continue this older case'; END IF;
   INSERT INTO private.support_messages(ticket_id,author,internal,body) VALUES(ticket.id,actor,staff AND coalesce((p_payload->>'internal')::boolean,false),body);
   next_state:=CASE WHEN staff AND coalesce((p_payload->>'internal')::boolean,false) THEN ticket.state WHEN staff THEN 'waiting_player' ELSE 'waiting_staff' END;
  ELSIF p_action='transition' THEN
   desired:=p_payload->>'state';
   IF desired IS NULL OR desired NOT IN ('waiting_staff','waiting_player','resolved','closed') OR (NOT staff AND desired='waiting_player') THEN RAISE EXCEPTION 'Invalid transition'; END IF;
   IF NOT staff AND desired='waiting_staff' AND (ticket.state NOT IN ('resolved','closed') OR ticket.closed_at<now()-interval '7 days') THEN RAISE EXCEPTION 'Reopen unavailable'; END IF;
   next_state:=desired;
  ELSIF p_action='triage' THEN
   IF NOT staff THEN RAISE EXCEPTION 'Owner access required' USING ERRCODE='42501'; END IF;
   new_priority:=p_payload->>'priority';IF new_priority IS NULL OR new_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Invalid priority';END IF;
   IF coalesce(p_payload->>'assignee','') NOT IN ('','me') THEN RAISE EXCEPTION 'Invalid assignee';END IF;
   UPDATE private.support_tickets SET priority=new_priority,assigned_staff_id=CASE WHEN p_payload->>'assignee'='me' THEN actor ELSE NULL END WHERE id=ticket.id;
   next_state:=ticket.state;
  END IF;
  UPDATE private.support_tickets SET state=next_state,revision=revision+1,updated_at=now(),closed_at=CASE WHEN next_state IN ('resolved','closed') THEN coalesce(closed_at,now()) ELSE NULL END WHERE id=ticket.id RETURNING * INTO ticket;
 END IF;
 INSERT INTO private.support_events(ticket_id,actor,action,reason) VALUES(ticket.id,actor,p_action,CASE WHEN staff THEN reason ELSE '' END);
 result:=jsonb_build_object('state','saved','ticket',CASE WHEN staff THEN private.support_summary(ticket) ELSE private.support_summary(ticket)-'assignee' END);
 INSERT INTO private.support_requests(actor,request_id,ticket_id,payload,result) VALUES(actor,request_id,ticket.id,jsonb_build_object('action',p_action,'data',p_payload),result);
 RETURN result;
END;$$;
REVOKE ALL ON FUNCTION public.support_call(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.support_call(text,jsonb) TO authenticated;

CREATE FUNCTION private.prune_support_history() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE removed integer;
BEGIN
 DELETE FROM private.support_tickets WHERE state IN ('resolved','closed') AND closed_at<now()-interval '90 days';
 GET DIAGNOSTICS removed=ROW_COUNT;RETURN removed;
END;$$;
REVOKE ALL ON FUNCTION private.prune_support_history() FROM PUBLIC,anon,authenticated,service_role;
COMMIT;
