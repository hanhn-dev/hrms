import { NextResponse } from "next/server";
import { z } from "zod";
import {
  hideSprintItem,
  placeItem,
  placeSprintItem,
  scheduleItem,
  scheduleSprintItem,
} from "@/features/azure/roadmap/roadmap";
import { readRoadmap, writeRoadmap } from "@/features/azure/roadmap/roadmap-store";
import { requireApiFeature } from "@/lib/api-auth";

const ScheduleBody = z.object({
  op: z.literal("schedule"),
  itemId: z.string().uuid(),
  startsOn: z.string(),
  endsOn: z.string(),
});

const PlaceBody = z.object({
  op: z.literal("place"),
  itemId: z.string().uuid(),
  windowId: z.string().uuid(),
  targetIndex: z.number().int().min(0),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
});

const ScheduleSprintBody = z.object({
  op: z.literal("schedule-sprint"),
  itemId: z.string().uuid(),
  startsOn: z.string(),
  endsOn: z.string(),
  boundStart: z.string(),
  boundEnd: z.string(),
});

const PlaceSprintBody = z.object({
  op: z.literal("place-sprint"),
  itemId: z.string().uuid(),
  sprintId: z.string().min(1),
  targetIndex: z.number().int().min(0),
  boundStart: z.string(),
  boundEnd: z.string(),
  startsOn: z.string().optional(),
  endsOn: z.string().optional(),
});

const HideSprintBody = z.object({
  op: z.literal("hide-sprint"),
  itemId: z.string().uuid(),
});

const Body = z.discriminatedUnion("op", [
  ScheduleBody,
  PlaceBody,
  ScheduleSprintBody,
  PlaceSprintBody,
  HideSprintBody,
]);

export async function POST(request: Request): Promise<NextResponse> {
  const gate = await requireApiFeature("azure");
  if (!gate.ok) return gate.response;
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Could not save the roadmap." }, { status: 400 });
  }
  try {
    const current = readRoadmap();
    const data = parsed.data;
    const next =
      data.op === "schedule"
        ? scheduleItem(current, data.itemId, data.startsOn, data.endsOn)
        : data.op === "place"
          ? placeItem(
              current,
              data.itemId,
              data.windowId,
              data.targetIndex,
              data.startsOn && data.endsOn
                ? { startsOn: data.startsOn, endsOn: data.endsOn }
                : undefined,
            )
          : data.op === "schedule-sprint"
            ? scheduleSprintItem(current, data.itemId, data.startsOn, data.endsOn, {
                startsOn: data.boundStart,
                endsOn: data.boundEnd,
              })
            : data.op === "place-sprint"
              ? placeSprintItem(
                  current,
                  data.itemId,
                  data.sprintId,
                  data.targetIndex,
                  { startsOn: data.boundStart, endsOn: data.boundEnd },
                  data.startsOn && data.endsOn
                    ? { startsOn: data.startsOn, endsOn: data.endsOn }
                    : undefined,
                )
              : hideSprintItem(current, data.itemId);
    writeRoadmap(next);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save the roadmap.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
