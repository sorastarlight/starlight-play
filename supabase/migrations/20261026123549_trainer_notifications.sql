begin;
create table private.notification_reads(user_id uuid not null, notification_id text not null, read_at timestamptz not null default now(),primary key(user_id,notification_id));
alter table private.notification_reads enable row level security;
revoke all on private.notification_reads from public,anon,authenticated,service_role;
create table private.trainer_announcements(id uuid primary key default gen_random_uuid(),title text not null check(length(title) between 1 and 100),body text not null check(length(body) between 1 and 2000),created_at timestamptz not null default now(),created_by uuid not null);
alter table private.trainer_announcements enable row level security;
revoke all on private.trainer_announcements from public,anon,authenticated,service_role;
create function private.trainer_notification_feed(p_uid uuid) returns table(id text,kind text,title text,body text,created_at timestamptz,href text) language sql stable set search_path='' as $$
select 'notice:'||n.id,n.kind,n.title,n.body,n.created_at,'./notifications.html' from public.trainer_notices n where n.user_id=p_uid
union all select 'gift:'||g.request_id,'gift','A staff gift arrived','Your Trainer account received a gift. Open your inventory to view it.',coalesce(g.finished_at,g.created_at),'./inventory.html' from private.staff_reward_actions g where g.target_id=p_uid and g.status='succeeded' and g.action not in ('pass_on','pass_off','pass_sync')
union all select 'supply:'||md5(d.idempotency),'supply','Supplies delivered','Your reward bundle was delivered. Open the Mart to view your supply availability.',d.created_at,'./store.html' from private.hub_reward_deliveries d where d.target_id=p_uid and d.status='delivered'
union all select 'case:'||m.id,'support','Service Desk reply — case #'||t.case_no,'There is a new reply to your case.',m.created_at,'./support.html' from private.support_messages m join private.support_tickets t on t.id=m.ticket_id where t.player_id=p_uid and m.internal=false and m.author is distinct from p_uid
union all select 'trade:'||d.id||':'||d.status,'trade','Trade update','Trade status: '||d.status,coalesce(d.completed_at,d.created_at),'./trade.html' from public.direct_trades d where d.a_user=p_uid or d.b_user=p_uid
union all select 'offer:'||o.id||':'||o.status,'trade','Trade offer update','Offer status: '||o.status,o.created_at,'./trade.html' from public.trade_offers o join public.trade_listings l on l.id=o.listing_id where o.user_id=p_uid or l.user_id=p_uid
union all select 'announcement:'||a.id,'announcement',a.title,a.body,a.created_at,'./notifications.html' from private.trainer_announcements a where p_uid is not null;
$$;
revoke all on function private.trainer_notification_feed(uuid) from public,anon,authenticated,service_role;
create function public.play_notifications() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();items jsonb;unread int;
begin if uid is null then raise exception 'Sign in to view notifications.' using errcode='42501';end if;
with recent as(select * from private.trainer_notification_feed(uid) order by created_at desc,id desc limit 100),rows as(select n.*,r.read_at is not null as read from recent n left join private.notification_reads r on r.user_id=uid and r.notification_id=n.id)
select coalesce(jsonb_agg(to_jsonb(rows) order by created_at desc,id desc),'[]'::jsonb),count(*) filter(where not read) into items,unread from rows;
return jsonb_build_object('ok',true,'items',items,'unread',unread,'canPublish',coalesce(private.play_staff_role() in ('owner','admin'),false));end;$$;
revoke all on function public.play_notifications() from public,anon;grant execute on function public.play_notifications() to authenticated,service_role;
create function public.play_notifications_read(p_ids text[]) returns jsonb language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid();begin if uid is null then raise exception 'Sign in first.' using errcode='42501';end if;
if p_ids is null or cardinality(p_ids)>100 then raise exception 'Select up to 100 notifications.';end if;
insert into private.notification_reads(user_id,notification_id) select uid,n.id from private.trainer_notification_feed(uid) n where n.id=any(p_ids) on conflict do nothing;
return jsonb_build_object('ok',true);end;$$;
revoke all on function public.play_notifications_read(text[]) from public,anon;grant execute on function public.play_notifications_read(text[]) to authenticated,service_role;
create function public.admin_announcement_publish(p_title text,p_body text,p_request_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare new_id uuid;existing private.trainer_announcements;begin perform private.require_staff_edit();if p_request_id is null or length(btrim(p_title)) not between 1 and 100 or length(btrim(p_body)) not between 1 and 2000 or p_title is null or p_body is null then raise exception 'Enter a title and message.';end if;
insert into private.trainer_announcements(id,title,body,created_by) values(p_request_id,btrim(p_title),btrim(p_body),auth.uid()) on conflict do nothing returning id into new_id;
select * into existing from private.trainer_announcements where id=p_request_id;if existing.created_by is distinct from auth.uid() or existing.title is distinct from btrim(p_title) or existing.body is distinct from btrim(p_body) then raise exception 'Announcement request changed.';end if;new_id:=p_request_id;return jsonb_build_object('ok',true,'id',new_id);end;$$;
revoke all on function public.admin_announcement_publish(text,text,uuid) from public,anon;grant execute on function public.admin_announcement_publish(text,text,uuid) to authenticated,service_role;
commit;
