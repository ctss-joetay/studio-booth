/** A plain figure for placeholder style tiles, until real sample photos replace them. */
export function Silhouette({ fill, className }: { fill: string; className?: string }) {
  return (
    <svg viewBox="0 0 100 130" preserveAspectRatio="xMidYMax meet" className={className} aria-hidden="true">
      <circle cx="50" cy="34" r="17" fill={fill} />
      <path d="M14 130 C14 84 28 62 50 62 C72 62 86 84 86 130 Z" fill={fill} />
    </svg>
  );
}
