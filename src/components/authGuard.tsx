"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { LuLogOut } from "react-icons/lu";

// Hook para verificar autenticação
export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem("mediaflow_user");
      const token = localStorage.getItem("mediaflow_token");

      if (userData && token) {
        setUser(JSON.parse(userData));
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: any, token: string) => {
    localStorage.setItem("mediaflow_user", JSON.stringify(userData));
    localStorage.setItem("mediaflow_token", token);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("mediaflow_user");
    localStorage.removeItem("mediaflow_token");
    setUser(null);
  };

  return { user, isLoading, login, logout };
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}

export function LogoutButton() {
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <Button
      color="orange"
      onClick={handleLogout}
      className="px-6 py-3 bg--600 flex text-white rounded-full items-center gap-2 transition-colors"
    >
      <span> Sair</span>
      <LuLogOut className="w-4 h-4 text-white" />
    </Button>
  );
}
