/**
 * Bounding Box Matching Utilities
 * 
 * Matches AI-detected slots with database slots based on bbox overlap/proximity
 */

interface BBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface SlotWithBBox {
  slotId: number;
  bbox: BBox;
  status?: string;
}

/**
 * Calculate Intersection over Union (IoU) between two bounding boxes
 * IoU = Area of Overlap / Area of Union
 * 
 * @param bbox1 First bounding box
 * @param bbox2 Second bounding box
 * @returns IoU score (0 to 1)
 */
export function calculateIoU(bbox1: BBox, bbox2: BBox): number {
  // Calculate intersection coordinates
  const x1 = Math.max(bbox1.x1, bbox2.x1);
  const y1 = Math.max(bbox1.y1, bbox2.y1);
  const x2 = Math.min(bbox1.x2, bbox2.x2);
  const y2 = Math.min(bbox1.y2, bbox2.y2);

  // Check if there's an intersection
  if (x2 < x1 || y2 < y1) {
    return 0; // No overlap
  }

  // Calculate areas
  const intersectionArea = (x2 - x1) * (y2 - y1);
  const bbox1Area = (bbox1.x2 - bbox1.x1) * (bbox1.y2 - bbox1.y1);
  const bbox2Area = (bbox2.x2 - bbox2.x1) * (bbox2.y2 - bbox2.y1);
  const unionArea = bbox1Area + bbox2Area - intersectionArea;

  // Calculate IoU
  return unionArea > 0 ? intersectionArea / unionArea : 0;
}

/**
 * Calculate center distance between two bounding boxes
 * 
 * @param bbox1 First bounding box
 * @param bbox2 Second bounding box
 * @returns Euclidean distance between centers
 */
export function calculateCenterDistance(bbox1: BBox, bbox2: BBox): number {
  const center1X = (bbox1.x1 + bbox1.x2) / 2;
  const center1Y = (bbox1.y1 + bbox1.y2) / 2;
  const center2X = (bbox2.x1 + bbox2.x2) / 2;
  const center2Y = (bbox2.y1 + bbox2.y2) / 2;

  return Math.sqrt(
    Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2)
  );
}

/**
 * Check if a bbox is valid (non-zero dimensions)
 * 
 * @param bbox Bounding box to check
 * @returns True if bbox has non-zero dimensions
 */
export function isValidBBox(bbox: BBox): boolean {
  return (
    bbox.x1 !== 0 ||
    bbox.y1 !== 0 ||
    bbox.x2 !== 0 ||
    bbox.y2 !== 0
  ) && bbox.x2 > bbox.x1 && bbox.y2 > bbox.y1;
}

/**
 * Match detected slots with database slots based on bbox overlap
 * 
 * @param detectedSlots Slots detected by AI with bbox
 * @param dbSlots Slots stored in database with bbox
 * @param iouThreshold Minimum IoU score for a match (default: 0.3)
 * @returns Map of dbSlotId -> detectedSlot
 */
export function matchSlotsByBBox(
  detectedSlots: SlotWithBBox[],
  dbSlots: SlotWithBBox[],
  iouThreshold: number = 0.3
): Map<number, SlotWithBBox> {
  const matches = new Map<number, SlotWithBBox>();
  const usedDetectedSlots = new Set<number>();

  // Filter valid bboxes
  const validDbSlots = dbSlots.filter(slot => isValidBBox(slot.bbox));
  const validDetectedSlots = detectedSlots.filter(slot => isValidBBox(slot.bbox));

  // For each DB slot, find the best matching detected slot
  for (const dbSlot of validDbSlots) {
    let bestMatch: SlotWithBBox | null = null;
    let bestIoU = iouThreshold;

    for (let i = 0; i < validDetectedSlots.length; i++) {
      if (usedDetectedSlots.has(i)) continue;

      const detectedSlot = validDetectedSlots[i];
      const iou = calculateIoU(dbSlot.bbox, detectedSlot.bbox);

      if (iou > bestIoU) {
        bestIoU = iou;
        bestMatch = detectedSlot;
      }
    }

    if (bestMatch) {
      matches.set(dbSlot.slotId, bestMatch);
      const matchIndex = validDetectedSlots.indexOf(bestMatch);
      usedDetectedSlots.add(matchIndex);
    }
  }

  return matches;
}

/**
 * Match detected slots with database slots using hybrid approach:
 * 1. Try bbox matching first (if valid bboxes exist)
 * 2. Fall back to slot ID matching
 * 
 * @param detectedSlots Slots detected by AI
 * @param dbSlots Slots stored in database
 * @param iouThreshold Minimum IoU score for bbox match (default: 0.3)
 * @returns Map of dbSlotId -> detectedSlot
 */
export function matchSlotsHybrid(
  detectedSlots: SlotWithBBox[],
  dbSlots: SlotWithBBox[],
  iouThreshold: number = 0.3
): Map<number, SlotWithBBox> {
  // Check if we have valid bboxes in both detected and DB slots
  const hasValidDetectedBBoxes = detectedSlots.some(slot => isValidBBox(slot.bbox));
  const hasValidDbBBoxes = dbSlots.some(slot => isValidBBox(slot.bbox));

  // If both have valid bboxes, use bbox matching
  if (hasValidDetectedBBoxes && hasValidDbBBoxes) {
    console.log('[BBox Matcher] Using bbox-based matching');
    return matchSlotsByBBox(detectedSlots, dbSlots, iouThreshold);
  }

  // Fall back to slot ID matching
  console.log('[BBox Matcher] Using slot ID matching (no valid bboxes)');
  const matches = new Map<number, SlotWithBBox>();
  
  for (const detectedSlot of detectedSlots) {
    const dbSlot = dbSlots.find(s => s.slotId === detectedSlot.slotId);
    if (dbSlot) {
      matches.set(dbSlot.slotId, detectedSlot);
    }
  }

  return matches;
}

/**
 * Get matching statistics for debugging
 * 
 * @param matches Map of matches from matchSlotsHybrid
 * @param detectedSlots Original detected slots
 * @param dbSlots Original database slots
 * @returns Statistics object
 */
export function getMatchingStats(
  matches: Map<number, SlotWithBBox>,
  detectedSlots: SlotWithBBox[],
  dbSlots: SlotWithBBox[]
) {
  const matchedDbSlots = matches.size;
  const unmatchedDbSlots = dbSlots.length - matchedDbSlots;
  const unmatchedDetectedSlots = detectedSlots.length - matchedDbSlots;

  return {
    totalDbSlots: dbSlots.length,
    totalDetectedSlots: detectedSlots.length,
    matchedSlots: matchedDbSlots,
    unmatchedDbSlots,
    unmatchedDetectedSlots,
    matchRate: dbSlots.length > 0 ? (matchedDbSlots / dbSlots.length) * 100 : 0,
  };
}
