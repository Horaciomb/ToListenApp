export default function AlbumCardSkeleton() {
  return (
    <div className="bg-gray-900 rounded-xl overflow-hidden flex sm:flex-col animate-pulse">
      <div className="w-24 h-24 sm:w-full sm:aspect-square bg-gray-800 flex-shrink-0" />
      <div className="flex-1 p-3 sm:p-4 space-y-2">
        <div className="h-4 bg-gray-800 rounded w-3/4" />
        <div className="h-3 bg-gray-800 rounded w-1/2" />
        <div className="h-3 bg-gray-800 rounded w-1/3" />
        <div className="flex gap-2 mt-3">
          <div className="h-7 bg-gray-800 rounded-full w-28" />
          <div className="h-7 bg-gray-800 rounded-full w-24" />
        </div>
      </div>
    </div>
  )
}
