export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="text-center py-16">
      {Icon && (
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-100 to-brand-300 dark:from-ink-800 dark:to-ink-700 grid place-items-center mb-4">
          <Icon className="w-7 h-7 text-brand-700 dark:text-brand-300" />
        </div>
      )}
      <h3 className="text-base font-semibold">{title}</h3>
      {description && <p className="text-sm text-ink-500 mt-1 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
