# Strong Hold Offering (SHO) — Product & Technical Specification

**Status:** Draft v2
**Audience:** Engineering team, investors/partners, token creators & communities considering SHO
**Chain target:** Robinhood Chain (Arbitrum Orbit, chain ID 4663, EVM-equivalent) — integrates with the Pons.family launchpad (bonding-curve tokens that graduate to Uniswap V4)

**Terms used throughout this doc:**
- **Robinhood Chain** — Robinhood's own Arbitrum Orbit L2 (EVM-equivalent, 100ms blocks, settles to Ethereum).
- **Pons.family** — the dominant token launchpad on Robinhood Chain. Anyone can launch a token with no code; it trades on a bonding curve (price rises algorithmically with buys) until it hits a liquidity threshold, at which point it **"graduates"** — its liquidity migrates to a standard Uniswap V4 pool and it trades like any other AMM-listed token from then on.
- **TWAP** — time-weighted average price, used here to smooth out short-term price spikes when checking if a market-cap milestone has genuinely been crossed.
- **Gnosis Safe ("Safe")** — the standard multi-signature wallet contract used to require multiple approvers before an on-chain action executes; referenced here as the keeper's signing mechanism.

---

## 1. Overview & Problem Statement

Meme token creators and large holders on launchpads like Pons.family face a binary choice today: **burn** their tokens (permanently destroy value, no upside for anyone) or **lock** them (freeze value, no upside either — just a promise not to dump). Neither option does anything to grow or stabilize the token; they're purely defensive signals.

**Strong Hold Offering (SHO) turns that locked supply into a growth incentive instead of a dead commitment.**

Instead of burning or locking unconditionally, a creator or holder deposits tokens into an SHO campaign, which acts as a reward pool for the token's most active traders. The pool only pays out as the token's market cap climbs past pre-defined milestones — and if the token never gets there, the tokens stay locked forever, exactly as if they'd been burned. There is no downside relative to burning; there is only optional upside for the ecosystem.

This reframes "supply commitment" from a one-time, static act into an ongoing growth challenge: *"if this token proves it has real trading activity and reaches $X mcap, its most active traders get rewarded."*

**Who can create a campaign:** the token deployer ("dev"), or any large individual holder — anyone who wants to commit their bag toward growing the token instead of burning or passively locking it.

**Who benefits:**
- **Traders** — earn a share of the pool, weighted by their net-buy volume, if they rank in the campaign's leaderboard when a milestone is confirmed.
- **The token** — gains sustained trading activity and a public, verifiable growth narrative ("9.95M tokens locked, first unlock at $250K mcap"); if the campaign fails, the outcome is identical to a burn.
- **The creator/holder** — has zero additional downside versus burning (locked tokens they'd have burned anyway), with optional upside if the token performs.

---

## 2. Mechanism / How It Works

### 2.1 Creating a campaign

A creator locks a chosen amount of tokens into a new SHO campaign and configures:

| Parameter | Options |
|---|---|
| **Reward denomination** | The campaign token itself, ETH, or an allowlisted stablecoin (MVP: USDC only — see §5) |
| **Leaderboard window** | 24H, 7D, or 30D — a *rolling* lookback used to rank trader activity at any point in time |
| **Leaderboard size** | Top 50, Top 100, or Top 500 traders |
| **Campaign duration** | 7D, 30D, or 90D — the overall deadline by which milestones must be hit |
| **Milestones** | One or more of exactly four preset mcap thresholds — 100K / 250K / 1M / 5M — each assigned a % of the total pool (must sum to 100%) |

**Leaderboard window vs. campaign duration — these are two different clocks.** The window is how far back the keeper looks when ranking traders *at the moment a milestone fires* (e.g., "who bought the most, net, in the last 7 days"). The duration is the overall lifespan of the campaign — how long the token has to hit its milestones at all before the unreached portion locks forever. A campaign can run 90 days while still ranking traders on a 7-day rolling window each time a milestone triggers within it (see the worked example in §5).

**Milestone thresholds are a fixed enum, not free-form input** — both the contract and the creation UI only accept the four presets above. This keeps campaigns comparable across tokens and avoids validating arbitrary creator-supplied numbers.

**Circulating supply**, for mcap purposes, is read as the token's total supply as reported on-chain, with no netting-out of SHO-locked tokens, vesting, or other locks. This is the simpler of two options; it means mcap is somewhat overstated relative to true freely-tradable supply, which creators should account for when picking a milestone.

A **0.5% protocol fee** is deducted from the locked pool at creation time and sent to the protocol treasury. The remainder is escrowed in the campaign contract for the life of the campaign. This treasury also funds the keeper's gas costs for posting leaderboard roots (§3.2) — creators and traders never pay keeper gas directly.

A token can have **multiple concurrent SHO campaigns** running from different creators/holders — each is an independent escrow with its own leaderboard and milestones, computed independently by the keeper. This is intentional: campaigns don't share state, so the same trader can legitimately earn from more than one campaign on the same token at once, and two campaigns can target the same milestone value without conflict.

### 2.2 Tracking trader activity

Throughout the campaign, an off-chain keeper service indexes every trade against the token — from the **Pons.family bonding curve** while the token is pre-graduation, and from its **Uniswap V4 pool** after graduation — and computes each wallet's **net-buy volume**: total USD-equivalent bought minus total USD-equivalent sold, each leg valued at that trade's own execution price, within the campaign's configured leaderboard window. Wallets with net-negative volume (net sellers over the window) are **excluded entirely from the leaderboard** — they are not ranked, not just floored to zero.

Net-buy volume is used specifically so that a single wallet's round-trip wash trading contributes nothing to its ranking. This does **not** fully close the wash-trading problem — a wallet could still route the sell side of a wash trade through a *different* address it controls, keeping the buy-side wallet's net-buy volume intact. Combined with the absence of a per-wallet cap (§5), this is a known, accepted MVP limitation — see §6.

### 2.3 Milestones and payout

The token's **circulating market cap** (price × circulating supply) is tracked via a **30-minute TWAP**, combining bonding-curve and Uniswap V4 price data, to prevent a single flash pump from falsely triggering a milestone.

When a milestone's mcap threshold is confirmed crossed (sustained for the full 30-minute TWAP window):
1. That milestone is marked **reached, permanently** — this is a one-way flag. If mcap later dips back below the threshold, the milestone stays reached; there is no un-reaching it.
2. The keeper freezes a leaderboard snapshot (net-buy volume per wallet, over the trailing window, as of that moment) and computes each eligible trader's proportional share of that tier's reward.
3. The keeper publishes a **provisional** Merkle root on-chain via `postMilestoneRoot()`, alongside the full underlying snapshot data (published off-chain, e.g. to IPFS, with the hash referenced on-chain) so anyone can independently recompute and verify it.
4. A **24-hour challenge window** follows. During this window `claim()` is not yet open. If an error is found (e.g. an indexer bug), the keeper can overwrite the root with a corrected one via another `postMilestoneRoot()` call — each overwrite restarts the 24-hour window.
5. Once the window elapses without a correction, the root **finalizes** and can no longer be changed. `claim()` opens, and eligible traders claim their share using a Merkle proof against the finalized root.

This challenge window is a **procedural, not cryptographic** safeguard — a Merkle proof only proves a claim was included in the posted root, it says nothing about whether the root itself was computed correctly from real trade data. The published snapshot data is what lets anyone (not just the keeper) catch a bad root before it finalizes; see §6 for the residual trust this still places in the keeper.

Milestones unlock **independently and cumulatively** — reaching 250K doesn't require 100K's reward to have been claimed first, but each tier's payout is only computed and claimable once that tier's threshold is actually crossed and its challenge window has elapsed.

### 2.4 Campaign failure

If the campaign's duration expires **before** a given milestone is reached, that milestone's portion of the pool is **never unlocked** and remains permanently locked in the contract — unclaimable by anyone, including the creator. In effect, an unreached milestone behaves exactly like a burn. There is no reclaim/refund path in this version of the spec (see §6 for the trade-offs of that choice).

---

## 3. Technical Architecture

```
                     ┌─────────────────────────┐
   creator ─lock────▶│      SHOFactory.sol       │──deploys (EIP-1167 clone)──▶  SHOCampaign.sol (per campaign)
                     └─────────────────────────┘                                        │
                                                                                          │ escrow + claim logic
                                                                                          ▼
                                                                                   trader.claim(proof)
                                                                                          ▲
                                                                          postMilestoneRoot(root)
                                                                                          │
                                                            ┌─────────────────────────────┴───────────────┐
                                                            │              Keeper Service (off-chain)        │
                                                            │  ┌───────────────┐  ┌───────────────────────┐  │
                                                            │  │ Chain Indexer │  │ Price/TWAP Oracle       │  │
                                                            │  │ (Pons bonding │  │ (bonding curve +        │  │
                                                            │  │ curve + Uni V4│  │ Uniswap V4, 30-min TWAP)│  │
                                                            │  └──────┬────────┘  └───────────┬─────────────┘  │
                                                            │         ▼                        ▼               │
                                                            │  ┌────────────────────────────────────────────┐ │
                                                            │  │ Leaderboard & Milestone Engine               │ │
                                                            │  │ (net-buy volume, snapshot, Merkle tree build)│ │
                                                            │  └───────────────────┬────────────────────────┘ │
                                                            │                       ▼                          │
                                                            │              multi-sig signer(s)                 │
                                                            └───────────────────────────────────────────────┘
```

### 3.1 On-chain components

- **`SHOFactory.sol`** — creates new campaigns as gas-efficient EIP-1167 minimal proxy clones of a `SHOCampaign` implementation contract; maintains a registry of all campaigns (by token, by creator).
- **`SHOCampaign.sol`** — per-campaign escrow. Holds locked tokens, stores milestone configuration and state, accepts Merkle roots from the authorized keeper multi-sig, and exposes `claim()` for traders.

### 3.2 Off-chain keeper service

- **Chain Indexer** — subscribes to swap/transfer events from the token's Pons bonding curve contract and, post-graduation, its Uniswap V4 pool.
- **Volume Aggregator** — computes rolling net-buy volume per wallet for each campaign's configured window.
- **Price/TWAP Oracle module** — computes the 30-minute circulating-mcap TWAP used for milestone detection.
- **Leaderboard & Milestone Engine** — detects milestone crossings, freezes leaderboard snapshots, builds the Merkle tree of reward allocations, and publishes the full snapshot (wallet → net-buy volume → allocated reward) to public off-chain storage (e.g. IPFS) so it can be independently recomputed and checked during the challenge window.
- **On-chain poster** — a multi-sig (target: 3-of-5 Gnosis Safe) submits `postMilestoneRoot()` transactions, funded from the protocol treasury (the 0.5% campaign creation fee). This multi-sig is the MVP's single trusted component — the 24-hour challenge window (§2.3) lets anyone catch and force correction of a bad root before it finalizes, but does not remove the underlying trust requirement (see §6).

### 3.3 Frontend dApp

- **Create Campaign** — wizard for lock amount, denomination, window, leaderboard size, duration, and milestone tiers.
- **Discover** — browse active/past SHO campaigns across tokens.
- **Campaign detail** — live leaderboard, milestone progress bar (current mcap vs. thresholds), pool status.
- **Claim** — wallet connect, shows claimable amount per milestone with live Merkle proof generation, submits `claim()`.

---

## 4. Data Model & Contract Interfaces

### 4.1 Campaign struct (illustrative)

```solidity
enum MilestoneTier { M100K, M250K, M1M, M5M }   // the only four allowed thresholds

struct Milestone {
    MilestoneTier tier;
    uint16  rewardBps;        // share of total pool allocated to this tier, in basis points
    bool    reached;          // one-way: true forever once TWAP confirms the cross
    bytes32 merkleRoot;       // provisional until challengeWindowEnds, then final
    bytes32 snapshotHash;     // hash of the published off-chain snapshot data, for verification
    uint256 reachedAt;        // timestamp the milestone was confirmed reached
    uint256 challengeWindowEnds; // reachedAt (or last root correction) + 24h
    uint256 totalClaimed;
}

struct Campaign {
    uint256 id;
    address token;             // the campaigning token
    address creator;
    address rewardToken;       // token itself, address(0) for ETH, or an allowlisted stablecoin (§5)
    uint256 totalLocked;       // net of the 0.5% protocol fee
    LeaderboardWindow window;  // 24H | 7D | 30D
    uint16  leaderboardSize;   // 50 | 100 | 500
    uint256 duration;          // 7D | 30D | 90D, from createdAt
    uint256 createdAt;
    Milestone[] milestones;    // rewardBps across all milestones must sum to exactly 10,000 (100%); enforced in createCampaign
    CampaignStatus status;     // Active | Completed | Expired
}
```

### 4.2 Key functions

| Function | Caller | Purpose |
|---|---|---|
| `createCampaign(token, rewardToken, amount, window, leaderboardSize, duration, milestones[])` | Creator | Deploys/initializes a campaign, transfers `amount`, deducts 0.5% fee. Reverts unless `rewardToken` is `address(0)`, the campaign token, or an allowlisted stablecoin, and unless `milestones[].rewardBps` sums to exactly 10,000. |
| `postMilestoneRoot(campaignId, milestoneIndex, merkleRoot, snapshotHash)` | Keeper multi-sig only | Posts (or, within the still-open challenge window, overwrites) the leaderboard snapshot for a reached milestone; resets `challengeWindowEnds` to `now + 24h` on every call. Reverts if called after the window has already elapsed. |
| `claim(campaignId, milestoneIndex, amount, proof[])` | Any trader | Reverts if `block.timestamp < challengeWindowEnds`. Otherwise verifies proof against the finalized root, transfers reward, marks leaf claimed. |

There is intentionally **no `withdraw`/`sweep` function** for unreached milestones or expired campaigns in this version — see §2.4 and §6.

### 4.3 Events

`CampaignCreated`, `MilestoneReached`, `RootPosted`, `RootCorrected`, `RewardClaimed`, `CampaignExpired`

### 4.4 Off-chain leaderboard leaf format

Each Merkle leaf encodes: `(campaignId, milestoneIndex, trader address, netBuyVolumeUSD, allocatedRewardAmount)`. `netBuyVolumeUSD` is the USD-equivalent net-buy figure described in §2.2, valued leg-by-leg at each trade's execution price; wallets with a negative value are omitted from the tree entirely.

---

## 5. Economics & Parameters

| Parameter | Value(s) |
|---|---|
| Leaderboard window | 24H / 7D / 30D |
| Leaderboard size | Top 50 / Top 100 / Top 500 |
| Campaign duration | 7D / 30D / 90D |
| Milestone tiers | One or more of exactly 100K / 250K / 1M / 5M circulating mcap (fixed enum, not free-form), creator-assigned % split summing to 100% |
| Reward denomination | Campaign token, ETH, or USDC (MVP stablecoin allowlist — extending the allowlist is a governance action, not a per-campaign creator choice) |
| Ranking weighting | Net-buy volume (USD-equivalent, priced at each trade's execution price) within window; net sellers excluded from the leaderboard entirely |
| Per-wallet cap | None — a single wallet can win an unbounded share of a tier (see §6) |
| Protocol fee | 0.5% of locked pool, taken at campaign creation; also funds keeper gas costs |
| Mcap definition | Circulating market cap = price × total token supply as reported on-chain (no netting-out of locked/vesting supply), 30-minute TWAP |
| Root challenge window | 24 hours between a milestone's root being posted and `claim()` opening for it |

### Worked example

A creator locks 10,000,000 tokens. 0.5% (50,000) goes to the protocol treasury; 9,950,000 are escrowed. They configure two milestones: 250K mcap → 40% of pool, 1M mcap → 60% of pool, leaderboard = Top 100 traders by 7D net-buy volume, duration = 30D.

If the token's 30-min TWAP mcap crosses 250K on day 6, the keeper snapshots the top 100 wallets by trailing-7D net-buy volume (in USD-equivalent, net sellers excluded) and posts a provisional root allocating 3,980,000 tokens across them, proportional to volume. Barring a correction, that root finalizes 24 hours later and those wallets can claim. If the token's mcap never sustains 1M before day 30, the remaining 5,970,000 tokens stay locked in the contract permanently — even though this same token could simultaneously have a second, independent SHO campaign from a different holder targeting different milestones.

---

## 6. Risks & Mitigations

| Risk | Description | Mitigation (MVP) | Future work |
|---|---|---|---|
| **Wash trading / whale dominance** | Net-buy volume weighting defeats simple round-trip wash trading on one wallet, but does **not** catch a wallet splitting the trade across two addresses it controls (buy on wallet A, sell on wallet B) — and since there is **no per-wallet cap**, a single well-funded actor can still legitimately dominate a leaderboard. This is an accepted MVP trade-off, not an oversight. | None beyond net-buy weighting — documented as a known limitation | Optional creator-toggleable soft cap per wallet; wallet-clustering heuristics for multi-address sybil detection |
| **Keeper/oracle centralization** | Leaderboard computation and mcap milestone confirmation depend on a trusted multi-sig, not a fully trustless on-chain process. A Merkle proof only proves a claim was included in the posted root — it proves nothing about whether the root was computed correctly from real trade data in the first place. | 3-of-5 Gnosis Safe; full snapshot data published off-chain and hash-referenced on-chain; 24-hour challenge window before any root finalizes, during which the keeper can be caught and forced to re-post a corrected root (§2.3, §4.2) | Migrate to a permissionless dispute model where anyone (not just the keeper itself) can post a bonded challenge against a bad root, not just the keeper self-correcting |
| **TWAP manipulation around milestones** | A malicious actor could attempt a flash pump right at a milestone boundary. | 30-minute TWAP smooths short-term price spikes; once a milestone is confirmed reached it cannot be un-reached by a later price drop (§2.3) | Extend TWAP window or require sustained mcap over multiple checkpoints before confirming a milestone |
| **Cross-venue volume double-counting** | Migration from Pons bonding curve to Uniswap V4 could double-count volume if not handled carefully during the graduation transition. | Indexer treats bonding-curve and Uniswap V4 as distinct venues with a clean cutover at the graduation block | Formal reconciliation tooling / audit of indexer output |
| **Reward token price risk** | If a campaign pays rewards in the project's own token, a price crash reduces real payout value despite nominal allocation being correct. | Creator can choose USDC/ETH denomination instead | N/A — creator's choice |
| **No refund path for creators** | Because unreached milestones lock permanently with no reclaim, a creator who sets an unrealistic milestone loses that portion of their bag entirely. | This mirrors burn behavior by design — it's meant to keep the commitment credible | Could reconsider for v2 if user feedback shows this is a major adoption blocker |
| **Regulatory framing** | Rewards distributed based on ranking + a speculative price threshold resemble a game-of-chance / prediction mechanism in some jurisdictions. | Unmitigated in this spec — explicitly flagged, not solved | Legal review required before broader launch; may constrain which jurisdictions/venues can offer SHO |
| **Smart contract risk** | Escrowed funds and Merkle-based claims are a direct attack target. | Standard patterns (OpenZeppelin Merkle libs, minimal proxy clones), thorough test coverage | Third-party audit required before mainnet launch with real funds |

---

## 7. Roadmap

**Phase 1 — MVP**
- `SHOFactory.sol` / `SHOCampaign.sol` with the mechanism as specified above
- Trusted 3-of-5 Gnosis Safe keeper, single indexer implementation, published snapshot data + 24h self-correction challenge window (keeper-only correction — not yet permissionless)
- Frontend: create campaign, discover, campaign detail, claim
- Reward denominations: campaign token, ETH, USDC
- No per-wallet cap, no multi-wallet sybil detection beyond net-buy-volume weighting

**Phase 2 — Hardening & decentralization**
- Migrate from keeper-only root correction to a **permissionless** dispute model — anyone can post a bonded challenge against a bad root, not just the keeper self-correcting
- Multiple independent indexers cross-checking leaderboard computation, rather than one keeper's pipeline
- Optional creator-configurable soft cap per wallet; wallet-clustering heuristics for multi-address wash trading
- Expand the reward-token stablecoin allowlist beyond USDC
- Third-party smart contract audit
- Legal/regulatory review

**Phase 3 — Expansion**
- Support additional DEX venues and chains beyond Pons.family/Uniswap V4/Robinhood Chain
- Protocol fee / treasury governance (potentially DAO-controlled)

---

## 8. Open Questions / Out of Scope

- Should there be a claim deadline after a milestone's challenge window ends, and what happens to rewards nobody claims (revert to creator? stay locked forever, like an unreached milestone)?
- Who governs the stablecoin allowlist (currently USDC-only) and the process for adding to it?
- Exact UI/UX flows for campaign creation and claiming — covered in a separate design doc, not here.
- Smart contract audit vendor and budget — not yet determined.
- Legal/regulatory classification of the reward mechanism — not yet reviewed.
- Whether the protocol fee (0.5%) should be adjustable per-campaign or governance-controlled over time.
- Multi-wallet (sybil) wash trading is explicitly unmitigated in the MVP (§6) — what threshold of abuse would justify prioritizing Phase 2's clustering heuristics sooner?
