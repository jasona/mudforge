# Research Summary Document (RSD): Modern Browser MUD Game v1

## 1. Project Overview

- **User brief:** Create a modern MUD (Multi-User Dungeon) game playable in a browser, with a hybrid text-core and optional graphical client approach.
- **Project type(s):** Product + Content + Design (all three)
- **Research depth:** Moderate
- **Primary research focus:** Balanced (technical, game design, market, monetization)
- **Key constraint:** Solo developer / small team feasibility

---

## 2. Existing Context & Assets (Internal)

### 2.1 Related Requirements & Docs
- No existing PRDs/CRDs/DRDs found in `/tasks` directory
- This is a greenfield concept exploration

### 2.2 Codebase / System Context
- Not applicable—pure ideation phase
- No existing codebase to extend

---

## 3. User & Business Context

### 3.1 Target Users

**Primary Audiences:**
- **Nostalgic players (30-50+):** Played MUDs in the 90s/2000s, value text-based immersion
- **Accessibility-focused players:** Blind/visually impaired users who rely on screen readers
- **Tabletop RPG enthusiasts:** Value narrative, roleplay, and imagination over graphics
- **Casual browser gamers:** Want drop-in experiences without downloads or installs
- **Writers and roleplayers:** Seeking collaborative storytelling platforms

### 3.2 User Goals & Pain Points

**What Players Want:**
- Deep, immersive worlds that engage imagination
- Strong community and social interaction
- Meaningful progression and achievement
- Low barrier to entry (no install, runs on any device)
- Accessibility for screen reader users

**Current Pain Points with Existing MUDs:**
- Telnet-based clients feel dated and intimidating
- Steep learning curves with complex command systems
- Dying communities on older games
- Poor mobile/touch support
- Inconsistent accessibility features

### 3.3 Success Signals
- Active concurrent players during peak hours
- Player retention beyond first session
- Community engagement (forums, Discord, in-game chat)
- Positive reviews emphasizing community and immersion
- Sustainable revenue (if monetized)

---

## 4. External Research: Best Practices & References

### 4.1 Active Browser-Based MUDs Worth Studying

| Game | Key Strength | Notable Feature |
|------|--------------|-----------------|
| **Written Realms** | Best UI/presentation | Modern websocket-based, mobile-friendly |
| **ArchaicQuest** | Accessibility | Screen reader friendly, browser-based |
| **Procedural Realms** | Hybrid roguelike | Browser-based, no setup needed |
| **Aardwolf** | Large community | Multiple interface panels, rudimentary graphics |
| **Discworld MUD** | Humor/personality | 30+ years running, strong IP |
| **Alter Aeon** | Accessibility | Screen reader support, 600+ quests |

**Key Insight:** The magic formula that keeps MUDs alive is **community and depth**. These games have enormous, intricate worlds crafted over decades, backed by passionate communities.

### 4.2 MUD Engine Frameworks

| Framework | Language | Web Support | Best For |
|-----------|----------|-------------|----------|
| **Evennia** | Python 3.11+ | Built-in HTML5 webclient | Feature-complete, Django integration |
| **Ranvier** | Node.js/TypeScript | WebSocket networking bundle | Modular, modern JS ecosystem |
| **Mudlet** | Lua scripting | Client-side | Enhancing existing MUDs |

#### Evennia (Recommended for Solo Devs)
- Uses Django + Twisted frameworks
- Built-in HTML5 webclient with websocket (ajax/comet fallback)
- Quick start: `pip install evennia && evennia --init mygame && evennia start`
- Browse at `http://localhost:4001` immediately
- Extensible via standard Python/Django patterns

#### Ranvier (Alternative)
- Node.js-based, converted to TypeScript
- Robust bundle system for modularity
- Unopinionated core—build any style of game
- WebSocket networking available as bundle
- Thorough documentation at ranviermud.com

### 4.3 Technical Architecture Patterns

**Real-Time Communication:**
- WebSockets for bidirectional, real-time messaging
- Socket.IO for Node.js (fallback to Flash/long-polling for old browsers)
- Evennia's webclient handles this automatically

**Scalability Patterns:**
- For small-scale MUDs, a single server is typically sufficient
- Redis can synchronize state across multiple WebSocket servers if needed
- Database sharding unlikely necessary unless thousands of concurrent users

**Recommended Stack for Solo Dev:**
```
Option A (Python):
├── Backend: Evennia (Python 3.11+, Django, Twisted)
├── Database: SQLite (dev) → PostgreSQL (prod)
├── Frontend: Built-in webclient or custom React/Vue
└── Hosting: Single VPS ($5-20/month)

Option B (JavaScript):
├── Backend: Ranvier (Node.js/TypeScript)
├── Database: File-based or MongoDB
├── Frontend: Custom browser client
└── Hosting: Single VPS or serverless
```

### 4.4 Solo Developer Feasibility

**The Hard Reality:**
- Full multiplayer MMO is extremely challenging for solo devs
- Server costs, maintenance, and 24/7 uptime add ongoing burden
- Most successful solo "MMO" projects are actually single-player with simulated multiplayer

**The Erenshor Lesson:**
Solo dev Brian "Burgee" created Erenshor, a "single-player MMO" where all other players are simulated AI. It sold 30,000 copies in its first month and "blew expectations out of the water." Key quote: "By committing to single-player exclusively, I ensure Erenshor provides the complete experience solo."

**Realistic Solo Dev Approaches:**

| Approach | Complexity | Community | Viability |
|----------|------------|-----------|-----------|
| True multiplayer MUD | High | Real players | Challenging but possible |
| Single-player with simulated players | Medium | Fake/AI | Proven successful |
| Async multiplayer (turns, not real-time) | Medium | Real, delayed | Underexplored niche |
| Hybrid (solo + optional co-op) | High | Mixed | Complex but flexible |

**Key Success Factor:** Work on your project every day, even if just 5 minutes. "100 days of 'a little bit of work' is still a LOT of development."

### 4.5 Hybrid Text/Graphical Interfaces

**The Spectrum:**
1. **Pure text** — Classic MUD experience
2. **Text + status panels** — HP bars, inventory windows, minimap
3. **Text + ASCII art** — Roguelike-inspired visuals
4. **Text + graphical tiles** — Alternate display mode
5. **Full graphical with text log** — MMO-style with chat window

**Modern Hybrid Examples:**
- **Aardwolf:** Multiple panels including rudimentary graphics
- **Cogmind:** "Most advanced terminal interface ever" — ASCII but beautiful
- **Caves of Qud:** ASCII art with optional tileset, retrofuturistic aesthetic
- **Written Realms:** Clean minimalist UI that draws attention to text

**Implementation Pattern:**
Write a display wrapper that abstracts rendering. The game logic communicates only with the wrapper, allowing easy swapping between text-only, ASCII, or graphical frontends.

### 4.6 Accessibility Best Practices

**Screen Reader Mode:**
- Provide explicit toggle command (no auto-detection—privacy concern)
- Trim unnecessary output (ASCII art, decorative elements)
- Replace color indicators with text
- Use "::" for deliberate pauses in screen reader speech
- Support common shortcuts (Ctrl+Tab for focus switching)

**Why Accessibility Matters:**
- MUDRammer stats: 10% of sales to blind gamers
- Solara: Blind players were most loyal, played longest, spent most
- Low competition in accessible gaming = profitable niche

**Key Features:**
- Sound cues for events (combat, chat, alerts)
- Keyboard-only navigation
- Configurable output verbosity
- Screen reader-friendly HTML semantics in webclient

### 4.7 Game Design Patterns for Retention

**What Makes MUDs Engaging:**

1. **Community is Core**
   - "It's right in the name—Multi-User. The most important feature is the community."
   - Even mechanically intensive MUDs allow time to chat and collaborate

2. **Depth of World**
   - Minor details make the world feel real
   - Background lore, unique deities, folklore, current events
   - Spatial sense—players must orient themselves in the environment

3. **Find the Fun First**
   - Prototype and test what's actually fun to play
   - Complex systems can be compelling to design but lackluster to engage with

4. **Accelerate Onboarding**
   - Cut time to "the fun parts"
   - Avoid boring, sprawling newbie academies
   - Delight new players with low-pressure, fun tutorial experiences

5. **Retention Mechanics**
   - Remort/New Game+ systems incentivize helping newbies
   - Permanent death creates meaningful stakes
   - Scenarios (staff-run events) keep the world fresh

6. **Content Breadth:**
   - Successful MUDs have 400+ locations, 600+ quests
   - Multiple races, classes, and progression paths
   - Years of accumulated content is a competitive advantage

### 4.8 Monetization Models

**Viable Models for Indie Browser Games:**

| Model | Pros | Cons | Fit for MUD |
|-------|------|------|-------------|
| **Free + Donations** | No barrier, community goodwill | Unpredictable income | Good for hobby |
| **Freemium** | Wide reach, test market | Must avoid pay-to-win perception | Good |
| **Subscription** | Predictable revenue | Limits audience | Good if strong content |
| **Cosmetic microtransactions** | Non-pay-to-win | Requires visual elements | Needs graphical client |
| **Ads (rewarded)** | Monetize non-payers | Can disrupt immersion | Risky for MUDs |

**Recommended Approach:**
- **Launch free** to build community and prove concept
- **Add optional subscription** for premium features (extra character slots, custom housing, exclusive areas)
- **Avoid pay-to-win** — MUD communities are highly sensitive to fairness
- **Cosmetics** work if graphical client exists (custom ASCII art, colors, titles)

**Platform Options:**
- **Itch.io:** Open revenue sharing, indie-friendly
- **Ko-fi/Patreon:** Direct creator support
- **Self-hosted:** Full control, payment via Stripe

---

## 5. Constraints, Risks, and Dependencies

### 5.1 Constraints

**Technical:**
- Real-time multiplayer requires always-on server ($5-50+/month ongoing)
- WebSocket connections need stable hosting
- Mobile browser support varies (especially for keyboard input)

**Content:**
- MUDs require massive amounts of written content
- World-building is time-intensive (history, lore, room descriptions)
- Solo dev must be comfortable writing extensively

**Community:**
- MUDs need players to feel alive
- Chicken-and-egg: players want active communities; communities need players
- Moderation burden scales with player count

### 5.2 Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Low player count** | High | High | Focus on compelling single-player or async experience first |
| **Content creation burnout** | High | Medium | Use procedural generation; enable player-created content |
| **Technical maintenance burden** | Medium | High | Use proven frameworks (Evennia, Ranvier) |
| **Competition from established MUDs** | Medium | Medium | Focus on unique niche or modern UX differentiator |
| **Monetization failure** | Medium | Medium | Keep costs low; treat as hobby until proven |

### 5.3 Dependencies & Assumptions

**Key Assumptions:**
- There's an audience for text-based gaming in 2025+
- Browser-based play removes enough friction to attract new players
- Solo dev can produce enough content to be engaging
- Existing frameworks reduce technical burden sufficiently

**Dependencies:**
- Hosting provider for server (DigitalOcean, Linode, Fly.io)
- Domain name and SSL certificate
- Payment processor if monetizing (Stripe)
- Community platform (Discord, forums) for out-of-game engagement

---

## 6. Opportunities & Ideas

### 6.1 Differentiation Opportunities

**Modern UX as Differentiator:**
- Most MUDs feel dated; modern, polished browser UI is rare
- Written Realms proves "clean minimalism" works
- Mobile-first design would be unusual in MUD space

**Accessibility as Niche:**
- Build screen reader support from day one
- Market to blind/VI gaming communities
- Low competition, high loyalty from this audience

**AI-Enhanced Content:**
- Use LLMs for NPC dialogue variation
- Procedurally generate room descriptions from templates
- AI dungeon master for dynamic quests

**Hybrid Single/Multiplayer:**
- Default to single-player with AI companions (like Erenshor)
- Optional multiplayer for those who want it
- Reduces server costs and always-available experience

### 6.2 Quick Wins (MVP Focus)

1. **Evennia installation with default webclient** — Playable in hours
2. **Small, polished starting area** — Quality over quantity initially
3. **3-5 character classes with distinct feel** — Core progression
4. **Simple combat and exploration loop** — The "core fun"
5. **Screen reader mode from launch** — Accessibility built-in
6. **Discord integration for community** — External social layer

### 6.3 Future Extensions (Post-MVP)

- Custom graphical webclient (React/Vue)
- Player housing and customization
- Player-created content tools (area builder)
- Guild/clan systems
- Cross-platform mobile app wrapper
- Subscription tier with premium features
- Seasonal events and staff-run scenarios

---

## 7. Key Findings by Track

### 7.1 Product / Feature Findings

1. **Proven frameworks exist** — Evennia (Python) and Ranvier (Node.js) dramatically reduce technical burden
2. **Browser-native MUDs are rare but successful** — Written Realms and ArchaicQuest prove the model works
3. **Solo dev multiplayer is hard but possible** — Consider single-player-first or async multiplayer
4. **Server costs are manageable** — $5-20/month VPS handles small MUD; scale only when needed
5. **Framework choice matters** — Evennia's built-in webclient vs Ranvier's modularity; both viable

### 7.2 Content Findings

1. **Content volume is the real challenge** — Successful MUDs have 400+ areas, 600+ quests
2. **World-building creates stickiness** — Deep lore, history, and detail keep players engaged
3. **Community IS the content** — Players create emergent stories through interaction
4. **Scenarios keep worlds fresh** — Staff-run events prevent staleness
5. **AI can augment (not replace) content** — LLMs for variation, not core writing

### 7.3 Design Findings

1. **Modern UI is a differentiator** — Most MUDs look dated; polish stands out
2. **Hybrid interfaces are proven** — Multiple panels, optional graphics, ASCII art all work
3. **Accessibility is underserved** — Screen reader users are loyal, high-value audience
4. **Onboarding is critical** — Boring tutorials kill retention; delight new players
5. **Mobile is underexplored** — Touch-friendly text input is a design challenge worth solving

---

## 8. Recommendations for the Create Phase

### 8.1 Recommended Requirements Document(s)

- **Create next:** PRD (Product Requirements Document)
- **Secondary:** DRD (Design Requirements Document) for UI/UX
- **Tertiary:** CRD (Content Requirements Document) for world-building guide
- **Suggested filename:** `prd-browser-mud-v1.md`

### 8.2 Scope Recommendations

**MVP Scope (Must Have):**
- Browser-based webclient (Evennia default or custom)
- Single starting area with 20-50 rooms
- 3-5 distinct character classes
- Basic combat and exploration
- Simple quest/task system (5-10 quests)
- Screen reader accessibility mode
- Account creation and character persistence
- In-game chat (global, local, tells)

**Stretch / Deferred:**
- Custom graphical client
- Multiple areas/zones
- Player housing
- Guild/clan systems
- Mobile-optimized interface
- Monetization features
- Player-created content tools
- AI-enhanced NPC dialogue

### 8.3 Key Questions the Requirements Doc Should Answer

1. **Multiplayer strategy:** True multiplayer, single-player with AI, or hybrid?
2. **Framework choice:** Evennia (Python) or Ranvier (Node.js)?
3. **World theme:** Fantasy, sci-fi, horror, or unique setting?
4. **Core loop:** Combat-focused, exploration-focused, or roleplay-focused?
5. **Content creation approach:** All handcrafted, procedural, or AI-assisted?
6. **Monetization plan:** Hobby project, donations, freemium, or subscription?
7. **Target platform:** Desktop-first, mobile-first, or equal priority?

### 8.4 Suggested Decisions to Lock In Now

| Decision | Recommendation | Rationale |
|----------|----------------|-----------|
| **Framework** | Evennia (Python) | Built-in webclient, Django integration, excellent docs |
| **Initial focus** | Single-player viable with optional multiplayer | Reduces complexity, always-playable |
| **Accessibility** | Screen reader support from day one | Underserved market, builds loyalty |
| **Monetization** | Free launch, donations/Patreon | Prove concept before monetizing |
| **Hosting** | Single VPS (DigitalOcean, Linode) | $5-10/month, sufficient for early stage |
| **Content scope** | Small but polished starting area | Quality over quantity for MVP |

---

## 9. Open Questions & Gaps

### 9.1 Unanswered Questions

- **Legal:** Are there trademark/IP concerns if building on an existing fictional universe?
- **Community:** How to seed initial player community? (Discord, Reddit, MUD listing sites?)
- **Content velocity:** How much content per week can a solo dev reasonably produce?
- **Mobile UX:** What's the best approach for touch-friendly text input?

### 9.2 Areas Needing Stakeholder Input

- Personal expertise (Python vs JavaScript preference)
- Available time commitment (hobby vs serious project)
- Genre/theme preference
- Comfort with ongoing server management

### 9.3 Out of Scope for This Research

- Detailed framework comparison/tutorial
- Specific world-building or narrative design
- Full technical architecture document
- User interviews / primary research
- Competitive pricing analysis

---

## 10. Sources & References

### Browser MUDs & Game Listings
- [MudVerse - MUD Directory](https://www.mudverse.com/)
- [Top Mud Sites](https://topmudsites.com)
- [Massively OP - 25 Text-Based MMOs](https://massivelyop.com/2023/04/26/perfect-ten-25-text-based-mmos-and-muds-that-are-worth-playing-in-2023/)
- [Medium - Multi-User Dungeons Still Serving Fun](https://medium.com/@the_andruid/multi-user-dungeons-10-games-still-serving-up-text-based-fun-in-2023-1e3951d3bf43)
- [ArchaicQuest](https://www.archaicquest.com/)
- [Genesis MUD](https://www.genesismud.org/)
- [Materia Magica](https://www.materiamagica.com/)

### MUD Frameworks & Engines
- [Evennia - Python MUD System](https://www.evennia.com/)
- [Evennia Beginner Tutorial](https://www.evennia.com/docs/latest/Howtos/Beginner-Tutorial/Beginner-Tutorial-Overview.html)
- [Evennia Web Client Docs](https://www.evennia.com/docs/latest/Components/Webclient.html)
- [Evennia GitHub](https://github.com/evennia/evennia)
- [Ranvier MUD Engine](https://ranviermud.com/)
- [Ranvier Getting Started](https://ranviermud.com/get_started/)
- [Ranvier GitHub](https://github.com/RanvierMUD/ranviermud)
- [Mudlet Client](https://www.mudlet.org/)

### Technical Architecture
- [FreeCodeCamp - Real-Time Multiplayer with WebSockets (Nov 2024)](https://www.freecodecamp.org/news/build-a-real-time-multiplayer-tic-tac-toe-game-using-websockets-and-microservices/)
- [DEV - Building Multiplayer Games with WebSockets](https://dev.to/sauravmh/building-a-multiplayer-game-using-websockets-1n63)
- [Codezup - Node.js WebSocket Game Server](https://codezup.com/node-js-websockets-real-time-game-server/)
- [ModernWeb - Multiplayer Games with Node.js and Socket.IO](https://modernweb.com/building-multiplayer-games-node-js-socket-io/)

### Solo Dev & Feasibility
- [GamesRadar - Erenshor Solo Dev Single-Player MMO](https://www.gamesradar.com/games/mmo/ive-had-this-idea-for-25-years-solo-dev-behind-single-player-mmo-with-fake-simulated-players-insists-i-do-not-plan-to-add-multiplayer-as-it-soars-on-steam/)
- [GamesRadar - Erenshor 30,000 Sales First Month](https://www.gamesradar.com/games/mmo/indie-dev-behind-single-player-mmo-that-sold-30-000-in-its-first-month-quit-his-job-to-make-the-game-because-he-would-have-forever-regretted-not-trying-otherwise/)
- [PC Gamer - Erenshor Simulated MMO](https://www.pcgamer.com/games/rpg/erenshor-is-a-simulated-mmo-built-for-singleplayer-by-a-single-person/)
- [MMORPG.com - Don't Make an MMO First](https://www.mmorpg.com/editorials/opinion-for-gods-sake-dont-make-an-mmo-for-your-first-indie-game-part-1-2000129505)

### Game Design & Retention
- [Writing-Games - Improve MUD Player Retention](https://writing-games.com/how-to-improve-player-retention-in-multi-user-mud-games-15-tips-for-game-designers/)
- [Gammon Forum - MUD Retention Rates](https://www.gammon.com.au/forum/?id=10147)
- [Andrew Zigler - MUD Cookbook](https://www.andrewzigler.com/blog/mud-cookbook-design-meets-implementation/)
- [Game Developer - Ancient Art of the MUD](https://www.gamedeveloper.com/design/the-ancient-art-of-the-mud-a-writer-s-perspective-of-the-crafting-of-a-text-based-game-)

### UI/UX & Accessibility
- [Writing-Games - Building Better MUD for Screen Readers](https://writing-games.com/building-a-better-mud/)
- [Mudlet Wiki - Screen Readers](https://wiki.mudlet.org/w/Manual:Screen_Readers)
- [Mudlet Blog - Accessibility Part 1](https://www.mudlet.org/2022/05/accessibility-for-mudlet-part-1/)
- [Mudlet 4.17 Screenreader Friendly](https://www.mudlet.org/2023/03/mudlet-4-17-now-more-screenreader-friendly/)
- [RogueBasin - User Interface Features](https://www.roguebasin.com/index.php/User_interface_features)
- [RogueBasin - ASCII](https://www.roguebasin.com/index.php/ASCII)

### Monetization
- [Fungies.io - 12 Strategies for Free Game Monetization 2024](https://fungies.io/12-proven-strategies-for-how-free-games-make-money-in-2024/)
- [Fungies.io - Top 11 Monetization for Indie Games](https://fungies.io/top-10-monetization-strategies-for-indie-game-developers/)
- [Xsolla - Browser Game Subscriptions](https://xsolla.com/blog/monetizing-your-browser-based-game-via-subscriptions)
- [Venatus - Browser Game Monetization](https://www.venatus.com/publishers/browser-game-monetization)
- [Sonamine - Indie Game Monetization Strategies](https://www.sonamine.com/blog/monetization-strategies-for-indie-game-developers-finding-success-beyond-the-release)

---

## Standards Compliance

- **Standards version:** 1.0.0
- **Standards files applied:**
  - global/principles.md
  - global/security-privacy.md
  - phases/research.md
  - domains/code-architecture.md
  - domains/content-voice.md
  - domains/design-ui.md
- **Compliance status:**
  - [R-1] Research goal clearly stated
  - [R-2] Facts distinguished from inferences (tables vs recommendations)
  - [R-3] All external sources cited
  - [R-4] Uncertainties flagged (Section 9)
  - [R-5] No PII included
  - [R-6] Current information prioritized (2024-2025 sources)
  - [R-7] Actionable recommendations provided (Section 8)
  - [R-8] Scope clearly stated (Section 9.3)
  - [PRIN-10] Simplicity emphasized (MVP scope recommendations)
  - [PRIN-14] Reuse before build (Evennia/Ranvier frameworks)
- **Deviations:** None
