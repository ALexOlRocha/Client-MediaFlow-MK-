"use client";
import Image from "next/image";
import { Button } from "./ui/Button";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lottie } from "./lottlie";
import Input from "./ui/Input";

// Interfaces para tipagem
interface User {
  email: string;
  name?: string;
  document?: string;
  createdAt?: string;
  password?: string;
}

interface FormData {
  name: string;
  email: string;
  document: string;
  password: string;
  confirmPassword: string;
}

function AuthSection() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    document: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verificar se usuário já está logado
  useEffect(() => {
    const user = localStorage.getItem("mediaflow_user");
    const token = localStorage.getItem("mediaflow_token");

    if (user && token) {
      router.push("/");
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLogin) {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } catch {
      setError("Erro ao processar sua solicitação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (): Promise<void> => {
    const { email, password } = formData;

    // Validação da conta de demonstração
    if (email === "demo@mediaflow.com" && password === "demo123") {
      const demoUser: User = {
        email: "demo@mediaflow.com",
        name: "Usuário Demonstração",
      };

      localStorage.setItem("mediaflow_user", JSON.stringify(demoUser));
      localStorage.setItem("mediaflow_token", "demo_token_12345");
      router.push("/");
      return;
    }

    // Buscar usuários cadastrados no localStorage
    const users: User[] = JSON.parse(
      localStorage.getItem("mediaflow_users") || "[]"
    );
    const user = users.find(
      (u: User) => u.email === email && u.password === password
    );

    if (user) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...userWithoutPassword } = user;
      localStorage.setItem(
        "mediaflow_user",
        JSON.stringify(userWithoutPassword)
      );
      localStorage.setItem("mediaflow_token", `user_token_${Date.now()}`);
      router.push("/");
    } else {
      setError("Email ou senha incorretos");
    }
  };

  const handleRegister = async (): Promise<void> => {
    const { name, email, document, password, confirmPassword } = formData;

    // Validações
    if (!name || !email || !document || !password) {
      setError("Todos os campos são obrigatórios");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    // Verificar se email já existe
    const users: User[] = JSON.parse(
      localStorage.getItem("mediaflow_users") || "[]"
    );
    const existingUser = users.find((u: User) => u.email === email);

    if (existingUser) {
      setError("Este email já está cadastrado");
      return;
    }

    // Criar novo usuário
    const newUser: User = {
      name,
      email,
      document,
      password,
      createdAt: new Date().toISOString(),
    };

    // Salvar usuário
    users.push(newUser);
    localStorage.setItem("mediaflow_users", JSON.stringify(users));

    // Logar automaticamente
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = newUser;
    localStorage.setItem("mediaflow_user", JSON.stringify(userWithoutPassword));
    localStorage.setItem("mediaflow_token", `user_token_${Date.now()}`);

    // Redirecionar
    router.push("/");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (error) setError("");
  };

  const handleSocialLogin = (platform: string): void => {
    setError(`Login com ${platform} - Em desenvolvimento`);
  };

  const handleDemoLogin = (): void => {
    setFormData({
      name: "",
      email: "demo@mediaflow.com",
      document: "",
      password: "demo123",
      confirmPassword: "",
    });
  };

  const toggleAuthMode = (): void => {
    setIsLogin(!isLogin);
    setError("");
    setFormData({
      name: "",
      email: "",
      document: "",
      password: "",
      confirmPassword: "",
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 w-full min-h-screen bg-gray-50">
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/MediaFlow2.png"
                alt="MediaFlow logo"
                width={100}
                height={100}
                className="w-25 h-25 rounded-full border-2 border-blue-100"
              />
            </div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-black to-black bg-clip-text text-transparent mb-4">
              {isLogin ? "Bem-vindo de volta" : "Crie sua conta"}
            </h1>
            <p className="text-gray-600 text-lg font-medium">
              {isLogin
                ? "Entre na sua conta para acessar o MediaFlow"
                : "Comece sua jornada conosco hoje"}
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            <button
              onClick={() => handleSocialLogin("instagram")}
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-orange-500 hover:bg-orange-50 transition-all duration-300 hover:scale-110"
            >
              <FaInstagram className="w-5 h-5 text-gray-600 hover:text-orange-500 transition-colors" />
            </button>
            <button
              onClick={() => handleSocialLogin("facebook")}
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all duration-300 hover:scale-110"
            >
              <FaFacebookF className="w-5 h-5 text-gray-600 hover:text-blue-600 transition-colors" />
            </button>
            <button
              onClick={() => handleSocialLogin("linkedin")}
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-blue-700 hover:bg-blue-50 transition-all duration-300 hover:scale-110"
            >
              <FaLinkedinIn className="w-5 h-5 text-gray-600 hover:text-blue-700 transition-colors" />
            </button>
            <button
              onClick={() => handleSocialLogin("whatsapp")}
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all duration-300 hover:scale-110"
            >
              <FaWhatsapp className="w-5 h-5 text-gray-600 hover:text-green-500 transition-colors" />
            </button>
            <button
              onClick={() => handleSocialLogin("email")}
              className="w-12 h-12 rounded-full flex items-center justify-center border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all duration-300 hover:scale-110"
            >
              <MdOutlineEmail className="w-5 h-5 text-gray-600 hover:text-red-500 transition-colors" />
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                ou continue com {isLogin ? "email" : "cadastro"}
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Nome completo"
                value={formData.name}
                onChange={handleInputChange}
                required={!isLogin}
                aria-label="Nome completo"
                className="w-full"
              />
            )}

            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Seu email"
              value={formData.email}
              onChange={handleInputChange}
              required
              aria-label="Email"
              className="w-full"
            />

            {!isLogin && (
              <Input
                id="document"
                name="document"
                type="text"
                placeholder="CPF ou CNPJ"
                value={formData.document}
                onChange={handleInputChange}
                required={!isLogin}
                aria-label="CPF ou CNPJ"
                className="w-full"
              />
            )}

            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Sua senha"
              value={formData.password}
              onChange={handleInputChange}
              required
              aria-label="Senha"
              className="w-full"
            />

            {!isLogin && (
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required={!isLogin}
                aria-label="Confirmar senha"
                className="w-full"
              />
            )}

            {isLogin && (
              <div className="flex items-center justify-between">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-600">Lembrar-me</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button
              type="submit"
              color="orange"
              className="w-full py-3 text-lg font-semibold disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Carregando..." : isLogin ? "Entrar" : "Criar Conta"}
            </Button>
          </form>

          {isLogin && (
            <div className="mt-4">
              <Button
                type="button"
                color="blue"
                className="w-full py-3 text-lg font-semibold bg-[#0a3057] hover:bg-[#0a3057]/90 transition-all duration-300 "
                onClick={handleDemoLogin}
              >
                Usar Conta Demonstração
              </Button>
            </div>
          )}

          <div className="text-center mt-6">
            <p className="text-gray-600">
              {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
              <button
                onClick={toggleAuthMode}
                className="text-blue-600 cursor-pointer hover:text-blue-500 font-semibold transition-colors"
              >
                {isLogin ? "Cadastre-se" : "Fazer login"}
              </button>
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center max-md:px-6 max-md:py-18 lg:p-16 bg-gradient-to-br from-blue-600 via-[#0a3057] to-orange-600 max-md:rounded-t-[120px] lg:rounded-l-[500px] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-48 translate-x-48 "></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-orange-400/10 rounded-full translate-y-40 -translate-x-40 "></div>

        {/* Grids */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

        <div className="text-center text-white max-w-4xl mx-auto relative z-10">
          <div>
            <div className="inline-block mb-2">
              <div className="text-4xl  font-black bg-gradient-to-r backdrop-blur-2xl from-white via-gray-200 to-gray-400 bg-clip-text text-transparent leading-none">
                MediaFlow MK
              </div>
            </div>

            <h2 className="text-xl lg:text-2xl font-bold text-orange-300 mb-5 leading-tight tracking-wide">
              <span className="bg-gradient-to-r from-orange-300 to-orange-400 bg-clip-text text-transparent">
                Seu Gerenciador de Mídia Inteligente
              </span>
            </h2>

            <p className="text-xl lg:text-2xl text-blue-100 leading max-w-2xl mx-auto font-light">
              Transforme completamente a maneira como você gerencia arquivos de
              mídia com uma plataforma intuitiva, poderosa e descomplicada.
            </p>
          </div>

          <div className="justify-center mb-4">
            <Lottie />
          </div>

          <div className="relative">
            <Button
              color="white"
              className="relative px-6 py-4 text-lg font-bold rounded-2xl bg-white/20 backdrop-blur-sm border-2 border-white/30 hover:bg-white hover:text-orange-600 transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-3xl group"
            >
              <span className="flex items-center space-x-3">
                <span className="text-2xl">✨</span>
                <span>Explorar Recursos Incríveis</span>
                <span className="group-hover:translate-x-1 transition-transform duration-300">
                  →
                </span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AuthSection;
