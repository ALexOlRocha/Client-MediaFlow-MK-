import React, { forwardRef } from "react";

export type ButtonProps = {
  color: "black" | "blue" | "white" | "orange";
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ color, children, className, ...props }, ref) => {
    const colors: Record<ButtonProps["color"], string> = {
      black: "bg-black hover:bg-black/90 text-white",
      blue: "bg-[#0a3057] hover:bg-[#0a3057]/85 text-white",
      white: "bg-white text-black hover:bg-gray-50 px-4 py-3",
      orange: "bg-[#eb670ef6] hover:bg-[#fa6a09] text-white",
    };

    return (
      <button
        ref={ref}
        className={`${
          colors[color]
        } rounded-full px-2 py-1.5 font-sans text-sm/6 font-medium shadow cursor-pointer ${
          className ?? ""
        }`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
