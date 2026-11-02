# FC26 tournament tracker

Single-file app (`index.html`, vanilla JS) for a two-player FC26 league: matchdays, results, transfers, team pages and stats.
It was built as a claude.ai Artifact and uses its shared database (`claude.use('db')`), so it only works inside that runtime.

## Rules encoded
- 10 active teams per player, squad star budget 40
- 6 slots per matchday, optional joker replacing a starter (max 1 per player per matchday, warning only)
- Max 2 transfers per player per window; a team needs 2 games before it can be sold
- A team that has played 5 games must be sold and cannot play again
- A team that missed the last 2 matchdays must play in the next
- Matchday winner: most game wins, then goal difference

## Data
`seed.json` maps document paths to contents (`config/main`, `teams/<slug>`, `matches/mdNN-sK`, `transfers/...`) as loaded from the original spreadsheet.

## Credits
Club crests come from open logo collections (luukhopman/football-logos, FCLOGO). Crests belong to their clubs.
