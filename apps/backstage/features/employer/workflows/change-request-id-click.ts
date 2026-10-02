export function openChangeRequestFromClick(
  event: { stopPropagation: () => void },
  changeRequestId: number,
  onOpen: (changeRequestId: number) => void,
): void {
  event.stopPropagation();
  if (!Number.isInteger(changeRequestId) || changeRequestId <= 0) {
    return;
  }
  onOpen(changeRequestId);
}
