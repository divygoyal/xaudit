import Link from "next/link";

export function MinimalNavbar() {
  return (
    <nav className="relative z-50 mx-auto flex max-w-7xl items-center px-6 py-5 md:px-10 md:py-6">
      <Link href="/" className="group inline-flex items-center text-paper">
        <span className="serif-italic text-[2rem] leading-none tracking-tight md:text-[2.4rem]">
          let
        </span>
        <LogoMark />
        <span className="serif-italic text-[2rem] leading-none tracking-tight md:text-[2.4rem]">
          cook
        </span>
      </Link>
    </nav>
  );
}

function LogoMark() {
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src="/logo-hero.svg"
      alt="x"
      width={64}
      height={64}
      className="-mx-1 block shrink-0 md:-mx-1.5"
    />
  );
}
