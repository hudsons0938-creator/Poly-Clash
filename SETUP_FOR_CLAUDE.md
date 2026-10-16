# Instructions for the Claude helping deploy PolyClash Arena
Owner's in-game username: **Landon2**. Do NOT ask for or store his password anywhere; he types it himself in the game.

1. Create a GitHub repo (public, free). Prefer a short memorable name. Try in order and use the first available: `polyclash`, `polyclasharena`, `polyclash3d`. Shortest possible URL: repo named `<github-username>.github.io` (site then lives at https://<github-username>.github.io). Upload this whole folder keeping `css/`, `js/`, `database/`.
2. GitHub Settings > Pages > Deploy from branch > main > /(root). Report the final URL to Landon.
3. Create a free Supabase project. SQL Editor: run `database/supabase.sql`. Authentication > Providers > Email: turn OFF "Confirm email".
4. Put the Supabase Project URL and anon/publishable key in `js/config.js`. NEVER the service-role key. Commit.
5. Before sharing the link: open the site and create the account **Landon2** (Landon picks a new private password). The SQL trigger makes it Mega Admin. Verify the ADMIN button appears.
6. Later updates: edit files in the SAME repo; do not rename/recreate the repo (URL stays the same, player data lives in Supabase and is untouched).
