export function AdPlaceholder({ className }: { className?: string }) {
    return (
        <div className={`bg-gray-800/50 border border-gray-700 rounded-lg flex items-center justify-center min-h-[100px] ${className}`}>
            <span className="text-xs text-gray-500 uppercase tracking-widest">Advertisement</span>
        </div>
    )
}
