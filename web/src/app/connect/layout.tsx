export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body style={{ height: "100%" }}>
        <div style={{ height: "100%" }}>{children}</div>
      </body>
    </html>
  );
}
