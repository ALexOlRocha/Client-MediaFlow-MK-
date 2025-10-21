"use client";
import Image from "next/image";
import { Lottie } from "./lottlie";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
} from "react-icons/fa";
import { MdOutlineEmail } from "react-icons/md";

function LoginSection() {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 w-full min-h-screen">
      <div className="flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md bg-white-900 rounded-md bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10 ">
          <form onSubmit={handleSubmit} className="space-y-4 ">
            <div className="flex gap-6">
              <Image
                src="/MediaFlow2.png"
                alt="MK logo"
                width={100}
                height={100}
                className="w-18 h-18 rounded-full p-2  border-2 border-gray-200"
              ></Image>
              <div className="text-start mb-4">
                <h1 className="text-2xl font-extrabold text-gray-900 mb-2">
                  Cadastro de Cliente
                </h1>
                <p className="text-gray-600">
                  Preencha os dados abaixo para criar sua conta
                </p>
              </div>
            </div>
            <div className="flex gap-x-3 justify-center">
              <FaInstagram className="w-10 h-10 rounded-full p-2 shadow-2xl drop-shadow-2xl border-2 hover:text-orange-500 border-gray-200 hover:border-orange-300 transition-colors cursor-pointer duration-300 hover:scale-110" />
              <FaFacebookF className="w-10 h-10 rounded-full p-2 shadow-2xl drop-shadow-2xl border-2  hover:text-orange-500 border-gray-200 hover:border-orange-300 transition-colors cursor-pointer duration-300 hover:scale-110" />
              <FaLinkedinIn className="w-10 h-10 rounded-full p-2 shadow-2xl drop-shadow-2xl border-2  hover:text-orange-500 border-gray-200 hover:border-orange-300 transition-colors cursor-pointer duration-300 hover:scale-110" />
              <FaWhatsapp className="w-10 h-10 rounded-full p-2 shadow-2xl drop-shadow-2xl border-2 hover:text-orange-500 border-gray-200 hover:border-orange-300 transition-colors cursor-pointer duration-300 hover:scale-110" />
              <MdOutlineEmail className="w-10 h-10 rounded-full p-2 shadow-2xl drop-shadow-2xl border-2 hover:text-orange-500 border-gray-200 hover:border-orange-300 transition-colors cursor-pointer duration-300 hover:scale-110" />
            </div>

            <div className="space-y-4">
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Digite seu nome completo"
                required
                aria-label="Nome completo"
              />

              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Digite seu email"
                required
                aria-label="Email"
              />

              <Input
                id="document"
                name="document"
                type="text"
                placeholder="Digite seu CNPJ ou CPF"
                required
                aria-label="CNPJ ou CPF"
              />
            </div>

            <Button type="submit" color="orange" className="w-full py-3">
              Criar Conta
            </Button>
          </form>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-[#0a3057] max-md:rounded-t-[75px] lg:rounded-l-[300px]">
        <div className="text-center text-white max-w-md">
          <h1 className="text-3xl lg:text-4xl font-bold mb-4">
            Seja Nosso Cliente
          </h1>

          <p className="text-lg mb-8 leading-relaxed">
            A MK Distribuidora é uma empresa comercial que distribui produtos de
            materiais de construção.
          </p>

          <div className="mb-8">
            <Lottie />
          </div>

          <Button
            color="white"
            className=" hover:bg-white/80  hover:text-[#ff4800] transition-colors"
          >
            Saiba Mais!
          </Button>
        </div>
      </div>
    </section>
  );
}

export default LoginSection;
