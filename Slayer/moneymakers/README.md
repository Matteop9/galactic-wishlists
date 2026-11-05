# Money makers (OSRS)

Ranks every Worthwhile OSRS wiki money making guide by gp/hr, with a luck (variance) estimate,
an effort score and a human-skill score. Spec and refinements: `MODEL.md`.

## Run

Python 3.11, stdlib + `requests`. From this folder:

```
python run.py                    # one wiki request (cached per day in data/raw/<date>/)
python run.py --details          # + guide wikitext (11 requests) for effort +-1 text rules
python run.py --reprice          # + live GE prices (prices.runescape.wiki), gemw lines only
python run.py --force            # refetch today's cache
python run.py --top 60 --min-profit 2000000 --members-only   # or --f2p-only
```

Outputs: `report.md` (read this), `report.json` (every method, every line), and a dated
snapshot `data/methods_<date>.json` (never overwritten).

## What the numbers mean

| Column | Tag | Meaning |
|---|---|---|
| gp/hr | read | Wiki headline: outputs after GE tax minus inputs, at the guide's default kph and render-time prices. Derived from live prices under `--reprice`. |
| sd/hr | derived | Standard deviation of one hour's loot from the drop model (MODEL.md). |
| cv | derived | sd / gp/hr. The luck number. |
| band | assumed | steady < 0.10 <= some luck < 0.35 <= lucky < 1.0 <= lottery. |
| luck share | derived | Share of output value from items you get less than once an hour. |
| hrs to +-10% | derived | Hours before your realised rate is within 10% of the wiki rate ~95% of the time. |
| effort 1-5 | assumed | Wiki intensity Low 1 / Moderate 3 / High 5 (+-1 from text with `--details`). |
| skill 1-5 | assumed | Human skill, from the keyword table. Not in-game level. |
| risk-adj | assumed | gp/hr - 0.5 x sd. A judgement call; change `risk_penalty_sd`. |

Recurring guides (herb runs, daily claims) are per run and listed separately.

## Where the assumptions live

- `data/config.json`: effort intensity map + category fallback + text keywords, skill defaults,
  variance model and thresholds, luck bands, risk penalty, report sizes, User-Agent, rate limit.
- `data/skill_tiers.json`: boss/activity keyword -> human-skill tier 3/4/5.

## Caveats

The drop model ignores kph variance, deaths and stacked drops averaged into one line. Prices
are frozen at the wiki's last render unless `--reprice`. Requirements and kph assume the guide
author's setup.
