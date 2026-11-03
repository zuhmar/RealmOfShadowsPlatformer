# Boss scale and dodge attacks

The implemented boss, Forest Bear, renders at twice its previous world size (atlas scale0.72→1.44). Boss catalog flags apply the same multiplier to future boss visuals. Melee reach, projectile width/height tests and AUTO approach distance account for the larger body. The boss label is raised and boss-arena cameras pull back slightly, especially on mobile. Enemy HP and rewards are unchanged.

Forest Bear has two attacks:

- Basic swipe:22 damage,150-unit reach,1.5-second cooldown, using the existing attack animation.
- Ground Slam: a fixed300-unit-wide red zone marks the target’s platform. A countdown and HUD warning give1.8 seconds to move clear. The bear stops moving and swiping during this windup. On impact, players still in the zone take88 damage (four times normal damage), and the dedicated two-paw slam animation lands and a root/shockwave effect plays. Jumping high enough to clear its100-unit vertical hazard also avoids the hit.

The first special becomes available3.5 seconds after engagement. After impact, its cooldown is8 seconds. Bosses can target reachable-height player ledges, so standing on a ledge does not provide permanent immunity. The warning locks to the target position at cast time and never follows movement. Its graphic uses the same dimensions as server hit checks, and its text keeps a readable screen size at mobile zoom.

Warning state is sent in snapshots, so joining mid-cast shows the current warning. Impact damage is server-owned and resolves once. Dead or removed bosses clear their warnings; killing the boss during windup cancels the attack. Players outside the marked rectangle take no special damage. Damage, gathering cancellation and lethal respawns use the common server damage path.

Validation includes basic-versus-special damage, no damage before impact, fixed targeting, movement/jump dodges, multiple targets, duplicate resolution prevention, cooldown, cancellation on death, normal lethal respawn and enlarged melee/projectile registration. The browser combat fixture runs production World logic and renders the real warning/impact on desktop and mobile. Live area travel checks retain one-key-per-entry semantics.

Forest Bear’s dedicated ground-slam art is `forest-bear-slam.{png,json}` with eight384×512 frames in a4×2 sheet. Four poses crouch/rear/raise the paws during the warning; frame4 (zero-based) is the server-confirmed impact; frames5–7 compress and recover over650ms. The renderer samples the server timeline rather than restarting a local clip on every snapshot, and holds the raised pose until impact is actually confirmed. Late joins can display the appropriate cast or recovery pose. The bear stays planted through recovery and resumes its normal animations afterward. Death cancels the sequence immediately.

Measured per-frame foot anchors keep the bear grounded. A body-width scale ratio matches the normal sheet while preserving the doubled boss size. The health label follows the pose height so raised paws do not obscure it. The original generated PNG is copied unchanged with true RGBA transparency; no ground effects are baked into it.
