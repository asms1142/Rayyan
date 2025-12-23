import { ReactNode } from "react";
import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type PageWrapperProps = {
  children: ReactNode;
  title?: string;
  breadcrumb?: BreadcrumbItem[];
  padding?: string; // optional override
};

export default function PageWrapper({
  children,
  title,
  breadcrumb,
  padding = "p-6",
}: PageWrapperProps) {
  return (
    <div className={`max-w-7xl mx-auto w-full ${padding}`}>
      {/* Breadcrumb */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav className="mb-3 text-sm text-gray-600 flex flex-wrap items-center gap-1">
          {breadcrumb.map((item, index) => (
            <span key={index} className="flex items-center gap-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className="text-blue-600 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-gray-800">
                  {item.label}
                </span>
              )}

              {index < breadcrumb.length - 1 && (
                <span className="mx-1 text-gray-400">/</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Page Title */}
      {title && (
        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          {title}
        </h1>
      )}

      {/* Page Content */}
      <div className="bg-white rounded-lg shadow p-4">
        {children}
      </div>
    </div>
  );
}
