// Controles de una lista de álbumes: buscador (por título/artista) + orden.
export default function ListControls({
  query,
  onQueryChange,
  sort,
  onSortChange,
  sortOptions,
  placeholder = 'Filtrar por título o artista...',
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-6">
      <div className="relative flex-1">
        <svg
          className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
            clipRule="evenodd"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-900 text-white placeholder-gray-500 text-sm rounded-lg pl-9 pr-9 py-2 outline-none border border-gray-800 focus:border-gray-600 transition-colors"
        />
        {query && (
          <button
            onClick={() => onQueryChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-sm leading-none"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>

      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 outline-none border border-gray-800 focus:border-gray-600 transition-colors cursor-pointer"
        aria-label="Ordenar"
      >
        {sortOptions.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
