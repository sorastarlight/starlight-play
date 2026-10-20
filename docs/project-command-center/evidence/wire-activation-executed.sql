-- PROPOSAL ONLY: NOT EXECUTED ON HOSTED SUPABASE. Requires explicit WIRE activation approval.
-- Enables future generated catches globally; no encounter, catch, delivery, reset or schema change.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='20s';
LOCK TABLE public.encounter_rounds IN SHARE MODE;
DO $wire_activation$
DECLARE v_before jsonb; v_after jsonb; v_count integer;
BEGIN
 PERFORM 1 FROM private.streamlink_wire_switch WHERE id=1 FOR UPDATE;
 IF NOT FOUND OR (SELECT enabled FROM private.streamlink_wire_switch WHERE id=1) IS DISTINCT FROM false THEN RAISE EXCEPTION 'WIRE baseline changed; stop'; END IF;
 IF EXISTS(SELECT 1 FROM public.encounter_rounds WHERE NOT coalesce(resolved,false) AND NOT coalesce(cancelled,false)) THEN RAISE EXCEPTION 'Unresolved encounter; stop'; END IF;
 SELECT to_jsonb(a) INTO v_before FROM private.species_mastery_activation a WHERE singleton FOR SHARE;
 IF v_before->>'lifecycle' IS DISTINCT FROM 'active' OR nullif(v_before->>'activated_at','') IS NULL THEN RAISE EXCEPTION 'Familiarity baseline changed; stop'; END IF;
 SELECT count(*) INTO v_count FROM (VALUES
 ('private','after_catch_present','','f0b96a30bc11ece53bf3d524f865837c'),
 ('private','after_catch_xp','','fe7d6e368e11604b78ebc92bd70212e3'),
 ('private','assert_streamlink_legal','p_mon jsonb, p_ctx text, p_hidden_auth uuid','ad513fd1f3031caf98e3d70ef0b75334'),
 ('private','catches_before_write','','80bf0cb05129d9b3f3066249e5019bff'),
 ('private','freeze_catch_server_inserted_at','','ae884032419d5162ead315d0f216d76c'),
 ('private','note_species_mastery_catch','p_catch_id uuid','313944ac139f33465e57d86c0a1c5678'),
 ('private','settle_if_needed','r encounter_rounds','565c102d0a8c84a3dfd036653aca307c'),
 ('private','species_mastery_caught_at_freeze','','046fb0fe991c2aa28f3b8fcbe39b42e9'),
 ('private','stamp_catch_server_inserted_at','','b66ad1b961b3573a2c48947dfe0413ea'),
 ('private','streamlink_complete_and_bind','p_prep jsonb, p_shiny boolean, p_nature_id integer, p_ability_pick bigint, p_iv_hp integer, p_iv_atk integer, p_iv_def integer, p_iv_spa integer, p_iv_spd integer, p_iv_spe integer, p_gender_roll bigint, p_specimen_id uuid','e1c7cad256e325d01fea471b2f0456e3'),
 ('private','streamlink_generate_prepare','p_form_id integer, p_level integer, p_ctx text, p_content_build text, p_hidden_ticket text','69750a277ce58acfc38b48cca10637bf'),
 ('private','streamlink_wire_set_enabled','p_enabled boolean','851717f6de5bdb67ec916559c2d75e67'),
 ('private','streamlink_json_int','p jsonb','aee169725b81de191df1e1871ecdb329'),
 ('private','streamlink_specimen_digest','p_mon jsonb','b243a4496672e560683d921a403aa631'),
 ('private','streamlink_obtain_ok','p_content_build text, p_ctx text, p_form_id integer','1aeea44c94039dbbf89e68899d4ee47f'),
 ('private','streamlink_gender','p_gender_rate integer, p_roll bigint','c815941b70b565860d238cadd2835135'),
 ('private','streamlink_level_up_slice','p_content_build text, p_form_id integer, p_level integer','dda453431a59560c46fa9cb8fecfd159'),
 ('private','streamlink_lock_hidden_ticket','p_ticket uuid, p_content_build text, p_form_id integer, p_ctx text','fdf01b196d7925e6aeac2555be1de1e1'),
 ('private','round_phase','r encounter_rounds','9c78775fc62dd1d90f8e6434cecde028'),
 ('private','streamlink_form_blocked','p_content_build text, p_form_id integer','15640a089971e5879918a76322c33714'),
 ('private','streamlink_hp_max','p_base integer, p_iv integer, p_ev integer, p_level integer','6d49530a73138778cdc48cb6701475b7'),
 ('private','streamlink_stat','p_base integer, p_iv integer, p_ev integer, p_level integer, p_nature numeric','2f2c6b077f6afb56811c099311fd68cf'),
 ('private','streamlink_bind_hidden_ticket','p_ticket uuid, p_specimen_id uuid, p_digest bytea','c7cb5a95d6690f4092c3d0a5423b6131'),
 ('private','ensure_trainer_stats','p_uid uuid','e8edf6d58825f7422570fef66884b28a'),
 ('private','push_notice','p_uid uuid, p_kind text, p_title text, p_body text, p_payload jsonb','0916366cfefccd66f94f2736226f733e'),
 ('private','female_visual_dex','','09138aba566dec033a389e82c4a38ffc'),
 ('private','ensure_inventory','p_uid uuid','ccc5af71a95193d0301edcb689e225e5'),
 ('private','materialize_streamlink_catch','p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text, p_round_id uuid, p_shiny boolean, p_content_build text, p_hidden_ticket text, p_variant text, p_name text, p_gender text','e88c6cbec313a4cc0b81a5df1f5691b3'),
 ('private','trainer_label','p_uid uuid','d552aa730b39c895d034e44aa01fc31e'),
 ('private','stamp_catch_row','c catches','716d8b76519ced3d05e3584c7869dd93'),
 ('private','enqueue_species_mastery_event','p_catch_id uuid','49e59ca336a343a2765ab811c06c96b6'),
 ('private','phase_banner','p_round uuid, p_key text, p_message text','2b8d17c22cae3437e654e77d3b5fc381'),
 ('private','capture_config','','45e7729b2f09b90a81ff4b821abd4a0b'),
 ('private','secure_random','','63b23e60485e69fdbfe567f987bc41c5'),
 ('private','announce_throws','p_round uuid','1145a36f2a1a2e93f9d99e91c4d24916'),
 ('private','capture_chance','p_dex integer, p_ball text, p_berry text, p_honey_contributors integer, p_honey_participants integer, p_contributed_honey boolean, p_owns_species boolean, p_is_shiny boolean, p_other_multiplier numeric, p_at timestamp with time zone, p_config jsonb','205d43359e90971f790816cf6e45c889'),
 ('private','progression_config','','2eeec805c6edd5ca07cd47873da73411'),
 ('private','grant_xp','p_uid uuid, p_amount integer, p_type text, p_reason text, p_meta jsonb','582053f5bccdf792536cf97dcb4daffe'),
 ('private','register_capture_collection','p_catch catches','f77428f1103eab9375acd894b2862d56'),
 ('private','variant_is_shiny','p_variant text','691aa5ab3acf14218413208d0a1a0c21'),
 ('private','encounter_pokemon_level','p_dex integer, p_round_id uuid','825320525ce7e795607acbfdde4c71ac'),
 ('private','round_is_test','p_round uuid','a33d9b63f44df44771b7d2d9a43cb2af'),
 ('private','capture_throw_context','p_round encounter_rounds, p_uid uuid, p_ball_at timestamp with time zone','24ad3ef224ff57379230117297c0e3cb'),
 ('private','canonical_form_id','p_dex integer, p_form_id integer','2b4136c01d09706f1b631f8b8b4c280e'),
 ('private','form_display_name','p_dex integer, p_form_id integer','3a46152129a51fc555b5d6a1c18af207'),
 ('private','mark_seen','p_uid uuid, p_dex integer, p_form_id integer','f2446af30960fa33815981fd8c73d671'),
 ('private','grant_starter_kit','p_uid uuid','66bf38c67d13ebd23425027ff93fc7fe'),
 ('private','streamlink_sha256','p_text text','4dd6bf66845332dcdd4febeae75a1769'),
 ('private','game_settings','','2f532f8384feaa461b73d3ca8d736c4a'),
 ('private','trainer_level','p_xp integer','1991bd9372ec037cac3a616128970c00'),
 ('private','streamlink_wire_is_enabled','','aa1e54f33255ff249d809fdba2efbfb4'),
 ('private','streamlink_protected_trainer','p_user_id uuid','0fa172fb089bf52959bbbbee3703ccdf'),
 ('private','persist_streamlink_catch','p_user_id uuid, p_form_id integer, p_level integer, p_ctx text, p_source_key text, p_ball text, p_round_id uuid, p_shiny boolean, p_content_build text, p_hidden_ticket text, p_variant text, p_name text, p_gender text','0d1724fb07b156d6124b2f0f556303a4'),
 ('private','lgpe_pick_moves','p_dex integer, p_level integer','faa2757753e14d77b977086896cfbd9c'),
 ('private','flush_bits_pending','p_uid uuid','cb7fc4cf40a53c815c967f3a48d5e4eb'),
 ('private','log_activity','p_round uuid, p_uid uuid, p_kind text, p_item text','2d82a8871801db260e3a75cefb4d742b'),
 ('private','spend_bag_item','p_uid uuid, p_item text','b30712a5a082f00ce45fd2c214e7029d'),
 ('private','lgpe_habitat','p_dex integer','3023d8a828cee722b376447f8187c49a'),
 ('private','lgpe_level_bounds','p_dex integer','4f1bcd0ba6545382474b1e23dd1388c2'),
 ('private','lgpe_roll_gender','p_dex integer, p_seed integer, p_current text','d720bd6d2916d4d0711ba150c2be8f37'),
 ('private','item_label','item text','50d8623a87cec84e3ed43f4f9e550c50'),
 ('private','deadlines_complete','d jsonb','1127b8fd38f4ce79c0c16e2eadbaf45f'),
 ('private','capture_berry_modifier','p_item text','b644dd00db34d16ccfc9e318372a7084'),
 ('private','capture_base_chance','p_catch_rate integer, p_config jsonb','22d975611f036503f188d0da83088cc7'),
 ('private','capture_honey_modifier','p_contributors integer, p_participants integer, p_config jsonb','537de86df94f942b158519844cac0da7'),
 ('private','a_or_an','p_label text','caedd2414e0f887f379416b46ceea0d0'),
 ('private','candy_for_stage','p_stage integer','818927ddf825eb5062b8de2a1c2c6ee2'),
 ('private','grant_family_candy','p_uid uuid, p_family integer, p_amount integer, p_type text, p_reason text, p_meta jsonb','b06b275b4a9fe15cd6471a68e122baf7'),
 ('private','grant_mastery','p_uid uuid, p_dex integer, p_amount integer, p_reason text, p_idem text','d5c11cc672f2cb16ae0210023a8dd91b'),
 ('private','family_has_enabled_evo','p_family integer','243e9865e04e03faa61af8404b73a12c'),
 ('private','process_level_ups','p_uid uuid, p_from integer, p_to integer, p_grant_items boolean','7ec99dd58b36de3303c0460f93d32e18'),
 ('private','capture_ball_modifier','p_ball text, p_dex integer, p_owns_species boolean, p_at timestamp with time zone, p_config jsonb','8feff897b7f1686588b027233b4a34b5'),
 ('private','streamlink_secure_u32','','6df158570e9a8fe4ce8409821c0ead40'),
 ('private','streamlink_next_public_id','p_prefix text','04c1c8336b24494c5f132749de4bec2a'),
 ('private','grant_known','p_uid uuid, p_grants jsonb','a4e10d948d62b054abe30f3f3b1f20ce'),
 ('private','lgpe_gender_rate','p_dex integer','1a36d403ef1f50ed4e4841eb73d316ec'),
 ('private','extra_ball_keys','','bf310997b2900296268684fd122ff673'),
 ('private','store_catalog','','fc38b689ca800ee46c3496517f40ad8a'),
 ('private','unlock_badge','p_uid uuid, p_badge text, p_notice boolean','b01baef5b09afa6be3cfe02e815a5f58'),
 ('private','unlock_title','p_uid uuid, p_title text, p_notice boolean','4d8c947be7f3fbbf1d31e669013ec6ff'),
 ('private','is_capture_berry','item text','753b66d6bc5255ae6d3b7c94b1fbfdbc'),
 ('private','economy_config','','7513695d9b73cfaca03b65f9d6b2b8a3'),
 ('private','xp_to_reach_level','p_level integer','9728299208695989c60a0d9af968c5f2'),
 ('private','mastery_rank','p_points integer','04fa122f1f4424cd6e63fa1f3ffa16a4'),
 ('private','evo_enabled_generations','','f81a6d7ad662d15f448cb2a3bcc792c0'),
 ('private','evaluate_cosmetics','p_uid uuid','024bb6f7d95682dc5dbd50c676afd2af'),
 ('private','grant_progress_rewards','p_uid uuid, p_rewards jsonb, p_notice boolean','f7cfde826ab8b80c55f697ee01a0f22e'),
 ('private','adjust_coins','p_uid uuid, p_amount integer, p_type text, p_reason text, p_meta jsonb','d02b15dde384226e33d23d38be33cb64'),
 ('private','grant_items','p_uid uuid, p_grants jsonb, p_reason text, p_source text, p_idem text, p_strict boolean','79313a404313c34e5224ecdf2622cb6a'),
 ('private','bag_capacity','p_uid uuid','589607d4326af22f930c6d11318d0e1d'),
 ('private','item_total','i inventories','6145ad55ab068e044696d5617ed7ab68'),
 ('private','bag_capacity_max','','7c2e73b11853a83a21c18cadd28f2dd4'),
 ('private','store_floors','','87ca34428aeed6322dc16c07c709a8f3'),
 ('private','core_item_keys','','41f1dfe86b521e876e5f8081c7ff171c'),
 ('private','capture_berry_keys','','ef78f633a2a4d2a01797138305fc8493'),
 ('private','xp_for_level','p_level integer','3347b846206bc59f0a580d78145d6462'),
 ('private','adjust_item','p_uid uuid, p_key text, p_delta integer','e87256fbc467b5ae5254c652a5be983d'),
 ('private','evo_item_keys','','e6c6a8da99db2361da668898b1931743'),
 ('private','open_choice_reward','p_uid uuid, p_key text, p_options text[], p_remaining integer','60ec34e23c3424cd95a00bee682c8a1f'),
 ('private','cosmetic_requirement_met','p_uid uuid, p_req jsonb','fee52527e27833ca27c4ff6e11966ae5'),
 ('private','unlock_cosmetic','p_uid uuid, p_id text, p_source text, p_notice boolean','90afc724cfa4362473cda04656ff432b'),
 ('private','store_item_is_live','i private.store_items','71340b41e6c668f4fc5126c1d711d8bf'),
 ('private','store_item_json','i private.store_items','f988e9235d3173ad4c2f850494342fef'),
 ('private','bag_bonus_cap','','881f08962e39aab21a5e80516574fcd5'),
 ('private','valuable_item_keys','','3156584fb1337c369603f4551c60e12e'),
 ('private','as_uuid_or_null','p_text text','34d2b5dc9485e64f20d45a191c979f15'),
 ('private','owns_avatar_pack','p_uid uuid, p_pack text','a20cc082f3c0f5f157367dcb5eb00deb'),
 ('private','item_qty','p_uid uuid, p_key text','b02031b587363cf03f608e3bc4232bf5'),
 ('private','item_identity','p_key text','635e00c57f8bcc6902a79cbee81825dd'),
 ('private','cosmetic_asset','p_id text','dbcf12b612d8dfce2e87c0c6022ed7c7'),
 ('private','item_power_label','p_mult numeric, p_guaranteed boolean, p_collector boolean','173396f2699b6a9c24e64745bde6fadf'),
 ('private','twitch_numeric_id','p_id text','22e10f2828b60194b1e12d4ea09e2bc5')
 ) expected(schema_name,function_name,identity_args,body_md5)
 JOIN pg_namespace n ON n.nspname=expected.schema_name
 JOIN pg_proc p ON p.pronamespace=n.oid AND p.proname=expected.function_name
 AND pg_get_function_identity_arguments(p.oid)=expected.identity_args AND md5(p.prosrc)=expected.body_md5;
 IF v_count<>112 THEN RAISE EXCEPTION 'Function fingerprint drift; stop'; END IF;
 IF has_function_privilege('anon','private.streamlink_wire_set_enabled(boolean)','EXECUTE')
 OR has_function_privilege('authenticated','private.streamlink_wire_set_enabled(boolean)','EXECUTE')
 THEN RAISE EXCEPTION 'WIRE switch permission drift; stop'; END IF;
 SELECT count(*) INTO v_count FROM pg_trigger t WHERE t.tgrelid='public.catches'::regclass AND NOT t.tgisinternal AND t.tgenabled='O'
 AND pg_get_triggerdef(t.oid) IN ('CREATE TRIGGER catch_server_inserted_at BEFORE INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION private.stamp_catch_server_inserted_at()',
 'CREATE TRIGGER catch_server_inserted_at_freeze BEFORE UPDATE OF server_inserted_at ON public.catches FOR EACH ROW EXECUTE FUNCTION private.freeze_catch_server_inserted_at()',
 'CREATE TRIGGER catches_after_present AFTER INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION private.after_catch_present()',
 'CREATE TRIGGER catches_before_write BEFORE INSERT OR UPDATE OF dex, level, iv_hp, iv_atk, iv_def, iv_spa, iv_spd, iv_spe, av_hp, av_atk, av_def, av_spa, av_spd, av_spe ON public.catches FOR EACH ROW EXECUTE FUNCTION private.catches_before_write()',
 'CREATE TRIGGER catches_xp AFTER INSERT ON public.catches FOR EACH ROW EXECUTE FUNCTION private.after_catch_xp()',
 'CREATE TRIGGER species_mastery_caught_at_freeze BEFORE UPDATE OF caught_at ON public.catches FOR EACH ROW EXECUTE FUNCTION private.species_mastery_caught_at_freeze()');
 IF v_count<>6 OR (SELECT count(*) FROM pg_trigger WHERE tgrelid='public.catches'::regclass AND NOT tgisinternal)<>6 THEN RAISE EXCEPTION 'Catch trigger drift; stop'; END IF;
 IF private.streamlink_wire_set_enabled(true) IS DISTINCT FROM true THEN RAISE EXCEPTION 'WIRE activation failed'; END IF;
 IF (SELECT enabled FROM private.streamlink_wire_switch WHERE id=1) IS DISTINCT FROM true THEN RAISE EXCEPTION 'WIRE activation verification failed'; END IF;
 SELECT to_jsonb(a) INTO v_after FROM private.species_mastery_activation a WHERE singleton;
 IF v_after IS DISTINCT FROM v_before THEN RAISE EXCEPTION 'Unexpected Familiarity change'; END IF;
END
$wire_activation$;
COMMIT;
SELECT enabled,updated_at FROM private.streamlink_wire_switch WHERE id=1;
