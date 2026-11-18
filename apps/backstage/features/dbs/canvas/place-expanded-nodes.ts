export type CanvasPosition = { x: number; y: number };

export type PlacedExpandNode = {
  id: string;
  position: CanvasPosition;
};

type OccupiedNode = {
  id: string;
  position: CanvasPosition;
};

const EXPANDED_NODE_WIDTH = 288;
const EXPANDED_NODE_HEIGHT = 96;
const EXPANDED_NODE_HORIZONTAL_GAP = 72;
const EXPANDED_NODE_VERTICAL_GAP = 48;
const EXPANSION_INITIAL_RADIUS = 360;
const EXPANSION_RING_STEP = 200;
const MIN_RING_SLOTS = 6;

type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Place newly expanded objects on rings around the anchor, skipping ids
 * already on the canvas and avoiding simple rectangular overlaps.
 */
export function placeExpandedNodes(
  anchor: OccupiedNode,
  newObjectIds: readonly string[],
  existingNodes: ReadonlyArray<OccupiedNode>,
): PlacedExpandNode[] {
  const existingIds = new Set(existingNodes.map((node) => node.id));
  const toPlace = newObjectIds.filter((id) => !existingIds.has(id));
  if (toPlace.length === 0) {
    return [];
  }

  const occupiedRects = existingNodes.map((node) => createNodeRect(node.position));
  const startAngle = findLargestAngularGap(anchor, existingNodes);
  const placed: PlacedExpandNode[] = [];
  let placedCount = 0;
  let ringIndex = 0;

  while (placedCount < toPlace.length) {
    const radius = EXPANSION_INITIAL_RADIUS + ringIndex * EXPANSION_RING_STEP;
    const minArcLength = EXPANDED_NODE_WIDTH + EXPANDED_NODE_HORIZONTAL_GAP;
    const slotCount = Math.max(
      MIN_RING_SLOTS,
      Math.floor((Math.PI * 2 * radius) / minArcLength),
    );
    const angleStep = (Math.PI * 2) / slotCount;
    const ringOffset = ringIndex % 2 === 0 ? 0 : angleStep / 2;
    let placedInRing = 0;

    for (
      let slotIndex = 0;
      slotIndex < slotCount && placedCount < toPlace.length;
      slotIndex += 1
    ) {
      const angle = startAngle + ringOffset + slotIndex * angleStep;
      const position = {
        x: anchor.position.x + Math.cos(angle) * radius,
        y: anchor.position.y + Math.sin(angle) * radius,
      };
      const candidateRect = createNodeRect(position);
      if (rectanglesOverlapAny(candidateRect, occupiedRects)) {
        continue;
      }

      const id = toPlace[placedCount];
      if (!id) {
        break;
      }
      placed.push({ id, position });
      occupiedRects.push(candidateRect);
      placedCount += 1;
      placedInRing += 1;
    }

    if (placedInRing === 0) {
      const id = toPlace[placedCount];
      if (!id) {
        break;
      }
      const angle = startAngle + ringIndex * 0.37;
      const position = {
        x: anchor.position.x + Math.cos(angle) * radius,
        y: anchor.position.y + Math.sin(angle) * radius,
      };
      placed.push({ id, position });
      occupiedRects.push(createNodeRect(position));
      placedCount += 1;
    }

    ringIndex += 1;
  }

  return placed;
}

function createNodeRect(position: CanvasPosition): NodeRect {
  return {
    x: position.x,
    y: position.y,
    width: EXPANDED_NODE_WIDTH + EXPANDED_NODE_HORIZONTAL_GAP,
    height: EXPANDED_NODE_HEIGHT + EXPANDED_NODE_VERTICAL_GAP,
  };
}

function rectanglesOverlap(left: NodeRect, right: NodeRect): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

function rectanglesOverlapAny(
  candidate: NodeRect,
  occupiedRects: readonly NodeRect[],
): boolean {
  return occupiedRects.some((occupied) => rectanglesOverlap(candidate, occupied));
}

function findLargestAngularGap(
  anchor: OccupiedNode,
  existingNodes: ReadonlyArray<OccupiedNode>,
): number {
  const angles = existingNodes
    .filter((node) => node.id !== anchor.id)
    .map((node) => {
      const deltaX = node.position.x - anchor.position.x;
      const deltaY = node.position.y - anchor.position.y;
      return Math.atan2(deltaY, deltaX);
    })
    .sort((left, right) => left - right);

  if (angles.length === 0) {
    return -Math.PI / 2;
  }

  if (angles.length === 1) {
    return normalizeAngle((angles[0] ?? 0) + Math.PI);
  }

  let bestGap = -1;
  let bestAngle = -Math.PI / 2;

  for (let index = 0; index < angles.length; index += 1) {
    const currentAngle = angles[index] ?? 0;
    const nextAngle = angles[(index + 1) % angles.length] ?? 0;
    const normalizedNextAngle =
      index === angles.length - 1 ? nextAngle + Math.PI * 2 : nextAngle;
    const gap = normalizedNextAngle - currentAngle;

    if (gap > bestGap) {
      bestGap = gap;
      bestAngle = currentAngle + gap / 2;
    }
  }

  return normalizeAngle(bestAngle);
}

function normalizeAngle(angle: number): number {
  let value = angle;
  while (value <= -Math.PI) {
    value += Math.PI * 2;
  }
  while (value > Math.PI) {
    value -= Math.PI * 2;
  }
  return value;
}
