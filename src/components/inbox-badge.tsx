export function CountDot({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="absolute -top-0.5 -left-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 text-white">
      {n > 9 ? "9+" : n}
    </span>
  );
}
