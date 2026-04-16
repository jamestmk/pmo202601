type Props = { message?: string };

export function Flash({ message }: Props) {
  if (!message) return null;
  return (
    <div
      className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      role="alert"
    >
      {message}
    </div>
  );
}
