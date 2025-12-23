export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-600">
          You do not have permission to access this page.
        </p>
      </div>
    </div>
  );
}
