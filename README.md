# PolyClash Arena 3D
Keyboard-first 3D arena fighter. 400 fighters, 60 weapons (10 secret), 6 bags, grind bots (10 levels), leaderboard, admin panel, online parties.

## Run it
Upload this whole folder to a GitHub repo (keep the `css/`, `js/`, `database/` folders), then Settings > Pages > main > /(root).
Works immediately in **local mode** (accounts saved in that browser only).

## Cross-device accounts + online play (free Supabase plan)
1. Create a free project at supabase.com. 2. SQL Editor: run `database/supabase.sql`.
3. Authentication > Providers > Email: turn OFF "Confirm email". (Players never type an email; the game uses username@polyclash-players.com internally.)
4. Paste Project URL + anon/publishable key into `js/config.js` (never a service-role key).
5. In the game, create the account **Landon2** FIRST (before sharing the link) with a NEW password you keep private. The SQL trigger makes that username Mega Admin automatically; no password or secret is stored in any file.

## Controls
WASD move, mouse (click to lock) or arrow keys turn camera, Shift run, Space jump, J/click hit (4-hit combo), 1-4 skills, Q dash, F block, R ultimate (charges as you fight).

## Admin
Mega admin: pick any player, give coins, unlock all, make/remove admins and choose which powers each admin gets. Admins only manage themselves with the powers you grant. Mega admin = username set in `js/config.js` (local mode) or the `landon2` rule in the SQL trigger (online mode). Mega admin automatically owns every fighter, weapon and skin, and has a LIVE UPDATES panel (announcement, coin/bag/bot multipliers) that changes the game for everyone without touching code.

## Updating the game later
Edit files in the SAME repo (pencil icon > Commit). The site redeploys at the same URL and player progress is untouched (it lives in Supabase). Never rename or delete the repo.

## Honest limits
Clients are trusted (a determined player can cheat). Move combat/rewards into Supabase Edge Functions before a serious public launch.
