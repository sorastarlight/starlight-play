-- Data-driven trainer looks so staff can build avatar packs in the Store editor.

create table if not exists private.trainer_looks (
  id text primary key,
  name text not null,
  gender text not null default '',
  outfit text not null default '',
  ext text not null default 'png',
  group_key text not null default 'custom',
  group_label text not null default 'Custom',
  games text not null default '',
  pack_key text,
  sort int not null default 100,
  visible boolean not null default true
);

alter table private.trainer_looks enable row level security;

insert into private.trainer_looks (
  id, name, gender, outfit, ext, group_key, group_label, games, pack_key, sort, visible
)
select
  x.id, x.name, coalesce(x.gender, ''), coalesce(x.outfit, ''), coalesce(x.ext, 'png'),
  coalesce(x.group_key, 'custom'), coalesce(x.group_label, 'Custom'), coalesce(x.games, ''),
  nullif(x.pack_key, ''), x.sort, coalesce(x.visible, true)
from jsonb_to_recordset($looks$[{"id":"red-gen1","name":"Red","gender":"Male","outfit":"Yellow","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1001,"visible":true},{"id":"red-gen1rb","name":"Red","gender":"Male","outfit":"Red / Blue","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1002,"visible":true},{"id":"red-gen1main","name":"Red","gender":"Male","outfit":"Overworld","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1003,"visible":true},{"id":"red-gen1title","name":"Red","gender":"Male","outfit":"Title","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1004,"visible":true},{"id":"red-gen2","name":"Red","gender":"Male","outfit":"Johto","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1005,"visible":true},{"id":"red-gen3","name":"Red","gender":"Male","outfit":"FRLG","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1006,"visible":true},{"id":"red-gen7","name":"Red","gender":"Male","outfit":"Alola","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1007,"visible":true},{"id":"red","name":"Red","gender":"Male","outfit":"Classic","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1008,"visible":true},{"id":"leaf-gen3","name":"Leaf","gender":"Female","outfit":"FRLG","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1009,"visible":true},{"id":"green","name":"Green","gender":"Female","outfit":"Classic","ext":"png","group_key":"gen1","group_label":"Gen 1 · Kanto","games":"Red / Blue / Yellow","pack_key":null,"sort":1010,"visible":true},{"id":"ethan-gen2","name":"Ethan","gender":"Male","outfit":"Gold / Silver","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2001,"visible":true},{"id":"ethan-gen2c","name":"Ethan","gender":"Male","outfit":"Crystal","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2002,"visible":true},{"id":"ethan","name":"Ethan","gender":"Male","outfit":"HGSS","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2003,"visible":true},{"id":"ethan-pokeathlon","name":"Ethan","gender":"Male","outfit":"Pokéathlon","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2004,"visible":true},{"id":"kris-gen2","name":"Kris","gender":"Female","outfit":"Crystal","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2005,"visible":true},{"id":"kris","name":"Kris","gender":"Female","outfit":"Classic","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2006,"visible":true},{"id":"lyra","name":"Lyra","gender":"Female","outfit":"HGSS","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2007,"visible":true},{"id":"lyra-pokeathlon","name":"Lyra","gender":"Female","outfit":"Pokéathlon","ext":"png","group_key":"gen2","group_label":"Gen 2 · Johto","games":"Gold / Silver / Crystal / HGSS","pack_key":null,"sort":2008,"visible":true},{"id":"brendan-gen3","name":"Brendan","gender":"Male","outfit":"Emerald","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3001,"visible":true},{"id":"brendan-gen3rs","name":"Brendan","gender":"Male","outfit":"RS overworld","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3002,"visible":true},{"id":"brendan-rs","name":"Brendan","gender":"Male","outfit":"Ruby / Sapphire","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3003,"visible":true},{"id":"brendan-e","name":"Brendan","gender":"Male","outfit":"Emerald alt","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3004,"visible":true},{"id":"brendan","name":"Brendan","gender":"Male","outfit":"ORAS","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3005,"visible":true},{"id":"brendan-contest","name":"Brendan","gender":"Male","outfit":"Contest","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3006,"visible":true},{"id":"may-gen3","name":"May","gender":"Female","outfit":"Emerald","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3007,"visible":true},{"id":"may-gen3rs","name":"May","gender":"Female","outfit":"RS overworld","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3008,"visible":true},{"id":"may-rs","name":"May","gender":"Female","outfit":"Ruby / Sapphire","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3009,"visible":true},{"id":"may-e","name":"May","gender":"Female","outfit":"Emerald alt","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3010,"visible":true},{"id":"may","name":"May","gender":"Female","outfit":"ORAS","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3011,"visible":true},{"id":"may-contest","name":"May","gender":"Female","outfit":"Contest","ext":"png","group_key":"gen3","group_label":"Gen 3 · Hoenn","games":"Ruby / Sapphire / Emerald","pack_key":null,"sort":3012,"visible":true},{"id":"lucas","name":"Lucas","gender":"Male","outfit":"DP","ext":"png","group_key":"gen4","group_label":"Gen 4 · Sinnoh","games":"Diamond / Pearl / Platinum","pack_key":null,"sort":4001,"visible":true},{"id":"lucas-gen4pt","name":"Lucas","gender":"Male","outfit":"Platinum","ext":"png","group_key":"gen4","group_label":"Gen 4 · Sinnoh","games":"Diamond / Pearl / Platinum","pack_key":null,"sort":4002,"visible":true},{"id":"lucas-contest","name":"Lucas","gender":"Male","outfit":"Super Contest","ext":"png","group_key":"gen4","group_label":"Gen 4 · Sinnoh","games":"Diamond / Pearl / Platinum","pack_key":null,"sort":4003,"visible":true},{"id":"dawn","name":"Dawn","gender":"Female","outfit":"DP","ext":"png","group_key":"gen4","group_label":"Gen 4 · Sinnoh","games":"Diamond / Pearl / Platinum","pack_key":null,"sort":4004,"visible":true},{"id":"dawn-gen4pt","name":"Dawn","gender":"Female","outfit":"Platinum","ext":"png","group_key":"gen4","group_label":"Gen 4 · Sinnoh","games":"Diamond / Pearl / Platinum","pack_key":null,"sort":4005,"visible":true},{"id":"dawn-contest","name":"Dawn","gender":"Female","outfit":"Super Contest","ext":"png","group_key":"gen4","group_label":"Gen 4 · Sinnoh","games":"Diamond / Pearl / Platinum","pack_key":null,"sort":4006,"visible":true},{"id":"hilbert","name":"Hilbert","gender":"Male","outfit":"Black / White","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5001,"visible":true},{"id":"hilbert-wonderlauncher","name":"Hilbert","gender":"Male","outfit":"Wonder Launcher","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5002,"visible":true},{"id":"hilda","name":"Hilda","gender":"Female","outfit":"Black / White","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5003,"visible":true},{"id":"hilda-wonderlauncher","name":"Hilda","gender":"Female","outfit":"Wonder Launcher","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5004,"visible":true},{"id":"nate","name":"Nate","gender":"Male","outfit":"Black 2 / White 2","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5005,"visible":true},{"id":"rosa","name":"Rosa","gender":"Female","outfit":"Black 2 / White 2","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5006,"visible":true},{"id":"rosa-wonderlauncher","name":"Rosa","gender":"Female","outfit":"Wonder Launcher","ext":"png","group_key":"gen5","group_label":"Gen 5 · Unova","games":"Black / White / B2W2","pack_key":null,"sort":5007,"visible":true},{"id":"calem","name":"Calem","gender":"Male","outfit":"X / Y","ext":"png","group_key":"gen6","group_label":"Gen 6 · Kalos","games":"X / Y","pack_key":null,"sort":6001,"visible":true},{"id":"serena","name":"Serena","gender":"Female","outfit":"X / Y","ext":"png","group_key":"gen6","group_label":"Gen 6 · Kalos","games":"X / Y","pack_key":null,"sort":6002,"visible":true},{"id":"serena-anime","name":"Serena","gender":"Female","outfit":"Anime","ext":"png","group_key":"gen6","group_label":"Gen 6 · Kalos","games":"X / Y","pack_key":null,"sort":6003,"visible":true},{"id":"elio","name":"Elio","gender":"Male","outfit":"Sun / Moon","ext":"png","group_key":"gen7","group_label":"Gen 7 · Alola","games":"Sun / Moon / Ultra","pack_key":null,"sort":7001,"visible":true},{"id":"elio-usum","name":"Elio","gender":"Male","outfit":"Ultra","ext":"png","group_key":"gen7","group_label":"Gen 7 · Alola","games":"Sun / Moon / Ultra","pack_key":null,"sort":7002,"visible":true},{"id":"selene","name":"Selene","gender":"Female","outfit":"Sun / Moon","ext":"png","group_key":"gen7","group_label":"Gen 7 · Alola","games":"Sun / Moon / Ultra","pack_key":null,"sort":7003,"visible":true},{"id":"selene-usum","name":"Selene","gender":"Female","outfit":"Ultra","ext":"png","group_key":"gen7","group_label":"Gen 7 · Alola","games":"Sun / Moon / Ultra","pack_key":null,"sort":7004,"visible":true},{"id":"victor","name":"Victor","gender":"Male","outfit":"Sword / Shield","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8001,"visible":true},{"id":"victor-dojo","name":"Victor","gender":"Male","outfit":"Isle of Armor","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8002,"visible":true},{"id":"victor-tundra","name":"Victor","gender":"Male","outfit":"Crown Tundra","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8003,"visible":true},{"id":"victor-league","name":"Victor","gender":"Male","outfit":"League","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8004,"visible":true},{"id":"gloria","name":"Gloria","gender":"Female","outfit":"Sword / Shield","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8005,"visible":true},{"id":"gloria-dojo","name":"Gloria","gender":"Female","outfit":"Isle of Armor","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8006,"visible":true},{"id":"gloria-tundra","name":"Gloria","gender":"Female","outfit":"Crown Tundra","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8007,"visible":true},{"id":"gloria-league","name":"Gloria","gender":"Female","outfit":"League","ext":"png","group_key":"gen8","group_label":"Gen 8 · Galar","games":"Sword / Shield","pack_key":null,"sort":8008,"visible":true},{"id":"florian-s","name":"Florian","gender":"Male","outfit":"School","ext":"png","group_key":"gen9","group_label":"Gen 9 · Paldea","games":"Scarlet / Violet","pack_key":null,"sort":9001,"visible":true},{"id":"florian-bb","name":"Florian","gender":"Male","outfit":"Blueberry","ext":"png","group_key":"gen9","group_label":"Gen 9 · Paldea","games":"Scarlet / Violet","pack_key":null,"sort":9002,"visible":true},{"id":"florian-festival","name":"Florian","gender":"Male","outfit":"Festival","ext":"png","group_key":"gen9","group_label":"Gen 9 · Paldea","games":"Scarlet / Violet","pack_key":null,"sort":9003,"visible":true},{"id":"juliana-s","name":"Juliana","gender":"Female","outfit":"School","ext":"png","group_key":"gen9","group_label":"Gen 9 · Paldea","games":"Scarlet / Violet","pack_key":null,"sort":9004,"visible":true},{"id":"juliana-bb","name":"Juliana","gender":"Female","outfit":"Blueberry","ext":"png","group_key":"gen9","group_label":"Gen 9 · Paldea","games":"Scarlet / Violet","pack_key":null,"sort":9005,"visible":true},{"id":"juliana-festival","name":"Juliana","gender":"Female","outfit":"Festival","ext":"png","group_key":"gen9","group_label":"Gen 9 · Paldea","games":"Scarlet / Violet","pack_key":null,"sort":9006,"visible":true},{"id":"paxton","name":"Paxton","gender":"Male","outfit":"","ext":"png","group_key":"gen10","group_label":"Legends Z-A","games":"Lumiose City","pack_key":null,"sort":10001,"visible":true},{"id":"harmony","name":"Harmony","gender":"Female","outfit":"","ext":"png","group_key":"gen10","group_label":"Legends Z-A","games":"Lumiose City","pack_key":null,"sort":10002,"visible":true},{"id":"chase","name":"Chase","gender":"Male","outfit":"","ext":"png","group_key":"lgpe","group_label":"Let's Go","games":"Let's Go Pikachu / Eevee","pack_key":null,"sort":11001,"visible":true},{"id":"elaine","name":"Elaine","gender":"Female","outfit":"","ext":"png","group_key":"lgpe","group_label":"Let's Go","games":"Let's Go Pikachu / Eevee","pack_key":null,"sort":11002,"visible":true},{"id":"red-lgpe","name":"Red","gender":"Male","outfit":"Let's Go","ext":"png","group_key":"lgpe","group_label":"Let's Go","games":"Let's Go Pikachu / Eevee","pack_key":null,"sort":11003,"visible":true},{"id":"rei","name":"Rei","gender":"Male","outfit":"","ext":"png","group_key":"pla","group_label":"Legends: Arceus","games":"Hisui","pack_key":null,"sort":12001,"visible":true},{"id":"akari","name":"Akari","gender":"Female","outfit":"","ext":"png","group_key":"pla","group_label":"Legends: Arceus","games":"Hisui","pack_key":null,"sort":12002,"visible":true},{"id":"pokemonranger-gen3","name":"Ranger","gender":"Male","outfit":"","ext":"png","group_key":"ranger-fiore","group_label":"Ranger · Fiore","games":"Pokémon Ranger","pack_key":null,"sort":13001,"visible":true},{"id":"pokemonrangerf-gen3rs","name":"Ranger","gender":"Female","outfit":"","ext":"png","group_key":"ranger-fiore","group_label":"Ranger · Fiore","games":"Pokémon Ranger","pack_key":null,"sort":13002,"visible":true},{"id":"pokemonranger-gen4","name":"Ranger","gender":"Male","outfit":"","ext":"png","group_key":"ranger-almia","group_label":"Ranger · Almia","games":"Shadows of Almia","pack_key":null,"sort":14001,"visible":true},{"id":"pokemonrangerf-gen4","name":"Ranger","gender":"Female","outfit":"","ext":"png","group_key":"ranger-almia","group_label":"Ranger · Almia","games":"Shadows of Almia","pack_key":null,"sort":14002,"visible":true},{"id":"hero-conquest","name":"Hero","gender":"Male","outfit":"","ext":"png","group_key":"conquest","group_label":"Conquest","games":"Pokémon Conquest","pack_key":null,"sort":15001,"visible":true},{"id":"heroine-conquest","name":"Heroine","gender":"Female","outfit":"","ext":"png","group_key":"conquest","group_label":"Conquest","games":"Pokémon Conquest","pack_key":null,"sort":15002,"visible":true},{"id":"player-go","name":"GO Trainer","gender":"","outfit":"","ext":"png","group_key":"go","group_label":"Pokémon GO","games":"Pokémon GO","pack_key":null,"sort":16001,"visible":true},{"id":"ash","name":"Ash","gender":"","outfit":"Kanto","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17001,"visible":true},{"id":"ash-capbackward","name":"Ash","gender":"","outfit":"Cap backward","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17002,"visible":true},{"id":"ash-johto","name":"Ash","gender":"","outfit":"Johto","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17003,"visible":true},{"id":"ash-hoenn","name":"Ash","gender":"","outfit":"Hoenn","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17004,"visible":true},{"id":"ash-sinnoh","name":"Ash","gender":"","outfit":"Sinnoh","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17005,"visible":true},{"id":"ash-unova","name":"Ash","gender":"","outfit":"Unova","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17006,"visible":true},{"id":"ash-kalos","name":"Ash","gender":"","outfit":"Kalos","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17007,"visible":true},{"id":"ash-alola","name":"Ash","gender":"","outfit":"Alola","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17008,"visible":true},{"id":"misty","name":"Misty","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17009,"visible":true},{"id":"misty-gen1","name":"Misty","gender":"","outfit":"Gen 1","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17010,"visible":true},{"id":"misty-lgpe","name":"Misty","gender":"","outfit":"Let's Go","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17011,"visible":true},{"id":"brock","name":"Brock","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17012,"visible":true},{"id":"brock-gen1","name":"Brock","gender":"","outfit":"Gen 1","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17013,"visible":true},{"id":"brock-lgpe","name":"Brock","gender":"","outfit":"Let's Go","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17014,"visible":true},{"id":"oak","name":"Professor Oak","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17015,"visible":true},{"id":"clemont","name":"Clemont","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17016,"visible":true},{"id":"iris","name":"Iris","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17017,"visible":true},{"id":"cynthia-anime","name":"Cynthia","gender":"","outfit":"Anime","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17018,"visible":true},{"id":"yellow","name":"Yellow","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17019,"visible":true},{"id":"liko","name":"Liko","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17020,"visible":true},{"id":"kiawe","name":"Kiawe","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17021,"visible":true},{"id":"lana","name":"Lana","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17022,"visible":true},{"id":"mallow","name":"Mallow","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17023,"visible":true},{"id":"sophocles","name":"Sophocles","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17024,"visible":true},{"id":"giovanni","name":"Giovanni","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17025,"visible":true},{"id":"teamrocket","name":"Team Rocket","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17026,"visible":true},{"id":"jessiejames-gen1","name":"Jessie & James","gender":"","outfit":"Gen 1","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17027,"visible":true},{"id":"nurse","name":"Nurse Joy","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17028,"visible":true},{"id":"officer-gen2","name":"Officer Jenny","gender":"","outfit":"","ext":"png","group_key":"anime","group_label":"Anime","games":"Pokémon the Series","pack_key":null,"sort":17029,"visible":true},{"id":"sonic-sonic","name":"Sonic","gender":"","outfit":"","ext":"png","group_key":"sonic","group_label":"Sonic The Hedgehog Advance Trainer Sprite Pack","games":"Sonic Advance","pack_key":"sonic","sort":18001,"visible":true},{"id":"sonic-tails","name":"Tails","gender":"","outfit":"","ext":"png","group_key":"sonic","group_label":"Sonic The Hedgehog Advance Trainer Sprite Pack","games":"Sonic Advance","pack_key":"sonic","sort":18002,"visible":true},{"id":"sonic-knuckles","name":"Knuckles","gender":"","outfit":"","ext":"png","group_key":"sonic","group_label":"Sonic The Hedgehog Advance Trainer Sprite Pack","games":"Sonic Advance","pack_key":"sonic","sort":18003,"visible":true},{"id":"sonic-amy","name":"Amy","gender":"","outfit":"","ext":"png","group_key":"sonic","group_label":"Sonic The Hedgehog Advance Trainer Sprite Pack","games":"Sonic Advance","pack_key":"sonic","sort":18004,"visible":true},{"id":"sonic-cream","name":"Cream","gender":"","outfit":"","ext":"png","group_key":"sonic","group_label":"Sonic The Hedgehog Advance Trainer Sprite Pack","games":"Sonic Advance","pack_key":"sonic","sort":18005,"visible":true},{"id":"sonic-origins-sonic","name":"Sonic","gender":"","outfit":"","ext":"png","group_key":"sonic-classic","group_label":"Sonic The Hedgehog Classic Trainer Sprite Pack","games":"Sonic Origins","pack_key":"sonic-classic","sort":19001,"visible":true},{"id":"sonic-origins-tails","name":"Tails","gender":"","outfit":"","ext":"png","group_key":"sonic-classic","group_label":"Sonic The Hedgehog Classic Trainer Sprite Pack","games":"Sonic Origins","pack_key":"sonic-classic","sort":19002,"visible":true},{"id":"sonic-origins-knuckles","name":"Knuckles","gender":"","outfit":"","ext":"png","group_key":"sonic-classic","group_label":"Sonic The Hedgehog Classic Trainer Sprite Pack","games":"Sonic Origins","pack_key":"sonic-classic","sort":19003,"visible":true},{"id":"sonic-origins-amy","name":"Amy","gender":"","outfit":"","ext":"png","group_key":"sonic-classic","group_label":"Sonic The Hedgehog Classic Trainer Sprite Pack","games":"Sonic Origins","pack_key":"sonic-classic","sort":19004,"visible":true},{"id":"taichi","name":"Taichi","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20001,"visible":true},{"id":"yamato","name":"Yamato","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20002,"visible":true},{"id":"sora","name":"Sora","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20003,"visible":true},{"id":"hikari","name":"Hikari","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20004,"visible":true},{"id":"takeru","name":"Takeru","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20005,"visible":true},{"id":"joe","name":"Joe","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20006,"visible":true},{"id":"mimi","name":"Mimi","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20007,"visible":true},{"id":"koushiro","name":"Koushiro","gender":"","outfit":"","ext":"png","group_key":"digimon","group_label":"Digimon Adventure Trainer Sprite Pack","games":"Digimon Adventure","pack_key":"digimon","sort":20008,"visible":true}]$looks$::jsonb) as x(
  id text, name text, gender text, outfit text, ext text,
  group_key text, group_label text, games text, pack_key text, sort int, visible boolean
)
on conflict (id) do update set
  name = excluded.name,
  gender = excluded.gender,
  outfit = excluded.outfit,
  ext = excluded.ext,
  group_key = excluded.group_key,
  group_label = excluded.group_label,
  games = excluded.games,
  pack_key = excluded.pack_key,
  sort = excluded.sort,
  visible = excluded.visible;

create or replace function private.trainer_sprite_ok(p_id text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from private.trainer_looks
    where id = coalesce(p_id, '') and visible
  );
$$;

create or replace function private.trainer_look_json(l private.trainer_looks)
returns jsonb
language sql
stable
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', l.id,
    'name', l.name,
    'gender', nullif(l.gender, ''),
    'outfit', nullif(l.outfit, ''),
    'ext', l.ext,
    'pack', l.pack_key
  ));
$$;

create or replace function private.trainer_catalog_json()
returns jsonb
language sql
stable
as $$
  select coalesce((
    select jsonb_agg(row_to_json(g)::jsonb order by g.premium, g.sort, g.label)
    from (
      select
        false as premium,
        min(l.sort) as sort,
        l.group_key as key,
        l.group_label as label,
        l.games,
        jsonb_agg(private.trainer_look_json(l) order by l.sort, l.name) as looks
      from private.trainer_looks l
      where l.visible and l.pack_key is null and l.group_key <> 'library'
      group by l.group_key, l.group_label, l.games
      union all
      select
        true as premium,
        i.sort,
        coalesce(nullif(i.extra->>'pack', ''), i.sku) as key,
        i.name as label,
        coalesce(i.extra->>'games', '') as games,
        coalesce((
          select jsonb_agg(coalesce(private.trainer_look_json(l), jsonb_build_object('id', look_id, 'name', look_id)) order by ord)
          from jsonb_array_elements_text(coalesce(i.extra->'looks', '[]'::jsonb)) with ordinality as looks(look_id, ord)
          left join private.trainer_looks l on l.id = looks.look_id
        ), '[]'::jsonb) as looks
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'avatars' and i.visible and c.visible
    ) g
  ), '[]'::jsonb);
$$;

create or replace function public.play_trainer_catalog()
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $$
  select jsonb_build_object('ok', true, 'groups', private.trainer_catalog_json());
$$;

grant execute on function public.play_trainer_catalog() to anon, authenticated;

create or replace function private.sync_avatar_pack_looks(p_pack text, p_looks jsonb, p_label text, p_games text)
returns void
language plpgsql
as $$
declare
  look_id text;
  ord int := 0;
begin
  if coalesce(p_pack, '') = '' then
    return;
  end if;
  update private.trainer_looks
    set pack_key = null,
        group_key = 'library',
        group_label = 'Sprite library'
    where pack_key = p_pack
      and not (id in (select jsonb_array_elements_text(coalesce(p_looks, '[]'::jsonb))));
  for look_id in select jsonb_array_elements_text(coalesce(p_looks, '[]'::jsonb)) loop
    ord := ord + 1;
    insert into private.trainer_looks (
      id, name, group_key, group_label, games, pack_key, sort, visible
    ) values (
      look_id,
      initcap(replace(look_id, '-', ' ')),
      p_pack,
      coalesce(nullif(p_label, ''), p_pack),
      coalesce(p_games, ''),
      p_pack,
      40000 + ord,
      true
    )
    on conflict (id) do update set
      pack_key = excluded.pack_key,
      group_key = excluded.group_key,
      group_label = excluded.group_label,
      games = case when excluded.games = '' then private.trainer_looks.games else excluded.games end,
      visible = true,
      sort = excluded.sort;
  end loop;
end;
$$;

create or replace function public.admin_store_get()
returns jsonb
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  perform private.require_hub();
  return jsonb_build_object(
    'ok', true,
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'key', c.key, 'name', c.name, 'blurb', c.blurb, 'icon', c.icon,
        'sort', c.sort, 'kind', c.kind, 'visible', c.visible, 'system', c.system, 'extra', c.extra
      ) order by c.sort, c.name)
      from private.store_categories c
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'sku', i.sku, 'categoryId', i.category_id, 'name', i.name, 'blurb', i.blurb,
        'cost', i.cost, 'bits', i.bits, 'grants', i.grants, 'sprite', i.sprite, 'thumb', i.thumb,
        'featured', i.featured, 'sort', i.sort, 'visible', i.visible, 'extra', i.extra
      ) order by i.sort, i.name)
      from private.store_items i
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(jsonb_build_object('filename', a.filename, 'kind', a.kind, 'label', a.label) order by a.label, a.filename)
      from private.store_assets a
    ), '[]'::jsonb),
    'looks', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'name', l.name, 'gender', l.gender, 'outfit', l.outfit, 'ext', l.ext,
        'groupKey', l.group_key, 'groupLabel', l.group_label, 'games', l.games,
        'pack', l.pack_key, 'sort', l.sort, 'visible', l.visible
      ) order by l.sort, l.name)
      from private.trainer_looks l
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_store_save_item(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_sku text;
  v_extra jsonb;
  v_pack text;
  v_kind text;
begin
  perform private.require_staff_edit();
  v_sku := btrim(coalesce(p_row->>'sku', ''));
  if v_sku = '' then
    raise exception 'Give this item a SKU.';
  end if;
  v_extra := coalesce(p_row->'extra', '{}'::jsonb);
  select c.kind into v_kind
  from private.store_categories c
  where c.id = (p_row->>'categoryId')::uuid;
  if v_kind = 'avatars' then
    v_pack := nullif(btrim(coalesce(v_extra->>'pack', '')), '');
    if v_pack is null then
      v_pack := trim(both '-' from regexp_replace(lower(v_sku), '^avatar-', ''));
      if v_pack = '' then v_pack := v_sku; end if;
      v_extra := v_extra || jsonb_build_object('pack', v_pack);
    end if;
    if v_extra->'looks' is null or jsonb_typeof(v_extra->'looks') <> 'array' then
      v_extra := v_extra || jsonb_build_object('looks', '[]'::jsonb);
    end if;
  end if;
  insert into private.store_items (
    sku, category_id, name, blurb, cost, bits, grants, sprite, thumb, featured, sort, visible, extra
  ) values (
    v_sku,
    (p_row->>'categoryId')::uuid,
    coalesce(nullif(p_row->>'name', ''), v_sku),
    coalesce(p_row->>'blurb', ''),
    coalesce((p_row->>'cost')::int, 0),
    coalesce((p_row->>'bits')::int, 0),
    coalesce(p_row->'grants', '{}'::jsonb),
    coalesce(p_row->>'sprite', ''),
    coalesce(p_row->>'thumb', ''),
    coalesce((p_row->>'featured')::boolean, false),
    coalesce((p_row->>'sort')::int, 100),
    coalesce((p_row->>'visible')::boolean, true),
    v_extra
  )
  on conflict (sku) do update set
    category_id = excluded.category_id,
    name = excluded.name,
    blurb = excluded.blurb,
    cost = excluded.cost,
    bits = excluded.bits,
    grants = excluded.grants,
    sprite = excluded.sprite,
    thumb = excluded.thumb,
    featured = excluded.featured,
    sort = excluded.sort,
    visible = excluded.visible,
    extra = excluded.extra;
  if v_kind = 'avatars' then
    perform private.sync_avatar_pack_looks(
      v_extra->>'pack',
      v_extra->'looks',
      coalesce(nullif(p_row->>'name', ''), v_sku),
      coalesce(v_extra->>'games', '')
    );
  end if;
  return public.admin_store_get() || jsonb_build_object('message', 'Item saved.', 'sku', v_sku);
end;
$$;

create or replace function public.admin_store_save_look(p_row jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_id text;
begin
  perform private.require_staff_edit();
  v_id := lower(regexp_replace(btrim(coalesce(p_row->>'id', p_row->>'filename', '')), '[^a-z0-9._-]+', '-', 'g'));
  v_id := trim(both '-' from regexp_replace(v_id, '\.[a-z0-9]+$', ''));
  if v_id = '' then
    raise exception 'Give this look an id.';
  end if;
  insert into private.trainer_looks (
    id, name, gender, outfit, ext, group_key, group_label, games, pack_key, sort, visible
  ) values (
    v_id,
    coalesce(nullif(p_row->>'name', ''), initcap(replace(v_id, '-', ' '))),
    coalesce(p_row->>'gender', ''),
    coalesce(p_row->>'outfit', ''),
    coalesce(nullif(p_row->>'ext', ''), 'png'),
    coalesce(nullif(p_row->>'groupKey', ''), coalesce(nullif(p_row->>'pack', ''), 'custom')),
    coalesce(nullif(p_row->>'groupLabel', ''), coalesce(nullif(p_row->>'pack', ''), 'Custom')),
    coalesce(p_row->>'games', ''),
    nullif(p_row->>'pack', ''),
    coalesce((p_row->>'sort')::int, 50000),
    coalesce((p_row->>'visible')::boolean, true)
  )
  on conflict (id) do update set
    name = excluded.name,
    gender = excluded.gender,
    outfit = excluded.outfit,
    ext = excluded.ext,
    group_key = excluded.group_key,
    group_label = excluded.group_label,
    games = excluded.games,
    pack_key = excluded.pack_key,
    visible = excluded.visible;
  return public.admin_store_get() || jsonb_build_object('message', 'Look saved.', 'id', v_id);
end;
$$;

grant execute on function public.admin_store_save_look(jsonb) to authenticated;

create or replace function private.premium_sprite_pack(p_sprite text)
returns text
language sql
stable
as $$
  select coalesce(
    (
      select l.pack_key
      from private.trainer_looks l
      where l.id = p_sprite
      limit 1
    ),
    (
      select i.extra->>'pack'
      from private.store_items i
      join private.store_categories c on c.id = i.category_id
      where c.kind = 'avatars'
        and exists (
          select 1 from jsonb_array_elements_text(coalesce(i.extra->'looks', '[]'::jsonb)) look
          where look = p_sprite
        )
      limit 1
    )
  );
$$;
