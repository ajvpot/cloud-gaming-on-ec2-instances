export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ height: "100%" }}>{children}</body>
    </html>
  );
}
