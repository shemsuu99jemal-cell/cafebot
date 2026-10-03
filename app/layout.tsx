export const metadata = { title: "Cafe Money" };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body style={{ fontFamily: "system-ui", padding: 24 }}>{children}</body></html>;
}
