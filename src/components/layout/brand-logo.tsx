import Image from "next/image";

interface BrandLogoProps {
  showName?: boolean;
  size?: number;
  nameClassName?: string;
}

export function BrandLogo({
  showName = true,
  size = 28,
  nameClassName = "text-lg font-semibold tracking-tight text-text-primary",
}: BrandLogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="SOARICH Investor"
        width={size}
        height={size}
        className="shrink-0 rounded-[8px]"
        priority
      />
      {showName && <span className={nameClassName}>SOARICH Investor</span>}
    </div>
  );
}
