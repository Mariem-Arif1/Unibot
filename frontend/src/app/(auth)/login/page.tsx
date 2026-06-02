import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="w-screen h-screen overflow-hidden bg-[#0f0f0f]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
