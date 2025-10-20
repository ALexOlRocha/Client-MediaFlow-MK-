import React from "react";

type AlertProps = {
  variant?: "success" | "error" | "warning" | "info";
  title?: string;
  children: React.ReactNode;
};

export function Alert({ variant = "info", title, children }: AlertProps) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      {title && <strong className="alert-title">{title}</strong>}
      <span className="alert-message">{children}</span>
    </div>
  );
}
