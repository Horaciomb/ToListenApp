export default function EmptyState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
      <span className="text-5xl">🎵</span>
      <p className="text-gray-400 text-sm">{message}</p>
    </div>
  )
}
