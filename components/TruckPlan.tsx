import { TREADS, TRUCK } from "@/lib/drawings";
import type { PositionId } from "@/lib/business";

/**
 * Plan view of a five-axle tractor-trailer, drawn as if the trailer were
 * transparent so the drive tandem underneath stays visible. Pointer users can
 * click an axle; keyboard and screen-reader users get the tabs beneath it.
 */
export function TruckPlan({ active, onPick }: { active: PositionId; onPick?: (id: PositionId) => void }) {
  return (
    <svg className="truck" viewBox="0 0 1120 260" aria-hidden="true" focusable="false">
      <path className="truck__centre" d={TRUCK.centre} />
      <path className="truck__body" d={TRUCK.tractor} />
      <path className="truck__detail" d={TRUCK.cabDetail} />
      <path className="truck__body" d={TRUCK.trailer} />
      <path className="truck__pin" d={TRUCK.kingpin} />
      {(Object.keys(TRUCK.axles) as PositionId[]).map((id) => (
        <g
          key={id}
          className="truck__axle"
          data-active={id === active}
          onClick={onPick ? () => onPick(id) : undefined}
        >
          <path className="truck__shaft" d={TRUCK.axles[id].axle} />
          <path className="truck__tyres" d={TRUCK.axles[id].tyres} />
          <path className="truck__tread" d={TRUCK.axles[id].treads} />
        </g>
      ))}
    </svg>
  );
}

export function Tread({ id }: { id: PositionId }) {
  return (
    <svg className="tread" viewBox="0 0 200 280" role="img" aria-label={`${id} tire tread pattern`}>
      <defs>
        <clipPath id={`tread-clip-${id}`}>
          <rect width="200" height="280" />
        </clipPath>
      </defs>
      <g clipPath={`url(#tread-clip-${id})`}>
        <path className="tread__main" d={TREADS[id].main} />
        <path className="tread__sipes" d={TREADS[id].sipes} />
      </g>
      <rect className="tread__frame" x=".5" y=".5" width="199" height="279" />
    </svg>
  );
}
