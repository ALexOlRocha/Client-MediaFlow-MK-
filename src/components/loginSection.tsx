"use client";
import Image from "next/image";

import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
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

// Interface para o usuário
interface User {
  email: string;
  name?: string;
  document?: string;
}

function AuthSection() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
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
        // Lógica de login
        await handleLogin();
      } else {
        // Lógica de cadastro
        await handleRegister();
      }
    } catch (err) {
      setError("Erro ao processar sua solicitação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const { email, password } = formData;

    // Validação da conta de demonstração
    if (email === "demo@mediaflow.com" && password === "demo123") {
      const demoUser = {
        email: "demo@mediaflow.com",
        name: "Usuário Demonstração",
      };

      localStorage.setItem("mediaflow_user", JSON.stringify(demoUser));
      localStorage.setItem("mediaflow_token", "demo_token_12345");
      router.push("/");
      return;
    }

    // Buscar usuários cadastrados no localStorage
    const users = JSON.parse(localStorage.getItem("mediaflow_users") || "[]");
    const user = users.find(
      (u: any) => u.email === email && u.password === password
    );

    if (user) {
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

  const handleRegister = async () => {
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
    const users = JSON.parse(localStorage.getItem("mediaflow_users") || "[]");
    const existingUser = users.find((u: any) => u.email === email);

    if (existingUser) {
      setError("Este email já está cadastrado");
      return;
    }

    // Criar novo usuário
    const newUser = {
      name,
      email,
      document,
      password, // Em produção, isso deve ser criptografado
      createdAt: new Date().toISOString(),
    };

    // Salvar usuário
    users.push(newUser);
    localStorage.setItem("mediaflow_users", JSON.stringify(users));

    // Logar automaticamente
    const { password: _, ...userWithoutPassword } = newUser;
    localStorage.setItem("mediaflow_user", JSON.stringify(userWithoutPassword));
    localStorage.setItem("mediaflow_token", `user_token_${Date.now()}`);

    // Redirecionar
    router.push("/");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Limpar erro quando usuário começar a digitar
    if (error) setError("");
  };

  const handleSocialLogin = (platform: string) => {
    setError(`Login com ${platform} - Em desenvolvimento`);
    // Aqui você integraria com APIs de social login
  };

  const handleDemoLogin = () => {
    setFormData({
      name: "",
      email: "demo@mediaflow.com",
      document: "",
      password: "demo123",
      confirmPassword: "",
    });
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 w-full min-h-screen bg-gray-50">
      {/* Left Side - Form */}
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Image
                src="/MediaFlow2.png"
                alt="MediaFlow logo"
                width={80}
                height={80}
                className="w-20 h-20 rounded-full border-2 border-blue-100"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? "Bem-vindo de volta" : "Criar Conta"}
            </h1>
            <p className="text-gray-600">
              {isLogin
                ? "Entre na sua conta para acessar o MediaFlow"
                : "Preencha os dados abaixo para criar sua conta"}
            </p>
          </div>

          {/* Social Login */}
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

          {/* Mensagem de Erro */}
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
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                  setFormData({
                    name: "",
                    email: "",
                    document: "",
                    password: "",
                    confirmPassword: "",
                  });
                }}
                className="text-blue-600 hover:text-blue-500 font-semibold transition-colors"
              >
                {isLogin ? "Cadastre-se" : "Fazer login"}
              </button>
            </p>
          </div>

          {isLogin && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 text-center">
                <strong>Conta de demonstração:</strong>
                <br />
                Email: demo@mediaflow.com
                <br />
                Senha: demo123
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-gradient-to-br from-blue-700 via-[#0a3057] to-orange-500 max-md:rounded-t-[75px] lg:rounded-l-[300px] relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>

        <div className="text-center text-white max-w-md relative z-10">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 leading-tight">
            MediaFlow
            <span className="block text-orange-300 text-2xl lg:text-3xl mt-2">
              Seu Gerenciador de Mídia Inteligente
            </span>
          </h1>

          <p className="text-lg lg:text-xl mb-8 leading-relaxed">
            Gerencie, organize e compartilhe seus arquivos de mídia de forma
            simples e eficiente. Uploads ilimitados, organização inteligente e
            acesso em qualquer lugar.
          </p>

          <div className="mb-8">
            <Lottie />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <span>Uploads ilimitados de arquivos</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <span>Organização automática por pastas</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm">
              <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              <span>Compartilhamento seguro</span>
            </div>
          </div>

          <Button
            color="white"
            className="mt-8 hover:bg-white/90 hover:text-orange-600 transition-all duration-300 font-semibold"
          >
            Conhecer Recursos
          </Button>
        </div>
      </div>
    </section>
  );
}

export default AuthSection;
