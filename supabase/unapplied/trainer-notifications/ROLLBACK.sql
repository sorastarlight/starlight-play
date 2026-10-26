begin;
do $guard$ begin if md5(pg_get_functiondef('admin_announcement_publish(text,text,uuid)'::regprocedure)) <> 'e5e3e1422d4dddc2847f287ea8b6454e' then raise exception 'Notification rollback source drift';end if;end $guard$;
do $guard$ begin if md5(pg_get_functiondef('play_notifications_read(text[])'::regprocedure)) <> '0ae8cd87bc8c8466076e766abaef18db' then raise exception 'Notification rollback source drift';end if;end $guard$;
do $guard$ begin if md5(pg_get_functiondef('play_notifications()'::regprocedure)) <> '90d58802bd33ad783fce6f469182c387' then raise exception 'Notification rollback source drift';end if;end $guard$;
do $guard$ begin if md5(pg_get_functiondef('private.trainer_notification_feed(uuid)'::regprocedure)) <> '411e28f96258b7d33164536e8b96316f' then raise exception 'Notification rollback source drift';end if;end $guard$;
drop function admin_announcement_publish(text,text,uuid);
drop function play_notifications_read(text[]);
drop function play_notifications();
drop function private.trainer_notification_feed(uuid);
-- Private announcement/read rows are retained; no data deletion is authorized.
commit;

