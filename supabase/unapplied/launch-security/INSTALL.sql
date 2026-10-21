-- Security-only packet. Generated from 2026-10-20 catalog; no gameplay calls.
begin;
set local lock_timeout='5s';
do $guard$ begin
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.admin_overview()')) is distinct from '0fe99f4de1ff20a799f2472ef63a54ab' then raise exception 'Security source drift: admin_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.is_play_admin()')) is distinct from '5dec088fc6372699343e924773106f9c' then raise exception 'Security source drift: is_play_admin'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.require_hub()')) is distinct from '2700659516eebbcd14df359253d7985f' then raise exception 'Security source drift: require_hub'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.require_owner()')) is distinct from '66c8e48e91f75dfb0f88854ed75140ce' then raise exception 'Security source drift: require_owner'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('private.require_staff_edit()')) is distinct from '07d2e855eefa8da56e99f32441bde2fd' then raise exception 'Security source drift: require_staff_edit'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_advance_phase()')) is distinct from '3aed6a3208976f4f94d574182d34bded' then raise exception 'Security source drift: admin_advance_phase'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_bits_events(text, integer)')) is distinct from 'de06ead1cf678fe87a6ebebe36a95bbb' then raise exception 'Security source drift: admin_bits_events'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_bits_health()')) is distinct from 'c6657813772f888baef34f6926db7c19' then raise exception 'Security source drift: admin_bits_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_bits_qa_redemption(text, text, integer, text)')) is distinct from '21956bec47954f7b05236632008c9ea3' then raise exception 'Security source drift: admin_bits_qa_redemption'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_bits_retry(text)')) is distinct from '5344bc06de66906bfa9ab4ca592f3d76' then raise exception 'Security source drift: admin_bits_retry'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_build_health()')) is distinct from 'f2d0c8bee4a7e838e436fc4a2d13c6bf' then raise exception 'Security source drift: admin_build_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_cancel_round()')) is distinct from '1d1664e3b3a1ac2a2e901b12e01b12a8' then raise exception 'Security source drift: admin_cancel_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_candy_simulate(integer, integer)')) is distinct from 'f64cc9435c0d3db88bffab0c61cda4d8' then raise exception 'Security source drift: admin_candy_simulate'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_health()')) is distinct from '12e6cdce0ab0b766fd81f663b0fcbfff' then raise exception 'Security source drift: admin_capture_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_inspect(uuid)')) is distinct from '5292937fa1b8d8315bc3ef079eccdd41' then raise exception 'Security source drift: admin_capture_inspect'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_overview()')) is distinct from '0436691cb4f0af0d2179d12e52bc444c' then raise exception 'Security source drift: admin_capture_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_report(integer)')) is distinct from '80b09501a6e06ad07b2ee0bc9f56ba53' then raise exception 'Security source drift: admin_capture_report'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_round(uuid)')) is distinct from '81f6c19b4804b879f2eb5a5a702c1ca4' then raise exception 'Security source drift: admin_capture_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_save_balance(jsonb)')) is distinct from 'bdb4c159047abf7f0fa8ffd990513a98' then raise exception 'Security source drift: admin_capture_save_balance'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_save_ball(text, jsonb)')) is distinct from '0243c86fc5042fa187478fc55f432981' then raise exception 'Security source drift: admin_capture_save_ball'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_save_berry(text, jsonb)')) is distinct from '7b6a1f12b6ef4ee471e69ef4896821cc' then raise exception 'Security source drift: admin_capture_save_berry'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer)')) is distinct from '96594b02aceb98d6a7226c540f6cb5eb' then raise exception 'Security source drift: admin_capture_simulate'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_clear_console()')) is distinct from '93acd3dcc3f81a8c91b12ac5f74630c2' then raise exception 'Security source drift: admin_clear_console'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_clear_round()')) is distinct from 'b23ae3547f05eddfbed080a8ed3e78c2' then raise exception 'Security source drift: admin_clear_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_collection_overview()')) is distinct from 'f7c6e40ecfddadae1e33b172a4158930' then raise exception 'Security source drift: admin_collection_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_content_health()')) is distinct from 'a0d7599f8fb26cafeecf926cc3a89ae4' then raise exception 'Security source drift: admin_content_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_content_picker(text, text)')) is distinct from '5ff2b586279b20aa75d57c5b901534e2' then raise exception 'Security source drift: admin_content_picker'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_content_studio()')) is distinct from '50038ae8e8c14c052fcc5a08be7c628a' then raise exception 'Security source drift: admin_content_studio'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_delete_event(uuid)')) is distinct from 'b85fed6383b1505d72f770733d4886cd' then raise exception 'Security source drift: admin_delete_event'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_director_command(text, jsonb)')) is distinct from '17ccf4b473defb94477dba9a8300712b' then raise exception 'Security source drift: admin_director_command'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_director_simulate(numeric, numeric, numeric)')) is distinct from '94055f8c987875a57aeff97f783bfb3a' then raise exception 'Security source drift: admin_director_simulate'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_disconnect_twitch(uuid, text)')) is distinct from 'df3260e967a875cee832f3083285a8da' then raise exception 'Security source drift: admin_disconnect_twitch'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_economy_health()')) is distinct from 'b502600c978bf345f3ca57ecc9d6a964' then raise exception 'Security source drift: admin_economy_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_economy_overview()')) is distinct from '4df0964a9f8f3d9fa8dba096da978c79' then raise exception 'Security source drift: admin_economy_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_economy_save(jsonb)')) is distinct from '258ad1627053821b655065f468bc61bd' then raise exception 'Security source drift: admin_economy_save'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text)')) is distinct from 'd750ff2075128e6cdd8db651ce9282ef' then raise exception 'Security source drift: admin_economy_simulate'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_evolution_validate()')) is distinct from 'f134265ed3bf8be6d648c9cd96642f77' then raise exception 'Security source drift: admin_evolution_validate'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_game_health()')) is distinct from 'cba47f19a27496031dbcb13ca571691d' then raise exception 'Security source drift: admin_game_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_gift_catalog()')) is distinct from 'b14aabd8267462c78a0b03443bc247d7' then raise exception 'Security source drift: admin_gift_catalog'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_gift_joined(text)')) is distinct from 'c50fbe8b31b0fb0995924e05240afae6' then raise exception 'Security source drift: admin_gift_joined'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_achievement(uuid, text)')) is distinct from 'd420e884e2440bfa91b729fed9ffc325' then raise exception 'Security source drift: admin_grant_achievement'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_badge(uuid, text, text)')) is distinct from '8f6e1e1b1676a1418ef311f0c45dd4c4' then raise exception 'Security source drift: admin_grant_badge'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_bag(uuid, jsonb)')) is distinct from '899d51d9b5d30afece0a10a1f9db4dac' then raise exception 'Security source drift: admin_grant_bag'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_bits_pack(text, text)')) is distinct from '3693f7ef912160d72e175400726ebbf2' then raise exception 'Security source drift: admin_grant_bits_pack'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_candy(uuid, integer, integer)')) is distinct from '83798742753dc6810480ec1ef89adef1' then raise exception 'Security source drift: admin_grant_candy'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_cosmetic(uuid, text, text)')) is distinct from '5e22fc11972a950b8c19d815daaef6a4' then raise exception 'Security source drift: admin_grant_cosmetic'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_pokemon(uuid, integer, text, text, boolean, text)')) is distinct from '194355d874ec8c8d2f35897636397279' then raise exception 'Security source drift: admin_grant_pokemon'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_title(uuid, text, text)')) is distinct from '56ab6f85e76259887b215d28a6f1c6c2' then raise exception 'Security source drift: admin_grant_title'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_grant_valuable(uuid, text, integer)')) is distinct from '58d1bbc8761ff50cae2b8c2f466a6894' then raise exception 'Security source drift: admin_grant_valuable'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_hide_round(boolean)')) is distinct from '07eb8c8d689bab3ef4694e5739edb36a' then raise exception 'Security source drift: admin_hide_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_identity_inspect(uuid)')) is distinct from 'e9091c0de1b91e67a62bade78cf8edde' then raise exception 'Security source drift: admin_identity_inspect'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_issue_bridge_token()')) is distinct from '4ccfaa96210594ab90c49f4460a5b617' then raise exception 'Security source drift: admin_issue_bridge_token'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_item_library(text, text)')) is distinct from '9f00b7bbbdfd63a29e74a4253991950a' then raise exception 'Security source drift: admin_item_library'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_list_users(text, integer)')) is distinct from '4044aa5ba8238efa9b6dbce02f5288db' then raise exception 'Security source drift: admin_list_users'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_live_dashboard()')) is distinct from '235f5252658e7725c79f1a72f4db3575' then raise exception 'Security source drift: admin_live_dashboard'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_live_snapshot()')) is distinct from 'eeaa0da1c25aea0777e9141d00585797' then raise exception 'Security source drift: admin_live_snapshot'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_overview()')) is distinct from '74080fc887b528d641c01fea390279cc' then raise exception 'Security source drift: admin_loot_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_save_config(jsonb)')) is distinct from '65815040a7ce576fdc0a656242758c35' then raise exception 'Security source drift: admin_loot_save_config'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_save_entry(uuid, integer, integer, integer, boolean)')) is distinct from 'b82a9fc9ebb3cd52bd74476b7fb7cd3b' then raise exception 'Security source drift: admin_loot_save_entry'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_self_test()')) is distinct from 'ca5d2e49a69f0842a40ad2fdfd74663d' then raise exception 'Security source drift: admin_loot_self_test'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_simulate(integer, numeric, numeric, numeric)')) is distinct from '5317916904a5836a91a7dbc3fe2c8390' then raise exception 'Security source drift: admin_loot_simulate'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_tables()')) is distinct from 'a08ea231a114b29bd0ea5097d65f3f8e' then raise exception 'Security source drift: admin_loot_tables'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_loot_warnings()')) is distinct from '7f6a033712d306f53d3d7ddd98119ce6' then raise exception 'Security source drift: admin_loot_warnings'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_oak_qa(text, uuid, jsonb)')) is distinct from 'bcdaee589157381dcf79290fdbb48682' then raise exception 'Security source drift: admin_oak_qa'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_oak_research_reset(uuid)')) is distinct from '25fa4f4ef4cee2432610c2929c1633c1' then raise exception 'Security source drift: admin_oak_research_reset'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_overview()')) is distinct from 'ceff59dc4087bb5d70d4534b5df5ce4b' then raise exception 'Security source drift: admin_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_pause_round()')) is distinct from '564deea18569550f01ac74dc2795918d' then raise exception 'Security source drift: admin_pause_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_pokemon_forms(integer)')) is distinct from '468d39ffc7c2844f6ae6afdceff230ba' then raise exception 'Security source drift: admin_pokemon_forms'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_progression_overview()')) is distinct from 'feab0073dc038e392877483a8e665c1d' then raise exception 'Security source drift: admin_progression_overview'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_progression_save(jsonb)')) is distinct from 'af591db7048f63a2f218d5a1c45da6ee' then raise exception 'Security source drift: admin_progression_save'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_qa_grant_pass_reward(text)')) is distinct from '8d1c84d07d9be114586fa98b2430ee25' then raise exception 'Security source drift: admin_qa_grant_pass_reward'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_queue_stream_command(text, jsonb)')) is distinct from 'd06f7e3add36c39f4cb9b70c60cb2d1b' then raise exception 'Security source drift: admin_queue_stream_command'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_refill_test()')) is distinct from '0e6bda2362d0069263089f6db0b9a455' then raise exception 'Security source drift: admin_refill_test'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_remove_pokemon(uuid, uuid)')) is distinct from 'dbeb623c7e95d5ed12cf56812b709fdb' then raise exception 'Security source drift: admin_remove_pokemon'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_resume_round()')) is distinct from 'fa3f43d49f9f8120b9dc0e59adb25b5f' then raise exception 'Security source drift: admin_resume_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_revoke_cosmetic(uuid, text, text)')) is distinct from '9a357a7fecd595b015718f5c8c2242b7' then raise exception 'Security source drift: admin_revoke_cosmetic'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_channel(text, text, text)')) is distinct from 'a76d9f5e4f42c87bbafa6768bdbd98c4' then raise exception 'Security source drift: admin_save_channel'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_event(uuid, text, text, text, timestamp with time zone, timestamp with time zone)')) is distinct from '6ac6d989ac5548f126d53c7b84677672' then raise exception 'Security source drift: admin_save_event'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_game_settings(jsonb)')) is distinct from 'fcebcd0546b7ec748ee2a5c506ed7466' then raise exception 'Security source drift: admin_save_game_settings'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_github_token(text)')) is distinct from 'c8807a70c8761cb32fa82a8248864f55' then raise exception 'Security source drift: admin_save_github_token'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_item_identity(text, jsonb)')) is distinct from '0705f775ecb0f2c79eaf3982ff636522' then raise exception 'Security source drift: admin_save_item_identity'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_look_portrait(text, text, jsonb, text)')) is distinct from '37e40745bc274b112ee95b87a70a8c45' then raise exception 'Security source drift: admin_save_look_portrait'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_pass_rewards(jsonb, jsonb)')) is distinct from '553fd4b8bdda7e537937a2652de935e1' then raise exception 'Security source drift: admin_save_pass_rewards'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_save_twitch_client_secret(text)')) is distinct from 'dd03ef4fa4166fe60c45b0a22ea19316' then raise exception 'Security source drift: admin_save_twitch_client_secret'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_coins(uuid, integer)')) is distinct from '802a2ca366499502b1d19e9c8dfd1f8a' then raise exception 'Security source drift: admin_set_coins'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_pass(text, boolean)')) is distinct from '3cfdc35329c98919e55a2921df3c60f5' then raise exception 'Security source drift: admin_set_pass'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_ranking_visible(uuid, boolean, text)')) is distinct from '0821e28c7872d10f9513252ea4c0b49c' then raise exception 'Security source drift: admin_set_ranking_visible'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_role(uuid, text)')) is distinct from '8a2c9e664ead37e4ed76562ca58c7df9' then raise exception 'Security source drift: admin_set_role'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_twitch_flags(uuid, text, boolean, boolean, text)')) is distinct from '5a308b9a213bd396511189b3d848065e' then raise exception 'Security source drift: admin_set_twitch_flags'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_twitch_primary(uuid, text)')) is distinct from 'e54c836e0718318f290c58ac3e0b6441' then raise exception 'Security source drift: admin_set_twitch_primary'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_set_xp(uuid, integer)')) is distinct from '5b3098f9236f5e2702d6de041ec8a800' then raise exception 'Security source drift: admin_set_xp'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_special_event_analytics(uuid)')) is distinct from '573f36898c04a1ff46b6d87147d9c617' then raise exception 'Security source drift: admin_special_event_analytics'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_special_event_command(text, jsonb)')) is distinct from 'b8c5a8b07fa64f8eb1022007e167b465' then raise exception 'Security source drift: admin_special_event_command'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_special_event_health()')) is distinct from '4c05da864d3e430c0e073825e0bc1f5c' then raise exception 'Security source drift: admin_special_event_health'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_start_round(integer, text, boolean, integer)')) is distinct from 'ddb78de21a82f37547646558f87cb9b7' then raise exception 'Security source drift: admin_start_round'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_delete_category(uuid)')) is distinct from '4fae0cbee1b27d63d695348a0792490a' then raise exception 'Security source drift: admin_store_delete_category'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_delete_item(text)')) is distinct from 'b0d08e770d86e4cccf14c8673db277fc' then raise exception 'Security source drift: admin_store_delete_item'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_duplicate_item(text)')) is distinct from 'f47a27a27a51b89603a8214343c6d221' then raise exception 'Security source drift: admin_store_duplicate_item'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_get()')) is distinct from 'efe208fa8fa8e57cabee32f2a9e01942' then raise exception 'Security source drift: admin_store_get'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_register_asset(text, text, text)')) is distinct from '83182f9fada5a0cd993cce56cf9bbf22' then raise exception 'Security source drift: admin_store_register_asset'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_reorder(text, jsonb)')) is distinct from 'dd75c3042e2e67d90e2965ba1d83fcf1' then raise exception 'Security source drift: admin_store_reorder'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_save_category(jsonb)')) is distinct from '7e53b348f2d546ddc7c1137857228a03' then raise exception 'Security source drift: admin_store_save_category'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_save_item(jsonb)')) is distinct from 'ad5519ed15317864c42f7e34f9c3389e' then raise exception 'Security source drift: admin_store_save_item'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_store_save_look(jsonb)')) is distinct from '6d9438c81c34fa4858c8688ae0fb6402' then raise exception 'Security source drift: admin_store_save_look'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_test_act(uuid, text, text, uuid)')) is distinct from '01794683115ab87c096939e7eb26145d' then raise exception 'Security source drift: admin_test_act'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_test_start(jsonb)')) is distinct from '3a0d0e54bf92a672080b7e2db9c750db' then raise exception 'Security source drift: admin_test_start'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_trainer_reward_action(uuid, uuid, text, jsonb, text)')) is distinct from '60584b0879b209d8bb4f6ce8bdc34f15' then raise exception 'Security source drift: admin_trainer_reward_action'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_trainer_rewards(uuid)')) is distinct from '04b58d18d56913408ae94cde5dda81f3' then raise exception 'Security source drift: admin_trainer_rewards'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_unlock_catch(uuid, text)')) is distinct from '603cf683df79fd5f0ae1ace792ec898c' then raise exception 'Security source drift: admin_unlock_catch'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.admin_user_account(uuid)')) is distinct from '88f488058dc6f56d827666bee497b531' then raise exception 'Security source drift: admin_user_account'; end if;
  if (select md5(prosrc) from pg_proc where oid=to_regprocedure('public.is_play_admin()')) is distinct from '147ec402e09d173203d079d6e58b419c' then raise exception 'Security source drift: is_play_admin'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_advance_phase()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_advance_phase'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_bits_events(text, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_bits_events'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_bits_health()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_bits_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_bits_qa_redemption(text, text, integer, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_bits_qa_redemption'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_bits_retry(text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_bits_retry'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_build_health()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_build_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_cancel_round()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_cancel_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_candy_simulate(integer, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_candy_simulate'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_health()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_inspect(uuid)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_inspect'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_overview()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_overview'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_report(integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_report'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_round(uuid)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_save_balance(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_save_balance'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_save_ball(text, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_save_ball'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_save_berry(text, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_save_berry'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_capture_simulate'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_clear_console()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_clear_console'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_clear_round()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_clear_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_collection_overview()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_collection_overview'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_content_health()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_content_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_content_picker(text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_content_picker'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_content_studio()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_content_studio'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_delete_event(uuid)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_delete_event'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_director_command(text, jsonb)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_director_command'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_director_simulate(numeric, numeric, numeric)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_director_simulate'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_disconnect_twitch(uuid, text)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_disconnect_twitch'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_economy_health()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_economy_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_economy_overview()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_economy_overview'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_economy_save(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_economy_save'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_economy_simulate'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_evolution_validate()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_evolution_validate'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_game_health()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_game_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_gift_catalog()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_gift_catalog'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_gift_joined(text)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_gift_joined'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_achievement(uuid, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_achievement'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_badge(uuid, text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_badge'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_bag(uuid, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_bag'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_bits_pack(text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_bits_pack'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_candy(uuid, integer, integer)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_candy'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_cosmetic(uuid, text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_cosmetic'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_pokemon(uuid, integer, text, text, boolean, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_pokemon'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_title(uuid, text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_title'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_grant_valuable(uuid, text, integer)')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_grant_valuable'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_hide_round(boolean)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_hide_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_identity_inspect(uuid)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_identity_inspect'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_issue_bridge_token()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_issue_bridge_token'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_item_library(text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_item_library'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_list_users(text, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_list_users'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_live_dashboard()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_live_dashboard'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_live_snapshot()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres}' then raise exception 'Security ACL drift: admin_live_snapshot'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_overview()')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_overview'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_save_config(jsonb)')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_save_config'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_save_entry(uuid, integer, integer, integer, boolean)')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_save_entry'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_self_test()')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_self_test'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_simulate(integer, numeric, numeric, numeric)')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_simulate'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_tables()')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_tables'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_loot_warnings()')) is distinct from '{postgres=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_loot_warnings'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_oak_qa(text, uuid, jsonb)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_oak_qa'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_oak_research_reset(uuid)')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_oak_research_reset'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_overview()')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_overview'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_pause_round()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_pause_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_pokemon_forms(integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_pokemon_forms'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_progression_overview()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_progression_overview'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_progression_save(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_progression_save'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_qa_grant_pass_reward(text)')) is distinct from '{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_qa_grant_pass_reward'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_queue_stream_command(text, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_queue_stream_command'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_refill_test()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_refill_test'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_remove_pokemon(uuid, uuid)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_remove_pokemon'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_resume_round()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_resume_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_revoke_cosmetic(uuid, text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_revoke_cosmetic'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_channel(text, text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_channel'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_event(uuid, text, text, text, timestamp with time zone, timestamp with time zone)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_event'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_game_settings(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_game_settings'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_github_token(text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_github_token'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_item_identity(text, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_item_identity'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_look_portrait(text, text, jsonb, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_look_portrait'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_pass_rewards(jsonb, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_pass_rewards'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_save_twitch_client_secret(text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_save_twitch_client_secret'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_coins(uuid, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_coins'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_pass(text, boolean)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_pass'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_ranking_visible(uuid, boolean, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_ranking_visible'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_role(uuid, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_role'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_twitch_flags(uuid, text, boolean, boolean, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_twitch_flags'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_twitch_primary(uuid, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_twitch_primary'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_set_xp(uuid, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_set_xp'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_special_event_analytics(uuid)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_special_event_analytics'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_special_event_command(text, jsonb)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_special_event_command'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_special_event_health()')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_special_event_health'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_start_round(integer, text, boolean, integer)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_start_round'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_delete_category(uuid)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_delete_category'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_delete_item(text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_delete_item'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_duplicate_item(text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_duplicate_item'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_get()')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_get'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_register_asset(text, text, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_register_asset'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_reorder(text, jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_reorder'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_save_category(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_save_category'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_save_item(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_save_item'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_store_save_look(jsonb)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_store_save_look'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_test_act(uuid, text, text, uuid)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_test_act'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_test_start(jsonb)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_test_start'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_trainer_reward_action(uuid, uuid, text, jsonb, text)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_trainer_reward_action'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_trainer_rewards(uuid)')) is distinct from '{postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_trainer_rewards'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_unlock_catch(uuid, text)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_unlock_catch'; end if;
  if (select proacl::text from pg_proc where oid=to_regprocedure('public.admin_user_account(uuid)')) is distinct from '{=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}' then raise exception 'Security ACL drift: admin_user_account'; end if;
end $guard$;
CREATE OR REPLACE FUNCTION public.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform private.require_hub();
  perform private.settle_due_rounds();
  return coalesce(private.admin_overview(), '{}'::jsonb)
    || jsonb_build_object('console', private.play_console_json(250));
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_set_pass(p_login text, p_active boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  updated int;
begin
  perform private.require_staff_edit();
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  update public.profiles
    set starlight_pass = p_active,
        pass_source = case when p_active then 'admin' else null end,
        pass_checked_at = now(),
        updated_at = now()
    where lower(twitch_login) = lower(btrim(p_login));
  get diagnostics updated = row_count;
  if updated = 0 then
    raise exception 'No Play trainer matches that Twitch login yet.';
  end if;
  return jsonb_build_object(
    'ok', true,
    'message', case when p_active then 'Starlight Pass granted.' else 'Starlight Pass removed.' end
  );
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_grant_bits_pack(p_login text, p_sku text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  item jsonb;
  trainer uuid;
begin
  perform private.require_staff_edit();
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select elem into item
  from jsonb_array_elements(private.store_catalog()->'bits') as elem
  where elem->>'sku' = p_sku;
  if item is null then
    raise exception 'Unknown Bits pack.';
  end if;
  select id into trainer from public.profiles where lower(twitch_login) = lower(btrim(p_login));
  if trainer is null then
    raise exception 'No Play trainer matches that Twitch login yet.';
  end if;
  perform private.grant_known(trainer, item->'grants');
  return jsonb_build_object('ok', true, 'message', 'Granted ' || (item->>'name') || ' to ' || btrim(p_login) || '.');
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_oak_qa(p_action text, p_user uuid, p_payload jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin uuid := auth.uid();
  payload jsonb := coalesce(p_payload, '{}'::jsonb);
  action text := upper(trim(coalesce(p_action, '')));
  mon_dex int;
  mon_qty int;
  i int;
  catch_id uuid;
  fam int;
  candy_amt int;
  grants jsonb := '{}'::jsonb;
  created int := 0;
  sora uuid := '60ff5211-6ef8-40e6-8daa-095b5600bf4c';
  warn boolean := false;
  catch_row public.catches;
  spec public.species;
  fam_name text;
  candy_base int;
  pay int := 0;
  candy_key text;
  proofs jsonb := '[]'::jsonb;
  before_qty int;
  after_qty int;
begin
  perform private.require_staff_edit();
  if admin is null or not private.is_play_admin() then
    raise exception 'Admin only.' using errcode = '42501';
  end if;
  if p_user is null then raise exception 'Pick a target Trainer.'; end if;
  if not exists (select 1 from public.profiles where id = p_user) then raise exception 'Unknown Trainer.'; end if;
  warn := p_user = sora;

  if action = 'GRANT_MON' then
    mon_dex := (payload->>'dex')::int;
    mon_qty := greatest(1, least(20, coalesce((payload->>'qty')::int, 1)));
    if mon_dex is null or mon_dex < 1 or mon_dex > 151 then raise exception 'Pick a Kanto species (1–151).'; end if;
    for i in 1..mon_qty loop
      insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name, pokemon_form_id)
      values (
        gen_random_uuid(), p_user, mon_dex,
        coalesce(payload->>'name', (select s.name from public.species s where s.dex = mon_dex), 'Pokémon'),
        case when coalesce((payload->>'shiny')::boolean, false) then 'shiny' else 'normal' end,
        coalesce(nullif(payload->>'gender', ''), 'Unknown'),
        greatest(1, least(100, coalesce((payload->>'level')::int, 10))),
        false, false, 'ADMIN_QA', p_user, 'ADMIN_QA', nullif(payload->>'formId', '')::int
      );
      created := created + 1;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_MON', payload || jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Granted %s ADMIN_QA Pokémon.', created));

  elsif action = 'GRANT_CANDY' then
    fam := coalesce((payload->>'familyId')::int, (payload->>'dex')::int);
    candy_amt := greatest(1, least(999, coalesce((payload->>'amount')::int, 1)));
    if fam is null then raise exception 'Pick an Evolution Line.'; end if;
    fam := coalesce((select s.family_id from public.species s where s.dex = fam), fam);
    perform private.grant_family_candy(p_user, fam, candy_amt, 'ADMIN_QA', 'Oak Lab QA candy',
      jsonb_build_object('idempotency', 'qa-candy:' || admin::text || ':' || p_user::text || ':' || fam::text || ':' || clock_timestamp()::text));
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_CANDY', jsonb_build_object('familyId', fam, 'amount', candy_amt, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'familyId', fam, 'amount', candy_amt, 'soraWarning', warn, 'message', 'Granted Evolution Candy.');

  elsif action = 'GRANT_ITEMS' then
    grants := coalesce(payload->'grants', '{}'::jsonb);
    perform private.ensure_inventory(p_user);
    perform private.grant_items(p_user, grants, 'ADMIN_QA', 'Oak Lab QA items',
      'qa-items:' || admin::text || ':' || p_user::text || ':' || clock_timestamp()::text, true);
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'GRANT_ITEMS', jsonb_build_object('grants', grants, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'Granted QA evolution items.');

  elsif action = 'PRESET_OAK' then
    for mon_dex, mon_qty in select * from (values (113,2),(111,2),(25,2),(27,2),(133,3)) as t(d, q) loop
      for i in 1..mon_qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (gen_random_uuid(), p_user, mon_dex, (select s.name from public.species s where s.dex = mon_dex), 'normal', 'Unknown', 12, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA');
        created := created + 1;
      end loop;
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_OAK', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', format('Oak transfer preset: %s Pokémon.', created));

  elsif action = 'PRESET_EVO' then
    for mon_dex, mon_qty in select * from (values (25,1),(27,1),(133,3),(63,1),(64,1),(29,1),(32,1)) as t(d, q) loop
      for i in 1..mon_qty loop
        insert into public.catches (id, user_id, dex, name, variant, gender, level, favorite, locked, obtained_method, ot_user_id, ot_name)
        values (gen_random_uuid(), p_user, mon_dex, (select s.name from public.species s where s.dex = mon_dex), 'normal',
          case when mon_dex = 29 then 'Female' when mon_dex = 32 then 'Male' else 'Unknown' end, 20, false, false, 'ADMIN_QA', p_user, 'ADMIN_QA');
        created := created + 1;
      end loop;
    end loop;
    perform private.grant_family_candy(p_user, 25, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-pika:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 27, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-sand:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 133, 80, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-eevee:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.grant_family_candy(p_user, 63, 50, 'ADMIN_QA', 'QA evo candy', jsonb_build_object('idempotency', 'qa-evo-abra:' || p_user::text || ':' || clock_timestamp()::text));
    perform private.ensure_inventory(p_user);
    perform private.grant_items(p_user, jsonb_build_object(
      'thunderstone', 2, 'firestone', 2, 'waterstone', 2, 'leafstone', 2, 'moonstone', 2,
      'linkingcord', 2, 'rarecandy', 5
    ), 'ADMIN_QA', 'QA evo kit', 'qa-evo-items:' || p_user::text || ':' || clock_timestamp()::text, true);
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PRESET_EVO', jsonb_build_object('created', created, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'created', created, 'soraWarning', warn, 'message', 'Kanto evolution QA kit granted.');

  elsif action = 'PROOF_TRANSFER' then
    for catch_id in select x::uuid from jsonb_array_elements_text(coalesce(payload->'catchIds', '[]'::jsonb)) t(x) loop
      select * into catch_row from public.catches
       where id = catch_id and user_id = p_user and transferred_at is null and obtained_method = 'ADMIN_QA' for update;
      if catch_row.id is null then raise exception 'ADMIN_QA catch % missing for target.', catch_id; end if;
      select * into spec from public.species where species.dex = catch_row.dex;
      fam := coalesce(spec.family_id, catch_row.dex);
      select f.name, f.base_dex into fam_name, candy_base from public.evolution_families f where f.id = fam;
      if candy_base is null then candy_base := fam; fam_name := coalesce(spec.name, catch_row.name); end if;
      candy_key := 'species-' || fam::text;
      pay := case coalesce(spec.evo_stage, 0) when 2 then 2 when 3 then 3 else 1 end;
      if coalesce(catch_row.is_alpha, false) or strpos(coalesce(catch_row.variant, ''), 'shiny') > 0 then pay := pay + 1; end if;
      select coalesce(fc.qty,0) into before_qty from public.family_candy fc where fc.user_id = p_user and fc.family_id = fam;
      perform private.grant_family_candy(p_user, fam, pay, 'OAK_TRANSFER', 'Sent to Professor Oak',
        jsonb_build_object('idempotency', 'oak:' || catch_row.id::text, 'catchId', catch_row.id::text));
      insert into public.oak_transfers (user_id, dex, catch_id, candy_key) values (p_user, catch_row.dex, catch_row.id, candy_key);
      update public.catches set transferred_at = now() where id = catch_row.id;
      select coalesce(fc.qty,0) into after_qty from public.family_candy fc where fc.user_id = p_user and fc.family_id = fam;
      proofs := proofs || jsonb_build_object('catchId', catch_row.id, 'dex', catch_row.dex, 'name', catch_row.name, 'familyId', fam, 'candyKey', candy_key, 'candyGranted', pay, 'candyBaseDex', candy_base, 'candyName', coalesce(fam_name, 'Evolution') || ' Evolution Candy', 'balanceBefore', before_qty, 'balanceAfter', after_qty);
    end loop;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'PROOF_TRANSFER', jsonb_build_object('proofs', proofs, 'soraWarning', warn));
    return jsonb_build_object('ok', true, 'proofs', proofs, 'soraWarning', warn);

  elsif action = 'RESET_QA' then
    delete from public.oak_transfers ot using public.catches qa where ot.catch_id = qa.id and qa.user_id = p_user and qa.obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger cl using public.catches qa where cl.related_catch = qa.id and qa.user_id = p_user and qa.obtained_method = 'ADMIN_QA';
    delete from public.catches where user_id = p_user and obtained_method = 'ADMIN_QA';
    delete from public.candy_ledger where user_id = p_user and type = 'ADMIN_QA';
    update public.family_candy fc set qty = greatest(0, coalesce((select sum(cl.amount) from public.candy_ledger cl where cl.user_id = fc.user_id and cl.family_id = fc.family_id), 0)) where fc.user_id = p_user;
    delete from public.family_candy fc2 where fc2.user_id = p_user and fc2.qty <= 0;
    insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
    values (admin, p_user, 'RESET_QA', jsonb_build_object('soraWarning', warn));
    return jsonb_build_object('ok', true, 'soraWarning', warn, 'message', 'ADMIN_QA catches and ADMIN_QA candy ledger rows cleared.');

  else
    raise exception 'Unknown Oak QA action.';
  end if;
end;
$function$
;
CREATE OR REPLACE FUNCTION public.admin_qa_grant_pass_reward(p_kind text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  admin uuid := auth.uid();
  kind text := lower(btrim(coalesce(p_kind, '')));
  v_grants jsonb;
  label text;
  supply jsonb;
  berry jsonb;
begin
  perform private.require_staff_edit();
  if admin is null then
    raise exception 'Sign in first.' using errcode = '42501';
  end if;
  if not private.is_play_admin() then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if kind not in ('daily', 'weekly', 'supply') then
    raise exception 'Unknown Pass QA reward kind.';
  end if;
  if kind = 'supply' then
    supply := private.economy_config()->'dailySupply';
    berry := private.pick_loot_entry('DAILY_COMMON_BERRY');
    if berry is null or (berry->>'item') = 'goldenrazz' then
      berry := jsonb_build_object('item', 'berry', 'qty', 1);
    end if;
    v_grants := jsonb_build_object(
        'pokeball', coalesce((supply->>'pokeball')::int, 3),
        berry->>'item', coalesce((supply->>'berry')::int, 1),
        'coins', coalesce((supply->>'coins')::int, 50)
      ) || coalesce(private.daily_streak_bonus(1), '{}'::jsonb);
    label := 'ADMIN QA Daily Trainer Supply';
  else
    v_grants := private.pass_reward_grants(kind);
    label := case when kind = 'daily' then 'ADMIN QA Daily Pass' else 'ADMIN QA Weekly Pass' end;
  end if;
  if v_grants is null or v_grants = '{}'::jsonb then
    raise exception 'QA reward bundle is empty.';
  end if;
  perform private.grant_items(
    admin,
    v_grants,
    'ADMIN_QA',
    'pass-qa-' || kind,
    'admin-pass-qa:' || admin::text || ':' || kind || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'),
    true
  );
  insert into public.admin_qa_grants (admin_id, target_user, kind, payload)
  values (
    admin,
    admin,
    'PASS_REWARD_QA',
    jsonb_build_object('passKind', kind, 'grants', v_grants, 'label', label)
  );
  return private.play_snapshot(admin) || jsonb_build_object(
    'ok', true,
    'qa', true,
    'kind', kind,
    'grants', v_grants,
    'message', label || ' granted: ' || private.grant_summary(v_grants) || '.'
  );
end;
$function$
;
revoke execute on function public.admin_advance_phase() from public, anon;
revoke execute on function public.admin_bits_events(text, integer) from public, anon;
revoke execute on function public.admin_bits_health() from public, anon;
revoke execute on function public.admin_bits_qa_redemption(text, text, integer, text) from public, anon;
revoke execute on function public.admin_bits_retry(text) from public, anon;
revoke execute on function public.admin_build_health() from public, anon;
revoke execute on function public.admin_cancel_round() from public, anon;
revoke execute on function public.admin_candy_simulate(integer, integer) from public, anon;
revoke execute on function public.admin_capture_health() from public, anon;
revoke execute on function public.admin_capture_overview() from public, anon;
revoke execute on function public.admin_capture_report(integer) from public, anon;
revoke execute on function public.admin_capture_round(uuid) from public, anon;
revoke execute on function public.admin_capture_save_balance(jsonb) from public, anon;
revoke execute on function public.admin_capture_save_ball(text, jsonb) from public, anon;
revoke execute on function public.admin_capture_save_berry(text, jsonb) from public, anon;
revoke execute on function public.admin_capture_simulate(integer, text, text, integer, integer, boolean, boolean, boolean, integer) from public, anon;
revoke execute on function public.admin_clear_round() from public, anon;
revoke execute on function public.admin_collection_overview() from public, anon;
revoke execute on function public.admin_content_health() from public, anon;
revoke execute on function public.admin_content_picker(text, text) from public, anon;
revoke execute on function public.admin_content_studio() from public, anon;
revoke execute on function public.admin_delete_event(uuid) from public, anon;
revoke execute on function public.admin_economy_health() from public, anon;
revoke execute on function public.admin_economy_overview() from public, anon;
revoke execute on function public.admin_economy_save(jsonb) from public, anon;
revoke execute on function public.admin_economy_simulate(integer, integer, numeric, numeric, numeric, text) from public, anon;
revoke execute on function public.admin_evolution_validate() from public, anon;
revoke execute on function public.admin_game_health() from public, anon;
revoke execute on function public.admin_grant_achievement(uuid, text) from public, anon;
revoke execute on function public.admin_grant_badge(uuid, text, text) from public, anon;
revoke execute on function public.admin_grant_bag(uuid, jsonb) from public, anon;
revoke execute on function public.admin_grant_bits_pack(text, text) from public, anon;
revoke execute on function public.admin_grant_cosmetic(uuid, text, text) from public, anon;
revoke execute on function public.admin_grant_pokemon(uuid, integer, text, text, boolean, text) from public, anon;
revoke execute on function public.admin_grant_title(uuid, text, text) from public, anon;
revoke execute on function public.admin_grant_valuable(uuid, text, integer) from public, anon;
revoke execute on function public.admin_hide_round(boolean) from public, anon;
revoke execute on function public.admin_identity_inspect(uuid) from public, anon;
revoke execute on function public.admin_issue_bridge_token() from public, anon;
revoke execute on function public.admin_item_library(text, text) from public, anon;
revoke execute on function public.admin_list_users(text, integer) from public, anon;
revoke execute on function public.admin_loot_overview() from public, anon;
revoke execute on function public.admin_loot_save_config(jsonb) from public, anon;
revoke execute on function public.admin_loot_save_entry(uuid, integer, integer, integer, boolean) from public, anon;
revoke execute on function public.admin_loot_self_test() from public, anon;
revoke execute on function public.admin_loot_simulate(integer, numeric, numeric, numeric) from public, anon;
revoke execute on function public.admin_loot_tables() from public, anon;
revoke execute on function public.admin_oak_research_reset(uuid) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
revoke execute on function public.admin_pokemon_forms(integer) from public, anon;
revoke execute on function public.admin_progression_overview() from public, anon;
revoke execute on function public.admin_progression_save(jsonb) from public, anon;
revoke execute on function public.admin_qa_grant_pass_reward(text) from public, anon;
revoke execute on function public.admin_queue_stream_command(text, jsonb) from public, anon;
revoke execute on function public.admin_refill_test() from public, anon;
revoke execute on function public.admin_remove_pokemon(uuid, uuid) from public, anon;
revoke execute on function public.admin_revoke_cosmetic(uuid, text, text) from public, anon;
revoke execute on function public.admin_save_channel(text, text, text) from public, anon;
revoke execute on function public.admin_save_event(uuid, text, text, text, timestamp with time zone, timestamp with time zone) from public, anon;
revoke execute on function public.admin_save_game_settings(jsonb) from public, anon;
revoke execute on function public.admin_save_github_token(text) from public, anon;
revoke execute on function public.admin_save_item_identity(text, jsonb) from public, anon;
revoke execute on function public.admin_save_look_portrait(text, text, jsonb, text) from public, anon;
revoke execute on function public.admin_save_pass_rewards(jsonb, jsonb) from public, anon;
revoke execute on function public.admin_save_twitch_client_secret(text) from public, anon;
revoke execute on function public.admin_set_coins(uuid, integer) from public, anon;
revoke execute on function public.admin_set_pass(text, boolean) from public, anon;
revoke execute on function public.admin_set_ranking_visible(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_set_role(uuid, text) from public, anon;
revoke execute on function public.admin_set_twitch_flags(uuid, text, boolean, boolean, text) from public, anon;
revoke execute on function public.admin_set_twitch_primary(uuid, text) from public, anon;
revoke execute on function public.admin_set_xp(uuid, integer) from public, anon;
revoke execute on function public.admin_start_round(integer, text, boolean, integer) from public, anon;
revoke execute on function public.admin_store_delete_category(uuid) from public, anon;
revoke execute on function public.admin_store_delete_item(text) from public, anon;
revoke execute on function public.admin_store_duplicate_item(text) from public, anon;
revoke execute on function public.admin_store_get() from public, anon;
revoke execute on function public.admin_store_register_asset(text, text, text) from public, anon;
revoke execute on function public.admin_store_reorder(text, jsonb) from public, anon;
revoke execute on function public.admin_store_save_category(jsonb) from public, anon;
revoke execute on function public.admin_store_save_item(jsonb) from public, anon;
revoke execute on function public.admin_store_save_look(jsonb) from public, anon;
revoke execute on function public.admin_unlock_catch(uuid, text) from public, anon;
revoke execute on function public.admin_user_account(uuid) from public, anon;
do $verify$ begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and left(p.proname,6)='admin_' and has_function_privilege('anon',p.oid,'execute')) then raise exception 'Anonymous admin execution remains'; end if;
end $verify$;
commit;
