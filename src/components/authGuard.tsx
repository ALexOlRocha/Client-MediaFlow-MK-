"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/Button";
import { LuLogOut } from "react-icons/lu";

// Interface para o usuário
interface User {
  email: string;
  name?: string;
  document?: string;
  createdAt?: string;
}

// Interface para o hook useAuth
interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  login: (userData: User, token: string) => void;
  logout: () => void;
}

// Hook para verificar autenticação
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem("mediaflow_user");
      const token = localStorage.getItem("mediaflow_token");

      if (userData && token) {
        try {
          const parsedUser: User = JSON.parse(userData);
          setUser(parsedUser);
        } catch (error) {
          console.error("Erro ao fazer parse do usuário:", error);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (userData: User, token: string) => {
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

// Props para AuthGuard
interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando...</p>
        </div>
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
  const [texto, setTexto] = useState("Sair");

  const handleLogout = () => {
    setTexto("Saindo...");
    logout();
    router.push("/login");
  };

  return (
    <Button
      color="orange"
      onClick={handleLogout}
      className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full flex items-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
    >
      <span className="font-semibold">{texto}</span>
      <LuLogOut className="w-4 h-4" />
    </Button>
  );
}
