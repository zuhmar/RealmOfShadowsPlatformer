# Whispering Woods gathering

Six original inventory sprites represent Iron Ore, Oak Logs, Greenleaf, Brook Trout, Silver Minnow, and Golden Carp. Separate world sprites represent the iron deposit, oak tree, and herb patch. An original water-and-dock platform at x40–400 / y555 is reachable from the ground by the ladder at x140. The existing hunting routes, ladder indices, wolves and village portal remain intact.

Stand next to a node on its platform, then press E/use Interact or click the node/label. The iron deposit is at x2250, oak at x1360, Greenleaf at x2040, and fishing at x260 on the raised dock. Mining and Woodcutting take three seconds, Herbalism two, and Fishing four. Starting gathering turns AUTO off. Moving, jumping, attacking, changing platforms, or taking damage cancels an unfinished attempt. Fishing displays a rod, line and bobber while active; held weapons are hidden during gathering.

Each completed action awards one resource and 10 XP in its separate gathering skill. All four start at level1; the next-level requirement is current level ×20 XP. Skills and stacked inventory save with character data and appear in Character/Bag. Active gathering is cleared on reconnect, travel, and logout. No database migration is needed.

Fishing always awards Brook Trout below Fishing5. From Fishing5, rolls below33% award Silver Minnow. From Fishing10, rolls below8% award Golden Carp and the next25% Silver Minnow; other catches are Brook Trout. Rarity and skill gates are server-owned. The client cannot choose the catch, quantity, skill level, or completion time. Nodes are renewable and do not deplete in this first implementation. Wooden tools are free automatic starters. Bram crafts Iron upgrades that require manual equipment in Character; see `docs/forging.md`. Offline gathering and automatic repeat gathering are not enabled. Timing, XP and probabilities are initial balance choices and remain adjustable.

Original generated PNG files are copied unchanged, with genuine alpha transparency. Inventory and world-node JSON atlases use measured silhouette rectangles. The pond atlas includes measured walking-surface geometry so the dock art aligns with authoritative collision. The new platform has a separate collision body; water is decorative, not a swimming or drowning mechanic.

Validation includes gathering timing, range/map/platform gates, cancellation, duplicate reward prevention, XP progression, fish rarity gates, all existing combat tests, forest alignment/navigation, and a live browser fishing-to-inventory-to-save flow.

Gathering now uses held wooden tools and dedicated character animation loops. The starter sets and all ore-tier tool artwork are documented in `docs/gathering-tools.md`.
