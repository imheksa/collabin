# Strong Hold Offering (SHO) — Product & Technical Specification

**Status:** Draft v1
**Audience:** Engineering team, investors/partners, token creators & communities considering SHO
**Chain target:** Robinhood Chain (Arbitrum Orbit, chain ID 4663, EVM-equivalent) — integrates with the Pons.family launchpad (bonding-curve tokens that graduate to Uniswap V4)

---

## 1. Overview & Problem Statement

Meme token creators and large holders on launchpads like Pons.family face a binary choice today: **burn** their tokens (permanently destroy value, no upside for anyone) or **lock** them (freeze value, no upside either — just a promise not to dump). Neither option does anything to grow or stabilize the token; they're purely defensive signals.

**Strong Hold Offering (SHO) turns that locked supply into a growth incentive instead of a dead commitment.**

Instead of burning or locking unconditionally, a creator or holder deposits tokens into an SHO campaign, which acts as a reward pool for the token's most active traders. The pool only pays out as the token's market cap climbs past pre-defined milestones — and if the token never gets there, the tokens stay locked forever, exactly as if they'd been burned. There is no downside relative to burning; there is only optional upside for the ecosystem.

This reframes "supply commitment" from a one-time, static act into an ongoing growth challenge: *"if this token proves it has real trading activity and reaches $X mcap, its most active traders get rewarded."*

**Who can create a campaign:** the token deployer ("dev"), or any large individual holder — anyone who wants to commit their bag toward growing the token instead of burning or passively locking it.

**Who benefits:**
- **Traders** get a direct, quantifiable incentive to trade a token actively (weighted by real net-buying, not just noise).
- **The token** gets sustained trading volume, a public growth narrative ("X tokens locked, unlocks at $1M mcap"), and downside protection equivalent to a burn if it fails.
- **The creator/holder** gets a marketing and community-growth mechanism that costs them nothing if the token doesn't perform, and directly rewards the people driving its success if it does.

---

## 2. Mechanism / How It Works

### 2.1 Creating a campaign

A creator locks a chosen amount of tokens into a new SHO campaign and configures:

| Parameter | Options |
|---|---|
| **Reward denomination** | The campaign token itself, a stablecoin, or ETH |
| **Leaderboard window** | 24H, 7D, or 30D (rolling window used to rank trader activity) |
| **Leaderboard size** | Top 50, Top 100, or Top 500 traders |
| **Campaign duration** | 7D, 30D, or 90D (deadline by which milestones must be hit) |
| **Milestones** | Any combination of mcap thresholds — 100K / 250K / 1M / 5M — each assigned a % of the total pool |

A **0.5% protocol fee** is deducted from the locked pool at creation time and sent to the protocol treasury. The remainder is escrowed in the campaign contract for the life of the campaign.

A token can have **multiple concurrent SHO campaigns** running from different creators/holders — each is an independent escrow with its own leaderboard and milestones.

### 2.2 Tracking trader activity

Throughout the campaign, an off-chain keeper service indexes every trade against the token — from the **Pons.family bonding curve** while the token is pre-graduation, and from its **Uniswap V4 pool** after graduation — and computes each wallet's **net-buy volume** (buys minus sells, not gross turnover) within the campaign's configured leaderboard window. Net-buy volume is used specifically so that round-trip wash trading contributes nothing to a wallet's ranking.

### 2.3 Milestones and payout

The token's **circulating market cap** (price × circulating supply) is tracked via a **30-minute TWAP**, combining bonding-curve and Uniswap V4 price data, to prevent a single flash pump from falsely triggering a milestone.

When a milestone's mcap threshold is confirmed crossed:
1. The keeper freezes a leaderboard snapshot (net-buy volume per wallet, over the trailing window, as of that moment).
2. Rewards for that milestone's tier are allocated **proportionally to each wallet's net-buy volume** among the top N traders in that snapshot.
3. The keeper publishes a Merkle root of that allocation on-chain via a multi-sig transaction.
4. Eligible traders can then `claim()` their share of that tier directly from the escrow contract using a Merkle proof.

Milestones unlock **independently and cumulatively** — reaching 250K doesn't require 100K's reward to have been claimed first, but each tier's payout is only computed and claimable once that tier's threshold is actually crossed.

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
- **Leaderboard & Milestone Engine** — detects milestone crossings, freezes leaderboard snapshots, and builds the Merkle tree of reward allocations.
- **On-chain poster** — a multi-sig (target: 3-of-5 Safe) submits `postMilestoneRoot()` transactions. This is the MVP's single trusted component (see §6).

### 3.3 Frontend dApp

- **Create Campaign** — wizard for lock amount, denomination, window, leaderboard size, duration, and milestone tiers.
- **Discover** — browse active/past SHO campaigns across tokens.
- **Campaign detail** — live leaderboard, milestone progress bar (current mcap vs. thresholds), pool status.
- **Claim** — wallet connect, shows claimable amount per milestone with live Merkle proof generation, submits `claim()`.

---

## 4. Data Model & Contract Interfaces

### 4.1 Campaign struct (illustrative)

```solidity
struct Milestone {
    uint256 mcapThreshold;   // circulating mcap threshold, in reward-token decimals
    uint16  rewardBps;       // share of total pool allocated to this tier, in basis points
    bool    reached;
    bytes32 merkleRoot;      // set once keeper posts the leaderboard snapshot
    uint256 totalClaimed;
}

struct Campaign {
    uint256 id;
    address token;            // the campaigning token
    address creator;
    address rewardToken;      // token itself, a stablecoin, or address(0) for ETH
    uint256 totalLocked;      // net of the 0.5% protocol fee
    LeaderboardWindow window; // 24H | 7D | 30D
    uint16  leaderboardSize;  // 50 | 100 | 500
    uint256 duration;         // 7D | 30D | 90D, from createdAt
    uint256 createdAt;
    Milestone[] milestones;
    CampaignStatus status;    // Active | Completed | Expired
}
```

### 4.2 Key functions

| Function | Caller | Purpose |
|---|---|---|
| `createCampaign(token, rewardToken, amount, window, leaderboardSize, duration, milestones[])` | Creator | Deploys/initializes a campaign, transfers `amount`, deducts 0.5% fee |
| `postMilestoneRoot(campaignId, milestoneIndex, merkleRoot)` | Keeper multi-sig only | Publishes the frozen leaderboard snapshot for a reached milestone |
| `claim(campaignId, milestoneIndex, amount, proof[])` | Any trader | Verifies proof against the posted root, transfers reward, marks leaf claimed |

There is intentionally **no `withdraw`/`sweep` function** for unreached milestones or expired campaigns in this version — see §2.4 and §6.

### 4.3 Events

`CampaignCreated`, `MilestoneReached`, `RootPosted`, `RewardClaimed`, `CampaignExpired`

### 4.4 Off-chain leaderboard leaf format

Each Merkle leaf encodes: `(campaignId, milestoneIndex, trader address, netBuyVolume, allocatedRewardAmount)`.

---

## 5. Economics & Parameters

| Parameter | Value(s) |
|---|---|
| Leaderboard window | 24H / 7D / 30D |
| Leaderboard size | Top 50 / Top 100 / Top 500 |
| Campaign duration | 7D / 30D / 90D |
| Milestone tiers | Any subset of 100K / 250K / 1M / 5M circulating mcap, creator-assigned % split (must sum to 100%) |
| Reward denomination | Campaign token, stablecoin, or ETH |
| Ranking weighting | Net-buy volume within window (not gross, not flat top-N) |
| Per-wallet cap | None (see §6) |
| Protocol fee | 0.5% of locked pool, taken at campaign creation |
| Mcap definition | Circulating market cap (price × circulating supply), 30-minute TWAP |

### Worked example

A creator locks 10,000,000 tokens. 0.5% (50,000) goes to the protocol treasury; 9,950,000 are escrowed. They configure two milestones: 250K mcap → 40% of pool, 1M mcap → 60% of pool, leaderboard = Top 100 traders by 7D net-buy volume, duration = 30D.

If the token hits 250K mcap on day 6, the keeper snapshots the top 100 wallets by trailing-7D net-buy volume and posts a root allocating 3,980,000 tokens across them, proportional to volume. If the token never reaches 1M mcap before day 30, the remaining 5,970,000 tokens stay locked in the contract permanently.

---

## 6. Risks & Mitigations

| Risk | Description | Mitigation (MVP) | Future work |
|---|---|---|---|
| **Wash trading / whale dominance** | Net-buy volume weighting removes the incentive for pure round-trip wash trading, but a single well-funded wallet can still legitimately dominate a leaderboard since there is **no per-wallet cap**. This is an accepted MVP trade-off, not an oversight. | None — documented as a known limitation | Optional creator-toggleable soft cap per wallet |
| **Keeper/oracle centralization** | Leaderboard computation and mcap milestone confirmation depend on a trusted multi-sig, not a fully trustless on-chain process. | 3-of-5 multi-sig, on-chain-verifiable inputs (Merkle proofs), transparent indexer logic | Migrate to a decentralized attestation model (multiple independent indexers + optimistic challenge window on posted roots) |
| **TWAP manipulation around milestones** | A malicious actor could attempt a flash pump right at a milestone boundary. | 30-minute TWAP smooths short-term price spikes | Extend TWAP window or require sustained mcap over multiple checkpoints before confirming a milestone |
| **Cross-venue volume double-counting** | Migration from Pons bonding curve to Uniswap V4 could double-count volume if not handled carefully during the graduation transition. | Indexer treats bonding-curve and Uniswap V4 as distinct venues with a clean cutover at the graduation block | Formal reconciliation tooling / audit of indexer output |
| **Reward token price risk** | If a campaign pays rewards in the project's own token, a price crash reduces real payout value despite nominal allocation being correct. | Creator can choose stablecoin/ETH denomination instead | N/A — creator's choice |
| **No refund path for creators** | Because unreached milestones lock permanently with no reclaim, a creator who sets an unrealistic milestone loses that portion of their bag entirely. | This mirrors burn behavior by design — it's meant to keep the commitment credible | Could reconsider for v2 if user feedback shows this is a major adoption blocker |
| **Regulatory framing** | Rewards distributed based on ranking + a speculative price threshold resemble a game-of-chance / prediction mechanism in some jurisdictions. | Out of scope for this spec | Legal review before broader launch |
| **Smart contract risk** | Escrowed funds and Merkle-based claims are a direct attack target. | Standard patterns (OpenZeppelin Merkle libs, minimal proxy clones), thorough test coverage | Third-party audit required before mainnet launch with real funds |

---

## 7. Roadmap

**Phase 1 — MVP**
- `SHOFactory.sol` / `SHOCampaign.sol` with the mechanism as specified above
- Trusted 3-of-5 multi-sig keeper, single indexer implementation
- Frontend: create campaign, discover, campaign detail, claim
- Reward denominations: campaign token, stablecoin, ETH
- No per-wallet cap, no additional anti-sybil layer beyond net-buy-volume weighting

**Phase 2 — Hardening & decentralization**
- Migrate keeper from a single trusted multi-sig toward a decentralized attestation model (multiple independent indexers, optimistic challenge window before a posted root becomes final)
- Optional creator-configurable soft cap per wallet
- Third-party smart contract audit
- Legal/regulatory review

**Phase 3 — Expansion**
- Support additional DEX venues and chains beyond Pons.family/Uniswap V4/Robinhood Chain
- Protocol fee / treasury governance (potentially DAO-controlled)

---

## 8. Open Questions / Out of Scope

- Should there be a claim deadline after a milestone unlocks, and what happens to rewards nobody claims?
- Exact UI/UX flows for campaign creation and claiming — covered in a separate design doc, not here.
- Smart contract audit vendor and budget — not yet determined.
- Legal/regulatory classification of the reward mechanism — not yet reviewed.
- Whether protocol fee (0.5%) should be adjustable per-campaign or governance-controlled over time.

---

*This document was co-authored through a structured consultation. See conversation history for the reasoning behind each design decision.*
