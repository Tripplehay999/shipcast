export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="mb-8">
        <span className="text-2xl font-bold text-white tracking-tight">Shipcast</span>
      </div>
      {children}
    </div>
  );
}
